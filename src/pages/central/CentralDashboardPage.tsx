/**
 * CentralDashboardPage — Panel General de Supervisión Docente
 * DISENO_BASE.md §7.3: Familias por CAPS y barrio, valoraciones pendientes, alertas de instrumentos y actividad.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Stethoscope,
  ChevronRight,
} from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { Familia, Barrio } from '@/types'

export function CentralDashboardPage() {
  const { usuario } = useAuth()
  const [familias, setFamilias] = useState<Familia[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function cargarMetricas() {
      if (!usuario?.capsIds || usuario.capsIds.length === 0) {
        setCargando(false)
        return
      }

      try {
        const capsQuery = usuario.capsIds.slice(0, 10)

        // Cargar familias
        const qFam = query(
          collection(db, 'familias'),
          where('capsId', 'in', capsQuery),
          where('eliminado', '!=', true)
        )
        const snapFam = await getDocs(qFam)
        const famDocs = snapFam.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Familia[]

        // Cargar barrios
        const qBar = query(
          collection(db, 'barrios'),
          where('capsId', 'in', capsQuery)
        )
        const snapBar = await getDocs(qBar)
        const barDocs = snapBar.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Barrio[]

        if (activo) {
          setFamilias(famDocs)
          setBarrios(barDocs)
          setCargando(false)
        }
      } catch (err) {
        console.warn('[CentralDashboard] Error cargando métricas:', err)
        if (activo) setCargando(false)
      }
    }

    cargarMetricas()
    return () => {
      activo = false
    }
  }, [usuario?.capsIds])

  // Métricas agregadas
  const totalFamilias = familias.length
  const totalBarrios = barrios.length
  const conConsentimiento = familias.filter((f) => !!f.consentimiento?.otorgado).length
  const sinConsentimiento = totalFamilias - conConsentimiento
  const activas = familias.filter((f) => f.estado === 'activa').length
  const otras = totalFamilias - activas

  return (
    <div className="central-dashboard-stack">
      <header className="dashboard-header">
        <div>
          <h1 className="h2 dashboard-titulo">Panel de Supervisión Comunitaria</h1>
          <p className="text-apagado">
            Monitoreo en tiempo real del relevamiento de campo, estado de valoraciones y alertas clínicas.
          </p>
        </div>
      </header>

      {/* Tarjetas métricas clave */}
      <section className="dashboard-metricas-grid">
        <div className="tarjeta kpi-tarjeta">
          <div className="kpi-top">
            <span className="kpi-etiqueta">Familias relevadas</span>
            <div className="kpi-icono kpi-azul">
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-valor">{cargando ? '—' : totalFamilias}</div>
          <span className="kpi-subtext text-apagado">
            {conConsentimiento} con consentimiento ({totalFamilias > 0 ? Math.round((conConsentimiento / totalFamilias) * 100) : 0}%)
          </span>
        </div>

        <div className="tarjeta kpi-tarjeta">
          <div className="kpi-top">
            <span className="kpi-etiqueta">Barrios asignados</span>
            <div className="kpi-icono kpi-lago">
              <Compass size={20} />
            </div>
          </div>
          <div className="kpi-valor">{cargando ? '—' : totalBarrios}</div>
          <span className="kpi-subtext text-apagado">
            {totalBarrios} áreas de cobertura CAPS
          </span>
        </div>

        <div className="tarjeta kpi-tarjeta">
          <div className="kpi-top">
            <span className="kpi-etiqueta">Familias activas</span>
            <div className="kpi-icono kpi-ok">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-valor">{cargando ? '—' : activas}</div>
          <span className="kpi-subtext text-apagado">
            {otras} inactivas o derivadas
          </span>
        </div>

        <div className="tarjeta kpi-tarjeta">
          <div className="kpi-top">
            <span className="kpi-etiqueta">Sin consentimiento</span>
            <div className="kpi-icono kpi-alerta">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-valor">{cargando ? '—' : sinConsentimiento}</div>
          <span className="kpi-subtext text-apagado">
            Requieren registro antes de valorar
          </span>
        </div>
      </section>

      {/* Grid de dos columnas: Desglose por barrio y Accesos rápidos */}
      <div className="dashboard-columnas-grid">
        {/* Columna Izquierda: Cobertura por Barrio */}
        <section className="tarjeta seccion-panel">
          <div className="seccion-panel-cabecera">
            <div>
              <h2 className="h4">Distribución por Barrios</h2>
              <p className="text-apagado text-sm">Familias registradas según sector cardinal</p>
            </div>
            <Link to="/central/barrios" className="link-accion-panel">
              <span>Ver barrios</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {cargando ? (
            <p className="text-apagado text-sm">Cargando distribución...</p>
          ) : barrios.length === 0 ? (
            <p className="text-apagado text-sm">No hay barrios registrados para tus CAPS.</p>
          ) : (
            <div className="barrios-progreso-lista">
              {barrios.map((b) => {
                const countFam = familias.filter((f) => f.barrioId === b.id).length
                const pct = totalFamilias > 0 ? (countFam / totalFamilias) * 100 : 0

                return (
                  <div key={b.id} className="barrio-progreso-item">
                    <div className="barrio-progreso-info">
                      <div className="barrio-progreso-nombre">
                        <Compass size={14} className="icono-cardinal" />
                        <strong>{b.etiqueta || b.nombre}</strong>
                      </div>
                      <span className="barrio-familias-count">
                        {countFam} {countFam === 1 ? 'familia' : 'familias'}
                      </span>
                    </div>
                    <div className="barra-progreso-fondo">
                      <div className="barra-progreso-relleno" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Columna Derecha: Flujos de Supervisión y Diagnósticos */}
        <section className="tarjeta seccion-panel">
          <div className="seccion-panel-cabecera">
            <div>
              <h2 className="h4">Acciones de Supervisión</h2>
              <p className="text-apagado text-sm">Herramientas docentes y clínicas</p>
            </div>
          </div>

          <div className="accesos-docentes-lista">
            <Link to="/central/familias" className="acceso-item">
              <div className="acceso-icono-box box-azul">
                <Users size={18} />
              </div>
              <div className="acceso-textos">
                <strong>Tabla de Familias y Seguimiento</strong>
                <p className="text-apagado text-sm">
                  Revisar estado de patrones, integrantes y exportar a CSV
                </p>
              </div>
              <ChevronRight size={18} className="acceso-flecha" />
            </Link>

            <Link to="/central/diagnosticos" className="acceso-item">
              <div className="acceso-icono-box box-lago">
                <Stethoscope size={18} />
              </div>
              <div className="acceso-textos">
                <strong>Asistente Diagnóstico NANDA en PES</strong>
                <p className="text-apagado text-sm">
                  Cruzar patrones alterados con diagnósticos NANDA y validar propuestas
                </p>
              </div>
              <ChevronRight size={18} className="acceso-flecha" />
            </Link>

            <Link to="/central/duplicados" className="acceso-item">
              <div className="acceso-icono-box box-alerta">
                <TrendingUp size={18} />
              </div>
              <div className="acceso-textos">
                <strong>Control de Duplicados en Terreno</strong>
                <p className="text-apagado text-sm">
                  Detectar y resolver coincidencias en apellidos y domicilios
                </p>
              </div>
              <ChevronRight size={18} className="acceso-flecha" />
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        .central-dashboard-stack {
          display: flex;
          flex-direction: column;
          gap: var(--sp-6);
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--sp-3);
        }

        .dashboard-titulo {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-1);
        }

        .dashboard-metricas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--sp-4);
        }

        .kpi-tarjeta {
          padding: var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
        }

        .kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kpi-etiqueta {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--apagado, #5B6B7C);
        }

        .kpi-icono {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-azul {
          background: color-mix(in srgb, var(--azul, #17375E) 12%, transparent);
          color: var(--azul, #17375E);
        }

        .kpi-lago {
          background: color-mix(in srgb, var(--lago, #1AA6A0) 15%, transparent);
          color: var(--lago, #1AA6A0);
        }

        .kpi-ok {
          background: color-mix(in srgb, var(--ok, #2F9E6B) 15%, transparent);
          color: var(--ok, #2F9E6B);
        }

        .kpi-alerta {
          background: color-mix(in srgb, var(--atencion, #C98A00) 15%, transparent);
          color: var(--atencion, #C98A00);
        }

        .kpi-valor {
          font-family: var(--fuente-titulo, serif);
          font-size: 2.25rem;
          font-weight: 700;
          color: var(--azul, #17375E);
          line-height: 1.1;
          margin-top: 4px;
        }

        .kpi-subtext {
          font-size: 0.78rem;
        }

        .dashboard-columnas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: var(--sp-6);
        }

        .seccion-panel {
          padding: var(--sp-5);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .seccion-panel-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--linea);
          padding-bottom: var(--sp-3);
        }

        .link-accion-panel {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--azul-medio, #3E6A9A);
          text-decoration: none;
        }

        .link-accion-panel:hover {
          text-decoration: underline;
        }

        .barrios-progreso-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .barrio-progreso-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .barrio-progreso-nombre {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
          color: var(--azul, #17375E);
        }

        .icono-cardinal {
          color: var(--lago, #1AA6A0);
        }

        .barrio-familias-count {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--apagado);
        }

        .barra-progreso-fondo {
          height: 6px;
          background: var(--linea, #D9E0E8);
          border-radius: 999px;
          overflow: hidden;
        }

        .barra-progreso-relleno {
          height: 100%;
          background: var(--lago, #1AA6A0);
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .accesos-docentes-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .acceso-item {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          padding: var(--sp-3);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .acceso-item:hover {
          background: color-mix(in srgb, var(--azul, #17375E) 4%, transparent);
          border-color: var(--azul-medio, #3E6A9A);
        }

        .acceso-icono-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .box-azul {
          background: color-mix(in srgb, var(--azul) 12%, transparent);
          color: var(--azul);
        }

        .box-lago {
          background: color-mix(in srgb, var(--lago) 15%, transparent);
          color: var(--lago);
        }

        .box-alerta {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
        }

        .acceso-textos {
          flex: 1;
        }

        .acceso-textos strong {
          color: var(--azul);
          font-size: 0.92rem;
          display: block;
        }

        .acceso-textos p {
          margin: 2px 0 0;
          font-size: 0.78rem;
          line-height: 1.3;
        }

        .acceso-flecha {
          color: var(--apagado);
        }
      `}</style>
    </div>
  )
}
