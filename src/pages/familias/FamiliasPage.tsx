/**
 * Listado, Búsqueda y Creación de Familias
 * DISENO_BASE.md §6.1, §7.2 paso 4 y §5
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  normalizar,
  distanciaEdicion,
  generarCodigoFamiliar,
} from '@/lib/normalizacion'
import type { Familia, Barrio, EstadoFamilia } from '@/types'
import { SyncBadge } from '@/components/sync/SyncBadge'
import {
  Search,
  UserPlus,
  Users,
  Compass,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Home,
  Plus,
  X,
} from 'lucide-react'

export function FamiliasPage() {
  const navigate = useNavigate()
  const { usuario, firebaseUser } = useAuth()

  const [familias, setFamilias] = useState<Familia[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [cargando, setCargando] = useState(true)

  // Filtros de búsqueda
  const [busquedaApellido, setBusquedaApellido] = useState('')
  const [busquedaDomicilio, setBusquedaDomicilio] = useState('')
  const [filtroBarrioId, setFiltroBarrioId] = useState('')

  // Modal nueva familia
  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoDomicilio, setNuevoDomicilio] = useState('')
  const [nuevoBarrioId, setNuevoBarrioId] = useState('')
  const [nuevoParentescoRef, setNuevoParentescoRef] = useState('Jefa / Jefe de hogar')
  const [ordenEnDomicilio, setOrdenEnDomicilio] = useState<number>(1)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const capsIdActual = usuario?.capsIds?.[0] ?? 'caps_1'

  // Cargar familias y barrios reactivamente de la organización
  useEffect(() => {
    setCargando(true)
    const orgId = usuario?.orgId ?? 'org_default'

    // 1. Barrios
    const qBarrios = query(collection(db, 'barrios'), where('orgId', '==', orgId))
    const unsubBarrios = onSnapshot(
      qBarrios,
      (snap) => {
        const listaBarrios: Barrio[] = []
        snap.forEach((d) => listaBarrios.push({ id: d.id, ...(d.data() as Barrio) }))
        setBarrios(listaBarrios)

        if (listaBarrios.length > 0) {
          setNuevoBarrioId((prev) => prev || listaBarrios[0].id || '')
        }
      },
      (err) => console.warn('[Familias] Error snapshot barrios:', err)
    )

    // 2. Familias
    const qFamilias = query(collection(db, 'familias'), where('orgId', '==', orgId))
    const unsubFamilias = onSnapshot(
      qFamilias,
      (snap) => {
        const listaFamilias: Familia[] = []
        snap.forEach((d) => listaFamilias.push({ id: d.id, ...(d.data() as Familia) }))
        setFamilias(listaFamilias)
        setCargando(false)
      },
      (err) => {
        console.warn('[Familias] Error snapshot familias:', err)
        setCargando(false)
      }
    )

    return () => {
      unsubBarrios()
      unsubFamilias()
    }
  }, [usuario])

  // Filtrado y búsqueda normalizada con tolerancia a errores de tipeo (Levenshtein ≤ 2)
  const familiasFiltradas = useMemo(() => {
    const apNorm = normalizar(busquedaApellido)
    const domNorm = normalizar(busquedaDomicilio)

    return familias.filter((f) => {
      if (filtroBarrioId && f.barrioId !== filtroBarrioId) {
        return false
      }

      let coincideApellido = true
      if (apNorm) {
        const dist = distanciaEdicion(apNorm, f.apellidoNorm || normalizar(f.apellido))
        coincideApellido =
          f.apellidoNorm.includes(apNorm) ||
          f.apellido.toLowerCase().includes(apNorm) ||
          dist <= 2
      }

      let coincideDomicilio = true
      if (domNorm) {
        const dist = distanciaEdicion(domNorm, f.domicilioNorm || normalizar(f.domicilio))
        coincideDomicilio =
          f.domicilioNorm.includes(domNorm) ||
          f.domicilio.toLowerCase().includes(domNorm) ||
          dist <= 2
      }

      return coincideApellido && coincideDomicilio
    })
  }, [familias, busquedaApellido, busquedaDomicilio, filtroBarrioId])

  // Búsqueda de coincidencia exacta o similar para "¿Es esta familia?"
  const posiblesDuplicados = useMemo(() => {
    if (!nuevoApellido && !nuevoDomicilio) return []
    const apNorm = normalizar(nuevoApellido)
    const domNorm = normalizar(nuevoDomicilio)

    return familias.filter((f) => {
      const distAp = apNorm ? distanciaEdicion(apNorm, f.apellidoNorm) : 99
      const distDom = domNorm ? distanciaEdicion(domNorm, f.domicilioNorm) : 99
      return distDom <= 2 || distAp <= 1 || f.domicilioNorm.includes(domNorm)
    })
  }, [familias, nuevoApellido, nuevoDomicilio])

  // Crear familia
  const handleCrearFamilia = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal(null)

    const apLimpio = nuevoApellido.trim()
    const domLimpio = nuevoDomicilio.trim()

    if (!apLimpio || !domLimpio || !nuevoBarrioId) {
      setErrorModal('Por favor completá apellido, domicilio y barrio.')
      return
    }

    setGuardando(true)

    try {
      const famRef = doc(collection(db, 'familias'))
      const deviceId = localStorage.getItem('cuida_device_id') || 'dev_local'
      const anioActual = new Date().getFullYear()
      const secuencia = familias.length + 1

      const codigoFamiliar = generarCodigoFamiliar(
        capsIdActual,
        anioActual,
        secuencia,
        deviceId
      )

      const nuevaFamiliaData: Omit<Familia, 'createdAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>
      } = {
        orgId: usuario?.orgId ?? 'org_default',
        codigoFamiliar,
        barrioId: nuevoBarrioId,
        capsId: capsIdActual,
        apellido: apLimpio,
        apellidoNorm: normalizar(apLimpio),
        domicilio: domLimpio,
        domicilioNorm: normalizar(domLimpio),
        ordenEnDomicilio,
        referenteParentesco: nuevoParentescoRef,
        consentimiento: { otorgado: false },
        estado: 'activa' as EstadoFamilia,
        vivienda: {},
        cartografia: { ubicacion: 'urbana' },
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
      }

      // Guardar en Firestore (local IndexedDB prioritario)
      await Promise.race([
        setDoc(famRef, nuevaFamiliaData),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      setModalAbierto(false)
      navigate(`/familias/${famRef.id}`)
    } catch (err) {
      console.error('[Familias] Error al crear familia:', err)
      setErrorModal('No se pudo crear la familia en el dispositivo. Reintentá.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="familias-page-contenedor">
      {/* Cabecera con título y botón alta */}
      <header className="familias-header">
        <div>
          <h1 className="h2">Familias en Terreno</h1>
          <p className="text-apagado" style={{ fontSize: 'var(--text-xs)' }}>
            Búsqueda con normalización fonética y tolerancia a tipeo (Ley 25.326: sin DNI)
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setErrorModal(null)
            setModalAbierto(true)
          }}
        >
          <UserPlus size={16} /> Nueva familia
        </button>
      </header>

      {/* Buscador de 3 campos (DISENO_BASE.md §6.1) */}
      <section className="tarjeta buscador-seccion" aria-label="Buscador de familias">
        <div className="buscador-grilla">
          <div className="campo">
            <label htmlFor="search-apellido" className="campo-etiqueta">
              Apellido familiar
            </label>
            <div className="input-con-icono">
              <Search size={16} className="icono-input" />
              <input
                id="search-apellido"
                type="text"
                className="input-control"
                placeholder="Ej. Pérez, Gómez..."
                value={busquedaApellido}
                onChange={(e) => setBusquedaApellido(e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="search-domicilio" className="campo-etiqueta">
              Domicilio / Calle y nro.
            </label>
            <div className="input-con-icono">
              <Home size={16} className="icono-input" />
              <input
                id="search-domicilio"
                type="text"
                className="input-control"
                placeholder="Ej. San Martín 450, Pje 2..."
                value={busquedaDomicilio}
                onChange={(e) => setBusquedaDomicilio(e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="search-barrio" className="campo-etiqueta">
              Filtrar por barrio
            </label>
            <select
              id="search-barrio"
              className="input-control"
              value={filtroBarrioId}
              onChange={(e) => setFiltroBarrioId(e.target.value)}
            >
              <option value="">Todos los barrios</option>
              {barrios.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Resultados de la búsqueda */}
      <section className="lista-familias-seccion" aria-labelledby="titulo-resultados">
        <div className="resultados-contador">
          <h2 id="titulo-resultados" className="h4">
            Familias encontradas ({familiasFiltradas.length})
          </h2>
          <small className="text-apagado">
            Sin conexión busca en la base local de este dispositivo
          </small>
        </div>

        {cargando ? (
          <div className="cargando-fila text-apagado">Buscando familias...</div>
        ) : familiasFiltradas.length === 0 ? (
          <div className="tarjeta estado-vacio">
            <Users size={36} className="text-apagado" />
            <h3 className="h4">No se encontraron familias</h3>
            <p className="text-apagado">
              No hay familias que coincidan con la búsqueda. Podés registrar una nueva familia en este domicilio.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setNuevoApellido(busquedaApellido)
                setNuevoDomicilio(busquedaDomicilio)
                if (filtroBarrioId) setNuevoBarrioId(filtroBarrioId)
                setModalAbierto(true)
              }}
            >
              <Plus size={16} /> Crear con estos datos
            </button>
          </div>
        ) : (
          <div className="familias-grilla">
            {familiasFiltradas.map((fam) => {
              const barrio = barrios.find((b) => b.id === fam.barrioId)
              const tieneConsentimiento = fam.consentimiento?.otorgado

              return (
                <article
                  key={fam.id}
                  className="tarjeta familia-card"
                  onClick={() => navigate(`/familias/${fam.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/familias/${fam.id}`)}
                >
                  <div className="card-top">
                    <div className="card-titulos">
                      <div className="codigo-fila">
                        <span className="badge-codigo">{fam.codigoFamiliar}</span>
                        <SyncBadge estado={fam.syncEstado ?? (fam.createdAt ? 'enviado' : 'pendiente')} />
                        {fam.ordenEnDomicilio > 1 && (
                          <span className="badge-orden">Familia {fam.ordenEnDomicilio}</span>
                        )}
                        {tieneConsentimiento ? (
                          <span className="badge-consentimiento-ok" title="Consentimiento informado registrado">
                            <CheckCircle2 size={12} /> Consentimiento
                          </span>
                        ) : (
                          <span className="badge-consentimiento-pendiente" title="Consentimiento pendiente">
                            <AlertCircle size={12} /> Sin consentimiento
                          </span>
                        )}
                      </div>
                      <h3 className="h4 apellido-titulo">Familia {fam.apellido}</h3>
                      <p className="domicilio-sub text-apagado">
                        <Home size={13} /> {fam.domicilio}
                      </p>
                    </div>

                    <ChevronRight size={20} className="flecha-navegar" />
                  </div>

                  <footer className="card-pie">
                    <div className="barrio-chip-mini">
                      <Compass size={12} />
                      <span>{barrio?.etiqueta ?? 'Barrio s/d'}</span>
                    </div>
                    <span className="referente-badge text-apagado">
                      Ref: {fam.referenteParentesco}
                    </span>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal: Crear Nueva Familia */}
      {modalAbierto && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-familia-titulo">
          <div className="modal-contenido tarjeta">
            <header className="modal-cabecera">
              <h2 id="modal-familia-titulo" className="h3">
                Registrar nueva familia
              </h2>
              <button
                type="button"
                className="btn-cerrar"
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleCrearFamilia} className="modal-form">
              {errorModal && (
                <div className="alerta-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{errorModal}</span>
                </div>
              )}

              {/* ¿Es esta familia? Verificación de similitudes previas */}
              {posiblesDuplicados.length > 0 && (
                <div className="alerta-duplicados" role="status">
                  <div className="duplicados-cabecera">
                    <ShieldAlert size={16} />
                    <strong>¿Es alguna de estas familias ya registradas?</strong>
                  </div>
                  <div className="duplicados-lista">
                    {posiblesDuplicados.slice(0, 3).map((dup) => (
                      <div key={dup.id} className="dup-item">
                        <div className="dup-info">
                          <strong>Familia {dup.apellido}</strong> ({dup.domicilio})
                          <small className="text-apagado">Código: {dup.codigoFamiliar}</small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setModalAbierto(false)
                            navigate(`/familias/${dup.id}`)
                          }}
                        >
                          Ir a esta familia
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="duplicados-accion-segunda-fam">
                    <label className="checkbox-mini">
                      <input
                        type="checkbox"
                        checked={ordenEnDomicilio > 1}
                        onChange={(e) => setOrdenEnDomicilio(e.target.checked ? 2 : 1)}
                      />
                      <span>Es otra familia que convive en el mismo domicilio (Familia 2)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="campo">
                <label htmlFor="input-nuevo-apellido" className="campo-etiqueta">
                  Apellido familiar
                </label>
                <input
                  id="input-nuevo-apellido"
                  type="text"
                  className="input-control"
                  placeholder="Ej. González"
                  value={nuevoApellido}
                  onChange={(e) => setNuevoApellido(e.target.value)}
                  disabled={guardando}
                  autoFocus
                />
                <span className="campo-ayuda">Por Ley 25.326, solo se registra apellido</span>
              </div>

              <div className="campo">
                <label htmlFor="input-nuevo-domicilio" className="campo-etiqueta">
                  Domicilio completo
                </label>
                <input
                  id="input-nuevo-domicilio"
                  type="text"
                  className="input-control"
                  placeholder="Ej. Belgrano 1234 (o Manzana 3 Casa 12)"
                  value={nuevoDomicilio}
                  onChange={(e) => setNuevoDomicilio(e.target.value)}
                  disabled={guardando}
                />
              </div>

              <div className="fila-dos">
                <div className="campo">
                  <label htmlFor="select-nuevo-barrio" className="campo-etiqueta">
                    Barrio
                  </label>
                  <select
                    id="select-nuevo-barrio"
                    className="input-control"
                    value={nuevoBarrioId}
                    onChange={(e) => setNuevoBarrioId(e.target.value)}
                    disabled={guardando}
                  >
                    {barrios.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor="input-parentesco-ref" className="campo-etiqueta">
                    Rol del referente
                  </label>
                  <input
                    id="input-parentesco-ref"
                    type="text"
                    className="input-control"
                    value={nuevoParentescoRef}
                    onChange={(e) => setNuevoParentescoRef(e.target.value)}
                    disabled={guardando}
                  />
                </div>
              </div>

              <footer className="modal-pie">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando || !nuevoApellido.trim() || !nuevoDomicilio.trim()}
                >
                  <CheckCircle2 size={16} />
                  {guardando ? 'Creando...' : 'Crear ficha familiar'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .familias-page-contenedor {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          padding-bottom: 90px;
        }

        .familias-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-3);
        }

        .buscador-seccion {
          padding: var(--sp-4);
        }

        .buscador-grilla {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--sp-3);
        }

        @media (max-width: 700px) {
          .buscador-grilla {
            grid-template-columns: 1fr;
          }
        }

        .input-con-icono {
          position: relative;
          display: flex;
          align-items: center;
        }

        .icono-input {
          position: absolute;
          left: 12px;
          color: var(--texto-secundario);
          pointer-events: none;
        }

        .input-con-icono .input-control {
          padding-left: 36px;
        }

        .resultados-contador {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: var(--sp-2);
        }

        .familias-grilla {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .familia-card {
          padding: var(--sp-4);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          border: 1px solid var(--borde-suave);
        }

        .familia-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(23, 55, 94, 0.08);
          border-color: var(--lago);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .card-titulos {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .codigo-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .badge-codigo {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.75rem;
          background: color-mix(in srgb, var(--azul-profundo) 10%, var(--fondo));
          color: var(--azul-profundo);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .badge-orden {
          font-size: 0.68rem;
          background: var(--fondo);
          padding: 1px 6px;
          border-radius: var(--r-capsula);
          font-weight: 600;
        }

        .badge-consentimiento-ok {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          background: color-mix(in srgb, var(--lago) 12%, var(--fondo));
          color: var(--lago);
          padding: 1px 6px;
          border-radius: var(--r-capsula);
          font-weight: 600;
        }

        .badge-consentimiento-pendiente {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          background: color-mix(in srgb, var(--alerta) 12%, var(--fondo));
          color: var(--alerta);
          padding: 1px 6px;
          border-radius: var(--r-capsula);
          font-weight: 600;
        }

        .apellido-titulo {
          color: var(--azul-profundo);
          margin-top: 2px;
        }

        .domicilio-sub {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
        }

        .flecha-navegar {
          color: var(--texto-secundario);
          margin-top: var(--sp-2);
        }

        .card-pie {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--borde-suave);
          padding-top: var(--sp-2);
        }

        .barrio-chip-mini {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--azul-profundo);
          font-weight: 600;
        }

        .referente-badge {
          font-size: 0.72rem;
        }

        .alerta-duplicados {
          background: color-mix(in srgb, var(--alerta) 10%, var(--tarjeta));
          border: 1px solid var(--alerta);
          border-radius: var(--r-campo);
          padding: var(--sp-3);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .duplicados-cabecera {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--azul-profundo);
          font-size: 0.8rem;
        }

        .duplicados-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .dup-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--tarjeta);
          padding: var(--sp-2) var(--sp-3);
          border-radius: 4px;
        }

        .dup-info {
          display: flex;
          flex-direction: column;
          font-size: 0.78rem;
        }
      `}</style>
    </div>
  )
}
