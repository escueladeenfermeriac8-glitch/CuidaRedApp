/**
 * Pantalla de Valoración Comunitaria por Patrones Funcionales y Asistente FODA
 * DISENO_BASE.md §6.5, §7.2 paso 3, Anexo B y Anexo D
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import guiaComunitaria from '@/catalogos/guiaComunitaria.json'
import bancoFoda from '@/catalogos/bancoFODA.json'
import type {
  Barrio,
  ValoracionComunidad,
  PatronComunidad,
  Foda,
  ItemFoda,
} from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Trash2,
} from 'lucide-react'

export function ValoracionComunidadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { usuario, firebaseUser } = useAuth()

  const [barrioSeleccionado, setBarrioSeleccionado] = useState<Barrio | null>(null)
  const [pasoActual, setPasoActual] = useState<number>(1) // 1..11 patrones, 12 = FODA
  const [guardando, setGuardando] = useState(false)
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)
  const [valoracionId, setValoracionId] = useState<string>('')

  // Estado de los 11 patrones
  const [patrones, setPatrones] = useState<Record<string, PatronComunidad>>(() => {
    const inicial: Record<string, PatronComunidad> = {}
    for (let i = 1; i <= 11; i++) {
      inicial[`p${i}`] = {
        subjetivos: '',
        objetivos: '',
        observaciones: '',
        fuente: '',
        alterado: false,
        justificacion: '',
      }
    }
    return inicial
  })

  // Estado del FODA
  const [foda, setFoda] = useState<Foda>({
    fortalezas: [],
    debilidades: [],
    oportunidades: [],
    amenazas: [],
  })

  // Respuestas del banco de preguntas FODA (preguntaId -> { respuesta: 'A'|'B'|'C', fuentes: string[], afectaVulnerables: boolean, evidencia: string })
  const [respuestasBanco, setRespuestasBanco] = useState<
    Record<
      string,
      {
        respuesta: 'A' | 'B' | 'C'
        fuentes: string[]
        afectaVulnerables: boolean
        evidencia: string
      }
    >
  >({})

  // Cargar barrios disponibles
  useEffect(() => {
    async function cargarBarrios() {
      try {
        const orgId = usuario?.orgId ?? 'org_default'
        const q = query(collection(db, 'barrios'), where('orgId', '==', orgId))
        const snap = await getDocs(q)
        const lista: Barrio[] = []
        snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as Barrio) }))

        const paramBarrioId = searchParams.get('barrioId')
        if (paramBarrioId) {
          const match = lista.find((b) => b.id === paramBarrioId)
          if (match) setBarrioSeleccionado(match)
        } else if (lista.length > 0) {
          setBarrioSeleccionado(lista[0])
        }
      } catch (err) {
        console.error('[Comunidad] Error al cargar barrios:', err)
      }
    }
    cargarBarrios()
  }, [usuario, searchParams])

  // Cargar valoración existente o crear ID
  useEffect(() => {
    const bId = barrioSeleccionado?.id
    if (!bId) return

    async function cargarValoracion(id: string) {
      const valId = `val_${id}`
      setValoracionId(valId)
      try {
        const ref = doc(db, 'barrios', id, 'valoracionesComunidad', valId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data() as ValoracionComunidad
          if (data.patrones) {
            setPatrones((prev) => ({ ...prev, ...data.patrones }))
          }
          if (data.foda) {
            setFoda(data.foda)
          }
        }
      } catch (err) {
        console.error('[Comunidad] Error al cargar valoración:', err)
      }
    }

    cargarValoracion(bId)
  }, [barrioSeleccionado])

  // Guardar en Firestore (autoguardado offline)
  const guardar = useCallback(
    async (esFinal: boolean = false) => {
      const bId = barrioSeleccionado?.id
      if (!bId || !valoracionId) return
      setGuardando(true)
      try {
        const ref = doc(db, 'barrios', bId, 'valoracionesComunidad', valoracionId)
        const data: Omit<ValoracionComunidad, 'createdAt' | 'fecha'> & {
          createdAt?: ReturnType<typeof serverTimestamp>
          fecha: ReturnType<typeof serverTimestamp>
        } = {
          barrioId: bId,
          orgId: usuario?.orgId ?? 'org_default',
          patrones,
          foda,
          estado: esFinal ? 'final' : 'borrador',
          version: 1,
          autorId: firebaseUser?.uid ?? 'anon',
          fecha: serverTimestamp(),
          createdBy: firebaseUser?.uid ?? 'anon',
          deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
          schemaVersion: 1,
        }

        await setDoc(ref, data, { merge: true })
        setGuardadoExitoso(true)
        setTimeout(() => setGuardadoExitoso(false), 2500)
      } catch (err) {
        console.error('[Comunidad] Error al autoguardar:', err)
      } finally {
        setGuardando(false)
      }
    },
    [barrioSeleccionado, valoracionId, patrones, foda, usuario, firebaseUser]
  )

  // Autoguardar automáticamente al cambiar de paso
  const cambiarPaso = (nuevoPaso: number) => {
    guardar(false)
    setPasoActual(nuevoPaso)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Generar Fortalezas y Debilidades a partir de patrones (Anexo B.2)
  const generarFodaDesdePatrones = () => {
    const fortalezasGeneradas: ItemFoda[] = []
    const debilidadesGeneradas: ItemFoda[] = []

    guiaComunitaria.patrones.forEach((p) => {
      const datos = patrones[`p${p.n}`]
      if (!datos) return

      if (datos.alterado && datos.justificacion.trim()) {
        debilidadesGeneradas.push({
          id: `deb_p${p.n}`,
          texto: `Patrón ${p.n} (${p.nombre}): ${datos.justificacion.trim()}`,
          patrones: [p.n],
          prioridad: 3,
          fuentes: datos.fuente ? [datos.fuente] : [],
          evidencia: datos.justificacion.trim(),
          afectaVulnerables: false,
          origen: 'patron',
        })
      } else if (!datos.alterado && datos.justificacion.trim()) {
        fortalezasGeneradas.push({
          id: `fort_p${p.n}`,
          texto: `Patrón ${p.n} (${p.nombre}): ${datos.justificacion.trim()}`,
          patrones: [p.n],
          prioridad: 3,
          fuentes: datos.fuente ? [datos.fuente] : [],
          evidencia: datos.justificacion.trim(),
          afectaVulnerables: false,
          origen: 'patron',
        })
      }
    })

    // Procesar banco de Oportunidades y Amenazas respondidas (Anexo B.4)
    const oportunidadesGeneradas: ItemFoda[] = []
    const amenazasGeneradas: ItemFoda[] = []

    Object.entries(respuestasBanco).forEach(([pregId, r]) => {
      const qConfig = bancoFoda.preguntas.find((pq) => pq.id === pregId)
      if (!qConfig) return

      let basePrioridad = 1
      if (qConfig.tipo === 'R') {
        if (r.respuesta === 'A') {
          basePrioridad = 3
          oportunidadesGeneradas.push({
            id: `op_${pregId}`,
            texto: `${qConfig.pregunta} (Existe y es accesible)`,
            patrones: qConfig.patrones,
            prioridad: Math.min(5, basePrioridad + (r.fuentes.length >= 2 ? 1 : 0) + (r.afectaVulnerables ? 1 : 0)),
            fuentes: r.fuentes,
            evidencia: r.evidencia,
            afectaVulnerables: r.afectaVulnerables,
            origen: 'banco',
            preguntaId: pregId,
          })
        } else if (r.respuesta === 'B') {
          basePrioridad = 2
          oportunidadesGeneradas.push({
            id: `op_${pregId}`,
            texto: `${qConfig.pregunta} (Oportunidad condicionada: fortalecer o quitar barreras)`,
            patrones: qConfig.patrones,
            prioridad: Math.min(5, basePrioridad + (r.fuentes.length >= 2 ? 1 : 0) + (r.afectaVulnerables ? 1 : 0)),
            fuentes: r.fuentes,
            evidencia: r.evidencia,
            afectaVulnerables: r.afectaVulnerables,
            origen: 'banco',
            preguntaId: pregId,
          })
        } else if (r.respuesta === 'C') {
          amenazasGeneradas.push({
            id: `am_${pregId}`,
            texto: `Carencia del entorno: ${qConfig.pregunta}`,
            patrones: qConfig.patrones,
            prioridad: 2,
            fuentes: r.fuentes,
            evidencia: r.evidencia,
            afectaVulnerables: r.afectaVulnerables,
            origen: 'banco',
            preguntaId: pregId,
          })
        }
      } else if (qConfig.tipo === 'K') {
        if (r.respuesta === 'A') {
          basePrioridad = 3
          amenazasGeneradas.push({
            id: `am_${pregId}`,
            texto: `Amenaza alta: ${qConfig.pregunta}`,
            patrones: qConfig.patrones,
            prioridad: Math.min(5, basePrioridad + (r.fuentes.length >= 2 ? 1 : 0) + (r.afectaVulnerables ? 1 : 0)),
            fuentes: r.fuentes,
            evidencia: r.evidencia,
            afectaVulnerables: r.afectaVulnerables,
            origen: 'banco',
            preguntaId: pregId,
          })
        } else if (r.respuesta === 'B') {
          basePrioridad = 2
          amenazasGeneradas.push({
            id: `am_${pregId}`,
            texto: `Amenaza moderada: ${qConfig.pregunta}`,
            patrones: qConfig.patrones,
            prioridad: Math.min(5, basePrioridad + (r.fuentes.length >= 2 ? 1 : 0) + (r.afectaVulnerables ? 1 : 0)),
            fuentes: r.fuentes,
            evidencia: r.evidencia,
            afectaVulnerables: r.afectaVulnerables,
            origen: 'banco',
            preguntaId: pregId,
          })
        }
      }
    })

    setFoda((prev) => ({
      fortalezas: fortalezasGeneradas.length > 0 ? fortalezasGeneradas : prev.fortalezas,
      debilidades: debilidadesGeneradas.length > 0 ? debilidadesGeneradas : prev.debilidades,
      oportunidades: [
        ...prev.oportunidades.filter((o) => o.origen === 'manual'),
        ...oportunidadesGeneradas,
      ],
      amenazas: [
        ...prev.amenazas.filter((a) => a.origen === 'manual'),
        ...amenazasGeneradas,
      ],
    }))
  }

  // Patron actual
  const configPatron = useMemo(
    () => guiaComunitaria.patrones.find((p) => p.n === pasoActual),
    [pasoActual]
  )

  const patronActualData = patrones[`p${pasoActual}`]

  const actualizarPatronActual = (cambios: Partial<PatronComunidad>) => {
    setPatrones((prev) => ({
      ...prev,
      [`p${pasoActual}`]: {
        ...prev[`p${pasoActual}`],
        ...cambios,
      },
    }))
  }

  return (
    <div className="valoracion-page">
      {/* Cabecera pegada con contexto de Barrio y Progreso */}
      <header className="valoracion-header">
        <div className="header-info">
          <button
            type="button"
            className="btn-volver"
            onClick={() => navigate('/')}
            aria-label="Volver al inicio"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="h3">Valoración Comunitaria</h1>
            <div className="barrio-chip">
              <span className="punto-cardinal-badge">{barrioSeleccionado?.cardinal ?? 'S'}</span>
              <span>{barrioSeleccionado?.etiqueta ?? 'Seleccionar barrio'}</span>
            </div>
          </div>
        </div>

        <div className="header-acciones">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => guardar(false)}
            disabled={guardando}
          >
            <Save size={14} />
            <span>{guardando ? 'Guardando...' : guardadoExitoso ? '¡Guardado!' : 'Guardar'}</span>
          </button>
        </div>
      </header>

      {/* Selector de paso / Anillo de 11 nodos horizontal */}
      <nav className="stepper-horizontal" aria-label="Progreso de patrones comunitarios">
        {guiaComunitaria.patrones.map((p) => {
          const pData = patrones[`p${p.n}`]
          const tieneDatos = pData && (pData.subjetivos || pData.objetivos || pData.justificacion)
          const esActivo = pasoActual === p.n
          return (
            <button
              key={p.n}
              type="button"
              className={`step-nodo ${esActivo ? 'activo' : ''} ${pData?.alterado ? 'alterado' : tieneDatos ? 'completado' : ''}`}
              onClick={() => cambiarPaso(p.n)}
              title={`Patrón ${p.n}: ${p.nombre}`}
            >
              <span className="nodo-numero">{p.n}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={`step-nodo step-foda ${pasoActual === 12 ? 'activo' : ''}`}
          onClick={() => {
            generarFodaDesdePatrones()
            cambiarPaso(12)
          }}
          title="Asistente FODA"
        >
          <Sparkles size={14} />
        </button>
      </nav>

      {/* Contenido principal según paso (1..11: Patrón, 12: FODA) */}
      <main className="valoracion-cuerpo">
        {pasoActual >= 1 && pasoActual <= 11 && configPatron && (
          <section className="tarjeta seccion-patron" aria-labelledby="titulo-patron">
            <header className="patron-cabecera">
              <span className="patron-badge">Patrón {configPatron.n} de 11</span>
              <h2 id="titulo-patron" className="h2">{configPatron.nombre}</h2>
              <p className="text-apagado">{configPatron.descripcion}</p>
            </header>

            {/* Datos Subjetivos */}
            <div className="campo">
              <label htmlFor="input-subjetivos" className="campo-etiqueta">
                🗣 Datos subjetivos (lo que la comunidad expresa o percibe)
              </label>
              <p className="guia-texto text-apagado">
                <HelpCircle size={14} /> Guía: {configPatron.guiaSubjetiva}
              </p>
              <textarea
                id="input-subjetivos"
                className="input-control"
                rows={4}
                placeholder="Escribí lo que refieren los vecinos, testimonios de referentes o quejas recibidas..."
                value={patronActualData.subjetivos}
                onChange={(e) => actualizarPatronActual({ subjetivos: e.target.value })}
              />
            </div>

            {/* Datos Objetivos */}
            <div className="campo">
              <label htmlFor="input-objetivos" className="campo-etiqueta">
                👁 Datos objetivos (lo observado en terreno o fuentes oficiales)
              </label>
              <p className="guia-texto text-apagado">
                <HelpCircle size={14} /> Guía: {configPatron.guiaObjetiva}
              </p>
              <textarea
                id="input-objetivos"
                className="input-control"
                rows={4}
                placeholder="Escribí lo observado durante la recorrida barrial, datos del CAPS o registros institucionales..."
                value={patronActualData.objetivos}
                onChange={(e) => actualizarPatronActual({ objetivos: e.target.value })}
              />
            </div>

            {/* Fuente y Observaciones */}
            <div className="fila-dos-columnas">
              <div className="campo">
                <label htmlFor="input-fuente" className="campo-etiqueta">
                  Fuente de información
                </label>
                <input
                  id="input-fuente"
                  type="text"
                  className="input-control"
                  placeholder="Ej. Vecinos de calle X, Enfermera CAPS 5, Registro..."
                  value={patronActualData.fuente}
                  onChange={(e) => actualizarPatronActual({ fuente: e.target.value })}
                />
              </div>

              <div className="campo">
                <label htmlFor="input-observaciones" className="campo-etiqueta">
                  Observaciones adicionales
                </label>
                <input
                  id="input-observaciones"
                  type="text"
                  className="input-control"
                  placeholder="Notas metodológicas, horario, condiciones del clima..."
                  value={patronActualData.observaciones}
                  onChange={(e) => actualizarPatronActual({ observaciones: e.target.value })}
                />
              </div>
            </div>

            {/* Veredicto clínico del patrón: Conservado vs Alterado */}
            <div className="veredicto-bloque">
              <span className="campo-etiqueta">Estado del patrón en la comunidad</span>
              <div className="selector-veredicto" role="radiogroup" aria-label="Estado del patrón">
                <button
                  type="button"
                  className={`btn-veredicto conservado ${!patronActualData.alterado ? 'activo' : ''}`}
                  onClick={() => actualizarPatronActual({ alterado: false })}
                >
                  <CheckCircle2 size={18} />
                  <span>Conservado</span>
                </button>

                <button
                  type="button"
                  className={`btn-veredicto alterado ${patronActualData.alterado ? 'activo' : ''}`}
                  onClick={() => actualizarPatronActual({ alterado: true })}
                >
                  <AlertTriangle size={18} />
                  <span>Alterado</span>
                </button>
              </div>

              {/* Justificación o Evidencia */}
              <div className="campo" style={{ marginTop: 'var(--sp-3)' }}>
                <label htmlFor="input-justificacion" className="campo-etiqueta">
                  {patronActualData.alterado
                    ? 'Frase de justificación de la alteración (alimenta las Debilidades del FODA)'
                    : 'Frase de evidencia del patrón conservado (alimenta las Fortalezas del FODA)'}
                </label>
                <input
                  id="input-justificacion"
                  type="text"
                  className="input-control"
                  placeholder={
                    patronActualData.alterado
                      ? 'Ej. Microbasural activo en manzana 4 con presencia de roedores...'
                      : 'Ej. Vecinos organizados con red comunitaria activa y buena cobertura...'
                  }
                  value={patronActualData.justificacion}
                  onChange={(e) => actualizarPatronActual({ justificacion: e.target.value })}
                />
                <span className="campo-ayuda">
                  Escribí una frase concreta y verificable para el análisis estratégico.
                </span>
              </div>
            </div>

            {/* Navegación inferior entre patrones */}
            <footer className="patron-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => cambiarPaso(pasoActual - 1)}
                disabled={pasoActual === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (pasoActual < 11) {
                    cambiarPaso(pasoActual + 1)
                  } else {
                    generarFodaDesdePatrones()
                    cambiarPaso(12)
                  }
                }}
              >
                {pasoActual < 11 ? (
                  <>
                    Siguiente <ChevronRight size={16} />
                  </>
                ) : (
                  <>
                    Ir al Asistente FODA <Sparkles size={16} />
                  </>
                )}
              </button>
            </footer>
          </section>
        )}

        {/* PASO 12: Asistente FODA (Anexo B) */}
        {pasoActual === 12 && (
          <section className="tarjeta seccion-foda" aria-labelledby="titulo-foda">
            <header className="foda-cabecera">
              <div className="foda-titulo-fila">
                <span className="patron-badge">Paso final</span>
                <h2 id="titulo-foda" className="h2">Matriz FODA Comunitaria</h2>
              </div>
              <p className="text-apagado">
                El FODA separa lo que el barrio y el CAPS pueden transformar (Fortalezas y Debilidades) de los condicionantes del entorno (Oportunidades y Amenazas).
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={generarFodaDesdePatrones}
                style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-2)' }}
              >
                <Sparkles size={14} /> Regenerar sugerencias desde los patrones
              </button>
            </header>

            {/* Matriz de 4 cuadrantes */}
            <div className="matriz-foda-grilla">
              {/* FORTALEZAS */}
              <div className="cuadrante-foda cuadrante-fortalezas">
                <div className="cuadrante-cabecera">
                  <h3 className="h4">Fortalezas (Internas)</h3>
                  <span className="badge-contador">{foda.fortalezas.length}</span>
                </div>
                <p className="cuadrante-sub text-apagado">Recursos y capacidades que la comunidad sostiene por sí misma.</p>
                <ul className="lista-foda">
                  {foda.fortalezas.map((item, idx) => (
                    <li key={item.id} className="item-foda">
                      <div className="item-foda-texto">
                        <strong>{item.texto}</strong>
                        {item.evidencia && <small className="text-apagado">{item.evidencia}</small>}
                      </div>
                      <button
                        type="button"
                        className="btn-eliminar-item"
                        onClick={() =>
                          setFoda((prev) => ({
                            ...prev,
                            fortalezas: prev.fortalezas.filter((_, i) => i !== idx),
                          }))
                        }
                        title="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* DEBILIDADES */}
              <div className="cuadrante-foda cuadrante-debilidades">
                <div className="cuadrante-cabecera">
                  <h3 className="h4">Debilidades (Internas)</h3>
                  <span className="badge-contador">{foda.debilidades.length}</span>
                </div>
                <p className="cuadrante-sub text-apagado">Aspectos propios del barrio a mejorar o resolver.</p>
                <ul className="lista-foda">
                  {foda.debilidades.map((item, idx) => (
                    <li key={item.id} className="item-foda">
                      <div className="item-foda-texto">
                        <strong>{item.texto}</strong>
                        {item.evidencia && <small className="text-apagado">{item.evidencia}</small>}
                      </div>
                      <button
                        type="button"
                        className="btn-eliminar-item"
                        onClick={() =>
                          setFoda((prev) => ({
                            ...prev,
                            debilidades: prev.debilidades.filter((_, i) => i !== idx),
                          }))
                        }
                        title="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* OPORTUNIDADES */}
              <div className="cuadrante-foda cuadrante-oportunidades">
                <div className="cuadrante-cabecera">
                  <h3 className="h4">Oportunidades (Entorno)</h3>
                  <span className="badge-contador">{foda.oportunidades.length}</span>
                </div>
                <p className="cuadrante-sub text-apagado">Factores externos, programas y ayudas a aprovechar.</p>
                <ul className="lista-foda">
                  {foda.oportunidades.map((item, idx) => (
                    <li key={item.id} className="item-foda">
                      <div className="item-foda-texto">
                        <strong>{item.texto}</strong>
                        <span className="item-prioridad">Prioridad: {item.prioridad}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-eliminar-item"
                        onClick={() =>
                          setFoda((prev) => ({
                            ...prev,
                            oportunidades: prev.oportunidades.filter((_, i) => i !== idx),
                          }))
                        }
                        title="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AMENAZAS */}
              <div className="cuadrante-foda cuadrante-amenazas">
                <div className="cuadrante-cabecera">
                  <h3 className="h4">Amenazas (Entorno)</h3>
                  <span className="badge-contador">{foda.amenazas.length}</span>
                </div>
                <p className="cuadrante-sub text-apagado">Riesgos externos, precios, carencias o peligros ambientales.</p>
                <ul className="lista-foda">
                  {foda.amenazas.map((item, idx) => (
                    <li key={item.id} className="item-foda">
                      <div className="item-foda-texto">
                        <strong>{item.texto}</strong>
                        <span className="item-prioridad">Prioridad: {item.prioridad}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-eliminar-item"
                        onClick={() =>
                          setFoda((prev) => ({
                            ...prev,
                            amenazas: prev.amenazas.filter((_, i) => i !== idx),
                          }))
                        }
                        title="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Banco asistido de preguntas socioeconómicas y emocionales */}
            <div className="banco-preguntas-acordeon">
              <h3 className="h4" style={{ marginBottom: 'var(--sp-2)' }}>
                Banco asistido de Oportunidades y Amenazas (Anexo B.3)
              </h3>
              <p className="text-apagado" style={{ fontSize: 'var(--text-xs)' }}>
                Respondé algunas preguntas clave sobre el barrio para nutrir la matriz automáticamente:
              </p>

              <div className="preguntas-grilla">
                {bancoFoda.preguntas.slice(0, 6).map((q) => {
                  const rActual = respuestasBanco[q.id]
                  return (
                    <div key={q.id} className="pregunta-card">
                      <p className="pregunta-texto">{q.pregunta}</p>
                      <div className="opciones-botones">
                        <button
                          type="button"
                          className={`btn-opcion ${rActual?.respuesta === 'A' ? 'activo' : ''}`}
                          onClick={() => {
                            setRespuestasBanco((prev) => ({
                              ...prev,
                              [q.id]: {
                                respuesta: 'A',
                                fuentes: ['Observación barrial'],
                                afectaVulnerables: false,
                                evidencia: '',
                              },
                            }))
                          }}
                        >
                          {q.tipo === 'R' ? 'A · Existe y es accesible' : 'A · Afecta a muchas familias'}
                        </button>
                        <button
                          type="button"
                          className={`btn-opcion ${rActual?.respuesta === 'B' ? 'activo' : ''}`}
                          onClick={() => {
                            setRespuestasBanco((prev) => ({
                              ...prev,
                              [q.id]: {
                                respuesta: 'B',
                                fuentes: ['Observación barrial'],
                                afectaVulnerables: false,
                                evidencia: '',
                              },
                            }))
                          }}
                        >
                          {q.tipo === 'R' ? 'B · Existe con barreras' : 'B · Afecta a algunas'}
                        </button>
                        <button
                          type="button"
                          className={`btn-opcion ${rActual?.respuesta === 'C' ? 'activo' : ''}`}
                          onClick={() => {
                            setRespuestasBanco((prev) => ({
                              ...prev,
                              [q.id]: {
                                respuesta: 'C',
                                fuentes: ['Observación barrial'],
                                afectaVulnerables: false,
                                evidencia: '',
                              },
                            }))
                          }}
                        >
                          {q.tipo === 'R' ? 'C · No existe' : 'C · No se observa'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pie de acciones de cierre */}
            <footer className="foda-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => cambiarPaso(11)}
              >
                <ChevronLeft size={16} /> Volver al Patrón 11
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await guardar(true)
                  navigate('/')
                }}
              >
                <CheckCircle2 size={16} /> Finalizar valoración comunitaria
              </button>
            </footer>
          </section>
        )}
      </main>

      <style>{`
        .valoracion-page {
          min-height: 100dvh;
          padding-bottom: 90px;
          background-color: var(--fondo);
        }

        .valoracion-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--tarjeta);
          padding: var(--sp-3) var(--sp-4);
          border-bottom: 1px solid var(--borde-suave);
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }

        .btn-volver {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: var(--sp-1);
          color: var(--texto-secundario);
        }

        .barrio-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: color-mix(in srgb, var(--lago) 12%, var(--tarjeta));
          padding: 2px 8px;
          border-radius: var(--r-capsula);
          font-size: 0.75rem;
          color: var(--azul-profundo);
          font-weight: 600;
        }

        .punto-cardinal-badge {
          background: var(--azul-profundo);
          color: #FFF;
          padding: 0 4px;
          border-radius: 4px;
          font-size: 0.65rem;
        }

        .stepper-horizontal {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--sp-2) var(--sp-4);
          background: var(--tarjeta);
          border-bottom: 1px solid var(--borde-suave);
          overflow-x: auto;
          gap: var(--sp-1);
        }

        .step-nodo {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--borde-suave);
          background: var(--fondo);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .step-nodo.completado {
          border-color: var(--lago);
          color: var(--lago);
        }

        .step-nodo.alterado {
          border-color: var(--alerta);
          color: var(--alerta);
          background: color-mix(in srgb, var(--alerta) 10%, var(--fondo));
        }

        .step-nodo.activo {
          background: var(--azul-profundo);
          color: #FFF;
          border-color: var(--azul-profundo);
          transform: scale(1.15);
        }

        .step-foda {
          border-radius: var(--r-capsula);
          width: 40px;
          background: color-mix(in srgb, var(--lago) 15%, var(--fondo));
          color: var(--azul-profundo);
        }

        .valoracion-cuerpo {
          max-width: 800px;
          margin: var(--sp-4) auto;
          padding: 0 var(--sp-4);
        }

        .seccion-patron, .seccion-foda {
          padding: var(--sp-6);
          display: flex;
          flex-direction: column;
          gap: var(--sp-5);
        }

        .patron-cabecera {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          border-bottom: 1px solid var(--borde-suave);
          padding-bottom: var(--sp-4);
        }

        .patron-badge {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--lago);
        }

        .guia-texto {
          font-size: 0.75rem;
          margin-bottom: var(--sp-2);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fila-dos-columnas {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-4);
        }

        @media (max-width: 600px) {
          .fila-dos-columnas {
            grid-template-columns: 1fr;
          }
        }

        .veredicto-bloque {
          background: color-mix(in srgb, var(--borde-suave) 30%, var(--tarjeta));
          padding: var(--sp-4);
          border-radius: var(--r-campo);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .selector-veredicto {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-3);
        }

        .btn-veredicto {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--borde-suave);
          background: var(--tarjeta);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-veredicto.conservado.activo {
          background: color-mix(in srgb, var(--lago) 15%, var(--tarjeta));
          border-color: var(--lago);
          color: var(--lago);
        }

        .btn-veredicto.alterado.activo {
          background: color-mix(in srgb, var(--critico) 12%, var(--tarjeta));
          border-color: var(--critico);
          color: var(--critico);
        }

        .patron-footer, .foda-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--borde-suave);
          padding-top: var(--sp-4);
          margin-top: var(--sp-2);
        }

        /* Estilos FODA */
        .matriz-foda-grilla {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-4);
        }

        @media (max-width: 700px) {
          .matriz-foda-grilla {
            grid-template-columns: 1fr;
          }
        }

        .cuadrante-foda {
          padding: var(--sp-4);
          border-radius: var(--r-campo);
          border: 1px solid var(--borde-suave);
          background: var(--tarjeta);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .cuadrante-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .badge-contador {
          font-size: 0.75rem;
          background: var(--fondo);
          padding: 2px 8px;
          border-radius: var(--r-capsula);
          font-weight: 700;
        }

        .cuadrante-sub {
          font-size: 0.75rem;
        }

        .lista-foda {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .item-foda {
          padding: var(--sp-2);
          background: var(--fondo);
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-2);
          font-size: 0.8rem;
        }

        .item-foda-texto {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .btn-eliminar-item {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--critico);
          padding: 2px;
        }

        .preguntas-grilla {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          margin-top: var(--sp-3);
        }

        .pregunta-card {
          padding: var(--sp-3);
          background: var(--fondo);
          border-radius: var(--r-campo);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .pregunta-texto {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .opciones-botones {
          display: flex;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .btn-opcion {
          font-size: 0.75rem;
          padding: var(--sp-2) var(--sp-3);
          border: 1px solid var(--borde-suave);
          border-radius: var(--r-campo);
          background: var(--tarjeta);
          cursor: pointer;
        }

        .btn-opcion.activo {
          background: var(--azul-profundo);
          color: #FFF;
          border-color: var(--azul-profundo);
        }
      `}</style>
    </div>
  )
}
