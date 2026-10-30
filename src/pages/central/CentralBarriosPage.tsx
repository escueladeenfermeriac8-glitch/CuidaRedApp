/**
 * CentralBarriosPage — Supervisión de Barrios, Comunidades y FODA
 * DISENO_BASE.md §6.5, §7.3:
 * - Selección de barrios asignados con brújula cardinal
 * - Resumen de los 11 patrones funcionales comunitarios
 * - Matriz FODA en cuadrante 2x2 asistido
 * - Familias asociadas al barrio
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass,
  AlertCircle,
  ShieldCheck,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { Barrio, Familia, ValoracionComunidad, Foda, ItemFoda } from '@/types'

export function CentralBarriosPage() {
  const { usuario } = useAuth()
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [barrioSeleccionado, setBarrioSeleccionado] = useState<Barrio | null>(null)
  const [valoracionCom, setValoracionCom] = useState<ValoracionComunidad | null>(null)
  const [familiasDelBarrio, setFamiliasDelBarrio] = useState<Familia[]>([])
  const [cargando, setCargando] = useState(true)

  // Cargar lista de barrios
  useEffect(() => {
    let activo = true

    async function cargarBarrios() {
      if (!usuario?.capsIds || usuario.capsIds.length === 0) {
        setCargando(false)
        return
      }

      try {
        const capsQuery = usuario.capsIds.slice(0, 10)
        const qBar = query(collection(db, 'barrios'), where('capsId', 'in', capsQuery))
        const snap = await getDocs(qBar)
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Barrio[]

        if (activo) {
          setBarrios(docs)
          if (docs.length > 0) {
            setBarrioSeleccionado(docs[0])
          }
          setCargando(false)
        }
      } catch (err) {
        console.warn('[CentralBarrios] Error cargando barrios:', err)
        if (activo) setCargando(false)
      }
    }

    cargarBarrios()
    return () => {
      activo = false
    }
  }, [usuario?.capsIds])

  // Cargar valoración comunitaria y familias cuando cambia el barrio
  useEffect(() => {
    let activo = true
    if (!barrioSeleccionado?.id) return

    async function cargarDetallesBarrio() {
      try {
        // Cargar familias del barrio
        const qFam = query(
          collection(db, 'familias'),
          where('barrioId', '==', barrioSeleccionado!.id),
          where('eliminado', '!=', true)
        )
        const snapFam = await getDocs(qFam)
        const fams = snapFam.docs.map((d) => ({ id: d.id, ...d.data() })) as Familia[]

        // Cargar valoración comunitaria más reciente (subcolección valoracionesComunidad)
        const qVal = query(
          collection(db, `barrios/${barrioSeleccionado!.id}/valoracionesComunidad`)
        )
        const snapVal = await getDocs(qVal)
        let valData: ValoracionComunidad | null = null
        if (!snapVal.empty) {
          valData = { id: snapVal.docs[0].id, ...snapVal.docs[0].data() } as ValoracionComunidad
        }

        if (activo) {
          setFamiliasDelBarrio(fams)
          setValoracionCom(valData)
        }
      } catch (err) {
        console.warn('[CentralBarrios] Error cargando detalles del barrio:', err)
      }
    }

    cargarDetallesBarrio()
    return () => {
      activo = false
    }
  }, [barrioSeleccionado])

  const foda: Foda = valoracionCom?.foda ?? {
    fortalezas: [],
    oportunidades: [],
    debilidades: [],
    amenazas: [],
  }

  const patrones = valoracionCom?.patrones ?? {}
  const alteradosCount = Object.values(patrones).filter((p) => p.alterado).length

  function obtenerTextoFoda(item: ItemFoda | string): string {
    return typeof item === 'string' ? item : item?.texto || ''
  }

  return (
    <div className="central-barrios-stack">
      <header className="barrios-header">
        <div>
          <h1 className="h2 barrios-titulo">Supervisión de Barrios y Comunidad</h1>
          <p className="text-apagado">
            Diagnóstico de necesidades comunitarias por patrones de Gordon y matriz estratégica FODA.
          </p>
        </div>
      </header>

      {/* Selector de barrio en píldoras */}
      <section className="tarjeta selector-barrios-barra" aria-label="Elegir barrio">
        <span className="selector-label">Barrio:</span>
        {cargando ? (
          <span className="text-apagado text-sm">Cargando barrios...</span>
        ) : (
          <div className="barrios-pildoras-lista">
            {barrios.map((b) => {
              const activo = barrioSeleccionado?.id === b.id
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`pildora-barrio ${activo ? 'pildora-activa' : ''}`}
                  onClick={() => setBarrioSeleccionado(b)}
                >
                  <Compass size={14} />
                  <span>{b.etiqueta || b.nombre}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {barrioSeleccionado ? (
        <div className="barrio-detalle-grid">
          {/* Columna Izquierda: Matriz FODA en cuadrante 2x2 */}
          <section className="tarjeta foda-seccion">
            <header className="foda-header">
              <div>
                <h2 className="h4">Matriz FODA Comunitaria</h2>
                <p className="text-apagado text-sm">
                  Cruces estratégicos y factores prioritarios del barrio
                </p>
              </div>
              <span className="badge-foda-status">
                {valoracionCom?.estado === 'final' ? 'Validado' : 'Borrador'}
              </span>
            </header>

            <div className="foda-cuadrante-grid">
              {/* Fortalezas (Origen interno, positivo) */}
              <div className="cuadrante-item cuadrante-fortalezas">
                <div className="cuadrante-cabecera">
                  <ShieldCheck size={16} className="icono-f" />
                  <strong>Fortalezas (F)</strong>
                </div>
                {foda.fortalezas.length === 0 ? (
                  <p className="cuadrante-vacio text-apagado">Sin fortalezas cargadas.</p>
                ) : (
                  <ul className="foda-lista">
                    {foda.fortalezas.map((item, idx) => (
                      <li key={idx}>{obtenerTextoFoda(item)}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Oportunidades (Origen externo, positivo) */}
              <div className="cuadrante-item cuadrante-oportunidades">
                <div className="cuadrante-cabecera">
                  <Sparkles size={16} className="icono-o" />
                  <strong>Oportunidades (O)</strong>
                </div>
                {foda.oportunidades.length === 0 ? (
                  <p className="cuadrante-vacio text-apagado">Sin oportunidades cargadas.</p>
                ) : (
                  <ul className="foda-lista">
                    {foda.oportunidades.map((item, idx) => (
                      <li key={idx}>{obtenerTextoFoda(item)}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Debilidades (Origen interno, negativo) */}
              <div className="cuadrante-item cuadrante-debilidades">
                <div className="cuadrante-cabecera">
                  <AlertCircle size={16} className="icono-d" />
                  <strong>Debilidades (D)</strong>
                </div>
                {foda.debilidades.length === 0 ? (
                  <p className="cuadrante-vacio text-apagado">Sin debilidades cargadas.</p>
                ) : (
                  <ul className="foda-lista">
                    {foda.debilidades.map((item, idx) => (
                      <li key={idx}>{obtenerTextoFoda(item)}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Amenazas (Origen externo, negativo) */}
              <div className="cuadrante-item cuadrante-amenazas">
                <div className="cuadrante-cabecera">
                  <Target size={16} className="icono-a" />
                  <strong>Amenazas (A)</strong>
                </div>
                {foda.amenazas.length === 0 ? (
                  <p className="cuadrante-vacio text-apagado">Sin amenazas cargadas.</p>
                ) : (
                  <ul className="foda-lista">
                    {foda.amenazas.map((item, idx) => (
                      <li key={idx}>{obtenerTextoFoda(item)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Columna Derecha: Resumen de Patrones y Familias */}
          <div className="barrio-sidebar-column stack">
            {/* Patrones Comunitarios */}
            <section className="tarjeta patrones-resumen-card">
              <h3 className="h4">Patrones Funcionales</h3>
              <p className="text-apagado text-sm">
                {alteradosCount > 0
                  ? `${alteradosCount} de 11 patrones comunitarios alterados`
                  : 'Todos los patrones relevados se encuentran conservados'}
              </p>

              <div className="patrones-chips-grid">
                {Array.from({ length: 11 }, (_, i) => i + 1).map((pNum) => {
                  const patKey = `p${pNum}`
                  const pat = patrones[patKey]
                  const esAlterado = pat?.alterado

                  return (
                    <div
                      key={pNum}
                      className={`patron-chip-mini ${esAlterado ? 'chip-alterado' : 'chip-conservado'}`}
                      title={pat?.observaciones || `Patrón ${pNum}`}
                    >
                      <span className="chip-pnum">P{pNum}</span>
                      <span className="chip-estado-text">
                        {esAlterado ? 'Alterado' : 'Conservado'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Familias del Barrio */}
            <section className="tarjeta familias-barrio-card">
              <div className="familias-barrio-header">
                <div>
                  <h3 className="h4">Familias en {barrioSeleccionado.nombre}</h3>
                  <p className="text-apagado text-sm">
                    {familiasDelBarrio.length}{' '}
                    {familiasDelBarrio.length === 1 ? 'familia' : 'familias'}
                  </p>
                </div>
                <Link to="/central/familias" className="link-ver-tabla">
                  Ver tabla completa
                </Link>
              </div>

              <div className="familias-barrio-lista">
                {familiasDelBarrio.slice(0, 5).map((fam) => (
                  <Link
                    key={fam.id}
                    to={`/central/familias/${fam.id}/diagnosticos`}
                    className="familia-barrio-item"
                  >
                    <div>
                      <strong className="fam-apellido">Familia {fam.apellido}</strong>
                      <span className="fam-domicilio text-apagado">{fam.domicilio}</span>
                    </div>
                    <ArrowRight size={14} className="text-apagado" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="tarjeta text-apagado">No hay barrios disponibles.</div>
      )}

      <style>{`
        .central-barrios-stack {
          display: flex;
          flex-direction: column;
          gap: var(--sp-6);
        }

        .barrios-titulo {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-1);
        }

        .selector-barrios-barra {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          padding: var(--sp-3) var(--sp-4);
          overflow-x: auto;
        }

        .selector-label {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--apagado, #5B6B7C);
        }

        .barrios-pildoras-lista {
          display: flex;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .pildora-barrio {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--linea, #D9E0E8);
          background: var(--papel, #F5F7FA);
          color: var(--azul, #17375E);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pildora-barrio:hover {
          border-color: var(--azul-medio, #3E6A9A);
        }

        .pildora-activa {
          background: var(--azul, #17375E);
          color: white;
          border-color: var(--azul, #17375E);
        }

        .barrio-detalle-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: var(--sp-6);
        }

        @media (max-width: 900px) {
          .barrio-detalle-grid {
            grid-template-columns: 1fr;
          }
        }

        .foda-seccion {
          padding: var(--sp-5);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .foda-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--linea);
          padding-bottom: var(--sp-3);
        }

        .badge-foda-status {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--lago, #1AA6A0) 15%, transparent);
          color: var(--lago, #1AA6A0);
        }

        .foda-cuadrante-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-3);
        }

        @media (max-width: 600px) {
          .foda-cuadrante-grid {
            grid-template-columns: 1fr;
          }
        }

        .cuadrante-item {
          padding: var(--sp-3);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea);
          background: var(--fondo);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          min-height: 140px;
        }

        .cuadrante-cabecera {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          border-bottom: 1px solid color-mix(in srgb, var(--linea) 60%, transparent);
          padding-bottom: 4px;
        }

        .icono-f { color: var(--ok, #2F9E6B); }
        .icono-o { color: var(--lago, #1AA6A0); }
        .icono-d { color: var(--atencion, #C98A00); }
        .icono-a { color: var(--critico, #C8392F); }

        .cuadrante-fortalezas { border-top: 3px solid var(--ok); }
        .cuadrante-oportunidades { border-top: 3px solid var(--lago); }
        .cuadrante-debilidades { border-top: 3px solid var(--atencion); }
        .cuadrante-amenazas { border-top: 3px solid var(--critico); }

        .foda-lista {
          margin: 0;
          padding-left: 18px;
          font-size: 0.8rem;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cuadrante-vacio {
          font-size: 0.78rem;
          margin-top: var(--sp-2);
        }

        .patrones-resumen-card {
          padding: var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .patrones-chips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 6px;
          margin-top: 4px;
        }

        .patron-chip-mini {
          padding: 4px 6px;
          border-radius: 6px;
          border: 1px solid var(--linea);
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.68rem;
          text-align: center;
        }

        .chip-pnum {
          font-weight: 700;
        }

        .chip-conservado {
          background: color-mix(in srgb, var(--ok) 8%, var(--tarjeta));
          border-color: color-mix(in srgb, var(--ok) 30%, transparent);
          color: var(--ok);
        }

        .chip-alterado {
          background: color-mix(in srgb, var(--atencion) 10%, var(--tarjeta));
          border-color: color-mix(in srgb, var(--atencion) 40%, transparent);
          color: var(--atencion);
        }

        .familias-barrio-card {
          padding: var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .familias-barrio-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .link-ver-tabla {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--azul-medio);
          text-decoration: none;
        }

        .familias-barrio-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .familia-barrio-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 6px;
          background: var(--fondo);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s ease;
        }

        .familia-barrio-item:hover {
          background: color-mix(in srgb, var(--azul) 6%, var(--fondo));
        }

        .fam-apellido {
          font-size: 0.85rem;
          color: var(--azul);
          display: block;
        }

        .fam-domicilio {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  )
}
