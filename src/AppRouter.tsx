/**
 * Router principal de CuidaRed
 * DISENO_BASE.md §7.1
 *
 * Rutas del campo (mobile):
 *   / → Inicio
 *   /familias → Lista de familias
 *   /pendientes → Campanita de pendientes
 *   /sincronizar → Estado de sincronización
 *   /perfil → Perfil y logout
 *
 * Rutas de la central (desktop, P0/P1):
 *   /central/* → Panel, barrios, familias, diagnósticos, usuarios, catálogos
 *
 * Guarda de autenticación:
 *   - Si estado === 'cargando' → spinner
 *   - Si estado === 'sin_sesion' → /login
 *   - Si estado === 'sin_acceso' → /login (con mensaje)
 *   - Si estado === 'activo' → app
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { InicioPage } from '@/pages/InicioPage'
import { ValoracionComunidadPage } from '@/pages/comunidad/ValoracionComunidadPage'
import { FamiliasPage } from '@/pages/familias/FamiliasPage'
import { FichaFamiliarPage } from '@/pages/familias/FichaFamiliarPage'
import { ValoracionPatronesPage } from '@/pages/familias/ValoracionPatronesPage'
import { InstrumentosPage } from '@/pages/familias/InstrumentosPage'
import { PendientesPage } from '@/pages/pendientes/PendientesPage'
import { SincronizarPage } from '@/pages/sincronizar/SincronizarPage'
import { CentralLayout } from '@/layouts/CentralLayout'
import { CentralDashboardPage } from '@/pages/central/CentralDashboardPage'
import { CentralBarriosPage } from '@/pages/central/CentralBarriosPage'
import { CentralFamiliasPage } from '@/pages/central/CentralFamiliasPage'
import { CentralDiagnosticosPage } from '@/pages/central/CentralDiagnosticosPage'
import { CentralPlanPage } from '@/pages/central/CentralPlanPage'
import { CentralDuplicadosPage } from '@/pages/central/CentralDuplicadosPage'

// Placeholders de pasos 4-13
const Placeholder = ({ titulo }: { titulo: string }) => (
  <div className="stack">
    <h1>{titulo}</h1>
    <div className="tarjeta">
      <p className="text-apagado">Esta sección se implementa en los pasos 4–13.</p>
    </div>
  </div>
)

export function AppRouter() {
  const { estado } = useAuth()

  if (estado === 'cargando') {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-4)',
          backgroundColor: 'var(--fondo)',
        }}
        role="status"
        aria-live="polite"
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
          <circle cx="24" cy="24" r="20" stroke="var(--borde-suave)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" stroke="var(--lago)" strokeWidth="3" strokeDasharray="30 90" strokeLinecap="round" />
        </svg>
        <span className="text-apagado" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Verificando sesión...
        </span>
      </div>
    )
  }

  if (estado !== 'activo') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login (redirige al inicio si ya está autenticado) */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* App del campo */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<InicioPage />} />
          <Route path="comunidad/valorar" element={<ValoracionComunidadPage />} />
          <Route path="familias" element={<FamiliasPage />} />
          <Route path="familias/:famId" element={<FichaFamiliarPage />} />
          <Route path="familias/:famId/patrones" element={<ValoracionPatronesPage />} />
          <Route path="familias/:famId/instrumentos" element={<InstrumentosPage />} />
          <Route path="pendientes" element={<PendientesPage />} />
          <Route path="sincronizar" element={<SincronizarPage />} />
          <Route path="perfil" element={<Placeholder titulo="Perfil" />} />
        </Route>

        {/* Central web (desktop) */}
        <Route path="/central" element={<CentralLayout />}>
          <Route index element={<CentralDashboardPage />} />
          <Route path="barrios" element={<CentralBarriosPage />} />
          <Route path="familias" element={<CentralFamiliasPage />} />
          <Route path="diagnosticos" element={<CentralDiagnosticosPage />} />
          <Route path="familias/:famId/diagnosticos" element={<CentralDiagnosticosPage />} />
          <Route path="familias/:famId/plan" element={<CentralPlanPage />} />
          <Route path="duplicados" element={<CentralDuplicadosPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
