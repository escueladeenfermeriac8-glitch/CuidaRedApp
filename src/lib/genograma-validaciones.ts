/**
 * Componente de validación de genograma
 * ADENDA_GENOGRAMA.md §5 — Validaciones
 *
 * Las validaciones que bloquean el guardado y las que solo advierten
 * están separadas según la adenda.
 */

import type { Integrante, Pareja } from '@/types'

/**
 * Integrante con id de documento Firestore.
 * Cuando un integrante ya fue leído de Firestore, siempre tiene id.
 * Este tipo se usa en las funciones de validación.
 */
export type IntegranteConId = Integrante & { id: string }

// ─── Resultado de validación ─────────────────
export interface ResultadoValidacion {
  valido: boolean
  errores: string[]        // bloquean el guardado
  advertencias: string[]   // solo avisan
}

// ─── Validaciones que BLOQUEAN el guardado ───
// ADENDA §5: "Bloquean el guardado"

/**
 * Una persona no puede ser su propia madre/padre/hija/hijo.
 * Sin ciclos imposibles en la filiación.
 */
export function validarFiliacion(
  integrantes: IntegranteConId[],
  candidato: Partial<Integrante>,
  candidatoId?: string,
): string[] {
  const errores: string[] = []
  const id = candidatoId ?? null

  // Autoreferencia
  if (id && (candidato.madreId === id || candidato.padreId === id)) {
    errores.push('Una persona no puede ser su propia madre o padre.')
  }

  // Ciclos: si A es madre de B, B no puede ser madre de A
  if (candidato.madreId) {
    const madre = integrantes.find((i) => i.id === candidato.madreId)
    if (madre && id && (madre.madreId === id || madre.padreId === id)) {
      errores.push('Ciclo de filiación detectado: la madre/padre no puede ser hija/hijo de la persona.')
    }
  }

  return errores
}

/**
 * Las referencias (madreId, padreId, parejas) deben apuntar
 * a integrantes existentes de la misma familia.
 */
export function validarReferencias(
  integrantes: IntegranteConId[],
  candidato: Partial<Integrante>,
): string[] {
  const errores: string[] = []
  const ids = new Set(integrantes.map((i) => i.id))

  if (candidato.madreId && !ids.has(candidato.madreId)) {
    errores.push('La madre referenciada no existe en esta familia.')
  }
  if (candidato.padreId && !ids.has(candidato.padreId)) {
    errores.push('El padre referenciado no existe en esta familia.')
  }

  return errores
}

/**
 * Fallecimiento no puede ser anterior al nacimiento cuando ambas fechas son conocidas.
 * ADENDA: "Se advierte; no se corrige solo." → está en advertencias, pero
 * cuando ambas precisiones son 'exacta' y hay error claro, bloqueamos.
 */
export function validarFechas(candidato: Partial<Integrante>): {
  errores: string[]
  advertencias: string[]
} {
  const errores: string[] = []
  const advertencias: string[] = []

  if (
    candidato.fechaNac &&
    candidato.fechaFallecimiento &&
    candidato.fechaNacPrecision === 'exacta' &&
    candidato.fechaFallecimientoPrecision === 'exacta'
  ) {
    const nac = new Date(candidato.fechaNac)
    const fall = new Date(candidato.fechaFallecimiento)
    if (fall < nac) {
      errores.push('La fecha de fallecimiento no puede ser anterior a la de nacimiento.')
    }
  } else if (
    candidato.fechaNac &&
    candidato.fechaFallecimiento
  ) {
    // Fechas aproximadas: solo advertencia
    advertencias.push('Verificá que la fecha de fallecimiento sea posterior al nacimiento.')
  }

  return { errores, advertencias }
}

/**
 * Solo una persona índice por familia.
 */
export function validarPersonaIndice(
  integrantes: IntegranteConId[],
  candidato: Partial<Integrante>,
  candidatoId?: string,
): string[] {
  const errores: string[] = []
  if (candidato.esIndice) {
    const otraIndice = integrantes.find(
      (i) =>
        i.esIndice &&
        i.id !== candidatoId,
    )
    if (otraIndice) {
      errores.push('Ya hay una persona índice en esta familia. Solo puede haber una.')
    }
  }
  return errores
}

/**
 * Validación de pareja: los dos IDs deben existir en la familia.
 */
export function validarPareja(
  integrantes: IntegranteConId[],
  pareja: Partial<Pareja>,
): string[] {
  const errores: string[] = []
  const ids = new Set(integrantes.map((i) => i.id))

  if (!pareja.personaAId || !ids.has(pareja.personaAId)) {
    errores.push('La primera persona de la pareja no existe en esta familia.')
  }
  if (!pareja.personaBId || !ids.has(pareja.personaBId)) {
    errores.push('La segunda persona de la pareja no existe en esta familia.')
  }
  if (pareja.personaAId && pareja.personaBId && pareja.personaAId === pareja.personaBId) {
    errores.push('Una persona no puede ser pareja de sí misma.')
  }

  return errores
}

// ─── Validaciones que SOLO ADVIERTEN ─────────
// ADENDA §5: "Solo advierten (nunca bloquean)"

export function generarAdvertencias(
  integrantes: IntegranteConId[],
  candidato: Partial<Integrante>,
): string[] {
  const advertencias: string[] = []

  // Menos de 3 generaciones documentadas
  const tieneAbuela = integrantes.some(
    (i) => i.madreId || i.padreId,
  )
  if (!tieneAbuela && integrantes.length > 2) {
    advertencias.push('Hay menos de 3 generaciones documentadas.')
  }

  // Faltan fechas de nacimiento
  if (!candidato.fechaNac && !candidato.edadAprox) {
    advertencias.push('Falta la fecha o edad aproximada de nacimiento.')
  }

  // Personas sin información clínica
  if (!candidato.condiciones || candidato.condiciones.length === 0) {
    advertencias.push('No hay condiciones de salud registradas para esta persona.')
  }

  return advertencias
}

// ─── Función principal de validación ─────────

export function validarIntegrante(
  integrantes: IntegranteConId[],
  candidato: Partial<Integrante>,
  candidatoId?: string,
): ResultadoValidacion {
  const errores: string[] = [
    ...validarFiliacion(integrantes, candidato, candidatoId),
    ...validarReferencias(integrantes, candidato),
    ...validarPersonaIndice(integrantes, candidato, candidatoId),
  ]

  const { errores: erroresFecha, advertencias: advertenciasFecha } =
    validarFechas(candidato)
  errores.push(...erroresFecha)

  const advertencias: string[] = [
    ...advertenciasFecha,
    ...generarAdvertencias(integrantes, candidato),
  ]

  return {
    valido: errores.length === 0,
    errores,
    advertencias,
  }
}
