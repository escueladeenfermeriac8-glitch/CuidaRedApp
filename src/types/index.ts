/**
 * types/index.ts — Modelo de datos completo de CuidaRed
 *
 * Fuente de verdad:
 *   - DISENO_BASE.md §5 (modelo Firestore)
 *   - ADENDA_GENOGRAMA.md §3 (modelo de integrantes y parejas)
 *
 * Convenciones:
 *   - Todos los documentos llevan los campos base (BaseDoc).
 *   - Los borrados son lógicos (eliminado: true).
 *   - Las valoraciones son append-only (no se edita: se crea nueva versión).
 *   - Las fechas se guardan como string ISO UTC + zonaDispositivo separado.
 *   - No se guarda DNI ni nombre de pila de las familias.
 */

import type { Timestamp } from 'firebase/firestore'

// ─────────────────────────────────────────────
// Campos comunes a todos los documentos
// ─────────────────────────────────────────────
export interface BaseDoc {
  id?: string
  createdAt: Timestamp
  createdBy: string          // uid
  deviceId: string
  schemaVersion: number
  eliminado?: boolean
  updatedAt?: Timestamp
  updatedBy?: string
}

// ─────────────────────────────────────────────
// Sincronización (estado local del dispositivo)
// ─────────────────────────────────────────────
export type SyncEstado = 'enviado' | 'pendiente' | 'revisar'

// ─────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────
export type Rol =
  | 'valorador'
  | 'supervisor'
  | 'admin'
  | 'admin_global'
  | 'invitado_externo'

// ─────────────────────────────────────────────
// organizaciones/{orgId}
// ─────────────────────────────────────────────
export type TipoOrganizacion = 'catedra' | 'caps' | 'municipio' | 'red'

export interface Organizacion extends BaseDoc {
  nombre: string
  tipo: TipoOrganizacion
  pais: string
  config: OrgConfig
}

export interface OrgConfig {
  modoDocente: boolean
  etiquetas: {
    barrio: string       // "barrio" | "comuna" | "localidad"
    caps: string         // "CAPS" | "IPS" | "puesto de salud"
    documento: string    // "DNI" | "documento"
  }
  versionesEscalas: Record<string, string>
  retencionDias: number
  idioma: 'es-AR' | 'es-CO'
  convencionGenograma?: ConvencionGenograma
}

export interface ConvencionGenograma {
  varonForma: 'cuadrado'           // no configurable en v1
  mujerForma: 'circulo'
  desconocidoForma: 'rombo'
  ordenParejas: 'varon-izquierda' | 'mujer-izquierda'
}

// ─────────────────────────────────────────────
// usuarios/{uid}
// ─────────────────────────────────────────────
export interface Usuario extends BaseDoc {
  email: string
  nombre: string
  rol: Rol
  orgId: string
  capsIds: string[]
  comision?: string
  activo: boolean
}

// ─────────────────────────────────────────────
// invitaciones/{emailMin}
// ─────────────────────────────────────────────
export interface Invitacion {
  rol: Rol
  orgId: string
  capsIds: string[]
  comision?: string
  creadaPor: string
  creadaAt: Timestamp
  usada: boolean
}

// ─────────────────────────────────────────────
// caps/{capsId}
// ─────────────────────────────────────────────
export interface Caps extends BaseDoc {
  orgId: string
  nombre: string
  municipio: string
  pais: string
  emailInstitucional?: string   // Ola 2
}

// ─────────────────────────────────────────────
// barrios/{barrioId}
// ─────────────────────────────────────────────
export type Cardinal =
  | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO'

export interface Barrio extends BaseDoc {
  orgId: string
  nombre: string
  cardinal: Cardinal
  capsId: string
  etiqueta: string         // "Barrio Alberdi (Sur)"
  claveUnica: string       // nombreNorm + '-' + cardinalMin
}

// ─────────────────────────────────────────────
// barrios/{barrioId}/valoracionesComunidad/{id}
// ─────────────────────────────────────────────
export type EstadoValoracion = 'borrador' | 'final'

