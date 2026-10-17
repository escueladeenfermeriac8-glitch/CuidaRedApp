/**
 * Pantalla de login
 * DISENO_BASE.md §7.2 paso 1: "login con Google, aviso breve de privacidad"
 */

import { APP_NAME } from '@/constants/app'
import { useAuth } from '@/contexts/AuthContext'
import esAR from '@/i18n/es-AR.json'

export function LoginPage() {
  const { login, error, estado } = useAuth()
  const t = esAR

  return (
    <div className="login-page">
      {/* Anillo decorativo de fondo */}
      <div className="login-anillo" aria-hidden="true">
        <AnilloDecorativo />
      </div>

      <main className="login-card tarjeta" aria-labelledby="login-titulo">
        {/* Logo placeholder hasta que haya marca definitiva */}
        <div className="login-logo" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="22" stroke="var(--lago)" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="4" fill="var(--lago)" />
            {/* 11 nodos del anillo */}
            {Array.from({ length: 11 }, (_, i) => {
              const angle = (i * 360) / 11 - 90
              const rad = (angle * Math.PI) / 180
              const x = 24 + 16 * Math.cos(rad)
              const y = 24 + 16 * Math.sin(rad)
              return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--azul-medio)" />
            })}
          </svg>
        </div>

        <h1 id="login-titulo">
          {t.auth.loginTitle.replace('{{appName}}', APP_NAME)}
        </h1>
        <p className="login-subtitulo text-apagado">{t.auth.loginSubtitle}</p>

        {/* Aviso de privacidad breve */}
        <p className="login-privacidad text-apagado" role="note">
          Solo guardamos apellido, parentesco, edad y domicilio para la valoración.
          Sin DNI ni nombres de pila.{' '}
          <span className="text-apagado">Ley 25.326 (Argentina).</span>
        </p>

        {/* Error de acceso */}
        {estado === 'sin_acceso' && (
          <div className="login-error" role="alert" aria-live="assertive">
            <span aria-hidden="true">🔒</span> {t.auth.noAccess}
          </div>
        )}

        {/* Error técnico */}
        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <button
          id="btn-login-google"
          className="btn btn-primary login-btn"
          onClick={login}
          disabled={estado === 'cargando'}
          aria-busy={estado === 'cargando'}
        >
          {estado === 'cargando' ? t.auth.loginLoading : t.auth.loginButton}
        </button>
      </main>

      <style>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-4);
          position: relative;
          overflow: hidden;
        }

        .login-anillo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.04;
          pointer-events: none;
          width: 600px;
          height: 600px;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: var(--sp-8);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          align-items: center;
          text-align: center;
        }

        .login-logo {
          margin-bottom: var(--sp-2);
        }

        .login-subtitulo {
          font-size: var(--text-md);
          line-height: var(--leading);
        }

        .login-privacidad {
          font-size: var(--text-xs);
          line-height: var(--leading);
          max-width: 30ch;
        }

        .login-btn {
          width: 100%;
          margin-top: var(--sp-2);
        }

        .login-error {
          width: 100%;
          padding: var(--sp-3);
          background-color: color-mix(in srgb, var(--critico) 8%, var(--tarjeta));
          border: 1px solid var(--critico);
          border-radius: var(--r-campo);
          color: var(--critico);
          font-size: var(--text-xs);
          font-weight: 700;
          display: flex;
          gap: var(--sp-2);
          align-items: flex-start;
        }
      `}</style>
    </div>
  )
}

// Anillo decorativo grande de fondo
function AnilloDecorativo() {
  return (
    <svg width="600" height="600" viewBox="0 0 600 600" fill="none">
      <circle cx="300" cy="300" r="220" stroke="var(--lago)" strokeWidth="1" />
      {Array.from({ length: 11 }, (_, i) => {
        const angle = (i * 360) / 11 - 90
        const rad = (angle * Math.PI) / 180
        const x = 300 + 220 * Math.cos(rad)
        const y = 300 + 220 * Math.sin(rad)
        const x2 = 300 + 200 * Math.cos(rad)
        const y2 = 300 + 200 * Math.sin(rad)
        return (
          <g key={i}>
            <line
              x1={x2} y1={y2}
              x2={300} y2={300}
              stroke="var(--lago)"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
            <circle cx={x} cy={y} r="8" fill="var(--lago)" />
          </g>
        )
      })}
    </svg>
  )
}
