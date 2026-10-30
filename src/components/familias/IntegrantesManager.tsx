/**
 * Gestor de Integrantes de la Familia y Vínculos del Genograma
 * DISENO_BASE.md §6.4, §7.2 paso 6 y ADENDA_GENOGRAMA.md §3 y §5
 */

import React, { useState, useEffect } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  validarGenograma,
  type IntegranteConId,
  type ResultadoValidacion,
} from '@/lib/genograma-validaciones'
import type {
  Integrante,
  Pareja,
  SexoBiologico,
  TipoFiliacion,
  Condicion,
} from '@/types'
import {
  UserPlus,
  Users,
  AlertTriangle,
  Trash2,
  X,
  Plus,
  Square,
  Circle,
  HelpCircle,
} from 'lucide-react'

interface IntegrantesManagerProps {
  famId: string
  orgId: string
  onCambioIntegrantes?: (integrantes: IntegranteConId[]) => void
}

const PARENTESCOS_COMUNES = [
  'Referente (Índice)',
  'Cónyuge / Pareja',
  'Hijo / Hija',
  'Madre',
  'Padre',
  'Hermano / Hermana',
  'Abuelo / Abuela',
  'Nieto / Nieta',
  'Tío / Tía',
  'Sobrino / Sobrina',
  'Familiar político',
  'Conviviente no familiar',
]

const CONDICIONES_FRECUENTES = [
  'Hipertensión arterial',
  'Diabetes',
  'Asma / EPOC',
  'Tabaquismo',
  'Consumo problemático',
  'Obesidad',
  'Discapacidad motriz',
  'Embarazo actual',
  'Adulto mayor frágil',
]