export interface ValoracionComunidad extends BaseDoc {
  barrioId: string
  orgId: string
  patrones: Record<string, PatronComunidad>   // p1..p11
  foda: Foda
  estado: EstadoValoracion
  version: number
  fecha: Timestamp
  autorId: string
}

export interface PatronComunidad {
  subjetivos: string
  objetivos: string
  observaciones: string
  fuente: string
  alterado: boolean
  justificacion: string
}

export interface Foda {
  fortalezas: ItemFoda[]
  debilidades: ItemFoda[]
  oportunidades: ItemFoda[]
  amenazas: ItemFoda[]
}

export interface ItemFoda {
  id: string
  texto: string
  patrones: number[]
  prioridad: number
  fuentes: string[]
  evidencia: string
  afectaVulnerables: boolean
  estrategia?: string
  origen: 'patron' | 'banco' | 'manual'
  preguntaId?: string     // para ítems del banco B.3/B.4
}

// ─────────────────────────────────────────────
// familias/{famId}
// ─────────────────────────────────────────────
export type EstadoFamilia = 'activa' | 'inactiva' | 'derivada'

export interface Familia extends BaseDoc {
  orgId: string
  codigoFamiliar: string     // {CAPS}-{AA}-{seq}
  barrioId: string
  capsId: string
  apellido: string
  apellidoNorm: string       // normalizado para búsqueda
  domicilio: string
  domicilioNorm: string
  ordenEnDomicilio: number   // para varias familias en el mismo domicilio
  referenteParentesco: string
  consentimiento: Consentimiento
  estado: EstadoFamilia
  vivienda: Vivienda
  cartografia: Cartografia
  syncEstado?: SyncEstado
}

export interface Consentimiento {
  otorgado: boolean
  fecha?: Timestamp
  modalidad?: 'oral' | 'escrito'
  registradoPor?: string   // uid
}

export interface Vivienda {
  tipo?: string              // TODO(belen): catálogo de tipos de vivienda
  tenencia?: string          // TODO(belen): catálogo de tenencia
  materialesParedes?: string
  materialesTocho?: string
  cantHabitaciones?: number
  cantConvivientes?: number
  aguaPotable?: boolean
  cloacas?: boolean
  electricidad?: boolean
  gas?: boolean
  recoleccionResiduos?: boolean
  observaciones?: string
}

export interface Cartografia {
  ubicacion?: 'urbana' | 'periurbana' | 'rural'
  referencias?: string     // descripción de referencias y croquis
  fotoUrl?: string         // URL de imagen comprimida en Storage
}

// ─────────────────────────────────────────────
// familias/{famId}/integrantes/{id}
// Extiende DISENO_BASE.md §5 con ADENDA_GENOGRAMA.md §3.1
// ─────────────────────────────────────────────
export type SexoBiologico = 'varon' | 'mujer' | 'desconocido'
export type PrecisionFecha = 'exacta' | 'aproximada' | 'anio' | 'desconocida'
export type TipoFiliacion = 'biologica' | 'adoptiva' | 'otra'
export type TipoMultiple = 'gemelos' | 'mellizos'

export interface Integrante extends BaseDoc {
  famId: string
  orgId: string

  // Identificación (opcional — no se guarda nombre de pila por privacidad)
  nombre?: string | null          // Opcional — ADENDA §3.1
  apellido?: string | null        // Opcional
  parentesco: string              // Relación con el referente familiar
  sexo: SexoBiologico | null
  identidadGenero?: string | null // Solo si corresponde y es pertinente

  // Edad y fechas
  fechaNac?: string | null        // ISO date string
  fechaNacPrecision?: PrecisionFecha
  edadAprox?: number | null       // Cuando no hay fecha
  fallecido: boolean
  fechaFallecimiento?: string | null
  fechaFallecimientoPrecision?: PrecisionFecha

  // Genograma
  esIndice: boolean               // Solo uno por familia
  conviveActual: boolean
  madreId?: string | null
  padreId?: string | null
  tipoFiliacion: TipoFiliacion
  partoMultipleId?: string | null
  tipoMultiple?: TipoMultiple | null
  ordenManual?: number | null     // Para ordenar hijos sin fechas

  // Datos sociales
  ocupacion?: string | null
  escolaridad?: string | null
  obraSocial?: string | null
  condiciones: Condicion[]

