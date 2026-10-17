/**
 * Punto de acceso tipado a los catálogos clínicos semilla
 * DISENO_BASE.md §Anexos A-E
 */

import apgarData from './apgar.json'
import holmesData from './holmes.json'
import mosData from './mos.json'
import nandaData from './nandaPorPatron.json'
import reglasData from './reglasInstrumentos.json'

import type {
  ItemApgar,
  ItemHolmes,
  ItemMos,
  ItemNanda,
  CorteInstrumento,
  SujetoCuidadoNanda,
} from '@/types'

export type { ItemApgar, ItemHolmes, ItemMos, ItemNanda, CorteInstrumento, SujetoCuidadoNanda }
export { apgarData, holmesData, mosData, nandaData, reglasData }

// ─── APGAR familiar ──────────────────────────────────
export interface ResultadoApgar {
  puntaje: number
  corte: CorteInstrumento
  respuestas: Record<number, number>
}

export function calcularApgar(respuestas: Record<number, number>): ResultadoApgar {
  let puntaje = 0
  for (let i = 1; i <= 5; i++) {
    puntaje += respuestas[i] ?? 0
  }

  const corte = apgarData.cortes.find(
    (c) => puntaje >= c.min && puntaje <= c.max
  ) ?? {
    min: 0,
    max: 10,
    etiqueta: 'Sin clasificar',
    nivel: 'atencion' as const,
  }

  return {
    puntaje,
    corte: corte as CorteInstrumento,
    respuestas,
  }
}

// ─── Holmes y Rahe ───────────────────────────────────
export interface ResultadoHolmes {
  puntaje: number
  corte: CorteInstrumento
  eventosSeleccionados: number[]
}

export function calcularHolmes(eventosSeleccionados: number[]): ResultadoHolmes {
  const eventosSet = new Set(eventosSeleccionados)
  let puntaje = 0

  for (const item of holmesData.items) {
    if (eventosSet.has(item.n)) {
      puntaje += item.ucv
    }
  }

  const corte = holmesData.cortes.find(
    (c) => puntaje >= c.min && puntaje <= c.max
  ) ?? {
    min: 0,
    max: 9999,
    etiqueta: 'Sin clasificar',
    nivel: 'ok' as const,
  }

  return {
    puntaje,
    corte: corte as CorteInstrumento,
    eventosSeleccionados,
  }
}

// ─── Cuestionario MOS ────────────────────────────────
export interface SubescalaMosResultado {
  nombre: string
  puntaje: number
  min: number
  medio: number
  max: number
  esAdecuado: boolean
}

export interface ResultadoMos {
  global: {
    puntaje: number
    esAdecuado: boolean
  }
  subescalas: Record<string, SubescalaMosResultado>
  numeroAmigosYFamiliares?: number
}

export function calcularMos(
  respuestas: Record<number, number>,
  numeroAmigosYFamiliares?: number
): ResultadoMos {
  const subescalasRes: Record<string, SubescalaMosResultado> = {}

  for (const [clave, config] of Object.entries(mosData.subescalas)) {
    if (clave === 'global') continue

    let subPuntaje = 0
    for (const itemNum of config.items) {
      subPuntaje += respuestas[itemNum] ?? 1 // default valor mínimo si no respondió
    }

    subescalasRes[clave] = {
      nombre: config.nombre,
      puntaje: subPuntaje,
      min: config.min,
      medio: config.medio,
      max: config.max,
      esAdecuado: subPuntaje >= config.medio,
    }
  }

  let puntajeGlobal = 0
  for (const itemNum of mosData.subescalas.global.items) {
    puntajeGlobal += respuestas[itemNum] ?? 1
  }

  return {
    global: {
      puntaje: puntajeGlobal,
      esAdecuado: puntajeGlobal >= mosData.subescalas.global.medio,
    },
    subescalas: subescalasRes,
    numeroAmigosYFamiliares,
  }
}

// ─── Diagnósticos NANDA ──────────────────────────────
export interface FiltroNanda {
  patron?: number
  sujeto?: SujetoCuidadoNanda
  tipo?: 'problema' | 'riesgo' | 'disposicion'
  busqueda?: string
}

export function filtrarDiagnosticosNanda(filtro: FiltroNanda): ItemNanda[] {
  const items = nandaData.items as ItemNanda[]
  return items.filter((item) => {
    if (filtro.patron && !item.patrones.includes(filtro.patron)) {
      return false
    }
    if (filtro.sujeto && !item.sujeto.includes(filtro.sujeto)) {
      return false
    }
    if (filtro.tipo && item.tipo !== filtro.tipo) {
      return false
    }
    if (filtro.busqueda) {
      const q = filtro.busqueda.toLowerCase()
      const matchEtiqueta = item.etiqueta.toLowerCase().includes(q)
      const matchCodigo = item.codigo.includes(q)
      if (!matchEtiqueta && !matchCodigo) return false
    }
    return true
  })
}
