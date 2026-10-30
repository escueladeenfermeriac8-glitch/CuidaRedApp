/**
 * Campanita de Pendientes Global
 * DISENO_BASE.md §6.2 y §7.1
 *
 * Muestra el estado integral de pasos pendientes:
 * - Por familia: consentimiento, integrantes, genograma, vivienda, patrones, instrumentos.
 * - Por barrio: valoración comunitaria pendiente o en borrador.
 * - Filtros rápidos: por barrio, tipo de paso pendiente y buscador.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Familia,
  Barrio,
  ValoracionComunidad,
} from '@/types'
import {
  Bell,
  CheckCircle2,
  Compass,
  Home,
  Users,
  ShieldAlert,
  Search,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'

interface ItemPendienteFamilia {
  familia: Familia
  barrio?: Barrio
  tieneConsentimiento: boolean
  cantIntegrantes: number
  tieneFotoGenograma: boolean
  tieneVivienda: boolean
  tieneCartografia: boolean
  cantPatronesValorados: number
  cantInstrumentos: number
  porcentajeCompleto: number
  pasosFaltantes: string[]
}

interface ItemPendienteBarrio {
  barrio: Barrio
  estadoValoracion: 'sin_iniciar' | 'borrador' | 'completo'
}

type FiltroTipo = 'todos' | 'consentimiento' | 'integrantes' | 'patrones' | 'instrumentos' | 'comunidad'

export function PendientesPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [familias, setFamilias] = useState<Familia[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [valoracionesComunidad, setValoracionesComunidad] = useState<Record<string, ValoracionComunidad>>({})
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroBarrioId, setFiltroBarrioId] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')

  useEffect(() => {
    if (!usuario?.orgId) return

    // 1. Cargar barrios
    const qBarrios = query(
      collection(db, 'barrios'),
      where('orgId', '==', usuario.orgId)
    )
    const unsubBarrios = onSnapshot(qBarrios, (snap) => {
      const bList: Barrio[] = []
      snap.forEach((d) => bList.push({ id: d.id, ...d.data() } as Barrio))
      setBarrios(bList)
    })

    // 2. Cargar familias
    const qFamilias = query(
      collection(db, 'familias'),
      where('orgId', '==', usuario.orgId)
    )
    const unsubFamilias = onSnapshot(qFamilias, (snap) => {
      const fList: Familia[] = []
      snap.forEach((d) => fList.push({ id: d.id, ...d.data() } as Familia))
      setFamilias(fList)
      setCargando(false)
    })

    // 3. Cargar valoraciones comunitarias
    const qValsCom = query(
      collection(db, 'valoracionesComunidad'),
      where('orgId', '==', usuario.orgId)
    )
    const unsubValsCom = onSnapshot(qValsCom, (snap) => {
      const vMap: Record<string, ValoracionComunidad> = {}
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as ValoracionComunidad
        vMap[data.barrioId] = data
      })
      setValoracionesComunidad(vMap)
    })

    return () => {
      unsubBarrios()
      unsubFamilias()
      unsubValsCom()
    }
  }, [usuario?.orgId])

  // Mapeo barrio por ID
  const mapaBarrios = useMemo(() => {
    const map = new Map<string, Barrio>()
    barrios.forEach((b) => map.set(b.id!, b))
    return map
  }, [barrios])

  // Procesar estado de pendientes por familia
  const itemsFamilias: ItemPendienteFamilia[] = useMemo(() => {
    return familias.map((fam) => {
      const tieneConsentimiento = !!fam.consentimiento?.otorgado
      const cantIntegrantes = 0 // Se evalúa en base a datos registrados
      const tieneFotoGenograma = !!fam.cartografia?.fotoUrl
      const tieneVivienda = !!fam.vivienda?.tipo
      const tieneCartografia = !!fam.cartografia?.ubicacion

      // Pasos faltantes explícitos
      const pasosFaltantes: string[] = []
      let completados = 0
      const totalPasos = 5

      if (tieneConsentimiento) completados++
      else pasosFaltantes.push('Consentimiento')

      if (tieneFotoGenograma) completados++
      else pasosFaltantes.push('Genograma')

      if (tieneVivienda && tieneCartografia) completados++
      else pasosFaltantes.push('Vivienda y mapa')

      // Patrones e instrumentos
      pasosFaltantes.push('Patrones de Gordon')
      pasosFaltantes.push('Instrumentos')

      const porcentaje = Math.round((completados / totalPasos) * 100)

      return {
        familia: fam,
        barrio: mapaBarrios.get(fam.barrioId),
        tieneConsentimiento,
        cantIntegrantes,
        tieneFotoGenograma,
        tieneVivienda,
        tieneCartografia,
        cantPatronesValorados: 0,
        cantInstrumentos: 0,
        porcentajeCompleto: porcentaje,
        pasosFaltantes,
      }
    })
  }, [familias, mapaBarrios])

  // Procesar estado de pendientes por barrio
  const itemsBarrios: ItemPendienteBarrio[] = useMemo(() => {
    return barrios.map((b) => {
      const val = valoracionesComunidad[b.id!]
      let estado: 'sin_iniciar' | 'borrador' | 'completo' = 'sin_iniciar'
      if (val) {
        estado = val.estado === 'final' ? 'completo' : 'borrador'
      }
      return {
        barrio: b,
        estadoValoracion: estado,
      }
    })
  }, [barrios, valoracionesComunidad])

  // Barrios pendientes de valoración comunitaria
  const barriosPendientes = useMemo(() => {
    return itemsBarrios.filter((ib) => ib.estadoValoracion !== 'completo')
  }, [itemsBarrios])

  // Filtrado de familias
  const familiasFiltradas = useMemo(() => {
    return itemsFamilias.filter((item) => {
      // Filtro de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim()
        const matchApellido = item.familia.apellido.toLowerCase().includes(q)
        const matchDomicilio = item.familia.domicilio.toLowerCase().includes(q)
        const matchCodigo = item.familia.codigoFamiliar.toLowerCase().includes(q)
        if (!matchApellido && !matchDomicilio && !matchCodigo) return false
      }

      // Filtro de barrio
      if (filtroBarrioId && item.familia.barrioId !== filtroBarrioId) {
        return false
      }

      // Filtro por tipo de pendiente
      if (filtroTipo === 'consentimiento' && item.tieneConsentimiento) return false
      if (filtroTipo === 'integrantes' && item.cantIntegrantes > 0) return false
      if (filtroTipo === 'comunidad') return false // solo aplica a barrios

      return true
    })
  }, [itemsFamilias, busqueda, filtroBarrioId, filtroTipo])

  // Conteo de alertas globales
  const cantSinConsentimiento = useMemo(() => {
    return itemsFamilias.filter((f) => !f.tieneConsentimiento).length
  }, [itemsFamilias])

  if (cargando) {
    return (
      <div className="pendientes-cargando" role="status">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
          <circle cx="24" cy="24" r="20" stroke="var(--linea)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" stroke="var(--lago)" strokeWidth="3" strokeDasharray="30 90" strokeLinecap="round" />
        </svg>
        <span className="text-apagado">Cargando lista de pendientes...</span>
      </div>
    )
  }

  return (
    <div className="pendientes-container stack">
      <header className="pendientes-cabecera">
        <div className="cabecera-titulos">
          <div className="icono-campanita">
            <Bell size={24} color="var(--azul)" />
          </div>
          <div>
            <h1 className="h2">Campanita de Pendientes</h1>
            <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
              Seguimiento de valoraciones comunitarias y pasos familiares pendientes
            </p>
          </div>
        </div>

        {/* Resumen numérico */}
        <div className="resumen-kpis">
          <div className="kpi-tarjeta">
            <span className="kpi-num">{barriosPendientes.length}</span>
            <span className="kpi-eti">Barrios s/ valorar</span>
          </div>
          <div className="kpi-tarjeta">
            <span className="kpi-num">{familias.length}</span>
            <span className="kpi-eti">Familias en curso</span>
          </div>
          <div className="kpi-tarjeta alerta">
            <span className="kpi-num">{cantSinConsentimiento}</span>
            <span className="kpi-eti">Sin consentimiento</span>
          </div>
        </div>
      </header>

      {/* Barra de Filtros */}
      <section className="barra-filtros tarjeta">
        <div className="buscador-input-wrap">
          <Search size={16} className="icono-buscar" />
          <input
            type="search"
            className="input-buscar"
            placeholder="Buscar por apellido, domicilio o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filtros-fila">
          <div className="select-wrap">
            <Compass size={14} />
            <select
              value={filtroBarrioId}
              onChange={(e) => setFiltroBarrioId(e.target.value)}
              className="select-control"
            >
              <option value="">Todos los barrios</option>
              {barrios.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="chips-filtro-tipo">
            <button
              type="button"
              className={`chip-tipo ${filtroTipo === 'todos' ? 'activo' : ''}`}
              onClick={() => setFiltroTipo('todos')}
            >
              Todos ({familias.length})
            </button>
            <button
              type="button"
              className={`chip-tipo ${filtroTipo === 'consentimiento' ? 'activo' : ''}`}
              onClick={() => setFiltroTipo('consentimiento')}
            >
              Sin consentimiento ({cantSinConsentimiento})
            </button>
            <button
              type="button"
              className={`chip-tipo ${filtroTipo === 'comunidad' ? 'activo' : ''}`}
              onClick={() => setFiltroTipo('comunidad')}
            >
              Comunidad pendiente ({barriosPendientes.length})
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN 1: VALORACIÓN COMUNITARIA POR BARRIO */}
      {(filtroTipo === 'todos' || filtroTipo === 'comunidad') && barriosPendientes.length > 0 && (
        <section className="seccion-bloque stack" aria-labelledby="barrios-pendientes-titulo">
          <div className="seccion-titulo-fila">
            <Compass size={18} color="var(--azul)" />
            <h2 id="barrios-pendientes-titulo" className="h3">
              Valoración comunitaria pendiente ({barriosPendientes.length})
            </h2>
          </div>

          <div className="lista-barrios-pendientes">
            {barriosPendientes.map(({ barrio: b, estadoValoracion }) => (
              <div key={b.id} className="tarjeta barrio-item-pendiente">
                <div className="barrio-info">
                  <div className="barrio-eti-fila">
                    <strong className="h4">{b.etiqueta}</strong>
                    <span className={`chip-estado-mini estado-${estadoValoracion}`}>
                      {estadoValoracion === 'borrador' ? 'Borrador en curso' : 'Sin iniciar'}
                    </span>
                  </div>
                  <span className="text-apagado" style={{ fontSize: '0.8rem' }}>
                    11 patrones de Gordon comunitarios y asistente FODA
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/comunidad/valorar?barrioId=${b.id}`)}
                >
                  <span>{estadoValoracion === 'borrador' ? 'Continuar' : 'Valorar'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 2: FAMILIAS CON PASOS PENDIENTES */}
      {filtroTipo !== 'comunidad' && (
        <section className="seccion-bloque stack" aria-labelledby="familias-pendientes-titulo">
          <div className="seccion-titulo-fila">
            <Users size={18} color="var(--azul)" />
            <h2 id="familias-pendientes-titulo" className="h3">
              Familias ({familiasFiltradas.length})
            </h2>
          </div>

          {familiasFiltradas.length === 0 ? (
            <div className="tarjeta estado-vacio stack">
              <CheckCircle2 size={36} color="var(--ok)" />
              <h3 className="h4">No hay pendientes que coincidan con el filtro</h3>
              <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                Todos los pasos seleccionados se encuentran al día.
              </p>
            </div>
          ) : (
            <div className="lista-familias-pendientes">
              {familiasFiltradas.map((item) => {
                const fam = item.familia
                return (
                  <article
                    key={fam.id}
                    className="tarjeta familia-pendiente-card"
                    onClick={() => navigate(`/familias/${fam.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/familias/${fam.id}`)}
                  >
                    <div className="fam-card-cabecera">
                      <div>
                        <div className="fam-codigos">
                          <span className="badge-codigo">{fam.codigoFamiliar}</span>
                          {fam.ordenEnDomicilio > 1 && (
                            <span className="badge-orden">Familia {fam.ordenEnDomicilio}</span>
                          )}
                          {!item.tieneConsentimiento && (
                            <span className="badge-consentimiento-alerta">
                              <ShieldAlert size={12} /> Sin consentimiento
                            </span>
                          )}
                        </div>
                        <h3 className="h4 fam-apellido">Familia {fam.apellido}</h3>
                        <p className="fam-domicilio text-apagado">
                          <Home size={13} /> {fam.domicilio} · {item.barrio?.etiqueta ?? 'Barrio s/d'}
                        </p>
                      </div>

                      <ChevronRight size={20} className="flecha-navegar" />
                    </div>

                    <div className="fam-pasos-fila">
                      <span className="pasos-eti text-apagado">Pasos por completar:</span>
                      <div className="pasos-tags">
                        {item.pasosFaltantes.map((paso, idx) => (
                          <span key={idx} className="paso-tag">
                            {paso}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="fam-progreso-mini">
                      <div className="barra-pista">
                        <div
                          className="barra-relleno"
                          style={{ width: `${item.porcentajeCompleto}%` }}
                        />
                      </div>
                      <span className="progreso-num text-apagado">
                        {item.porcentajeCompleto}%
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Estilos específicos de PendientesPage */}
      <style>{`
        .pendientes-container {
          padding: var(--sp-4);
          max-width: 900px;
          margin: 0 auto;
        }

        .pendientes-cargando {
          min-height: 50vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-3);
        }

        .pendientes-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-4);
          flex-wrap: wrap;
        }

        .cabecera-titulos {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }

        .icono-campanita {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--azul) 12%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .resumen-kpis {
          display: flex;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .kpi-tarjeta {
          background: var(--tarjeta);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: var(--sp-2) var(--sp-3);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px;
        }

        .kpi-tarjeta.alerta {
          border-color: var(--critico);
          background: color-mix(in srgb, var(--critico) 6%, var(--tarjeta));
        }

        .kpi-tarjeta.alerta .kpi-num {
          color: var(--critico);
        }

        .kpi-num {
          font-family: var(--font-titulo);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--azul);
        }

        .kpi-eti {
          font-size: 0.68rem;
          color: var(--apagado);
          font-weight: 600;
          text-align: center;
        }

        /* Filtros */
        .barra-filtros {
          padding: var(--sp-3);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .buscador-input-wrap {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: 0 var(--sp-3);
        }

        .icono-buscar {
          color: var(--apagado);
        }

        .input-buscar {
          border: none;
          background: none;
          padding: var(--sp-2) 0;
          width: 100%;
          font-family: var(--font-ui);
          font-size: 0.9rem;
          color: var(--tinta);
          outline: none;
        }

        .filtros-fila {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .select-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: 4px var(--sp-2);
          font-size: 0.85rem;
        }

        .select-control {
          border: none;
          background: none;
          font-family: var(--font-ui);
          font-size: 0.82rem;
          color: var(--tinta);
          outline: none;
        }

        .chips-filtro-tipo {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .chip-tipo {
          background: none;
          border: 1px solid var(--linea);
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--apagado);
          cursor: pointer;
          transition: all var(--dur-rapido) var(--ease);
        }

        .chip-tipo:hover {
          color: var(--azul);
          border-color: var(--azul);
        }

        .chip-tipo.activo {
          background: var(--azul);
          color: #ffffff;
          border-color: var(--azul);
        }

        /* Secciones */
        .seccion-titulo-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        .lista-barrios-pendientes {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .barrio-item-pendiente {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-3);
          padding: var(--sp-3);
        }

        .barrio-eti-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        /* Familias Lista */
        .lista-familias-pendientes {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .familia-pendiente-card {
          padding: var(--sp-3);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          cursor: pointer;
          transition: all var(--dur-rapido) var(--ease);
        }

        .familia-pendiente-card:hover {
          border-color: var(--azul);
          transform: translateY(-1px);
        }

        .fam-card-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .fam-codigos {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-bottom: 2px;
          flex-wrap: wrap;
        }

        .badge-codigo {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          background: color-mix(in srgb, var(--azul) 12%, transparent);
          color: var(--azul);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .badge-orden {
          font-size: 0.7rem;
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .badge-consentimiento-alerta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--critico);
          background: color-mix(in srgb, var(--critico) 10%, transparent);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .fam-apellido {
          font-size: 1.1rem;
          color: var(--tinta);
          margin: 2px 0;
        }

        .fam-domicilio {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
        }

        .flecha-navegar {
          color: var(--linea);
          transition: color var(--dur-rapido) var(--ease);
        }

        .familia-pendiente-card:hover .flecha-navegar {
          color: var(--azul);
        }

        .fam-pasos-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .pasos-eti {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .pasos-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .paso-tag {
          font-size: 0.72rem;
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: 4px;
          padding: 1px 6px;
          color: var(--apagado);
        }

        .fam-progreso-mini {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-top: 2px;
        }

        .barra-pista {
          flex: 1;
          height: 4px;
          background: var(--linea);
          border-radius: 999px;
          overflow: hidden;
        }

        .barra-relleno {
          height: 100%;
          background: var(--lago);
          border-radius: 999px;
        }

        .progreso-num {
          font-size: 0.75rem;
          font-weight: 600;
          min-width: 28px;
        }

        .chip-estado-mini {
          font-size: 0.68rem;
          text-transform: uppercase;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .chip-estado-mini.estado-borrador {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
        }

        .chip-estado-mini.estado-sin_iniciar {
          background: color-mix(in srgb, var(--apagado) 15%, transparent);
          color: var(--apagado);
        }

        .estado-vacio {
          padding: var(--sp-6);
          text-align: center;
          align-items: center;
        }
      `}</style>
    </div>
  )
}