  notas?: string | null
  syncEstado?: SyncEstado
}

// ─────────────────────────────────────────────
// Condición de salud (dentro de integrante)
// ADENDA_GENOGRAMA.md §3.4
// ─────────────────────────────────────────────
export type TipoCondicion =
  | 'diagnostico'
  | 'antecedente'
  | 'factor_riesgo'
  | 'adiccion'
  | 'otro'

export type EstadoCondicion =
  | 'actual'
  | 'resuelto'
  | 'historico'
  | 'sospechado'
  | 'desconocido'

export interface Condicion {
  nombre: string
  tipo: TipoCondicion
  estado: EstadoCondicion
  fechaInicio?: string
  notas?: string
}

// ─────────────────────────────────────────────
// familias/{famId}/parejas/{id}
// ADENDA_GENOGRAMA.md §3.2
// Reemplaza parejaDeIds[] y tipoVinculo del diseño base.
// ─────────────────────────────────────────────
export type TipoPareja = 'matrimonio' | 'union_de_hecho' | 'otra'
export type MotivoFinPareja =
  | 'separacion'
  | 'divorcio'
  | 'fallecimiento'
  | 'otra'

export interface Pareja extends BaseDoc {
  famId: string
  orgId: string
  personaAId: string
  personaBId: string
  tipo: TipoPareja
  fechaInicio?: string | null
  fechaInicioPrecision?: PrecisionFecha
  fechaFin?: string | null
  fechaFinPrecision?: PrecisionFecha
  motivoFin?: MotivoFinPareja | null
  notas?: string | null
  syncEstado?: SyncEstado
}

// ─────────────────────────────────────────────
// Colecciones solo-modelo en P0
// ADENDA_GENOGRAMA.md §3.5
// ─────────────────────────────────────────────
export type CalidadRelacion =
  | 'unida'
  | 'fusionada'
  | 'conflictiva'
  | 'fusionada_conflictiva'
  | 'distante'
  | 'apartada'

export interface RelacionInterpersonal extends BaseDoc {
  famId: string
  orgId: string
  personaAId: string
  personaBId: string
  calidad: CalidadRelacion
  desde?: string | null
  hasta?: string | null
  notas?: string | null
}

export type TipoAcontecimiento =
  | 'migracion'
  | 'perdida_laboral'
  | 'fallecimiento'
  | 'crisis'
  | 'otro'

export interface AcontecimientoVital extends BaseDoc {
  famId: string
  orgId: string
  personaId?: string | null
  tipo: TipoAcontecimiento
  descripcion: string
  fecha?: string | null
  fechaPrecision?: PrecisionFecha
}

// ─────────────────────────────────────────────
// Convivencia (P0: solo conviveActual en integrante)
// P1: hogares/{id} con historial
// ─────────────────────────────────────────────
export interface Hogar extends BaseDoc {
  famId: string
  orgId: string
  miembroIds: string[]
  desde?: string | null
  hasta?: string | null
}

// ─────────────────────────────────────────────
// familias/{famId}/valoraciones/{id}
// ─────────────────────────────────────────────
export type TipoValoracion = 'patrones' | 'apgar' | 'mos' | 'holmes'
export type EstadoPatronFamiliar = 'conservado' | 'alterado' | 'sin_valorar'

export interface Valoracion extends BaseDoc {
  famId: string
  orgId: string
  tipo: TipoValoracion
  payload: ValoracionPayload
  puntaje?: number
  interpretacion?: string
  versionEscala: string
  version: number
  fecha: Timestamp
  autorId: string
  syncEstado?: SyncEstado
}

export type ValoracionPayload =
  | PayloadPatrones
  | PayloadApgar
  | PayloadHolmes
  | PayloadMos

export interface PayloadPatrones {
  patrones: Record<string, PatronFamiliar>   // p1..p11
}

export interface PatronFamiliar {
  estado: EstadoPatronFamiliar
  justificacion: string
  respuestas?: Record<string, string>   // preguntaId → respuesta
}

export interface PayloadApgar {
  respondioParentesco: string
  respuestas: number[]   // 0..2 por ítem, 5 ítems
}

