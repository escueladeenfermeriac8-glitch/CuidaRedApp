/**
 * Ficha Familiar — Vista Integral de la Familia
 * DISENO_BASE.md §6.2, §7.2 paso 5 y ADENDA_GENOGRAMA.md
 *
 * Características principales:
 * - Cabecera: Apellido, código {CAPS}-{AA}-{seq}, orden en domicilio, barrio y brújula.
 * - Anillo de 11 patrones de Gordon: estado interactivo (conservado / alterado / sin valorar).
 * - Campanita de pendientes: estado reactivo de cada paso (consentimiento, integrantes, genograma, vivienda, patrones, instrumentos).
 * - Pestañas de trabajo: Resumen, Integrantes & Genograma, Vivienda & Cartografía, Patrones, Instrumentos.
 * - Acceso directo a ConsentimientoModal, IntegrantesManager y ViviendaCartografiaSection.
 * - Acceso a exportar ficha en PDF (Paso 10).
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Familia,
  Barrio,
  Integrante,
  Valoracion,
  Consentimiento,
  Vivienda,
  Cartografia,
  EstadoPaso,
  PayloadPatrones,
} from '@/types'
import { ConsentimientoModal } from '@/components/familias/ConsentimientoModal'
import { IntegrantesManager } from '@/components/familias/IntegrantesManager'
import { ViviendaCartografiaSection } from '@/components/familias/ViviendaCartografiaSection'
import { generarPdfFamiliar, descargarBlobPdf } from '@/lib/pdf-generador'
import { SyncBadge } from '@/components/sync/SyncBadge'
import {
  ArrowLeft,
  ShieldAlert,
  Users,
  Home,
  Compass,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  HeartHandshake,
  Download,
  ChevronRight,
  UserCheck,
  FileText,
} from 'lucide-react'

// Nombres cortos de los 11 patrones de Gordon
const NOMBRES_PATRONES = [
  'Manejo de la salud',
  'Nutrición / Metabólico',
  'Eliminación',
  'Actividad / Ejercicio',
  'Sueño / Descanso',
  'Cognitivo / Perceptivo',
  'Autopercepción',
  'Rol / Relaciones',
  'Sexualidad / Reprod.',
  'Estrés / Afrontamiento',
  'Valores / Creencias',
]

type TabFicha = 'resumen' | 'integrantes' | 'vivienda' | 'patrones' | 'instrumentos'

export function FichaFamiliarPage() {
  const { famId } = useParams<{ famId: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [familia, setFamilia] = useState<Familia | null>(null)
  const [barrio, setBarrio] = useState<Barrio | null>(null)
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tabActiva, setTabActiva] = useState<TabFicha>('resumen')
  const [modalConsentimientoAbierto, setModalConsentimientoAbierto] = useState(false)
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [errorPdf, setErrorPdf] = useState<string | null>(null)

  const handleExportarPdf = async () => {
    if (!familia) return
    setGenerandoPdf(true)
    setErrorPdf(null)

    try {
      const pdfBytes = await generarPdfFamiliar({
        familia,
        barrio,
        integrantes,
        valoraciones,
        nombreValorador: usuario?.nombre || 'Estudiante de Enfermería',
        rolValorador: usuario?.rol || 'valorador',
      })

      const codLimpio = (familia.codigoFamiliar || 'FAM').replace(/[^a-zA-Z0-9_-]/g, '_')
      const apeLimpio = (familia.apellido || 'Familiar').replace(/[^a-zA-Z0-9_-]/g, '_')
      descargarBlobPdf(pdfBytes, `Ficha_${codLimpio}_${apeLimpio}.pdf`)
      setModalPdfAbierto(false)
    } catch (err) {
      console.error('Error generando PDF:', err)
      setErrorPdf('No se pudo generar el documento PDF. Verificá los datos.')
    } finally {
      setGenerandoPdf(false)
    }
  }

  // Cargar datos en tiempo real de la familia
  useEffect(() => {
    if (!famId) return

    const famRef = doc(db, 'familias', famId)
    const unsubFam = onSnapshot(
      famRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          setError('La familia solicitada no existe o fue eliminada.')
          setCargando(false)
          return
        }

        const data = { id: docSnap.id, ...docSnap.data() } as Familia
        setFamilia(data)

        // Cargar barrio si corresponde
        if (data.barrioId) {
          try {
            const bSnap = await getDoc(doc(db, 'barrios', data.barrioId))
            if (bSnap.exists()) {
              setBarrio({ id: bSnap.id, ...bSnap.data() } as Barrio)
            }
          } catch (e) {
            console.error('Error cargando barrio:', e)
          }
        }
        setCargando(false)
      },
      (err) => {
        console.error('Error suscribiendo familia:', err)
        setError('Error al conectar con la base de datos.')
        setCargando(false)
      }
    )

    // Subscripción a integrantes
    const intColRef = collection(db, 'familias', famId, 'integrantes')
    const unsubInt = onSnapshot(intColRef, (snap) => {
      const ints: Integrante[] = []
      snap.forEach((d) => ints.push({ id: d.id, ...d.data() } as Integrante))
      setIntegrantes(ints)
    })

    // Subscripción a valoraciones
    const valColRef = collection(db, 'familias', famId, 'valoraciones')
    const unsubVal = onSnapshot(valColRef, (snap) => {
      const vals: Valoracion[] = []
      snap.forEach((d) => vals.push({ id: d.id, ...d.data() } as Valoracion))
      setValoraciones(vals)
    })

    return () => {
      unsubFam()
      unsubInt()
      unsubVal()
    }
  }, [famId])

  // Obtener valoración de patrones de Gordon si existe
  const valoracionPatrones = useMemo(() => {
    return valoraciones.find((v) => v.tipo === 'patrones')
  }, [valoraciones])

  // Estados de los 11 patrones: 'conservado' | 'alterado' | 'sin_valorar'
  const estadosPatrones = useMemo(() => {
    const estados: ('conservado' | 'alterado' | 'sin_valorar')[] = Array(11).fill('sin_valorar')
    if (!valoracionPatrones || !valoracionPatrones.payload) return estados

    const payload = valoracionPatrones.payload as PayloadPatrones
    if (payload.patrones) {
      for (let i = 1; i <= 11; i++) {
        const pKey = `p${i}`
        const pData = payload.patrones[pKey]
        if (pData) {
          estados[i - 1] = pData.estado
        }
      }
    }
    return estados
  }, [valoracionPatrones])

  // Conteo de patrones valorados y alterados
  const conteoPatrones = useMemo(() => {
    let valorados = 0
    let conservados = 0
    let alterados = 0
    estadosPatrones.forEach((est) => {
      if (est !== 'sin_valorar') valorados++
      if (est === 'conservado') conservados++
      if (est === 'alterado') alterados++
    })
    return { valorados, conservados, alterados }
  }, [estadosPatrones])

  // Estado de instrumentos
  const valApgar = useMemo(() => valoraciones.find((v) => v.tipo === 'apgar'), [valoraciones])
  const valHolmes = useMemo(() => valoraciones.find((v) => v.tipo === 'holmes'), [valoraciones])
  const valMos = useMemo(() => valoraciones.find((v) => v.tipo === 'mos'), [valoraciones])

  // Cálculo reactivo de la campanita (Pasos pendientes)
  const checklist = useMemo(() => {
    if (!familia) return []

    // 1. Consentimiento
    const tieneConsentimiento = !!familia.consentimiento?.otorgado
    const estadoConsentimiento: EstadoPaso = tieneConsentimiento ? 'completo' : 'pendiente'

    // 2. Integrantes
    const estadoIntegrantes: EstadoPaso =
      integrantes.length === 0
        ? 'pendiente'
        : integrantes.some((i) => i.esIndice)
        ? 'completo'
        : 'en_curso'

    // 3. Genograma (foto o vínculos estructurados)
    const tieneFotoGenograma = !!familia.cartografia?.fotoUrl
    const tieneVinculos = integrantes.some((i) => i.madreId || i.padreId)
    const estadoGenograma: EstadoPaso = tieneFotoGenograma
      ? 'completo'
      : tieneVinculos
      ? 'en_curso'
      : 'pendiente'

    // 4. Vivienda y cartografía
    const tieneVivienda = !!familia.vivienda?.tipo
    const tieneCartografia = !!familia.cartografia?.ubicacion
    const estadoVivienda: EstadoPaso =
      tieneVivienda && tieneCartografia
        ? 'completo'
        : tieneVivienda || tieneCartografia
        ? 'en_curso'
        : 'pendiente'

    // 5. Patrones funcionales
    const estadoPatrones: EstadoPaso =
      conteoPatrones.valorados === 11
        ? 'completo'
        : conteoPatrones.valorados > 0
        ? 'en_curso'
        : 'pendiente'

    // 6. Instrumentos (APGAR, Holmes, MOS)
    const cantInst = (valApgar ? 1 : 0) + (valHolmes ? 1 : 0) + (valMos ? 1 : 0)
    const estadoInstrumentos: EstadoPaso =
      cantInst >= 2 ? 'completo' : cantInst === 1 ? 'en_curso' : 'pendiente'

    return [
      {
        id: 'consentimiento',
        titulo: 'Consentimiento informado',
        estado: estadoConsentimiento,
        descripcion: tieneConsentimiento
          ? `Otorgado (${familia.consentimiento?.modalidad || 'oral'})`
          : 'Requerido para iniciar valoración',
        bloqueante: true,
        irATab: 'resumen' as TabFicha,
        accion: () => setModalConsentimientoAbierto(true),
      },
      {
        id: 'integrantes',
        titulo: 'Integrantes del hogar',
        estado: estadoIntegrantes,
        descripcion:
          integrantes.length === 0
            ? 'Ningún integrante registrado'
            : `${integrantes.length} integrante(s) registrado(s)`,
        bloqueante: false,
        irATab: 'integrantes' as TabFicha,
      },
      {
        id: 'genograma',
        titulo: 'Genograma (árbol o foto)',
        estado: estadoGenograma,
        descripcion: tieneFotoGenograma
          ? 'Foto del genograma manual adjuntada'
          : tieneVinculos
          ? 'Vínculos familiares registrados'
          : 'Foto o vínculos pendientes',
        bloqueante: false,
        irATab: 'vivienda' as TabFicha,
      },
      {
        id: 'vivienda',
        titulo: 'Vivienda y cartografía',
        estado: estadoVivienda,
        descripcion:
          estadoVivienda === 'completo'
            ? `${familia.vivienda?.tipo ?? 'Vivienda'}, zona ${familia.cartografia?.ubicacion ?? 's/d'}`
            : 'Datos habitacionales y croquis',
        bloqueante: false,
        irATab: 'vivienda' as TabFicha,
      },
      {
        id: 'patrones',
        titulo: '11 Patrones de Gordon',
        estado: estadoPatrones,
        descripcion: `${conteoPatrones.valorados} de 11 valorados (${conteoPatrones.alterados} alterados)`,
        bloqueante: false,
        irATab: 'patrones' as TabFicha,
      },
      {
        id: 'instrumentos',
        titulo: 'Instrumentos (APGAR / Holmes / MOS)',
        estado: estadoInstrumentos,
        descripcion:
          cantInst === 0
            ? 'Ningún instrumento completado'
            : `${cantInst} de 3 instrumentos realizados`,
        bloqueante: false,
        irATab: 'instrumentos' as TabFicha,
      },
    ]
  }, [
    familia,
    integrantes,
    conteoPatrones,
    valApgar,
    valHolmes,
    valMos,
  ])

  // Porcentaje general completado
  const porcentajeCompleto = useMemo(() => {
    if (checklist.length === 0) return 0
    let puntos = 0
    checklist.forEach((item) => {
      if (item.estado === 'completo') puntos += 1
      else if (item.estado === 'en_curso') puntos += 0.5
    })
    return Math.round((puntos / checklist.length) * 100)
  }, [checklist])

  // Callback al guardar consentimiento
  const handleConsentimientoGuardado = (c: Consentimiento) => {
    if (familia) {
      setFamilia({ ...familia, consentimiento: c })
    }
  }

  // Callback al guardar vivienda/cartografía
  const handleViviendaGuardada = (v: Vivienda, cart: Cartografia) => {
    if (familia) {
      setFamilia({ ...familia, vivienda: v, cartografia: cart })
    }
  }

  if (cargando) {
    return (
      <div className="ficha-cargando" role="status" aria-live="polite">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
          <circle cx="24" cy="24" r="20" stroke="var(--linea)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" stroke="var(--lago)" strokeWidth="3" strokeDasharray="30 90" strokeLinecap="round" />
        </svg>
        <span>Cargando ficha familiar...</span>
      </div>
    )
  }

  if (error || !familia) {
    return (
      <div className="ficha-error tarjeta stack">
        <AlertCircle size={32} color="var(--critico)" />
        <h2>Familia no encontrada</h2>
        <p className="text-apagado">{error ?? 'No fue posible cargar el registro familiar.'}</p>
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => navigate('/familias')}
        >
          <ArrowLeft size={16} /> Volver a Familias
        </button>
      </div>
    )
  }

  const tieneConsentimiento = !!familia.consentimiento?.otorgado

  return (
    <div className="ficha-container stack">
      {/* Botón superior de retorno y acciones rápidas */}
      <div className="ficha-barra-superior">
        <button
          type="button"
          className="btn-volver-link"
          onClick={() => navigate('/familias')}
          aria-label="Volver a lista de familias"
        >
          <ArrowLeft size={18} />
          <span>Familias</span>
        </button>

        <div className="ficha-acciones-top">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setModalPdfAbierto(true)}
            title="Exportar Ficha Familiar a PDF"
          >
            <Download size={14} />
            <span className="btn-texto-pdf">PDF</span>
          </button>
        </div>
      </div>

      {/* Cartel de Consentimiento Bloqueante si no se otorgó */}
      {!tieneConsentimiento && (
        <section className="alerta-consentimiento-bloqueante" role="alert">
          <div className="alerta-icono">
            <ShieldAlert size={28} />
          </div>
          <div className="alerta-info">
            <strong>Consentimiento informado no registrado</strong>
            <p>
              Según el protocolo del servicio y la Ley 25.326, es requisito solicitar
              y registrar el consentimiento de la familia antes de iniciar la valoración.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primario btn-sm"
            onClick={() => setModalConsentimientoAbierto(true)}
          >
            Registrar consentimiento
          </button>
        </section>
      )}

      {/* Cabecera Principal de la Familia */}
      <header className="ficha-cabecera tarjeta">
        <div className="cabecera-top">
          <div className="titulos-bloque">
            <div className="etiquetas-fila">
              <span className="badge-codigo">{familia.codigoFamiliar}</span>
              <SyncBadge estado={familia.syncEstado ?? (familia.createdAt ? 'enviado' : 'pendiente')} />
              {familia.ordenEnDomicilio > 1 && (
                <span className="badge-orden">Familia {familia.ordenEnDomicilio}</span>
              )}
              <span className={`badge-estado estado-${familia.estado}`}>
                {familia.estado}
              </span>
            </div>

            <h1 className="familia-titulo">Familia {familia.apellido}</h1>

            <div className="datos-contacto-fila text-apagado">
              <span className="dato-item">
                <Home size={14} /> {familia.domicilio}
              </span>
              <span className="dato-separador">·</span>
              <span className="dato-item">
                <Compass size={14} /> {barrio?.etiqueta ?? 'Barrio s/d'}
              </span>
              <span className="dato-separador">·</span>
              <span className="dato-item">
                <UserCheck size={14} /> Ref: {familia.referenteParentesco}
              </span>
            </div>
          </div>

          {/* Anillo de 11 Patrones de Gordon (Gordon Ring preview) */}
          <div className="gordon-ring-container" title="Anillo de 11 Patrones de Gordon">
            <div className="gordon-ring-badge">
              <span className="ring-alterados-num">{conteoPatrones.alterados}</span>
              <span className="ring-alterados-txt">alterados</span>
            </div>
            <div className="gordon-ring-nodos" role="group" aria-label="11 Patrones de Gordon">
              {estadosPatrones.map((estado, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`ring-nodo estado-${estado} ${tabActiva === 'patrones' ? 'activo' : ''}`}
                  onClick={() => setTabActiva('patrones')}
                  title={`P${idx + 1}: ${NOMBRES_PATRONES[idx]} (${estado.replace('_', ' ')})`}
                  aria-label={`Patrón ${idx + 1}: ${NOMBRES_PATRONES[idx]}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Barra de progreso general */}
        <div className="progreso-ficha-barra">
          <div className="progreso-texto-fila">
            <span className="text-apagado" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Progreso de la ficha familiar
            </span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--lago)' }}>
              {porcentajeCompleto}%
            </strong>
          </div>
          <div className="barra-pista" role="progressbar" aria-valuenow={porcentajeCompleto} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="barra-relleno"
              style={{ width: `${porcentajeCompleto}%` }}
            />
          </div>
        </div>
      </header>

      {/* Navegación por pestañas de la Ficha */}
      <nav className="ficha-tabs-nav" aria-label="Pestañas de la Ficha Familiar">
        <button
          type="button"
          className={`tab-btn ${tabActiva === 'resumen' ? 'activa' : ''}`}
          onClick={() => setTabActiva('resumen')}
        >
          <Clock size={16} />
          <span>Resumen & Pendientes</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${tabActiva === 'integrantes' ? 'activa' : ''}`}
          onClick={() => setTabActiva('integrantes')}
        >
          <Users size={16} />
          <span>Integrantes ({integrantes.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${tabActiva === 'vivienda' ? 'activa' : ''}`}
          onClick={() => setTabActiva('vivienda')}
        >
          <Home size={16} />
          <span>Vivienda & Mapa</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${tabActiva === 'patrones' ? 'activa' : ''}`}
          onClick={() => setTabActiva('patrones')}
        >
          <Activity size={16} />
          <span>11 Patrones ({conteoPatrones.valorados}/11)</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${tabActiva === 'instrumentos' ? 'activa' : ''}`}
          onClick={() => setTabActiva('instrumentos')}
        >
          <HeartHandshake size={16} />
          <span>Instrumentos</span>
        </button>
      </nav>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA 1: RESUMEN Y CAMPANITA DE PENDIENTES */}
      {tabActiva === 'resumen' && (
        <section className="ficha-tab-contenido stack" aria-labelledby="seccion-pendientes-titulo">
          <div className="tarjeta">
            <header className="seccion-cabecera">
              <div>
                <h2 id="seccion-pendientes-titulo" className="h3">
                  Campanita de pendientes
                </h2>
                <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                  Pasos de valoración requeridos según DISENO_BASE.md §6.2
                </p>
              </div>
            </header>

            <div className="lista-pendientes-familia">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`pendiente-item estado-${item.estado}`}
                  onClick={() => {
                    if (item.accion) {
                      item.accion()
                    } else if (item.irATab) {
                      setTabActiva(item.irATab)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (item.accion) item.accion()
                      else if (item.irATab) setTabActiva(item.irATab)
                    }
                  }}
                >
                  <div className="pendiente-estado-icono">
                    {item.estado === 'completo' ? (
                      <CheckCircle2 size={20} color="var(--ok)" />
                    ) : item.estado === 'en_curso' ? (
                      <Clock size={20} color="var(--atencion)" />
                    ) : (
                      <AlertCircle size={20} color="var(--apagado)" />
                    )}
                  </div>

                  <div className="pendiente-info">
                    <div className="pendiente-titulo-fila">
                      <strong>{item.titulo}</strong>
                      <span className={`chip-estado-mini estado-${item.estado}`}>
                        {item.estado.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="pendiente-desc text-apagado">{item.descripcion}</span>
                  </div>

                  <ChevronRight size={18} className="flecha-ir text-apagado" />
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Datos Generales del Hogar */}
          <div className="tarjeta stack">
            <h3 className="h4">Síntesis territorial y de vivienda</h3>
            <div className="resumen-grid">
              <div className="resumen-dato">
                <span className="dato-eti">Domicilio</span>
                <strong>{familia.domicilio}</strong>
              </div>
              <div className="resumen-dato">
                <span className="dato-eti">Barrio</span>
                <strong>{barrio?.etiqueta ?? 'Sin asignar'}</strong>
              </div>
              <div className="resumen-dato">
                <span className="dato-eti">Tipo de vivienda</span>
                <strong>{familia.vivienda?.tipo ?? 'Pendiente de carga'}</strong>
              </div>
              <div className="resumen-dato">
                <span className="dato-eti">Convivientes declarados</span>
                <strong>{familia.vivienda?.cantConvivientes ?? integrantes.length ?? 's/d'}</strong>
              </div>
              <div className="resumen-dato">
                <span className="dato-eti">Habitaciones</span>
                <strong>{familia.vivienda?.cantHabitaciones ?? 's/d'}</strong>
              </div>
              <div className="resumen-dato">
                <span className="dato-eti">Hacinamiento</span>
                <strong>
                  {familia.vivienda?.cantHabitaciones && familia.vivienda?.cantConvivientes
                    ? familia.vivienda.cantConvivientes / familia.vivienda.cantHabitaciones > 3
                      ? 'Crítico (> 3 pers/hab)'
                      : familia.vivienda.cantConvivientes / familia.vivienda.cantHabitaciones >= 2
                      ? 'Medio (2 a 3 pers/hab)'
                      : 'Sin hacinamiento'
                    : 'Sin calcular'}
                </strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PESTAÑA 2: INTEGRANTES Y GENOGRAMA */}
      {tabActiva === 'integrantes' && (
        <section className="ficha-tab-contenido" aria-label="Gestión de Integrantes y Genograma">
          <IntegrantesManager
            famId={famId!}
            orgId={usuario?.orgId ?? familia.orgId}
            onCambioIntegrantes={(nuevos) => setIntegrantes(nuevos)}
          />
        </section>
      )}

      {/* PESTAÑA 3: VIVIENDA, CARTOGRAFÍA Y FOTO DEL GENOGRAMA */}
      {tabActiva === 'vivienda' && (
        <section className="ficha-tab-contenido" aria-label="Vivienda y Cartografía">
          <ViviendaCartografiaSection
            famId={famId!}
            viviendaActual={familia.vivienda}
            cartografiaActual={familia.cartografia}
            convivientesRegistrados={integrantes.length || 1}
            onGuardado={handleViviendaGuardada}
          />
        </section>
      )}

      {/* PESTAÑA 4: 11 PATRONES DE GORDON */}
      {tabActiva === 'patrones' && (
        <section className="ficha-tab-contenido stack" aria-label="11 Patrones Funcionales de Gordon">
          <div className="tarjeta stack">
            <header className="seccion-cabecera">
              <div>
                <h2 className="h3">11 Patrones Funcionales de Gordon</h2>
                <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                  Valoración de la salud familiar según el modelo de Marjory Gordon
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primario btn-sm"
                onClick={() => navigate(`/familias/${famId}/patrones`)}
              >
                <Activity size={15} />
                <span>Valorar patrones</span>
              </button>
            </header>

            <div className="patrones-cuadricula">
              {NOMBRES_PATRONES.map((nombre, idx) => {
                const est = estadosPatrones[idx]
                return (
                  <div key={idx} className={`patron-tarjetita estado-${est}`}>
                    <div className="patron-tarjetita-cabecera">
                      <span className="patron-num">P{idx + 1}</span>
                      <span className={`chip-estado-mini estado-${est}`}>
                        {est.replace('_', ' ')}
                      </span>
                    </div>
                    <strong className="patron-nombre">{nombre}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* PESTAÑA 5: INSTRUMENTOS FAMILIARES */}
      {tabActiva === 'instrumentos' && (
        <section className="ficha-tab-contenido stack" aria-label="Instrumentos de Valoración">
          <div className="tarjeta stack">
            <header className="seccion-cabecera">
              <div>
                <h2 className="h3">Instrumentos de Valoración Familiar</h2>
                <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                  Escalas estandarizadas validadas según Jacquier et al. (2014)
                </p>
              </div>
            </header>

            <div className="instrumentos-lista">
              {/* APGAR */}
              <div className="instrumento-card">
                <div className="instrumento-cabecera">
                  <div>
                    <h3 className="h4">APGAR Familiar</h3>
                    <p className="text-apagado" style={{ fontSize: '0.8rem' }}>
                      Evalúa la función familiar percibida (5 dimensiones, 0 a 10 pts)
                    </p>
                  </div>
                  <span className={`chip-estado-mini ${valApgar ? 'estado-completo' : 'estado-pendiente'}`}>
                    {valApgar ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <div className="instrumento-cuerpo">
                  {valApgar ? (
                    <div className="resultado-pill">
                      <span>Puntaje: <strong>{valApgar.puntaje} / 10</strong></span>
                      <span>·</span>
                      <span>Interpretación: <strong>{valApgar.interpretacion ?? 's/d'}</strong></span>
                    </div>
                  ) : (
                    <span className="text-apagado" style={{ fontSize: '0.82rem' }}>
                      Aún no se ha realizado la valoración de APGAR para esta familia.
                    </span>
                  )}
                </div>
                <div className="instrumento-pie">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/familias/${famId}/instrumentos?tipo=apgar`)}
                  >
                    {valApgar ? 'Ver o editar APGAR' : 'Realizar APGAR'}
                  </button>
                </div>
              </div>

              {/* Holmes y Rahe */}
              <div className="instrumento-card">
                <div className="instrumento-cabecera">
                  <div>
                    <h3 className="h4">Escala de Holmes y Rahe</h3>
                    <p className="text-apagado" style={{ fontSize: '0.8rem' }}>
                      Reajuste social por acontecimientos vitales estresantes (43 ítems)
                    </p>
                  </div>
                  <span className={`chip-estado-mini ${valHolmes ? 'estado-completo' : 'estado-pendiente'}`}>
                    {valHolmes ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <div className="instrumento-cuerpo">
                  {valHolmes ? (
                    <div className="resultado-pill">
                      <span>UCV acumuladas: <strong>{valHolmes.puntaje}</strong></span>
                      <span>·</span>
                      <span>Riesgo: <strong>{valHolmes.interpretacion ?? 's/d'}</strong></span>
                    </div>
                  ) : (
                    <span className="text-apagado" style={{ fontSize: '0.82rem' }}>
                      Sin eventos vitales registrados en los últimos 12 meses.
                    </span>
                  )}
                </div>
                <div className="instrumento-pie">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/familias/${famId}/instrumentos?tipo=holmes`)}
                  >
                    {valHolmes ? 'Ver o editar Holmes' : 'Realizar Holmes y Rahe'}
                  </button>
                </div>
              </div>

              {/* MOS de Apoyo Social */}
              <div className="instrumento-card">
                <div className="instrumento-cabecera">
                  <div>
                    <h3 className="h4">Cuestionario MOS</h3>
                    <p className="text-apagado" style={{ fontSize: '0.8rem' }}>
                      Apoyo social percibido (emocional, instrumental, afectivo e interacción)
                    </p>
                  </div>
                  <span className={`chip-estado-mini ${valMos ? 'estado-completo' : 'estado-pendiente'}`}>
                    {valMos ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <div className="instrumento-cuerpo">
                  {valMos ? (
                    <div className="resultado-pill">
                      <span>Índice global: <strong>{valMos.puntaje} / 100</strong></span>
                      <span>·</span>
                      <span>Nivel: <strong>{valMos.interpretacion ?? 's/d'}</strong></span>
                    </div>
                  ) : (
                    <span className="text-apagado" style={{ fontSize: '0.82rem' }}>
                      Sin cuestionario MOS registrado.
                    </span>
                  )}
                </div>
                <div className="instrumento-pie">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/familias/${famId}/instrumentos?tipo=mos`)}
                  >
                    {valMos ? 'Ver o editar MOS' : 'Realizar MOS'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal Consentimiento Informado */}
      <ConsentimientoModal
        abierto={modalConsentimientoAbierto}
        famId={famId!}
        consentimientoActual={familia.consentimiento}
        onCerrar={() => setModalConsentimientoAbierto(false)}
        onConsentimientoGuardado={handleConsentimientoGuardado}
      />

      {/* Modal interactivo de Exportación de PDF Offline (Paso 10) */}
      {modalPdfAbierto && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-pdf-titulo">
          <div className="modal-contenido tarjeta stack" style={{ maxWidth: '480px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <FileText size={22} color="var(--azul)" />
              <div>
                <h3 id="modal-pdf-titulo" className="h4" style={{ margin: 0 }}>
                  Exportar Ficha Familiar (PDF)
                </h3>
                <span className="text-apagado" style={{ fontSize: '0.8rem' }}>
                  Documento estructurado A4 para el servicio y la cátedra
                </span>
              </div>
            </header>

            {errorPdf && (
              <div className="alerta-error" role="alert">
                <AlertCircle size={16} />
                <span>{errorPdf}</span>
              </div>
            )}

            <div className="resumen-pdf-incluido stack" style={{ background: 'var(--papel)', padding: 'var(--sp-3)', borderRadius: 'var(--r-campo)', fontSize: '0.82rem' }}>
              <strong>Contenido incluido en el informe:</strong>
              <ul style={{ paddingLeft: 'var(--sp-4)', margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Encabezado: CAPS, barrio ({barrio?.etiqueta ?? 's/d'}), código {familia.codigoFamiliar}</li>
                <li>Identificación y consentimiento informado (Ley 25.326)</li>
                <li>{integrantes.length} integrante(s) registrado(s) con condiciones de salud</li>
                <li>Vivienda, cálculo de hacinamiento y foto/árbol de genograma</li>
                <li>Valoración de los 11 patrones con anillo vectorial de Gordon</li>
                <li>Resultados de APGAR, Holmes y Rahe, y MOS de apoyo social</li>
                <li>Líneas para firma del estudiante y del docente supervisor</li>
              </ul>
            </div>

            <p className="text-apagado" style={{ fontSize: '0.78rem', margin: 0 }}>
              El PDF se genera 100% en tu dispositivo y se descarga de inmediato, incluso sin conexión a internet.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setModalPdfAbierto(false)}
                disabled={generandoPdf}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primario btn-sm"
                onClick={handleExportarPdf}
                disabled={generandoPdf}
              >
                <Download size={14} />
                <span>{generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos específicos de FichaFamiliarPage */}
      <style>{`
        .ficha-container {
          padding: var(--sp-4);
          max-width: 900px;
          margin: 0 auto;
        }

        .ficha-cargando, .ficha-error {
          min-height: 50vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-3);
          text-align: center;
          padding: var(--sp-6);
        }

        .ficha-barra-superior {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-volver-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--azul);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          padding: var(--sp-1) 0;
        }

        .alerta-consentimiento-bloqueante {
          background: color-mix(in srgb, var(--critico) 8%, var(--tarjeta));
          border: 1.5px solid var(--critico);
          border-radius: var(--r-tarjeta);
          padding: var(--sp-3) var(--sp-4);
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          flex-wrap: wrap;
        }

        .alerta-icono {
          color: var(--critico);
          display: flex;
          align-items: center;
        }

        .alerta-info {
          flex: 1;
          min-width: 200px;
          font-size: 0.85rem;
        }

        .alerta-info strong {
          display: block;
          color: var(--critico);
          margin-bottom: 2px;
        }

        .alerta-info p {
          margin: 0;
          color: var(--tinta);
          font-size: 0.8rem;
        }

        .ficha-cabecera {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          padding: var(--sp-4);
        }

        .cabecera-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-4);
          flex-wrap: wrap;
        }

        .titulos-bloque {
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
          flex: 1;
          min-width: 250px;
        }

        .etiquetas-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .badge-codigo {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.8rem;
          background: color-mix(in srgb, var(--azul) 12%, transparent);
          color: var(--azul);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .badge-orden {
          font-size: 0.72rem;
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .badge-estado {
          font-size: 0.7rem;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .badge-estado.estado-activa {
          background: color-mix(in srgb, var(--ok) 12%, transparent);
          color: var(--ok);
        }

        .familia-titulo {
          font-family: var(--font-titulo);
          font-size: 1.6rem;
          color: var(--tinta);
          margin: var(--sp-1) 0;
        }

        .datos-contacto-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
          font-size: 0.82rem;
        }

        .dato-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .dato-separador {
          color: var(--linea);
        }

        /* Gordon Ring */
        .gordon-ring-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: var(--sp-2);
          background: var(--papel);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
        }

        .gordon-ring-badge {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .ring-alterados-num {
          font-weight: 700;
          font-size: 1rem;
          color: var(--critico);
        }

        .ring-alterados-txt {
          font-size: 0.7rem;
          color: var(--apagado);
          font-weight: 600;
          text-transform: uppercase;
        }

        .gordon-ring-nodos {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          max-width: 180px;
          justify-content: center;
        }

        .ring-nodo {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--apagado);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform var(--dur-rapido) var(--ease);
        }

        .ring-nodo:hover {
          transform: scale(1.15);
        }

        .ring-nodo.estado-conservado {
          background: var(--ok);
          color: #ffffff;
          border-color: var(--ok);
        }

        .ring-nodo.estado-alterado {
          background: var(--atencion);
          color: #ffffff;
          border-color: var(--atencion);
        }

        /* Progreso */
        .progreso-ficha-barra {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .progreso-texto-fila {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .barra-pista {
          width: 100%;
          height: 6px;
          background: var(--linea);
          border-radius: 999px;
          overflow: hidden;
        }

        .barra-relleno {
          height: 100%;
          background: var(--lago);
          border-radius: 999px;
          transition: width var(--dur-normal) var(--ease);
        }

        /* Tabs de la Ficha */
        .ficha-tabs-nav {
          display: flex;
          gap: var(--sp-2);
          overflow-x: auto;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--linea);
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: var(--sp-2) var(--sp-3);
          background: none;
          border: none;
          border-radius: var(--r-campo);
          color: var(--apagado);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--dur-rapido) var(--ease);
        }

        .tab-btn:hover {
          color: var(--azul);
          background: color-mix(in srgb, var(--azul) 6%, transparent);
        }

        .tab-btn.activa {
          color: var(--azul);
          background: color-mix(in srgb, var(--azul) 12%, transparent);
          font-weight: 700;
        }

        /* Campanita de Pendientes */
        .seccion-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
          margin-bottom: var(--sp-3);
        }

        .lista-pendientes-familia {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .pendiente-item {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          cursor: pointer;
          transition: all var(--dur-rapido) var(--ease);
        }

        .pendiente-item:hover {
          border-color: var(--azul);
          background: var(--papel);
        }

        .pendiente-info {
          flex: 1;
        }

        .pendiente-titulo-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        .pendiente-desc {
          font-size: 0.78rem;
          display: block;
          margin-top: 2px;
        }

        .chip-estado-mini {
          font-size: 0.68rem;
          text-transform: uppercase;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .chip-estado-mini.estado-completo {
          background: color-mix(in srgb, var(--ok) 15%, transparent);
          color: var(--ok);
        }

        .chip-estado-mini.estado-en_curso {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
        }

        .chip-estado-mini.estado-pendiente {
          background: color-mix(in srgb, var(--apagado) 15%, transparent);
          color: var(--apagado);
        }

        /* Resumen Grid */
        .resumen-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--sp-3);
        }

        .resumen-dato {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--papel);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
        }

        .dato-eti {
          font-size: 0.72rem;
          color: var(--apagado);
          text-transform: uppercase;
          font-weight: 600;
        }

        /* Patrones Grid */
        .patrones-cuadricula {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--sp-3);
        }

        .patron-tarjetita {
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .patron-tarjetita.estado-conservado {
          border-left: 4px solid var(--ok);
        }

        .patron-tarjetita.estado-alterado {
          border-left: 4px solid var(--atencion);
        }

        .patron-tarjetita-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .patron-num {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--azul);
        }

        .patron-nombre {
          font-size: 0.85rem;
          color: var(--tinta);
        }

        /* Instrumentos */
        .instrumentos-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .instrumento-card {
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .instrumento-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-2);
        }

        .resultado-pill {
          display: inline-flex;
          align-items: center;
          gap: var(--sp-2);
          background: var(--papel);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          font-size: 0.85rem;
        }

        .instrumento-pie {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--sp-1);
        }
      `}</style>
    </div>
  )
}
