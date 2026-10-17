/**
 * Pantalla de inicio (placeholder para pasos 1-3)
 * DISENO_BASE.md §7.2 — INICIO
 */

import { APP_NAME } from '@/constants/app'
import { useAuth } from '@/contexts/AuthContext'
import esAR from '@/i18n/es-AR.json'

export function InicioPage() {
  const { usuario } = useAuth()
  const t = esAR

  return (
    <div className="stack">
      <header>
        <h1>Hola, {usuario?.nombre?.split(' ')[0] ?? 'valorador/a'}</h1>
        <p className="text-apagado">{APP_NAME} · {t.nav.inicio}</p>
      </header>
      <div className="tarjeta">
        <p>
          Scaffold listo. Los pasos 4–13 completarán esta pantalla con barrios,
          familias y pendientes.
        </p>
      </div>
    </div>
  )
}