export interface PayloadHolmes {
  eventosSeleccionados: number[]   // índices 0..42
  otrosEventos?: string
}

export interface PayloadMos {
  amigosIntimos?: number   // pregunta 1 (descriptivo)
  respuestas: number[]     // 1..5 por ítem, 19 ítems (p2..p20)
}

// ─────────────────────────────────────────────
// familias/{famId}/diagnosticos/{id}
// ─────────────────────────────────────────────
export type EstadoDiagnostico = 'propuesto' | 'confirmado' | 'descartado'

export interface Diagnostico extends BaseDoc {
  famId: string
  orgId: string
  patron: string
  nandaCodigo: string
  etiqueta: string
  caracteristicasObservadas: string[]
  enunciadoPES?: string
  estado: EstadoDiagnostico
  validadoPor?: string   // uid
  fecha: Timestamp
  syncEstado?: SyncEstado
}

// ─────────────────────────────────────────────
// familias/{famId}/plan/{id}
// ─────────────────────────────────────────────
export interface PlanItem extends BaseDoc {
  famId: string
  orgId: string
  diagnosticoId: string
  resultadoEsperado: string
  intervencion: string
  fijada: boolean
  fechaObjetivo?: Timestamp
  responsable?: string
  syncEstado?: SyncEstado
}

// ─────────────────────────────────────────────
// familias/{famId}/evoluciones/{id}
// SOEP: Subjetivo · Objetivo · Evaluación · Plan
// ─────────────────────────────────────────────
export interface Evolucion extends BaseDoc {
  famId: string
  orgId: string
  S: string   // Subjetivo
  O: string   // Objetivo
  E: string   // Evaluación
  P: string   // Plan
  fecha: Timestamp
  autorId: string
  syncEstado?: SyncEstado
}

// ─────────────────────────────────────────────
// catalogos/{nombre}
// ─────────────────────────────────────────────
export interface Catalogo<T = unknown> {
  id: string
  version: string
  fuente: string
  items: T[]
  // Ajustes de cada organización (overrides)
  overrides?: Record<string, Partial<T>>
  overridesPor?: string
  overridesAt?: Timestamp
}

// Ítems del catálogo APGAR
export interface ItemApgar {
  n: number
  dimension: string
  enunciado: string
  escala: 'nunca-aveces-siempre'
  valores: { casiNunca: 0; aVeces: 1; casiSiempre: 2 }
}

// Ítems del catálogo Holmes y Rahe
export interface ItemHolmes {
  n: number
  evento: string
  ucv: number
}

// Ítems del catálogo MOS
export interface ItemMos {
  n: number
  enunciado: string
  subescala: 'emocional_informacional' | 'ayuda_material' | 'ocio' | 'afectivo'
}

// Cortes de interpretación
export interface CorteInstrumento {
  min: number
  max: number
  etiqueta: string
  nivel: 'ok' | 'atencion' | 'critico'
  accionApp?: string
}

export type SujetoCuidadoNanda =
  | 'individuo'
  | 'familia'
  | 'comunidad'
  | 'pareja'
  | 'grupo'
  | 'cuidador'

// NANDA por patrón
export interface ItemNanda {
  codigo: string
  etiqueta: string
  sujeto: SujetoCuidadoNanda[]
  patrones: number[]
  tipo: 'problema' | 'riesgo' | 'disposicion'
  notaClinica?: string
}

// ─────────────────────────────────────────────
// metricas/{id}
// Sin datos personales
// ─────────────────────────────────────────────
export interface Metrica extends BaseDoc {
  evento: string
  modulo: string
  duracionSeg?: number
  offline: boolean
  rol: Rol
}

// ─────────────────────────────────────────────
// Pendientes (campanita) — estado local
// ─────────────────────────────────────────────
export type EstadoPaso = 'pendiente' | 'en_curso' | 'completo'

export interface PasosPendientes {
  consentimiento: EstadoPaso
  integrantes: EstadoPaso
  genograma: EstadoPaso
  vivienda: EstadoPaso
  patrones: EstadoPaso
  apgar: EstadoPaso
  holmes: EstadoPaso
  mos: EstadoPaso
  notas: EstadoPaso
}
