/**
 * CentralLayout — Layout de la Central Web para Supervisión y Docencia
 * DISENO_BASE.md §7.1, §7.3
 *
 * Características:
 * - Barra lateral izquierda (Sidebar) desktop-first
 * - Navegación a: Panel, Barrios, Familias, Diagnósticos & Plan, Duplicados
 * - Indicador de usuario y acceso rápido a la app de campo
 * - Encabezado superior con título de sección y estado de la red
 */

import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Compass,
  Users,
  Stethoscope,
  CopyCheck,
  Smartphone,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSync } from '@/hooks/useSync'

export function CentralLayout() {
  const { usuario, logout } = useAuth()
  const { isOnline } = useSync()
  const navigate = useNavigate()

  return (
    <div className="central-layout-root">
      {/* Barra lateral de navegación (Sidebar) */}
      <aside className="central-sidebar" aria-label="Navegación de la central">
        <div className="sidebar-cabecera">
          <Link to="/central" className="sidebar-marca">
            <div className="marca-logo-circulo">
              <Building2 size={20} strokeWidth={2.2} />
            </div>
            <div className="marca-textos">
              <span className="marca-nombre">CuidaRed</span>
              <span className="marca-sub">Central Docente</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-seccion-label">Supervisión y Gestión</div>

          <NavLink
            to="/central"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} strokeWidth={1.8} />
            <span>Panel general</span>
          </NavLink>

          <NavLink
            to="/central/barrios"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Compass size={18} strokeWidth={1.8} />
            <span>Barrios y FODA</span>
          </NavLink>

          <NavLink
            to="/central/familias"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Users size={18} strokeWidth={1.8} />
            <span>Familias (Tabla)</span>
          </NavLink>

          <NavLink
            to="/central/diagnosticos"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Stethoscope size={18} strokeWidth={1.8} />
            <span>Diagnósticos NANDA</span>
          </NavLink>

          <NavLink
            to="/central/duplicados"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <CopyCheck size={18} strokeWidth={1.8} />
            <span>Fusión de duplicados</span>
          </NavLink>
        </nav>

        {/* Pie del Sidebar: usuario y volver a campo */}
        <div className="sidebar-pie">
          <div className="usuario-tarjeta-mini">
            <div className="usuario-avatar">
              {usuario?.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="usuario-detalles">
              <strong className="usuario-nombre">{usuario?.nombre ?? 'Docente / Supervisor'}</strong>
              <span className="usuario-rol">
                <ShieldCheck size={12} /> {usuario?.rol ?? 'supervisor'}
              </span>
            </div>
          </div>

          <div className="sidebar-acciones-pie">
            <button
              type="button"
              className="btn-ir-campo"
              onClick={() => navigate('/')}
              title="Volver a la vista de campo para móviles"
            >
              <Smartphone size={16} />
              <span>App de campo</span>
            </button>
            <button
              type="button"
              className="btn-logout-mini"
              onClick={logout}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Área principal de contenido */}
      <div className="central-contenedor-principal">
        <header className="central-topbar">
          <div className="topbar-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span className="badge-modo-central">Central Docente</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--sp-1)',
                padding: 'var(--sp-1) var(--sp-3)',
                fontSize: '0.82rem',
                backgroundColor: 'var(--superficie)',
              }}
              title="Ir al flujo de campo móvil para cargar familias y visitas"
            >
              <Smartphone size={14} />
              <span>Ir a Vista de Campo</span>
            </button>
            {!isOnline && (
              <span className="badge-offline-central">Sin conexión · Modo lectura</span>
            )}
          </div>
          <div className="topbar-caps">
            <span className="text-apagado text-sm">
              CAPS asignados: <strong>{usuario?.capsIds?.join(', ') || 'Todos'}</strong>
            </span>
          </div>
        </header>

        <main className="central-contenido" id="central-main">
          <Outlet />
        </main>
      </div>

      <style>{`
        .central-layout-root {
          display: flex;
          min-height: 100vh;
          background: var(--papel, #F5F7FA);
          color: var(--tinta, #0B1F33);
        }

        .central-sidebar {
          width: 260px;
          background: var(--tarjeta, #FFFFFF);
          border-right: 1px solid var(--linea, #D9E0E8);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar-cabecera {
          padding: var(--sp-4);
          border-bottom: 1px solid var(--linea, #D9E0E8);
        }

        .sidebar-marca {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          text-decoration: none;
          color: inherit;
        }

        .marca-logo-circulo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--azul, #17375E);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marca-nombre {
          font-family: var(--fuente-titulo, serif);
          font-weight: 700;
          font-size: 1.15rem;
          color: var(--azul, #17375E);
          display: block;
          line-height: 1.2;
        }

        .marca-sub {
          font-size: 0.72rem;
          color: var(--apagado, #5B6B7C);
          font-weight: 600;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--sp-3) var(--sp-2);
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .sidebar-seccion-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--apagado, #5B6B7C);
          padding: var(--sp-2) var(--sp-3) var(--sp-1);
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: var(--r-campo, 10px);
          color: var(--apagado, #5B6B7C);
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .sidebar-link:hover {
          background: color-mix(in srgb, var(--azul, #17375E) 6%, transparent);
          color: var(--azul, #17375E);
        }

        .sidebar-link.active {
          background: color-mix(in srgb, var(--azul, #17375E) 12%, transparent);
          color: var(--azul, #17375E);
          font-weight: 700;
        }

        .sidebar-pie {
          padding: var(--sp-3);
          border-top: 1px solid var(--linea, #D9E0E8);
          background: color-mix(in srgb, var(--papel, #F5F7FA) 50%, var(--tarjeta));
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .usuario-tarjeta-mini {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .usuario-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--azul-medio, #3E6A9A);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .usuario-detalles {
          display: flex;
          flex-direction: column;
          font-size: 0.78rem;
          overflow: hidden;
        }

        .usuario-nombre {
          color: var(--tinta, #0B1F33);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .usuario-rol {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: var(--lago, #1AA6A0);
          font-weight: 600;
          font-size: 0.7rem;
        }

        .sidebar-acciones-pie {
          display: flex;
          gap: 6px;
        }

        .btn-ir-campo {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 10px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--azul, #17375E);
          background: var(--tarjeta);
          border: 1px solid var(--linea);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-ir-campo:hover {
          background: color-mix(in srgb, var(--azul, #17375E) 8%, var(--tarjeta));
        }

        .btn-logout-mini {
          padding: 6px 9px;
          background: transparent;
          border: 1px solid var(--linea);
          border-radius: 8px;
          color: var(--apagado);
          cursor: pointer;
        }

        .btn-logout-mini:hover {
          color: var(--critico);
          background: color-mix(in srgb, var(--critico) 10%, transparent);
        }

        .central-contenedor-principal {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .central-topbar {
          height: 54px;
          background: var(--tarjeta);
          border-bottom: 1px solid var(--linea);
          padding: 0 var(--sp-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .topbar-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge-modo-central {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--azul, #17375E);
          background: color-mix(in srgb, var(--azul) 10%, transparent);
          padding: 2px 8px;
          border-radius: 999px;
        }

        .badge-offline-central {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--atencion, #C98A00);
          background: color-mix(in srgb, var(--atencion) 12%, transparent);
          padding: 2px 8px;
          border-radius: 999px;
        }

        .central-contenido {
          flex: 1;
          padding: var(--sp-6);
          overflow-y: auto;
        }

        @media (max-width: 820px) {
          .central-sidebar {
            width: 72px;
          }
          .marca-textos, .sidebar-seccion-label, .sidebar-link span, .usuario-detalles, .btn-ir-campo span {
            display: none;
          }
          .central-sidebar .sidebar-cabecera {
            padding: var(--sp-3) var(--sp-2);
            display: flex;
            justify-content: center;
          }
          .sidebar-link {
            justify-content: center;
            padding: 10px;
          }
          .sidebar-pie {
            padding: var(--sp-2);
          }
          .usuario-tarjeta-mini {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
