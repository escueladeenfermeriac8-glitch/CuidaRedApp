/**
 * Sección de Vivienda, Cartografía y Foto del Genograma (P0)
 * DISENO_BASE.md §6.4, §7.2 paso 7 y Anexo I
 */

import React, { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Vivienda, Cartografia } from '@/types'
import {
  Home,
  MapPin,
  Camera,
  Check,
  AlertTriangle,
  Trash2,
  HelpCircle,
} from 'lucide-react'

interface ViviendaCartografiaSectionProps {
  famId: string
  viviendaActual?: Vivienda
  cartografiaActual?: Cartografia
  convivientesRegistrados?: number
  onGuardado?: (vivienda: Vivienda, cartografia: Cartografia) => void
}

export const ViviendaCartografiaSection: React.FC<ViviendaCartografiaSectionProps> = ({
  famId,
  viviendaActual,
  cartografiaActual,
  convivientesRegistrados = 1,
  onGuardado,
}) => {
  const [tipo, setTipo] = useState(viviendaActual?.tipo ?? 'Casa')
  const [tenencia, setTenencia] = useState(viviendaActual?.tenencia ?? 'Propia')
  const [cantHabitaciones, setCantHabitaciones] = useState<string>(
    viviendaActual?.cantHabitaciones ? String(viviendaActual.cantHabitaciones) : '2'
  )
  const [cantConvivientes, setCantConvivientes] = useState<string>(
    viviendaActual?.cantConvivientes
      ? String(viviendaActual.cantConvivientes)
      : String(convivientesRegistrados || 1)
  )

  // Servicios
  const [aguaPotable, setAguaPotable] = useState(viviendaActual?.aguaPotable ?? true)
  const [cloacas, setCloacas] = useState(viviendaActual?.cloacas ?? false)
  const [electricidad, setElectricidad] = useState(viviendaActual?.electricidad ?? true)
  const [gas, setGas] = useState(viviendaActual?.gas ?? false)
  const [recoleccionResiduos, setRecoleccionResiduos] = useState(
    viviendaActual?.recoleccionResiduos ?? true
  )
  const [observacionesVivienda, setObservacionesVivienda] = useState(
    viviendaActual?.observaciones ?? ''
  )

  // Cartografía y Genograma Foto
  const [ubicacion, setUbicacion] = useState<'urbana' | 'periurbana' | 'rural'>(
    cartografiaActual?.ubicacion ?? 'urbana'
  )
  const [referencias, setReferencias] = useState(cartografiaActual?.referencias ?? '')
  const [fotoUrl, setFotoUrl] = useState<string>(cartografiaActual?.fotoUrl ?? '')

  const [guardando, setGuardando] = useState(false)
  const [mensajeOk, setMensajeOk] = useState(false)
  const [procesandoFoto, setProcesandoFoto] = useState(false)

  // Cálculo de hacinamiento
  const habNum = parseInt(cantHabitaciones, 10) || 1
  const convNum = parseInt(cantConvivientes, 10) || 1
  const indiceHacinamiento = (convNum / habNum).toFixed(1)
  const esHacinamientoCritico = convNum / habNum > 3
  const esHacinamientoModerado = convNum / habNum >= 2 && convNum / habNum <= 3

  // Compresión de imagen client-side (P0: Offline compatible)
  const handleFotoSeleccionada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcesandoFoto(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 1200
        let width = img.width
        let height = img.height

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width)
          width = MAX_DIM
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height)
          height = MAX_DIM
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75)
        setFotoUrl(compressedBase64)
        setProcesandoFoto(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const nuevaVivienda: Vivienda = {
      tipo,
      tenencia,
      cantHabitaciones: habNum,
      cantConvivientes: convNum,
      aguaPotable,
      cloacas,
      electricidad,
      gas,
      recoleccionResiduos,
      observaciones: observacionesVivienda,
    }

    const nuevaCartografia: Cartografia = {
      ubicacion,
      referencias,
      fotoUrl,
    }

    try {
      const famRef = doc(db, 'familias', famId)
      await updateDoc(famRef, {
        vivienda: nuevaVivienda,
        cartografia: nuevaCartografia,
        updatedAt: serverTimestamp(),
      })

      if (onGuardado) {
        onGuardado(nuevaVivienda, nuevaCartografia)
      }

      setMensajeOk(true)
      setTimeout(() => setMensajeOk(false), 2500)
    } catch (err) {
      console.error('[Vivienda] Error al guardar:', err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="vivienda-cartografia-seccion">
      {/* Módulo Vivienda */}
      <div className="tarjeta bloque-seccion">
        <header className="bloque-header">
          <Home size={22} className="icono-titulo" />
          <div>
            <h3 className="h4">Condiciones de la Vivienda</h3>
            <p className="text-apagado" style={{ fontSize: 'var(--text-xs)' }}>
              Estructura habitacional, servicios y factores ambientales del hogar
            </p>
          </div>
        </header>

        <div className="fila-dos">
          <div className="campo">
            <label htmlFor="select-tipo-viv" className="campo-etiqueta">
              Tipo de vivienda
            </label>
            <select
              id="select-tipo-viv"
              className="input-control"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={guardando}
            >
              <option value="Casa">Casa</option>
              <option value="Departamento">Departamento</option>
              <option value="Casilla / Vivienda precaria">Casilla / Vivienda precaria</option>
              <option value="Pieza en conventillo / Inquilinato">Pieza en conventillo / Inquilinato</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="select-tenencia" className="campo-etiqueta">
              Régimen de tenencia
            </label>
            <select
              id="select-tenencia"
              className="input-control"
              value={tenencia}
              onChange={(e) => setTenencia(e.target.value)}
              disabled={guardando}
            >
              <option value="Propia">Propia</option>
              <option value="Alquilada">Alquilada</option>
              <option value="Prestada / Cedida">Prestada / Cedida</option>
              <option value="Ocupación de hecho">Ocupación de hecho</option>
            </select>
          </div>
        </div>

        {/* Habitaciones, Convivientes e Índice de Hacinamiento */}
        <div className="fila-dos">
          <div className="campo">
            <label htmlFor="input-habitaciones" className="campo-etiqueta">
              Habitaciones para dormir
            </label>
            <input
              id="input-habitaciones"
              type="number"
              min="1"
              max="20"
              className="input-control"
              value={cantHabitaciones}
              onChange={(e) => setCantHabitaciones(e.target.value)}
              disabled={guardando}
            />
          </div>

          <div className="campo">
            <label htmlFor="input-convivientes" className="campo-etiqueta">
              Personas convivientes
            </label>
            <input
              id="input-convivientes"
              type="number"
              min="1"
              max="30"
              className="input-control"
              value={cantConvivientes}
              onChange={(e) => setCantConvivientes(e.target.value)}
              disabled={guardando}
            />
          </div>
        </div>

        {/* Indicador de hacinamiento */}
        <div
          className={`alerta-hacinamiento ${
            esHacinamientoCritico
              ? 'critico'
              : esHacinamientoModerado
              ? 'moderado'
              : 'normal'
          }`}
        >
          {esHacinamientoCritico ? (
            <AlertTriangle size={18} />
          ) : esHacinamientoModerado ? (
            <HelpCircle size={18} />
          ) : (
            <Check size={18} />
          )}
          <div>
            <strong>Índice de hacinamiento: {indiceHacinamiento} personas por habitación</strong>
            <p>
              {esHacinamientoCritico
                ? 'Hacinamiento crítico (> 3 personas/habitación): factor de riesgo sanitario.'
                : esHacinamientoModerado
                ? 'Hacinamiento moderado (2 a 3 personas/habitación).'
                : 'Sin hacinamiento significativo (< 2 personas/habitación).'}
            </p>
          </div>
        </div>

        {/* Servicios Básicos */}
        <div className="campo">
          <span className="campo-etiqueta">Servicios básicos disponibles</span>
          <div className="servicios-grilla">
            <label className="checkbox-servicio">
              <input
                type="checkbox"
                checked={aguaPotable}
                onChange={(e) => setAguaPotable(e.target.checked)}
                disabled={guardando}
              />
              <span>Agua potable de red</span>
            </label>

            <label className="checkbox-servicio">
              <input
                type="checkbox"
                checked={cloacas}
                onChange={(e) => setCloacas(e.target.checked)}
                disabled={guardando}
              />
              <span>Red cloacal</span>
            </label>

            <label className="checkbox-servicio">
              <input
                type="checkbox"
                checked={electricidad}
                onChange={(e) => setElectricidad(e.target.checked)}
                disabled={guardando}
              />
              <span>Electricidad</span>
            </label>

            <label className="checkbox-servicio">
              <input
                type="checkbox"
                checked={gas}
                onChange={(e) => setGas(e.target.checked)}
                disabled={guardando}
              />
              <span>Gas de red</span>
            </label>

            <label className="checkbox-servicio">
              <input
                type="checkbox"
                checked={recoleccionResiduos}
                onChange={(e) => setRecoleccionResiduos(e.target.checked)}
                disabled={guardando}
              />
              <span>Recolección de basura</span>
            </label>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="input-obs-vivienda" className="campo-etiqueta">
            Observaciones habitacionales
          </label>
          <textarea
            id="input-obs-vivienda"
            className="input-control"
            rows={2}
            placeholder="Ej. Techo de chapa con aislación, ventilación e iluminación adecuadas..."
            value={observacionesVivienda}
            onChange={(e) => setObservacionesVivienda(e.target.value)}
            disabled={guardando}
          />
        </div>
      </div>

      {/* Módulo Cartografía y Foto del Genograma (P0) */}
      <div className="tarjeta bloque-seccion">
        <header className="bloque-header">
          <MapPin size={22} className="icono-titulo" />
          <div>
            <h3 className="h4">Cartografía y Genograma en Terreno</h3>
            <p className="text-apagado" style={{ fontSize: 'var(--text-xs)' }}>
              Entorno territorial y registro fotográfico del genograma realizado a mano (P0)
            </p>
          </div>
        </header>

        <div className="campo">
          <label htmlFor="select-ubicacion" className="campo-etiqueta">
            Zona de ubicación
          </label>
          <select
            id="select-ubicacion"
            className="input-control"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value as any)}
            disabled={guardando}
          >
            <option value="urbana">Urbana</option>
            <option value="periurbana">Periurbana</option>
            <option value="rural">Rural</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="input-referencias" className="campo-etiqueta">
            Referencias territoriales de llegada / Croquis
          </label>
          <textarea
            id="input-referencias"
            className="input-control"
            rows={3}
            placeholder="Ej. Casa de rejas verdes frente a la canchita, portón de madera, entre calles..."
            value={referencias}
            onChange={(e) => setReferencias(e.target.value)}
            disabled={guardando}
          />
        </div>

        {/* Captura de Foto del Genograma (P0) */}
        <div className="campo">
          <span className="campo-etiqueta">Foto del genograma dibujado en papel (P0)</span>
          <p className="text-apagado" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--sp-2)' }}>
            Sacá una foto clara del genograma dibujado en la planilla para adjuntarlo a la ficha y al PDF.
          </p>

          {fotoUrl ? (
            <div className="foto-preview-contenedor">
              <img src={fotoUrl} alt="Foto del genograma" className="foto-preview-img" />
              <div className="foto-preview-acciones">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setFotoUrl('')}
                  disabled={guardando}
                >
                  <Trash2 size={14} /> Quitar foto
                </button>
              </div>
            </div>
          ) : (
            <label className="boton-adjuntar-foto">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoSeleccionada}
                disabled={guardando || procesandoFoto}
                style={{ display: 'none' }}
              />
              <Camera size={24} />
              <span>{procesandoFoto ? 'Optimizando foto...' : 'Sacar o adjuntar foto del genograma'}</span>
            </label>
          )}
        </div>
      </div>

      {/* Botón de guardado */}
      <footer className="footer-vivienda">
        {mensajeOk && (
          <span className="mensaje-ok">
            <Check size={16} /> Datos de vivienda y genograma guardados
          </span>
        )}
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          <Check size={16} />
          {guardando ? 'Guardando...' : 'Guardar vivienda y cartografía'}
        </button>
      </footer>

      <style>{`
        .vivienda-cartografia-seccion {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .bloque-seccion {
          padding: var(--sp-5);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .bloque-header {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          border-bottom: 1px solid var(--borde-suave);
          padding-bottom: var(--sp-3);
        }

        .icono-titulo {
          color: var(--azul-profundo);
        }

        .fila-dos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-3);
        }

        @media (max-width: 550px) {
          .fila-dos {
            grid-template-columns: 1fr;
          }
        }

        .alerta-hacinamiento {
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          display: flex;
          gap: var(--sp-2);
          align-items: flex-start;
          font-size: var(--text-xs);
        }

        .alerta-hacinamiento.normal {
          background: color-mix(in srgb, var(--lago) 10%, var(--tarjeta));
          border: 1px solid var(--lago);
          color: var(--lago);
        }

        .alerta-hacinamiento.moderado {
          background: color-mix(in srgb, var(--alerta) 12%, var(--tarjeta));
          border: 1px solid var(--alerta);
          color: var(--azul-profundo);
        }

        .alerta-hacinamiento.critico {
          background: color-mix(in srgb, var(--critico) 10%, var(--tarjeta));
          border: 1px solid var(--critico);
          color: var(--critico);
        }

        .servicios-grilla {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--sp-2);
          margin-top: var(--sp-1);
        }

        .checkbox-servicio {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .boton-adjuntar-foto {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          padding: var(--sp-6);
          border: 2px dashed var(--borde-fuerte);
          border-radius: var(--r-campo);
          cursor: pointer;
          background: color-mix(in srgb, var(--lago) 5%, var(--tarjeta));
          color: var(--azul-profundo);
          font-weight: 600;
          font-size: 0.85rem;
          transition: background 0.15s ease;
        }

        .boton-adjuntar-foto:hover {
          background: color-mix(in srgb, var(--lago) 12%, var(--tarjeta));
        }

        .foto-preview-contenedor {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-3);
          background: var(--fondo);
          border-radius: var(--r-campo);
        }

        .foto-preview-img {
          max-width: 100%;
          max-height: 280px;
          border-radius: 4px;
          border: 1px solid var(--borde-suave);
          object-fit: contain;
        }

        .footer-vivienda {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
        }

        .mensaje-ok {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--lago);
          font-weight: 600;
          font-size: var(--text-xs);
        }
      `}</style>
    </form>
  )
}
