/**
 * Layout principal de la aplicación (campo — mobile)
 * DISENO_BASE.md §7.1: barra inferior con 5 destinos
 */

import { NavLink, Outlet } from 'react-router-dom'
import { Home, Users, Bell, RefreshCw, User } from 'lucide-react'
import { useSync } from '@/hooks/useSync'
import esAR from '@/i18n/es-AR.json'

export function AppLayout() {
  const { isOnline } = useSync()
  const t = esAR

  return (
    <div className="app-layout">
      {/* Franja offline */}
      {!isOnline && (
        <div className="franja-offline" role="status" aria-live="polite">
          {t.sync.offline}
        </div>
      )}

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
        >
          <RefreshCw size={22} strokeWidth={1.75} aria-hidden="true" />
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
    </div>
  )
}
