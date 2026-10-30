/**
 * Modal de Consentimiento Informado Familiar
 * DISENO_BASE.md §6.1, §10, P-01 de PENDIENTES.md y Ley 25.326
 */

import React, { useState } from 'react'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { Consentimiento } from '@/types'
import { ShieldCheck, Check, X, AlertCircle } from 'lucide-react'

interface ConsentimientoModalProps {
  abierto: boolean
  famId: string
  consentimientoActual?: Consentimiento
  onCerrar: () => void
  onConsentimientoGuardado: (c: Consentimiento) => void
}

export const ConsentimientoModal: React.FC<ConsentimientoModalProps> = ({
  abierto,
  famId,
  consentimientoActual,
  onCerrar,
  onConsentimientoGuardado,
}) => {
  const { firebaseUser } = useAuth()
  const [otorgado, setOtorgado] = useState<boolean>(consentimientoActual?.otorgado ?? false)
  const [modalidad, setModalidad] = useState<'oral' | 'escrito'>(
    consentimientoActual?.modalidad ?? 'oral'
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!abierto) return null

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otorgado) {
      setError('Se requiere la aceptación explícita de la familia para continuar.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const famRef = doc(db, 'familias', famId)
      const dataConsentimiento: Consentimiento = {
        otorgado: true,
        modalidad,
        fecha: Timestamp.now(),
        registradoPor: firebaseUser?.uid ?? 'anon',
      }

      await Promise.race([
        setDoc(famRef, { consentimiento: dataConsentimiento }, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      onConsentimientoGuardado(dataConsentimiento)
      onCerrar()
    } catch (err) {
      console.error('[Consentimiento] Error al guardar:', err)
      setError('No se pudo registrar el consentimiento. Reintentá.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-consentimiento-titulo">
      <div className="modal-contenido tarjeta">
        <header className="modal-cabecera">
          <div className="icono-consentimiento">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 id="modal-consentimiento-titulo" className="h3">
              Consentimiento Informado
            </h2>
            <p className="text-apagado" style={{ fontSize: 'var(--text-xs)' }}>
              Requisito ético y legal indispensable antes de registrar datos familiares
            </p>
          </div>
          <button
            type="button"
            className="btn-cerrar"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* Texto del consentimiento según protocolo y Ley 25.326 */}
        <div className="texto-protocolo-caja">
          <p>
            <strong>Propósito de la valoración:</strong> Las actividades de valoración familiar y comunitaria son realizadas por estudiantes y docentes de Enfermería de la UNRC en articulación con el Centro de Atención Primaria de la Salud (CAPS).
          </p>
          <p>
            <strong>Confidencialidad (Ley 25.326):</strong> Toda la información recabada se utilizará con fines estrictamente docentes, preventivos y de promoción de la salud. <em>No se solicitan números de documento de identidad (DNI) ni nombres de pila personales</em>, resguardando el secreto profesional y la privacidad familiar.
          </p>
          <p>
            <strong>Voluntariedad:</strong> La familia puede revocar su participación o negarse a responder preguntas específicas en cualquier momento sin que esto afecte su atención habitual en el centro de salud.
          </p>
        </div>

        <form onSubmit={handleGuardar} className="form-consentimiento">
          {error && (
            <div className="alerta-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="campo">
            <span className="campo-etiqueta">Modalidad de otorgamiento</span>
            <div className="selector-modalidad">
              <label className={`radio-opcion ${modalidad === 'oral' ? 'activo' : ''}`}>
                <input
                  type="radio"
                  name="modalidad"
                  value="oral"
                  checked={modalidad === 'oral'}
                  onChange={() => setModalidad('oral')}
                  disabled={guardando}
                />
                <span>Oral informado (explicado verbalmente en domicilio)</span>
              </label>

              <label className={`radio-opcion ${modalidad === 'escrito' ? 'activo' : ''}`}>
                <input
                  type="radio"
                  name="modalidad"
                  value="escrito"
                  checked={modalidad === 'escrito'}
                  onChange={() => setModalidad('escrito')}
                  disabled={guardando}
                />
                <span>Escrito / firmado en planilla papel</span>
              </label>
            </div>
          </div>

          <div className="campo-casilla">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={otorgado}
                onChange={(e) => setOtorgado(e.target.checked)}
                disabled={guardando}
              />
              <span className="checkbox-texto">
                <strong>Confirmo que el referente familiar ha sido debidamente informado</strong> y otorgó su consentimiento voluntario para iniciar la valoración.
              </span>
            </label>
          </div>

          <footer className="modal-pie">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando || !otorgado}
            >
              <Check size={16} />
              {guardando ? 'Registrando...' : 'Registrar consentimiento'}
            </button>
          </footer>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 24, 40, 0.6);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--sp-4);
        }

        .modal-contenido {
          width: 100%;
          max-width: 520px;
          max-height: 90dvh;
          overflow-y: auto;
          padding: var(--sp-6);
          border-radius: var(--r-tarjeta);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          box-shadow: 0 16px 48px rgba(0,0,0,0.22);
        }

        .modal-cabecera {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-3);
          position: relative;
        }

        .icono-consentimiento {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--lago) 15%, var(--tarjeta));
          color: var(--lago);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .btn-cerrar {
          position: absolute;
          right: 0;
          top: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--texto-secundario);
        }

        .texto-protocolo-caja {
          background: var(--fondo);
          padding: var(--sp-4);
          border-radius: var(--r-campo);
          border: 1px solid var(--borde-suave);
          font-size: 0.78rem;
          line-height: 1.45;
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          max-height: 180px;
          overflow-y: auto;
        }

        .form-consentimiento {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .selector-modalidad {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          margin-top: var(--sp-1);
        }

        .radio-opcion {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border: 1px solid var(--borde-suave);
          border-radius: var(--r-campo);
          font-size: 0.8rem;
          cursor: pointer;
          background: var(--tarjeta);
          transition: all 0.15s ease;
        }

        .radio-opcion.activo {
          border-color: var(--azul-profundo);
          background: color-mix(in srgb, var(--azul-profundo) 6%, var(--tarjeta));
        }

        .campo-casilla {
          padding: var(--sp-3);
          background: color-mix(in srgb, var(--lago) 8%, var(--tarjeta));
          border: 1px solid var(--lago);
          border-radius: var(--r-campo);
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-3);
          cursor: pointer;
        }

        .checkbox-texto {
          font-size: 0.8rem;
          line-height: 1.4;
          color: var(--azul-profundo);
        }

        .alerta-error {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          background: color-mix(in srgb, var(--critico) 10%, var(--tarjeta));
          border: 1px solid var(--critico);
          color: var(--critico);
          font-size: var(--text-xs);
        }

        .modal-pie {
          display: flex;
          justify-content: flex-end;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
        }
      `}</style>
    </div>
  )
}
