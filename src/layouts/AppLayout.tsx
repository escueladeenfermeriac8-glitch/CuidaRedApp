/**
 * Layout principal de la aplicación (campo — mobile)
 * DISENO_BASE.md §7.1: barra inferior con 5 destinos
 * DISENO_BASE.md §7.5: franja superior con estado de conexión y contador de pendientes
 */

import { NavLink, Link, Outlet } from 'react-router-dom'
import { Home, Users, Bell, RefreshCw, User, WifiOff, CloudSync, CloudUpload } from 'lucide-react'
import { useSync } from '@/hooks/useSync'
import esAR from '@/i18n/es-AR.json'

export function AppLayout() {
  const { isOnline, sincronizando, pendientesCount } = useSync()
  const t = esAR

  return (
    <div className="app-layout">
      {/* Franja superior de estado offline / sincronización */}
      {!isOnline ? (
        <Link
          to="/sincronizar"
          className="franja-offline"
          role="status"
          aria-live="polite"
          title="Ver estado detallado de sincronización"
        >
          <WifiOff size={13} strokeWidth={2.2} aria-hidden="true" />
          <span>
            {t.sync.offline}
            {pendientesCount > 0
              ? ` · ${pendientesCount} ${pendientesCount === 1 ? 'pendiente' : 'pendientes'}`
              : ''}
          </span>
        </Link>
      ) : sincronizando ? (
        <Link
          to="/sincronizar"
          className="franja-offline franja-sincronizando"
          role="status"
          aria-live="polite"
        >
          <CloudSync size={13} strokeWidth={2.2} className="icono-spin" aria-hidden="true" />
          <span>Conectado · Sincronizando datos con la central...</span>
        </Link>
      ) : pendientesCount > 0 ? (
        <Link
          to="/sincronizar"
          className="franja-offline franja-pendientes"
          role="status"
          aria-live="polite"
        >
          <CloudUpload size={13} strokeWidth={2.2} aria-hidden="true" />
          <span>
            {pendientesCount} {pendientesCount === 1 ? 'registro pendiente' : 'registros pendientes'} de envío · Tocá para sincronizar
          </span>
        </Link>
      ) : null}

      {/* Contenido principal */}
      <main className="app-main" id="main-content">
        <Outlet />
      </main>

      {/* Barra de navegación inferior */}
      <nav
        className="nav-bottom"
        aria-label="Navegación principal"
      >
        <NavLink
          to="/"
          end
          id="nav-inicio"
          aria-label={t.nav.inicio}
        >
          <Home size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.nav.inicio}</span>
        </NavLink>

        <NavLink
          to="/familias"
          id="nav-familias"
          aria-label={t.nav.familias}
        >
          <Users size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.nav.familias}</span>
        </NavLink>

        <NavLink
          to="/pendientes"
          id="nav-pendientes"
          aria-label={t.nav.pendientes}
        >
          <Bell size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.nav.pendientes}</span>
        </NavLink>

        <NavLink
          to="/sincronizar"
          id="nav-sincronizar"
          aria-label={t.nav.sincronizar}
          className={({ isActive }) => `nav-sincronizar-link ${isActive ? 'active' : ''}`}
        >
          <div className="icono-nav-badge-wrapper">
            <RefreshCw size={22} strokeWidth={1.75} aria-hidden="true" />
            {pendientesCount > 0 && (
              <span className="dot-badge-pendientes" aria-hidden="true">
                {pendientesCount > 9 ? '+9' : pendientesCount}
              </span>
            )}
          </div>
          <span>{t.nav.sincronizar}</span>
        </NavLink>

        <NavLink
          to="/perfil"
          id="nav-perfil"
          aria-label={t.nav.perfil}
        >
          <User size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.nav.perfil}</span>
        </NavLink>
      </nav>

      <style>{`
        .franja-offline {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          cursor: pointer;
        }

        .franja-sincronizando {
          background-color: var(--lago, #1AA6A0);
        }

        .franja-pendientes {
          background-color: var(--azul-medio, #3E6A9A);
        }

        .icono-spin {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .icono-nav-badge-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .dot-badge-pendientes {
          position: absolute;
          top: -3px;
          right: -7px;
          background: var(--critico, #C8392F);
          color: white;
          font-size: 0.62rem;
          font-weight: 700;
          line-height: 1;
          padding: 2px 4px;
          border-radius: 999px;
          min-width: 14px;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
