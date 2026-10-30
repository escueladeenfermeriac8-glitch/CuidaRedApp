/**
 * Pantalla de inicio del campo
 * DISENO_BASE.md §7.2 — INICIO
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ModalCrearBarrio } from '@/components/barrios/ModalCrearBarrio'
import type { Barrio } from '@/types'
import {
  Users,
  Building2,
  Compass,
  Plus,
  ChevronRight,
  Bell,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

export function InicioPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [barrioSeleccionado, setBarrioSeleccionado] = useState<Barrio | null>(null)
  const [modalBarrioAbierto, setModalBarrioAbierto] = useState(false)
  const [cargandoBarrios, setCargandoBarrios] = useState(true)

  // CAPS activo
  const capsIdActual = usuario?.capsIds?.[0] ?? 'caps_1'

  useEffect(() => {
    async function cargarBarrios() {
      setCargandoBarrios(true)
      try {
        const orgId = usuario?.orgId ?? 'org_default'
        const q = query(collection(db, 'barrios'), where('orgId', '==', orgId))
        const snap = await getDocs(q)
        const lista: Barrio[] = []
        snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as Barrio) }))
        setBarrios(lista)

        // Recuperar último barrio guardado o primero de la lista
        const guardadoId = localStorage.getItem('cuida_ultimo_barrio_id')
        const match = lista.find((b) => b.id === guardadoId)
        if (match) {
          setBarrioSeleccionado(match)
        } else if (lista.length > 0) {
          setBarrioSeleccionado(lista[0])
        }
      } catch (err) {
        console.error('[Inicio] Error al cargar barrios:', err)
      } finally {
        setCargandoBarrios(false)
      }
    }

    cargarBarrios()
  }, [usuario])

  const handleSeleccionarBarrio = (barrio: Barrio) => {
    setBarrioSeleccionado(barrio)
    if (barrio.id) {
      localStorage.setItem('cuida_ultimo_barrio_id', barrio.id)
    }
  }

  const handleBarrioCreado = (nuevoBarrio: Barrio) => {
    setBarrios((prev) => [...prev, nuevoBarrio])
    setBarrioSeleccionado(nuevoBarrio)
    if (nuevoBarrio.id) {
      localStorage.setItem('cuida_ultimo_barrio_id', nuevoBarrio.id)
    }
  }

  const nombreUsuario = usuario?.nombre?.split(' ')[0] ?? 'Equipo'

  return (
    <div className="inicio-container">
      {/* Cabecera de bienvenida */}
      <header className="inicio-header">
        <div className="saludo-bloque">
          <h1 className="h2 saludo-titulo">Hola, {nombreUsuario}</h1>
          <p className="text-apagado">
            {usuario?.rol ? `Rol: ${usuario.rol}` : 'Valoración comunitaria y familiar'} · CAPS {capsIdActual}
          </p>
        </div>

        <button
          type="button"
          className="btn-campana"
          onClick={() => navigate('/pendientes')}
          aria-label="Ver pendientes"
        >
          <Bell size={20} />
          <span className="campana-punto" />
        </button>
      </header>

      {/* Selector de barrio territorial con brújula cardinal */}
      <section className="tarjeta seccion-barrio" aria-labelledby="titulo-barrio-activo">
        <div className="barrio-cabecera">
          <div className="barrio-icono">
            <Compass size={22} />
          </div>
          <div className="barrio-info">
            <span id="titulo-barrio-activo" className="barrio-sub">Barrio activo</span>
            <div className="barrio-nombre-fila">
              {cargandoBarrios ? (
                <span className="text-apagado">Cargando barrios...</span>
              ) : barrioSeleccionado ? (
                <>
                  <strong className="barrio-etiqueta-texto">{barrioSeleccionado.etiqueta}</strong>
                  <span className="cardinal-badge">{barrioSeleccionado.cardinal}</span>
                </>
              ) : (
                <span className="text-apagado">Ningún barrio registrado</span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setModalBarrioAbierto(true)}
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {/* Lista horizontal de barrios del CAPS si hay más de uno */}
        {barrios.length > 1 && (
          <div className="barrios-chips-scroll" role="radiogroup" aria-label="Cambiar de barrio">
            {barrios.map((b, idx) => (
              <button
                key={b.id || idx}
                type="button"
                className={`chip-barrio ${barrioSeleccionado?.id && b.id === barrioSeleccionado.id ? 'activo' : ''}`}
                onClick={() => handleSeleccionarBarrio(b)}
              >
                <span className="chip-cardinal">{b.cardinal}</span>
                <span>{b.nombre}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Acciones principales de campo (Grandes, táctiles) */}
      <section className="acciones-principales-grilla" aria-label="Acciones de valoración">
        {/* Valorar la comunidad */}
        <button
          type="button"
          className="tarjeta tarjeta-accion accion-comunidad"
          onClick={() => {
            if (barrioSeleccionado?.id) {
              navigate(`/comunidad/valorar?barrioId=${barrioSeleccionado.id}`)
            } else {
              setModalBarrioAbierto(true)
            }
          }}
        >
          <div className="accion-icono-circulo comunidad-circulo">
            <Building2 size={28} />
          </div>
          <div className="accion-textos">
            <span className="accion-titulo">Valorar la comunidad</span>
            <span className="accion-desc">
              Guía de 11 patrones barriales (Wolhein y Martínez) + Asistente FODA
            </span>
          </div>
          <ChevronRight size={20} className="accion-flecha" />
        </button>

        {/* Valorar una familia */}
        <button
          type="button"
          className="tarjeta tarjeta-accion accion-familia"
          onClick={() => navigate('/familias')}
        >
          <div className="accion-icono-circulo familia-circulo">
            <Users size={28} />
          </div>
          <div className="accion-textos">
            <span className="accion-titulo">Valorar una familia</span>
            <span className="accion-desc">
              Búsqueda, integrantes, genograma, vivienda e instrumentos (APGAR/MOS/Holmes)
            </span>
          </div>
          <ChevronRight size={20} className="accion-flecha" />
        </button>

        {/* Acceso a la Central Web para supervisores/docentes */}
        {(usuario?.rol === 'supervisor' || usuario?.rol === 'admin' || usuario?.rol === 'admin_global') && (
          <button
            type="button"
            className="tarjeta tarjeta-accion accion-central-link"
            onClick={() => navigate('/central')}
          >
            <div className="accion-icono-circulo central-circulo">
              <Building2 size={26} />
            </div>
            <div className="accion-textos">
              <span className="accion-titulo">Central de Supervisión Web</span>
              <span className="accion-desc">
                Panel docente, diagnósticos NANDA en PES, plan de cuidados y control de duplicados
              </span>
            </div>
            <ChevronRight size={20} className="accion-flecha" />
          </button>
        )}
      </section>

      {/* Resumen rápido de pendientes */}
      <section className="tarjeta seccion-pendientes-resumen" aria-labelledby="titulo-resumen">
        <div className="resumen-cabecera">
          <h2 id="titulo-resumen" className="h4">Actividad en el terreno</h2>
          <button
            type="button"
            className="btn-enlace text-apagado"
            onClick={() => navigate('/sincronizar')}
          >
            <RefreshCw size={14} /> Sincronización
          </button>
        </div>

        <div className="resumen-items">
          <div className="resumen-item">
            <CheckCircle2 size={16} className="icono-ok" />
            <div className="item-texto">
              <strong>Modo offline activo</strong>
              <small className="text-apagado">Tus registros se guardan en este celular y se sincronizan solos al reconectar.</small>
            </div>
          </div>
        </div>
      </section>

      {/* Modal para crear barrio */}
      <ModalCrearBarrio
        abierto={modalBarrioAbierto}
        capsIdActual={capsIdActual}
        onCerrar={() => setModalBarrioAbierto(false)}
        onBarrioCreado={handleBarrioCreado}
        barriosExistentes={barrios}
      />

      <style>{`
        .inicio-container {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          padding-bottom: 24px;
        }

        .inicio-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-top: var(--sp-2);
        }

        .saludo-titulo {
          color: var(--azul-profundo);
          font-family: var(--fuente-titulos);
        }

        .btn-campana {
          position: relative;
          background: var(--tarjeta);
          border: 1px solid var(--borde-suave);
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--azul-profundo);
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }

        .campana-punto {
          position: absolute;
          top: 10px;
          right: 11px;
          width: 8px;
          height: 8px;
          background: var(--alerta);
          border-radius: 50%;
          border: 2px solid var(--tarjeta);
        }

        .seccion-barrio {
          padding: var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .barrio-cabecera {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }

        .barrio-icono {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--azul-profundo) 10%, var(--tarjeta));
          color: var(--azul-profundo);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .barrio-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .barrio-sub {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--texto-secundario);
          font-weight: 700;
        }

        .barrio-nombre-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        .barrio-etiqueta-texto {
          font-size: 1rem;
          color: var(--azul-profundo);
        }

        .cardinal-badge {
          background: var(--azul-profundo);
          color: #FFF;
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: var(--r-capsula);
          font-weight: 700;
        }

        .barrios-chips-scroll {
          display: flex;
          gap: var(--sp-2);
          overflow-x: auto;
          padding-top: var(--sp-2);
          border-top: 1px solid var(--borde-suave);
        }

        .chip-barrio {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--r-capsula);
          border: 1px solid var(--borde-suave);
          background: var(--tarjeta);
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .chip-barrio.activo {
          background: var(--lago);
          color: #FFF;
          border-color: var(--lago);
        }

        .chip-cardinal {
          font-weight: 800;
          font-size: 0.7rem;
          opacity: 0.85;
        }

        .acciones-principales-grilla {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .tarjeta-accion {
          display: flex;
          align-items: center;
          gap: var(--sp-4);
          padding: var(--sp-4);
          cursor: pointer;
          text-align: left;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          border: 1px solid var(--borde-suave);
        }

        .tarjeta-accion:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(23, 55, 94, 0.08);
        }

        .accion-icono-circulo {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .comunidad-circulo {
          background: color-mix(in srgb, var(--lago) 15%, var(--tarjeta));
          color: var(--lago);
        }

        .familia-circulo {
          background: color-mix(in srgb, var(--azul-medio) 15%, var(--tarjeta));
          color: var(--azul-medio);
        }

        .accion-textos {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .accion-titulo {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--azul-profundo);
        }

        .accion-desc {
          font-size: 0.78rem;
          color: var(--texto-secundario);
          line-height: 1.35;
        }

        .accion-flecha {
          color: var(--texto-secundario);
        }

        .seccion-pendientes-resumen {
          padding: var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .resumen-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-enlace {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
        }

        .resumen-items {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .resumen-item {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-3);
          padding: var(--sp-2);
          background: var(--fondo);
          border-radius: var(--r-campo);
        }

        .icono-ok {
          color: var(--lago);
          margin-top: 2px;
        }

        .item-texto {
          display: flex;
          flex-direction: column;
        }

        .item-texto strong {
          font-size: 0.85rem;
          color: var(--azul-profundo);
        }

        .item-texto small {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  )
}
