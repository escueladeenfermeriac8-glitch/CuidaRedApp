/**
 * Pantalla de login
 * DISENO_BASE.md §7.2 paso 1 + §3 (Alta cerrada) + §10 (Seguridad)
 */

import { APP_NAME } from '@/constants/app'
import { useAuth } from '@/contexts/AuthContext'
import esAR from '@/i18n/es-AR.json'
import { ShieldAlert, RefreshCw, LogIn, Lock, Sparkles, School, Compass } from 'lucide-react'

export function LoginPage() {
  const {
    login,
    loginDemo,
    cambiarCuenta,
    reintentarVerificacion,
    error,
    estado,
    firebaseUser,
    sesionCaducadaPorInactividad,
  } = useAuth()
  const t = esAR

  const cargando = estado === 'cargando'
  const sinAcceso = estado === 'sin_acceso'

  return (
    <div className="login-page">
      {/* Anillo decorativo de 11 nodos de fondo */}
      <div className="login-anillo" aria-hidden="true">
        <AnilloDecorativo />
      </div>

      <main className="login-card tarjeta" aria-labelledby="login-titulo">
        {/* Isotipo del anillo con 11 nodos */}
        <div className="login-logo" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="var(--lago)" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="6" fill="var(--lago)" />
            {Array.from({ length: 11 }, (_, i) => {
              const angle = (i * 360) / 11 - 90
              const rad = (angle * Math.PI) / 180
              const x = 32 + 20 * Math.cos(rad)
              const y = 32 + 20 * Math.sin(rad)
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={i % 2 === 0 ? 'var(--lago)' : 'var(--azul-medio)'}
                />
              )
            })}
          </svg>
        </div>

        <h1 id="login-titulo">
          {t.auth.loginTitle.replace('{{appName}}', APP_NAME)}
        </h1>
        <p className="login-subtitulo text-apagado">{t.auth.loginSubtitle}</p>

        {/* Aviso de caducidad de sesión por inactividad */}
        {sesionCaducadaPorInactividad && (
          <div className="login-alerta login-alerta-aviso" role="alert">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>{t.auth.inactivityNotice}</span>
          </div>
        )}

        {/* Estado: Sin invitación aprobada */}
        {sinAcceso && (
          <div className="login-alerta login-alerta-critica" role="alert" aria-live="assertive">
            <Lock size={18} aria-hidden="true" />
            <div className="login-alerta-texto">
              <strong>Acceso restringido</strong>
              <p>
                La cuenta <code>{firebaseUser?.email}</code> todavía no tiene una invitación activa.
              </p>
              <p className="text-apagado">{t.auth.noAccess}</p>
            </div>
          </div>
        )}

        {/* Error técnico o de conexión */}
        {error && (
          <div className="login-alerta login-alerta-critica" role="alert" aria-live="assertive">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Acciones principales */}
        <div className="login-acciones">
          {sinAcceso ? (
            <>
              <button
                id="btn-reintentar-acceso"
                type="button"
                className="btn btn-primary"
                onClick={reintentarVerificacion}
                disabled={cargando}
              >
                <RefreshCw size={16} className={cargando ? 'spin' : ''} aria-hidden="true" />
                {t.auth.retryAccess}
              </button>
              <button
                id="btn-cambiar-cuenta"
                type="button"
                className="btn btn-outline"
                onClick={cambiarCuenta}
                disabled={cargando}
              >
                <LogIn size={16} aria-hidden="true" />
                {t.auth.switchAccount}
              </button>
            </>
          ) : (
            <button
              id="btn-login-google"
              type="button"
              className="btn btn-primary login-btn"
              onClick={login}
              disabled={cargando}
              aria-busy={cargando}
            >
              {cargando ? (
                <>
                  <RefreshCw size={16} className="spin" aria-hidden="true" />
                  {t.auth.loginLoading}
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.24 10.285V13.8h6.887C18.2 16.14 15.64 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.53 0 2.92.57 3.99 1.51l2.67-2.67C17.26 3.29 14.92 2.4 12.24 2.4 6.96 2.4 2.64 6.72 2.64 12s4.32 9.6 9.6 9.6c5.52 0 9.12-3.88 9.12-9.28 0-.64-.06-1.12-.17-1.52H12.24z"/>
                  </svg>
                  {t.auth.loginButton}
                </>
              )}
            </button>
          )}
        </div>

        {/* Acceso rápido para pruebas locales */}
        <div
          className="login-demo-box tarjeta"
          style={{
            marginTop: 'var(--sp-4)',
            padding: 'var(--sp-3)',
            backgroundColor: 'var(--superficie-elevada)',
            border: '1px dashed var(--lago)',
            borderRadius: 'var(--rd-md)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--sp-2)',
              marginBottom: 'var(--sp-1)',
            }}
          >
            <Sparkles size={16} color="var(--lago)" aria-hidden="true" />
            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--texto-principal)' }}>
              Modo de prueba local (Demo)
            </strong>
          </div>
          <p className="text-apagado" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--sp-3)' }}>
            Podés recorrer la app inmediatamente sin configurar credenciales de Firebase:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
            <button
              id="btn-demo-estudiante"
              type="button"
              className="btn btn-outline"
              onClick={() => loginDemo('valorador')}
              style={{
                fontSize: 'var(--text-xs)',
                padding: 'var(--sp-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--sp-1)',
              }}
            >
              <Compass size={14} aria-hidden="true" />
              Estudiante (Campo)
            </button>
            <button
              id="btn-demo-docente"
              type="button"
              className="btn btn-outline"
              onClick={() => loginDemo('supervisor')}
              style={{
                fontSize: 'var(--text-xs)',
                padding: 'var(--sp-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--sp-1)',
              }}
            >
              <School size={14} aria-hidden="true" />
              Docente (Central)
            </button>
          </div>
        </div>

        {/* Aviso de confidencialidad y Ley 25.326 */}
        <div className="login-pie">
          <p className="login-privacidad text-apagado" role="note">
            Solo registramos apellido, parentesco, edad y domicilio para fines de cuidado y docencia en salud.
            Sin DNI ni nombres personales · Ley 25.326 de Protección de Datos Personales (Argentina).
          </p>
          <p className="login-bloqueo text-apagado">
            🔒 {t.auth.screenLockWarning}
          </p>
        </div>
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
          background-color: var(--fondo);
        }

        .login-anillo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.05;
          pointer-events: none;
          width: 600px;
          height: 600px;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          padding: var(--sp-8);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          align-items: center;
          text-align: center;
          box-shadow: 0 12px 36px rgba(23, 55, 94, 0.08);
          border-radius: var(--r-tarjeta);
        }

        .login-logo {
          margin-bottom: var(--sp-1);
        }

        .login-subtitulo {
          font-size: var(--text-md);
          line-height: var(--leading);
          margin-top: calc(-1 * var(--sp-2));
        }

        .login-alerta {
          width: 100%;
          padding: var(--sp-3) var(--sp-4);
          border-radius: var(--r-campo);
          font-size: var(--text-xs);
          display: flex;
          gap: var(--sp-3);
          align-items: flex-start;
          text-align: left;
        }

        .login-alerta-critica {
          background-color: color-mix(in srgb, var(--critico) 10%, var(--tarjeta));
          border: 1px solid var(--critico);
          color: var(--critico);
        }

        .login-alerta-aviso {
          background-color: color-mix(in srgb, var(--alerta) 12%, var(--tarjeta));
          border: 1px solid var(--alerta);
          color: var(--azul-profundo);
        }

        .login-alerta-texto {
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
        }

        .login-alerta-texto code {
          background: rgba(0, 0, 0, 0.06);
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .login-acciones {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
        }

        .login-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          min-height: 48px;
        }

        .login-pie {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
          padding-top: var(--sp-4);
          border-top: 1px solid var(--borde-suave);
        }

        .login-privacidad {
          font-size: 0.75rem;
          line-height: 1.4;
        }

        .login-bloqueo {
          font-size: 0.72rem;
          line-height: 1.4;
          font-style: italic;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

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
              x1={x2}
              y1={y2}
              x2={300}
              y2={300}
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