export const IntegrantesManager: React.FC<IntegrantesManagerProps> = ({
  famId,
  orgId,
  onCambioIntegrantes,
}) => {
  const { firebaseUser } = useAuth()
  const [integrantes, setIntegrantes] = useState<IntegranteConId[]>([])
  const [parejas, setParejas] = useState<Pareja[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // Formulario nuevo integrante
  const [parentesco, setParentesco] = useState('Hijo / Hija')
  const [sexo, setSexo] = useState<SexoBiologico>('mujer')
  const [edadAprox, setEdadAprox] = useState<string>('')
  const [conviveActual, setConviveActual] = useState(true)
  const [esIndice, setEsIndice] = useState(false)
  const [fallecido, setFallecido] = useState(false)
  const [madreId, setMadreId] = useState<string>('')
  const [padreId, setPadreId] = useState<string>('')
  const [tipoFiliacion, setTipoFiliacion] = useState<TipoFiliacion>('biologica')
  const [condicionesSeleccionadas, setCondicionesSeleccionadas] = useState<string[]>([])
  const [otraCondicion, setOtraCondicion] = useState('')

  // Suscripción reactiva a integrantes y parejas de Firestore
  useEffect(() => {
    setCargando(true)
    const intColRef = collection(db, 'familias', famId, 'integrantes')
    const parColRef = collection(db, 'familias', famId, 'parejas')

    const unsubInt = onSnapshot(
      intColRef,
      (snap) => {
        const listaInt: IntegranteConId[] = []
        snap.forEach((d) => {
          listaInt.push({ id: d.id, ...(d.data() as Integrante) })
        })
        setIntegrantes(listaInt)
        if (onCambioIntegrantes) {
          onCambioIntegrantes(listaInt)
        }
        setCargando(false)
      },
      (err) => {
        console.warn('[Integrantes] Error al cargar integrantes:', err)
        setCargando(false)
      }
    )

    const unsubPar = onSnapshot(
      parColRef,
      (snap) => {
        const listaPar: Pareja[] = []
        snap.forEach((d) => {
          listaPar.push({ id: d.id, ...(d.data() as Pareja) })
        })
        setParejas(listaPar)
      },
      (err) => console.warn('[Parejas] Error al cargar parejas:', err)
    )

    return () => {
      unsubInt()
      unsubPar()
    }
  }, [famId])

  // Validación clínica en tiempo real (ADENDA §5)
  const validacion: ResultadoValidacion = React.useMemo(() => {
    return validarGenograma(integrantes, parejas)
  }, [integrantes, parejas])

  // Toggle de condición frecuente
  const toggleCondicion = (c: string) => {
    setCondicionesSeleccionadas((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    )
  }

  // Guardar nuevo integrante
  const handleGuardarIntegrante = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorForm(null)

    if (esIndice && integrantes.some((i) => i.esIndice)) {
      setErrorForm('Ya existe una persona índice en esta familia. Solo puede haber una.')
      return
    }

    setGuardando(true)

    try {
      const nuevoRef = doc(collection(db, 'familias', famId, 'integrantes'))

      // Ensamblar condiciones
      const listaCondiciones: Condicion[] = condicionesSeleccionadas.map((nombre) => ({
        nombre,
        tipo: 'factor_riesgo',
        estado: 'actual',
      }))
      if (otraCondicion.trim()) {
        listaCondiciones.push({
          nombre: otraCondicion.trim(),
          tipo: 'otro',
          estado: 'actual',
        })
      }

      const edadNum = edadAprox ? parseInt(edadAprox, 10) : null

      const nuevoIntegranteData: Omit<Integrante, 'createdAt'> & {
        createdAt: Timestamp
      } = {
        famId,
        orgId,
        parentesco,
        sexo,
        edadAprox: isNaN(edadNum as any) ? null : edadNum,
        conviveActual,
        esIndice,
        fallecido,
        madreId: madreId || null,
        padreId: padreId || null,
        tipoFiliacion,
        condiciones: listaCondiciones,
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
        schemaVersion: 1,
        createdAt: Timestamp.now(),
      }

      await Promise.race([
        setDoc(nuevoRef, nuevoIntegranteData),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      // Reset form
      setParentesco('Hijo / Hija')
      setSexo('mujer')
      setEdadAprox('')
      setConviveActual(true)
      setEsIndice(false)
      setFallecido(false)
      setMadreId('')
      setPadreId('')
      setCondicionesSeleccionadas([])
      setOtraCondicion('')
      setModalAbierto(false)
    } catch (err) {
      console.error('[Integrantes] Error al guardar integrante:', err)
      setErrorForm('Error al guardar en el dispositivo. Reintentá.')
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar integrante
  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar este integrante del registro familiar?')) return
    try {
      await Promise.race([
        deleteDoc(doc(db, 'familias', famId, 'integrantes', id)),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])
    } catch (err) {
      console.error('[Integrantes] Error al eliminar:', err)
    }
  }

  return (
    <div className="integrantes-contenedor">
      {/* Alertas de validación de genograma */}
      {validacion.errores.length > 0 && (
        <div className="alerta-validacion alerta-critica" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Inconsistencia en el árbol familiar:</strong>
            <ul>
              {validacion.errores.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {validacion.advertencias.length > 0 && validacion.errores.length === 0 && (
        <div className="alerta-validacion alerta-aviso" role="status">
          <HelpCircle size={18} />
          <div>
            <span>Recomendaciones del genograma:</span>
            <ul>
              {validacion.advertencias.map((adv, i) => (
                <li key={i}>{adv}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Cabecera de integrantes con botón agregar */}
      <div className="integrantes-cabecera">
        <div>
          <h3 className="h4">Integrantes de la familia</h3>
          <p className="text-apagado" style={{ fontSize: 'var(--text-xs)' }}>
            Registrados: {integrantes.length} persona{integrantes.length !== 1 ? 's' : ''} (con o sin convivencia)
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setErrorForm(null)
            const hayIndice = integrantes.some((i) => i.esIndice)
            setEsIndice(!hayIndice)
            setParentesco(!hayIndice ? 'Referente (Índice)' : 'Hijo / Hija')
            setModalAbierto(true)
          }}
        >
          <UserPlus size={16} /> Agregar integrante
        </button>
      </div>

      {/* Listado de integrantes */}
      {cargando ? (
        <div className="cargando-integrantes text-apagado">Cargando integrantes...</div>
      ) : integrantes.length === 0 ? (
        <div className="tarjeta estado-vacio">
          <Users size={32} className="text-apagado" />
          <p className="text-apagado">Todavía no agregaste integrantes a esta familia.</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              const hayIndice = integrantes.some((i) => i.esIndice)
              setEsIndice(!hayIndice)
              setParentesco(!hayIndice ? 'Referente (Índice)' : 'Hijo / Hija')
              setModalAbierto(true)
            }}
          >
            Agregar primera persona (referente)
          </button>
        </div>
      ) : (
        <div className="integrantes-grilla">
          {integrantes.map((int) => {
            const madre = integrantes.find((m) => m.id === int.madreId)
            const padre = integrantes.find((p) => p.id === int.padreId)

            return (
              <div key={int.id} className={`tarjeta integrante-card ${int.esIndice ? 'es-indice' : ''}`}>
                <div className="integrante-top">
                  <div className="simbolo-genograma" title={int.sexo === 'varon' ? 'Varón (cuadrado)' : 'Mujer (círculo)'}>
                    {int.sexo === 'varon' ? (
                      <Square size={20} className={int.fallecido ? 'tachado' : ''} />
                    ) : (
                      <Circle size={20} className={int.fallecido ? 'tachado' : ''} />
                    )}
                  </div>

                  <div className="integrante-titulares">
                    <div className="parentesco-fila">
                      <strong className="integrante-parentesco">{int.parentesco}</strong>
                      {int.esIndice && <span className="badge-indice">Índice</span>}
                      {int.fallecido && <span className="badge-fallecido">Fallecido/a</span>}
                    </div>
                    <span className="integrante-edad text-apagado">
                      {int.edadAprox ? `${int.edadAprox} años` : 'Edad no informada'} ·{' '}
                      {int.conviveActual ? 'Convive en este hogar' : 'No convive'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-borrar-int"
                    onClick={() => handleEliminar(int.id)}
                    title="Eliminar integrante"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Filiación (Madre / Padre) */}
                {(madre || padre) && (
                  <div className="integrante-filiacion text-apagado">
                    <small>
                      Hijo/a de:{' '}
                      {madre ? `Madre (${madre.parentesco})` : ''}
                      {madre && padre ? ' y ' : ''}
                      {padre ? `Padre (${padre.parentesco})` : ''}
                    </small>
                  </div>
                )}

                {/* Condiciones de salud */}
                {int.condiciones && int.condiciones.length > 0 && (
                  <div className="condiciones-tags">
                    {int.condiciones.map((c, i) => (
                      <span key={i} className="condicion-tag">
                        {c.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Alta Rápida de Integrante */}
      {modalAbierto && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-int-titulo">
          <div className="modal-contenido tarjeta">
            <header className="modal-cabecera">
              <h2 id="modal-int-titulo" className="h3">Nuevo integrante</h2>
              <button
                type="button"
                className="btn-cerrar"
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleGuardarIntegrante} className="modal-form">
              {errorForm && (
                <div className="alerta-validacion alerta-critica" role="alert">
                  <AlertTriangle size={16} />
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Parentesco y Sexo */}
              <div className="fila-dos">
                <div className="campo">
                  <label htmlFor="select-parentesco" className="campo-etiqueta">
                    Parentesco con el referente
                  </label>
                  <select
                    id="select-parentesco"
                    className="input-control"
                    value={parentesco}
                    onChange={(e) => setParentesco(e.target.value)}
                    disabled={guardando}
                  >
                    {PARENTESCOS_COMUNES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor="select-sexo" className="campo-etiqueta">
                    Símbolo / Sexo biológico
                  </label>
                  <select
                    id="select-sexo"
                    className="input-control"
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value as SexoBiologico)}
                    disabled={guardando}
                  >
                    <option value="mujer">Mujer (Círculo)</option>
                    <option value="varon">Varón (Cuadrado)</option>
                    <option value="desconocido">Desconocido (Rombo)</option>
                  </select>
                </div>
              </div>

              {/* Edad y Convivencia */}
              <div className="fila-dos">
                <div className="campo">
                  <label htmlFor="input-edad" className="campo-etiqueta">
                    Edad aproximada (años)
                  </label>
                  <input
                    id="input-edad"
                    type="number"
                    min="0"
                    max="125"
                    className="input-control"
                    placeholder="Ej. 34"
                    value={edadAprox}
                    onChange={(e) => setEdadAprox(e.target.value)}
                    disabled={guardando}
                  />
                </div>

                <div className="campo-checks-fila">
                  <label className="checkbox-mini">
                    <input
                      type="checkbox"
                      checked={conviveActual}
                      onChange={(e) => setConviveActual(e.target.checked)}
                      disabled={guardando}
                    />
                    <span>¿Convive en el hogar?</span>
                  </label>

                  <label className="checkbox-mini">
                    <input
                      type="checkbox"
                      checked={fallecido}
                      onChange={(e) => setFallecido(e.target.checked)}
                      disabled={guardando}
                    />
                    <span>¿Fallecido/a?</span>
                  </label>

                  <label className="checkbox-mini">
                    <input
                      type="checkbox"
                      checked={esIndice}
                      onChange={(e) => setEsIndice(e.target.checked)}
                      disabled={guardando}
                    />
                    <span>¿Persona índice / referente?</span>
                  </label>
                </div>
              </div>

              {/* Vínculos de filiación si hay otros integrantes */}
              {integrantes.length > 0 && (
                <div className="bloque-filiacion">
                  <span className="campo-etiqueta">Vínculos de filiación en el árbol</span>
                  <div className="fila-dos">
                    <div className="campo">
                      <label htmlFor="select-madre" className="campo-sub-etiqueta">
                        Madre
                      </label>
                      <select
                        id="select-madre"
                        className="input-control"
                        value={madreId}
                        onChange={(e) => setMadreId(e.target.value)}
                        disabled={guardando}
                      >
                        <option value="">(No definida / No registrada)</option>
                        {integrantes
                          .filter((i) => i.sexo === 'mujer')
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.parentesco} ({m.edadAprox ? `${m.edadAprox}a` : 'sin edad'})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="campo">
                      <label htmlFor="select-padre" className="campo-sub-etiqueta">
                        Padre
                      </label>
                      <select
                        id="select-padre"
                        className="input-control"
                        value={padreId}
                        onChange={(e) => setPadreId(e.target.value)}
                        disabled={guardando}
                      >
                        <option value="">(No definido / No registrado)</option>
                        {integrantes
                          .filter((i) => i.sexo === 'varon')
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.parentesco} ({p.edadAprox ? `${p.edadAprox}a` : 'sin edad'})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="campo" style={{ marginTop: 'var(--sp-2)' }}>
                    <label htmlFor="select-tipo-filiacion" className="campo-sub-etiqueta">
                      Tipo de filiación
                    </label>
                    <select
                      id="select-tipo-filiacion"
                      className="input-control"
                      value={tipoFiliacion}
                      onChange={(e) => setTipoFiliacion(e.target.value as TipoFiliacion)}
                      disabled={guardando}
                    >
                      <option value="biologica">Biológica (trazo continuo)</option>
                      <option value="adoptiva">Adoptiva (trazo discontinuo)</option>
                      <option value="otra">Otra / Cuidado informal</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Condiciones de salud rápidas */}
              <div className="campo">
                <span className="campo-etiqueta">Condiciones o factores de riesgo relevantes</span>
                <div className="chips-condiciones">
                  {CONDICIONES_FRECUENTES.map((c) => {
                    const seleccionado = condicionesSeleccionadas.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`chip-condicion ${seleccionado ? 'activo' : ''}`}
                        onClick={() => toggleCondicion(c)}
                        disabled={guardando}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  className="input-control"
                  style={{ marginTop: 'var(--sp-2)' }}
                  placeholder="Otra condición o diagnóstico..."
                  value={otraCondicion}
                  onChange={(e) => setOtraCondicion(e.target.value)}
                  disabled={guardando}
                />
              </div>

              <footer className="modal-pie">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando}
                >
                  <Plus size={16} />
                  {guardando ? 'Guardando...' : 'Agregar al registro'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .integrantes-contenedor {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .integrantes-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alerta-validacion {
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          display: flex;
          gap: var(--sp-2);
          align-items: flex-start;
          font-size: var(--text-xs);
        }

        .alerta-critica {
          background: color-mix(in srgb, var(--critico) 10%, var(--tarjeta));
          border: 1px solid var(--critico);
          color: var(--critico);
        }

        .alerta-aviso {
          background: color-mix(in srgb, var(--alerta) 12%, var(--tarjeta));
          border: 1px solid var(--alerta);
          color: var(--azul-profundo);
        }

        .alerta-validacion ul {
          margin: 4px 0 0 16px;
          padding: 0;
        }

        .integrantes-grilla {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .integrante-card {
          padding: var(--sp-3);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .integrante-card.es-indice {
          border-left: 4px solid var(--lago);
        }

        .integrante-top {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }

        .simbolo-genograma {
          color: var(--azul-profundo);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .simbolo-genograma .tachado {
          opacity: 0.4;
          text-decoration: line-through;
        }

        .integrante-titulares {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .parentesco-fila {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        .badge-indice {
          background: var(--lago);
          color: #FFF;
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: var(--r-capsula);
          font-weight: 700;
        }

        .badge-fallecido {
          background: var(--texto-secundario);
          color: #FFF;
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: var(--r-capsula);
        }

        .btn-borrar-int {
          background: transparent;
          border: none;
          color: var(--texto-secundario);
          cursor: pointer;
          padding: 4px;
        }

        .btn-borrar-int:hover {
          color: var(--critico);
        }

        .integrante-filiacion {
          font-size: 0.72rem;
          padding-left: 28px;
        }

        .condiciones-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding-left: 28px;
        }

        .condicion-tag {
          font-size: 0.68rem;
          background: color-mix(in srgb, var(--alerta) 10%, var(--fondo));
          color: var(--alerta);
          border: 1px solid var(--alerta);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .estado-vacio {
          padding: var(--sp-6);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--sp-2);
        }

        /* Modal styles */
        .fila-dos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-3);
        }

        @media (max-width: 500px) {
          .fila-dos {
            grid-template-columns: 1fr;
          }
        }

        .campo-checks-fila {
          display: flex;
          flex-direction: column;
          gap: 6px;
          justify-content: center;
        }

        .checkbox-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          cursor: pointer;
        }

        .bloque-filiacion {
          background: var(--fondo);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .campo-sub-etiqueta {
          font-size: 0.72rem;
          color: var(--texto-secundario);
        }

        .chips-condiciones {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .chip-condicion {
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: var(--r-capsula);
          border: 1px solid var(--borde-suave);
          background: var(--tarjeta);
          cursor: pointer;
        }

        .chip-condicion.activo {
          background: var(--azul-profundo);
          color: #FFF;
          border-color: var(--azul-profundo);
        }
      `}</style>
    </div>
  )
}
