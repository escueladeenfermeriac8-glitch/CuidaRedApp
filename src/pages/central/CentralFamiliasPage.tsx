/**
 * CentralFamiliasPage — Tabla Densa de Familias y Seguimiento Clínico
 * DISENO_BASE.md §7.3, §12 P1:
 * - Tabla densa de familias
 * - Filtros rápidos por CAPS, Barrio y Estado
 * - Buscador en tiempo real
 * - Exportación a CSV
 * - Acciones directas a Diagnósticos NANDA, Plan e historia
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  FileText,
  Compass,
  Home,
} from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { SyncBadge } from '@/components/sync/SyncBadge'
import type { Familia, Barrio, EstadoFamilia } from '@/types'

export function CentralFamiliasPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [familias, setFamilias] = useState<Familia[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroBarrioId, setFiltroBarrioId] = useState('')
  const [filtroConsentimiento, setFiltroConsentimiento] = useState<'todos' | 'con' | 'sin'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoFamilia>('todos')

  useEffect(() => {
    let activo = true

    async function cargarDatos() {
      if (!usuario?.capsIds || usuario.capsIds.length === 0) {
        setCargando(false)
        return
      }

      try {
        const capsQuery = usuario.capsIds.slice(0, 10)
        const qFam = query(
          collection(db, 'familias'),
          where('capsId', 'in', capsQuery),
          where('eliminado', '!=', true)
        )
        const snapFam = await getDocs(qFam)
        const famDocs = snapFam.docs.map((d) => ({ id: d.id, ...d.data() })) as Familia[]

        const qBar = query(collection(db, 'barrios'), where('capsId', 'in', capsQuery))
        const snapBar = await getDocs(qBar)
        const barDocs = snapBar.docs.map((d) => ({ id: d.id, ...d.data() })) as Barrio[]

        if (activo) {
          setFamilias(famDocs)
          setBarrios(barDocs)
          setCargando(false)
        }
      } catch (err) {
        console.warn('[CentralFamilias] Error cargando datos:', err)
        if (activo) setCargando(false)
      }
    }

    cargarDatos()
    return () => {
      activo = false
    }
  }, [usuario?.capsIds])

  // Filtrado reactivo en cliente
  const familiasFiltradas = useMemo(() => {
    return familias.filter((fam) => {
      if (filtroBarrioId && fam.barrioId !== filtroBarrioId) {
        return false
      }
      if (filtroConsentimiento === 'con' && !fam.consentimiento?.otorgado) {
        return false
      }
      if (filtroConsentimiento === 'sin' && fam.consentimiento?.otorgado) {
        return false
      }
      if (filtroEstado !== 'todos' && fam.estado !== filtroEstado) {
        return false
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim()
        const enApellido = fam.apellido?.toLowerCase().includes(q)
        const enDomicilio = fam.domicilio?.toLowerCase().includes(q)
        const enCodigo = fam.codigoFamiliar?.toLowerCase().includes(q)
        if (!enApellido && !enDomicilio && !enCodigo) return false
      }
      return true
    })
  }, [familias, busqueda, filtroBarrioId, filtroConsentimiento, filtroEstado])

  // Exportar tabla a CSV (DISENO_BASE.md §12 P1)
  const exportarCSV = () => {
    const cabeceras = [
      'Codigo Familiar',
      'Apellido',
      'Domicilio',
      'Barrio',
      'Orden Domicilio',
      'Consentimiento',
      'Estado',
      'Sync',
    ]

    const filas = familiasFiltradas.map((f) => {
      const barrio = barrios.find((b) => b.id === f.barrioId)
      return [
        `"${f.codigoFamiliar || ''}"`,
        `"${f.apellido || ''}"`,
        `"${f.domicilio || ''}"`,
        `"${barrio?.etiqueta || barrio?.nombre || ''}"`,
        f.ordenEnDomicilio || 1,
        f.consentimiento?.otorgado ? 'Si' : 'No',
        f.estado || 'borrador',
        f.syncEstado || 'enviado',
      ].join(',')
    })

    const contenido = [cabeceras.join(','), ...filas].join('\n')
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `CuidaRed_Familias_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="central-familias-stack">
      <header className="familias-header-top">
        <div>
          <h1 className="h2 familias-titulo">Familias y Seguimiento</h1>
          <p className="text-apagado">
            Listado consolidado de familias, avance de valoración comunitaria y diagnósticos.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={exportarCSV}
          disabled={familiasFiltradas.length === 0}
          title="Exportar registros filtrados a formato CSV"
        >
          <Download size={14} />
          <span>Exportar a CSV</span>
        </button>
      </header>

      {/* Barra de Filtros y Búsqueda */}
      <section className="tarjeta filtros-barra-card">
        <div className="busqueda-input-wrapper">
          <Search size={16} className="icono-buscar" />
          <input
            type="text"
            className="input-buscar"
            placeholder="Buscar por apellido, domicilio o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filtros-selects-fila">
          <div className="filtro-item">
            <label className="filtro-etiqueta">
              <Compass size={13} /> Barrio:
            </label>
            <select
              className="select-filtro"
              value={filtroBarrioId}
              onChange={(e) => setFiltroBarrioId(e.target.value)}
            >
              <option value="">Todos los barrios</option>
              {barrios.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.etiqueta || b.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="filtro-item">
            <label className="filtro-etiqueta">
              <CheckCircle2 size={13} /> Consentimiento:
            </label>
            <select
              className="select-filtro"
              value={filtroConsentimiento}
              onChange={(e) => setFiltroConsentimiento(e.target.value as any)}
            >
              <option value="todos">Todos</option>
              <option value="con">Con consentimiento</option>
              <option value="sin">Sin consentimiento</option>
            </select>
          </div>

          <div className="filtro-item">
            <label className="filtro-etiqueta">
              <Filter size={13} /> Estado:
            </label>
            <select
              className="select-filtro"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
              <option value="derivada">Derivada</option>
            </select>
          </div>
        </div>
      </section>

      {/* Tabla Densa de Familias */}
      <section className="tarjeta tabla-contenedor-card">
        <div className="tabla-resumen-contador">
          <span className="text-apagado text-sm">
            Mostrando <strong>{familiasFiltradas.length}</strong> de {familias.length} familias
          </span>
        </div>

        {cargando ? (
          <div className="tabla-cargando text-apagado">Cargando familias...</div>
        ) : familiasFiltradas.length === 0 ? (
          <div className="tabla-vacia text-apagado">
            No se encontraron familias que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div className="tabla-scroll-wrapper">
            <table className="tabla-densa" aria-label="Familias registradas">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Familia</th>
                  <th>Domicilio</th>
                  <th>Barrio</th>
                  <th>Consentimiento</th>
                  <th>Estado</th>
                  <th>Sincronización</th>
                  <th className="th-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {familiasFiltradas.map((fam) => {
                  const barrio = barrios.find((b) => b.id === fam.barrioId)
                  const conConsentimiento = !!fam.consentimiento?.otorgado

                  return (
                    <tr key={fam.id}>
                      <td>
                        <span className="codigo-mono">{fam.codigoFamiliar}</span>
                        {fam.ordenEnDomicilio > 1 && (
                          <span className="badge-sub-orden">F{fam.ordenEnDomicilio}</span>
                        )}
                      </td>
                      <td>
                        <strong className="apellido-celda">Familia {fam.apellido}</strong>
                      </td>
                      <td>
                        <span className="domicilio-celda text-apagado">
                          <Home size={12} /> {fam.domicilio}
                        </span>
                      </td>
                      <td>
                        <span className="barrio-celda">
                          <Compass size={12} /> {barrio?.etiqueta || barrio?.nombre || 's/d'}
                        </span>
                      </td>
                      <td>
                        {conConsentimiento ? (
                          <span className="tag-con-consentimiento">
                            <CheckCircle2 size={12} /> Aceptado
                          </span>
                        ) : (
                          <span className="tag-sin-consentimiento">
                            <AlertCircle size={12} /> Pendiente
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge-estado-fam estado-${fam.estado || 'activa'}`}
                        >
                          {fam.estado ? fam.estado.charAt(0).toUpperCase() + fam.estado.slice(1) : 'Activa'}
                        </span>
                      </td>
                      <td>
                        <SyncBadge estado={fam.syncEstado ?? 'enviado'} compacto />
                      </td>
                      <td className="td-acciones">
                        <div className="acciones-botones-fila">
                          <button
                            type="button"
                            className="btn-accion-mini btn-accion-diagnosticos"
                            onClick={() => navigate(`/central/familias/${fam.id}/diagnosticos`)}
                            title="Asistente Diagnóstico NANDA"
                          >
                            <Stethoscope size={14} />
                            <span>NANDA</span>
                          </button>
                          <button
                            type="button"
                            className="btn-accion-mini btn-accion-plan"
                            onClick={() => navigate(`/central/familias/${fam.id}/plan`)}
                            title="Plan de intervenciones y SOEP"
                          >
                            <FileText size={14} />
                            <span>Plan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        .central-familias-stack {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .familias-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--sp-3);
        }

        .familias-titulo {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-1);
        }

        .filtros-barra-card {
          padding: var(--sp-3) var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        @media (min-width: 768px) {
          .filtros-barra-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .busqueda-input-wrapper {
          position: relative;
          flex: 1;
          max-width: 360px;
        }

        .icono-buscar {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--apagado, #5B6B7C);
        }

        .input-buscar {
          width: 100%;
          padding: 8px 12px 8px 32px;
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea, #D9E0E8);
          font-size: 0.85rem;
          background: var(--papel, #F5F7FA);
        }

        .filtros-selects-fila {
          display: flex;
          gap: var(--sp-3);
          flex-wrap: wrap;
        }

        .filtro-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filtro-etiqueta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--apagado, #5B6B7C);
        }

        .select-filtro {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--linea, #D9E0E8);
          background: var(--tarjeta);
          font-size: 0.82rem;
          color: var(--azul, #17375E);
          font-weight: 600;
        }

        .tabla-contenedor-card {
          padding: 0;
          overflow: hidden;
        }

        .tabla-resumen-contador {
          padding: var(--sp-3) var(--sp-4);
          border-bottom: 1px solid var(--linea);
          background: color-mix(in srgb, var(--papel) 60%, var(--tarjeta));
        }

        .tabla-scroll-wrapper {
          overflow-x: auto;
        }

        .tabla-densa {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.84rem;
          text-align: left;
        }

        .tabla-densa th {
          background: var(--papel, #F5F7FA);
          color: var(--apagado, #5B6B7C);
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 10px 14px;
          border-bottom: 1px solid var(--linea);
          white-space: nowrap;
        }

        .tabla-densa td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--linea);
          vertical-align: middle;
        }

        .tabla-densa tr:hover td {
          background: color-mix(in srgb, var(--azul, #17375E) 3%, var(--tarjeta));
        }

        .codigo-mono {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.78rem;
          color: var(--azul, #17375E);
          background: color-mix(in srgb, var(--azul) 10%, transparent);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .badge-sub-orden {
          font-size: 0.68rem;
          font-weight: 700;
          margin-left: 4px;
          background: var(--papel);
          padding: 1px 4px;
          border-radius: 4px;
        }

        .apellido-celda {
          color: var(--azul, #17375E);
          font-size: 0.88rem;
        }

        .domicilio-celda {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
        }

        .barrio-celda {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--tinta);
        }

        .tag-con-consentimiento {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--ok, #2F9E6B);
          background: color-mix(in srgb, var(--ok) 12%, transparent);
          padding: 2px 8px;
          border-radius: 999px;
        }

        .tag-sin-consentimiento {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--atencion, #C98A00);
          background: color-mix(in srgb, var(--atencion) 12%, transparent);
          padding: 2px 8px;
          border-radius: 999px;
        }

        .badge-estado-fam {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .estado-completa {
          background: color-mix(in srgb, var(--ok) 12%, transparent);
          color: var(--ok);
        }

        .estado-curso {
          background: color-mix(in srgb, var(--lago) 12%, transparent);
          color: var(--lago);
        }

        .th-acciones, .td-acciones {
          text-align: right;
        }

        .acciones-botones-fila {
          display: inline-flex;
          gap: 6px;
        }

        .btn-accion-mini {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          transition: all 0.15s ease;
        }

        .btn-accion-diagnosticos {
          color: var(--azul, #17375E);
          border-color: color-mix(in srgb, var(--azul) 30%, transparent);
        }

        .btn-accion-diagnosticos:hover {
          background: color-mix(in srgb, var(--azul) 10%, transparent);
        }

        .btn-accion-plan {
          color: var(--lago, #1AA6A0);
          border-color: color-mix(in srgb, var(--lago) 35%, transparent);
        }

        .btn-accion-plan:hover {
          background: color-mix(in srgb, var(--lago) 10%, transparent);
        }

        .tabla-cargando, .tabla-vacia {
          padding: var(--sp-6);
          text-align: center;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
