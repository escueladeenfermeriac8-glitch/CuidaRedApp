/**
 * Normalización de texto para búsqueda de familias
 * DISENO_BASE.md §6.1
 *
 * Pasos:
 * 1. Minúsculas
 * 2. Sin tildes ni puntuación
 * 3. Abreviaturas unificadas
 * 4. Números separados
 * 5. Espacios múltiples colapsados
 */

const ABREVIATURAS: Record<string, string> = {
  'av.': 'avenida',
  'av ': 'avenida ',
  'bv.': 'bulevar',
  'bv ': 'bulevar ',
  'blv.': 'bulevar',
  'pje.': 'pasaje',
  'pje ': 'pasaje ',
  'dr.': 'doctor',
  'dra.': 'doctora',
  'gral.': 'general',
  'gral ': 'general ',
}

export function normalizar(texto: string): string {
  if (!texto) return ''

  let s = texto
    .toLowerCase()
    // Quitar tildes y diacríticos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Quitar puntuación (excepto espacios y números)
    .replace(/[^\w\s]/g, ' ')

  // Unificar abreviaturas
  for (const [abrev, expandida] of Object.entries(ABREVIATURAS)) {
    s = s.replaceAll(abrev, expandida)
  }

  // Colapsar espacios múltiples
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

/**
 * Distancia de edición de Levenshtein (para búsqueda aproximada)
 * DISENO_BASE.md §6.1: "distancia de edición ≤ 2"
 */
export function distanciaEdicion(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Genera la claveUnica de un barrio
 * DISENO_BASE.md §5: nombreNorm + cardinal
 * Ejemplo: "alberdi-sur"
 */
export function claveUnicaBarrio(nombre: string, cardinal: string): string {
  const cardinalMap: Record<string, string> = {
    N: 'norte',
    NE: 'noreste',
    E: 'este',
    SE: 'sureste',
    S: 'sur',
    SO: 'suroeste',
    O: 'oeste',
    NO: 'noroeste',
  }
  const nombreNorm = normalizar(nombre).replace(/\s+/g, '-')
  const cardinalNorm = cardinalMap[cardinal] ?? cardinal.toLowerCase()
  return `${nombreNorm}-${cardinalNorm}`
}

/**
 * Genera el código familiar
 * DISENO_BASE.md §5: {CAPS}-{AA}-{secuencia}
 * Usa un prefijo por dispositivo para evitar choques offline.
 */
export function generarCodigoFamiliar(
  capsNombre: string,
  anio: number,
  secuencia: number,
  devicePrefix: string,
): string {
  const capsAbrev = capsNombre
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 4)
  const anioCorto = String(anio).slice(-2)
  const seq = String(secuencia).padStart(3, '0')
  const prefix = devicePrefix.slice(0, 2).toUpperCase()
  return `${capsAbrev}-${anioCorto}${prefix}-${seq}`
}
