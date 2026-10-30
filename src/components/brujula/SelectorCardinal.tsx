/**
 * Selector visual de punto cardinal con rosa de los vientos / brújula
 * DISENO_BASE.md §7.2 paso 2: "selector visual de brújula"
 */

import React from 'react'
import type { Cardinal } from '@/types'

interface SelectorCardinalProps {
  valor: Cardinal
  onChange: (nuevoCardinal: Cardinal) => void
  disabled?: boolean
}

const CARDINALES: { id: Cardinal; etiqueta: string; angulo: number }[] = [
  { id: 'N', etiqueta: 'Norte', angulo: 0 },
  { id: 'NE', etiqueta: 'Noreste', angulo: 45 },
  { id: 'E', etiqueta: 'Este', angulo: 90 },
  { id: 'SE', etiqueta: 'Sureste', angulo: 135 },
  { id: 'S', etiqueta: 'Sur', angulo: 180 },
  { id: 'SO', etiqueta: 'Suroeste', angulo: 225 },
  { id: 'O', etiqueta: 'Oeste', angulo: 270 },
  { id: 'NO', etiqueta: 'Noroeste', angulo: 315 },
]

export const SelectorCardinal: React.FC<SelectorCardinalProps> = ({
  valor,
  onChange,
  disabled = false,
}) => {
  const actual = CARDINALES.find((c) => c.id === valor) ?? CARDINALES[0]

  return (
    <div className="selector-cardinal-contenedor">
      <div className="brujula-visual" aria-hidden="true">
        {/* Esfera exterior */}
        <div className="brujula-disco">
          {/* Aguja orientable */}
          <div
            className="brujula-aguja"
            style={{
              transform: `rotate(${actual.angulo}deg)`,
            }}
          >
            <div className="aguja-punta aguja-norte" />
            <div className="aguja-centro" />
            <div className="aguja-punta aguja-sur" />
          </div>
        </div>

        <div className="brujula-etiqueta-central">
          <span className="cardinal-codigo">{valor}</span>
          <span className="cardinal-nombre">{actual.etiqueta}</span>
        </div>
      </div>

      {/* Botones táctiles de selección rápida */}
      <div
        className="cardinales-grilla"
        role="radiogroup"
        aria-label="Punto cardinal del barrio"
      >
        {CARDINALES.map((c) => {
          const seleccionado = c.id === valor
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={seleccionado}
              className={`btn-cardinal ${seleccionado ? 'activo' : ''}`}
              onClick={() => onChange(c.id)}
              disabled={disabled}
            >
              <span className="btn-cardinal-sigla">{c.id}</span>
              <span className="btn-cardinal-sub">{c.etiqueta}</span>
            </button>
          )
        })}
      </div>

      <style>{`
        .selector-cardinal-contenedor {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-4);
          width: 100%;
        }

        .brujula-visual {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brujula-disco {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          border: 2px dashed var(--borde-fuerte);
          background: color-mix(in srgb, var(--lago) 5%, var(--tarjeta));
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);
        }

        .brujula-aguja {
          width: 10px;
          height: 100px;
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
        }

        .aguja-punta {
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
        }

        .aguja-norte {
          border-bottom: 44px solid var(--alerta, #C85A32);
        }

        .aguja-sur {
          border-top: 44px solid var(--azul-medio, #3E6A9A);
        }

        .aguja-centro {
          width: 12px;
          height: 12px;
          background: var(--azul-profundo);
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          z-index: 2;
        }

        .brujula-etiqueta-central {
          position: absolute;
          bottom: -22px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--tarjeta);
          padding: 2px 10px;
          border-radius: var(--r-capsula);
          border: 1px solid var(--borde-suave);
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .cardinal-codigo {
          font-weight: 800;
          color: var(--azul-profundo);
          font-size: 0.85rem;
        }

        .cardinal-nombre {
          font-size: 0.75rem;
          color: var(--texto-secundario);
        }

        .cardinales-grilla {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--sp-2);
          width: 100%;
          margin-top: var(--sp-2);
        }

        .btn-cardinal {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--sp-2) var(--sp-1);
          border: 1px solid var(--borde-suave);
          background: var(--tarjeta);
          border-radius: var(--r-campo);
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 52px;
        }

        .btn-cardinal:hover:not(:disabled) {
          border-color: var(--lago);
          background: color-mix(in srgb, var(--lago) 6%, var(--tarjeta));
        }

        .btn-cardinal.activo {
          background: var(--azul-profundo);
          color: #FFFFFF;
          border-color: var(--azul-profundo);
          box-shadow: 0 2px 8px rgba(23, 55, 94, 0.25);
        }

        .btn-cardinal-sigla {
          font-weight: 800;
          font-size: 0.95rem;
        }

        .btn-cardinal-sub {
          font-size: 0.65rem;
          opacity: 0.85;
        }
      `}</style>
    </div>
  )
}
