/**
 * Modal para dar de alta un barrio con su punto cardinal
 * DISENO_BASE.md §7.2 paso 2
 */

import React, { useState } from 'react'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { normalizarTexto } from '@/lib/normalizacion'
import { SelectorCardinal } from '@/components/brujula/SelectorCardinal'
import type { Barrio, Cardinal } from '@/types'
import { X, Check, AlertCircle } from 'lucide-react'

interface ModalCrearBarrioProps {
  abierto: boolean
  capsIdActual: string
  onCerrar: () => void
  onBarrioCreado: (barrio: Barrio) => void
  barriosExistentes?: Barrio[]
}

export const ModalCrearBarrio: React.FC<ModalCrearBarrioProps> = ({
  abierto,
  capsIdActual,
  onCerrar,
  onBarrioCreado,
  barriosExistentes = [],
}) => {
  const { usuario, firebaseUser } = useAuth()
  const [nombre, setNombre] = useState('')
  const [cardinal, setCardinal] = useState<Cardinal>('S')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!abierto) return null

  // Previsualización de etiqueta
  const nombreLimpio = nombre.trim()
  const etiquetaPreview = nombreLimpio
    ? `Barrio ${nombreLimpio} (${obtenerNombreCardinal(cardinal)})`
    : ''

  const claveUnicaCalculada = nombreLimpio
    ? `${normalizarTexto(nombreLimpio)}-${cardinal.toLowerCase()}`
    : ''

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreLimpio) {
      setError('Ingresá el nombre del barrio.')
      return
    }

    // Verificar si ya existe en la misma org y CAPS
    const existe = barriosExistentes.some(
      (b) => b.claveUnica === claveUnicaCalculada
    )
    if (existe) {
      setError(`Ya existe un barrio con esa denominación (${etiquetaPreview}).`)
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const nuevoBarrioRef = doc(collection(db, 'barrios'))
      const nuevoBarrioData: Omit<Barrio, 'createdAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>
      } = {
        orgId: usuario?.orgId ?? 'org_default',
        capsId: capsIdActual,
        nombre: nombreLimpio,
        cardinal,
        etiqueta: etiquetaPreview,
        claveUnica: claveUnicaCalculada,
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
        schemaVersion: 1,
        createdAt: serverTimestamp(),
      }

      await Promise.race([
        setDoc(nuevoBarrioRef, nuevoBarrioData),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const barrioCreado: Barrio = {
        ...nuevoBarrioData,
        id: nuevoBarrioRef.id,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
      }

      onBarrioCreado(barrioCreado)
      setNombre('')
      onCerrar()
    } catch (err) {
      console.error('[Barrios] Error al crear barrio:', err)
      setError('No se pudo guardar el barrio. Comprobá tu conexión o reintentá.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-barrio-titulo">
      <div className="modal-contenido tarjeta">
        <header className="modal-cabecera">
          <h2 id="modal-barrio-titulo" className="h3">Nuevo barrio</h2>
          <button
            type="button"
            className="btn-cerrar"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleGuardar} className="modal-form">
          {error && (
            <div className="alerta-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="campo">
            <label htmlFor="input-nombre-barrio" className="campo-etiqueta">
              Nombre del barrio
            </label>
            <input
              id="input-nombre-barrio"
              type="text"
              className="input-control"
              placeholder="Ej. Alberdi, Banda Norte, Oncativo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={guardando}
              autoFocus
            />
            <span className="campo-ayuda">Sin abreviaturas ni prefijos</span>
          </div>

          <div className="campo">
            <span className="campo-etiqueta">Punto cardinal / Ubicación relativa</span>
            <SelectorCardinal valor={cardinal} onChange={setCardinal} disabled={guardando} />
          </div>

          {etiquetaPreview && (
            <div className="preview-tarjeta">
              <span className="preview-label">Etiqueta registrada:</span>
              <strong className="preview-valor">{etiquetaPreview}</strong>
              <small className="preview-clave">Clave única: {claveUnicaCalculada}</small>
            </div>
          )}

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
              disabled={guardando || !nombreLimpio}
            >
              <Check size={16} />
              {guardando ? 'Guardando...' : 'Crear barrio'}
            </button>
          </footer>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 24, 40, 0.55);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--sp-4);
        }

        .modal-contenido {
          width: 100%;
          max-width: 480px;
          max-height: 90dvh;
          overflow-y: auto;
          padding: var(--sp-6);
          border-radius: var(--r-tarjeta);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          box-shadow: 0 16px 48px rgba(0,0,0,0.2);
        }

        .modal-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-cerrar {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--texto-secundario);
          padding: var(--sp-1);
          border-radius: 50%;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
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

        .preview-tarjeta {
          padding: var(--sp-3);
          background: color-mix(in srgb, var(--lago) 8%, var(--tarjeta));
          border: 1px solid var(--lago);
          border-radius: var(--r-campo);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .preview-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--texto-secundario);
        }

        .preview-valor {
          color: var(--azul-profundo);
          font-size: 0.95rem;
        }

        .preview-clave {
          font-size: 0.7rem;
          color: var(--texto-secundario);
          font-family: monospace;
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

function obtenerNombreCardinal(c: Cardinal): string {
  switch (c) {
    case 'N': return 'Norte'
    case 'NE': return 'Noreste'
    case 'E': return 'Este'
    case 'SE': return 'Sureste'
    case 'S': return 'Sur'
    case 'SO': return 'Suroeste'
    case 'O': return 'Oeste'
    case 'NO': return 'Noroeste'
  }
}
