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
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="status"
        aria-label="Cargando..."
      >
        <span className="text-apagado">Cargando...</span>
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
          <Route path="familias" element={<Placeholder titulo="Familias" />} />
          <Route
            path="pendientes"
            element={<Placeholder titulo="Pendientes" />}
          />
          <Route
            path="sincronizar"
            element={<Placeholder titulo="Sincronizar" />}
          />
          <Route path="perfil" element={<Placeholder titulo="Perfil" />} />
        </Route>

        {/* Central web — placeholder paso 12 */}
        <Route
          path="/central/*"
          element={<Placeholder titulo="Central (paso 12)" />}
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
