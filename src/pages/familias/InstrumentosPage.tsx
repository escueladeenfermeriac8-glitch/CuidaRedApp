/**
 * Pantalla de Instrumentos de Valoración Familiar: APGAR, Holmes y Rahe, y MOS
 * DISENO_BASE.md §6.3, Anexos A.1, A.2, A.3, A.4 y reglasInstrumentos.json
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  apgarData,
  holmesData,
  mosData,
  calcularApgar,
  calcularHolmes,
  calcularMos,
  type ResultadoApgar,
  type ResultadoHolmes,
  type ResultadoMos,
} from '@/catalogos'
import type {
  Familia,
  Barrio,
  Integrante,
  Valoracion,
  TipoValoracion,
  PayloadApgar,
  PayloadHolmes,
  PayloadMos,
} from '@/types'
import {
  ArrowLeft,
  AlertCircle,
  Save,
  Check,
  ShieldAlert,
  Search,
  Sparkles,
} from 'lucide-react'

type InstrumentoTipo = 'apgar' | 'holmes' | 'mos'

export function InstrumentosPage() {
  const { famId } = useParams<{ famId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { usuario, firebaseUser } = useAuth()

  const [familia, setFamilia] = useState<Familia | null>(null)
  const [barrio, setBarrio] = useState<Barrio | null>(null)
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  // Tipo de instrumento activo
  const tipoParam = searchParams.get('tipo') as InstrumentoTipo | null
  const [instrumentoActivo, setInstrumentoActivo] = useState<InstrumentoTipo>(
    tipoParam === 'holmes' || tipoParam === 'mos' ? tipoParam : 'apgar'
  )

  // Sincronizar parámetro URL si cambia la pestaña
  const cambiarInstrumento = (tipo: InstrumentoTipo) => {
    setInstrumentoActivo(tipo)
    setSearchParams({ tipo })
    setGuardadoOk(false)
  }

  // Estados locales para formularios:
  // 1. APGAR
  const [apgarParentesco, setApgarParentesco] = useState('Referente familiar')
  const [apgarRespuestas, setApgarRespuestas] = useState<Record<number, number>>({
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
  })

  // 2. Holmes y Rahe
  const [holmesSeleccionados, setHolmesSeleccionados] = useState<number[]>([])
  const [holmesOtros, setHolmesOtros] = useState('')
  const [busquedaHolmes, setBusquedaHolmes] = useState('')

  // 3. MOS
  const [mosAmigos, setMosAmigos] = useState<number>(3)
  const [mosRespuestas, setMosRespuestas] = useState<Record<number, number>>(() => {
    const r: Record<number, number> = {}
    for (let i = 2; i <= 20; i++) r[i] = 3 // default 'Algunas veces'
    return r
  })

  // Cargar datos familiares y valoraciones previas
  useEffect(() => {
    if (!famId) return

    const cargar = async () => {
      setCargando(true)
      try {
        // Cargar familia
        const famSnap = await getDoc(doc(db, 'familias', famId))
        if (!famSnap.exists()) {
          setErrorGuardado('Familia no encontrada.')
          setCargando(false)
          return
        }
        const fData = { id: famSnap.id, ...famSnap.data() } as Familia
        setFamilia(fData)

        // Cargar barrio
        if (fData.barrioId) {
          const bSnap = await getDoc(doc(db, 'barrios', fData.barrioId))
          if (bSnap.exists()) {
            setBarrio({ id: bSnap.id, ...bSnap.data() } as Barrio)
          }
        }

        // Cargar integrantes
        const intSnap = await getDocs(collection(db, 'familias', famId, 'integrantes'))
        const iList: Integrante[] = []
        intSnap.forEach((d) => iList.push({ id: d.id, ...d.data() } as Integrante))
        setIntegrantes(iList)

        // Cargar valoraciones de instrumentos
        const valSnap = await getDocs(collection(db, 'familias', famId, 'valoraciones'))
        const vList: Valoracion[] = []
        valSnap.forEach((d) => vList.push({ id: d.id, ...d.data() } as Valoracion))
        setValoraciones(vList)

        // Pre-cargar datos si ya existían
        const vApgar = vList.find((v) => v.tipo === 'apgar')
        if (vApgar && vApgar.payload) {
          const p = vApgar.payload as PayloadApgar
          if (p.respondioParentesco) setApgarParentesco(p.respondioParentesco)
          if (Array.isArray(p.respuestas) && p.respuestas.length === 5) {
            const rMap: Record<number, number> = {}
            p.respuestas.forEach((val, idx) => {
              rMap[idx + 1] = val
            })
            setApgarRespuestas(rMap)
          }
        }

        const vHolmes = vList.find((v) => v.tipo === 'holmes')
        if (vHolmes && vHolmes.payload) {
          const p = vHolmes.payload as PayloadHolmes
          if (Array.isArray(p.eventosSeleccionados)) {
            setHolmesSeleccionados(p.eventosSeleccionados)
          }
          if (p.otrosEventos) setHolmesOtros(p.otrosEventos)
        }

        const vMos = vList.find((v) => v.tipo === 'mos')
        if (vMos && vMos.payload) {
          const p = vMos.payload as PayloadMos
          if (typeof p.amigosIntimos === 'number') setMosAmigos(p.amigosIntimos)
          if (Array.isArray(p.respuestas) && p.respuestas.length === 19) {
            const rMap: Record<number, number> = {}
            p.respuestas.forEach((val, idx) => {
              rMap[idx + 2] = val
            })
            setMosRespuestas(rMap)
          }
        }
      } catch (err) {
        console.error('Error al cargar datos de instrumentos:', err)
        setErrorGuardado('Error de conexión al cargar instrumentos.')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [famId])

  // Instrumentos existentes
  const valApgar = useMemo(() => valoraciones.find((v) => v.tipo === 'apgar'), [valoraciones])
  const valHolmes = useMemo(() => valoraciones.find((v) => v.tipo === 'holmes'), [valoraciones])
  const valMos = useMemo(() => valoraciones.find((v) => v.tipo === 'mos'), [valoraciones])

  // Cálculos reactivos puros de cada escala
  const resApgar: ResultadoApgar = useMemo(() => {
    return calcularApgar(apgarRespuestas)
  }, [apgarRespuestas])

  const resHolmes: ResultadoHolmes = useMemo(() => {
    return calcularHolmes(holmesSeleccionados)
  }, [holmesSeleccionados])

  const resMos: ResultadoMos = useMemo(() => {
    return calcularMos(mosRespuestas, mosAmigos)
  }, [mosRespuestas, mosAmigos])

  // Motor de evaluación de sugerencias y alertas (reglasInstrumentos.json)
  const sugerenciasYAlertas = useMemo(() => {
    const lista: { tipo: 'sugerencia' | 'alerta'; mensaje: string; instrumentoTarget?: InstrumentoTipo }[] = []

    // R1: APGAR con disfunción familiar leve o grave
    if (resApgar.corte.nivel === 'atencion' || resApgar.corte.nivel === 'critico') {
      if (!valHolmes) {
        lista.push({
          tipo: 'sugerencia',
          mensaje: 'El APGAR sugiere disfunción familiar. Se recomienda evaluar acontecimientos vitales estresantes (Holmes y Rahe).',
          instrumentoTarget: 'holmes',
        })
      }
      if (!valMos) {
        lista.push({
          tipo: 'sugerencia',
          mensaje: 'Se sugiere valorar el apoyo social percibido (Cuestionario MOS).',
          instrumentoTarget: 'mos',
        })
      }
    }

    // R2: APGAR funcional pero estrés elevado en Holmes y Rahe
    if (resApgar.corte.nivel === 'ok' && resHolmes.puntaje >= 150 && !valMos) {
      lista.push({
        tipo: 'sugerencia',
        mensaje: 'La familia presenta estrés significativo reciente en Holmes (≥ 150 UCV); se sugiere valorar su red de apoyo social (MOS).',
        instrumentoTarget: 'mos',
      })
    }

    // R3: Estrés elevado con bajo apoyo social (Alerta de riesgo psicosocial)
    if (resHolmes.puntaje >= 150 && !resMos.global.esAdecuado && (valHolmes || valMos)) {
      lista.push({
        tipo: 'alerta',
        mensaje: 'ALERTA DE RIESGO PSICOSOCIAL: Alto estrés acumulado (≥ 150 UCV) combinado con red de apoyo insuficiente en el MOS. Requiere atención prioritaria y seguimiento interdisciplinario.',
      })
    }

    return lista
  }, [resApgar, resHolmes, resMos, valHolmes, valMos])

  // Guardar APGAR
  const handleGuardarApgar = async () => {
    if (!famId || !familia) return
    setGuardando(true)
    setErrorGuardado(null)

    try {
      const colRef = collection(db, 'familias', famId, 'valoraciones')
      const docRef = valApgar ? doc(colRef, valApgar.id) : doc(colRef)

      const payload: PayloadApgar = {
        respondioParentesco: apgarParentesco,
        respuestas: [
          apgarRespuestas[1] ?? 0,
          apgarRespuestas[2] ?? 0,
          apgarRespuestas[3] ?? 0,
          apgarRespuestas[4] ?? 0,
          apgarRespuestas[5] ?? 0,
        ],
      }

      const docData = {
        famId,
        orgId: usuario?.orgId ?? familia.orgId,
        tipo: 'apgar' as TipoValoracion,
        payload,
        puntaje: resApgar.puntaje,
        interpretacion: resApgar.corte.etiqueta,
        versionEscala: 'Smilkstein-1978-UNRC',
        version: 1,
        fecha: serverTimestamp(),
        autorId: firebaseUser?.uid ?? 'anon',
        updatedAt: serverTimestamp(),
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
        schemaVersion: 1,
      }

      await setDoc(docRef, docData, { merge: true })
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)

      // Actualizar lista local de valoraciones
      setValoraciones((prev) => [
        ...prev.filter((v) => v.tipo !== 'apgar'),
        { id: docRef.id, ...docData } as any,
      ])
    } catch (err) {
      console.error('Error al guardar APGAR:', err)
      setErrorGuardado('No se pudo guardar el APGAR.')
    } finally {
      setGuardando(false)
    }
  }

  // Guardar Holmes y Rahe
  const handleGuardarHolmes = async () => {
    if (!famId || !familia) return
    setGuardando(true)
    setErrorGuardado(null)

    try {
      const colRef = collection(db, 'familias', famId, 'valoraciones')
      const docRef = valHolmes ? doc(colRef, valHolmes.id) : doc(colRef)

      const payload: PayloadHolmes = {
        eventosSeleccionados: holmesSeleccionados,
        otrosEventos: holmesOtros.trim() || undefined,
      }

      const docData = {
        famId,
        orgId: usuario?.orgId ?? familia.orgId,
        tipo: 'holmes' as TipoValoracion,
        payload,
        puntaje: resHolmes.puntaje,
        interpretacion: resHolmes.corte.etiqueta,
        versionEscala: 'Holmes-Rahe-1967-UNRC',
        version: 1,
        fecha: serverTimestamp(),
        autorId: firebaseUser?.uid ?? 'anon',
        updatedAt: serverTimestamp(),
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
        schemaVersion: 1,
      }

      await setDoc(docRef, docData, { merge: true })
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)

      setValoraciones((prev) => [
        ...prev.filter((v) => v.tipo !== 'holmes'),
        { id: docRef.id, ...docData } as any,
      ])
    } catch (err) {
      console.error('Error al guardar Holmes y Rahe:', err)
      setErrorGuardado('No se pudo guardar la escala de Holmes y Rahe.')
    } finally {
      setGuardando(false)
    }
  }

  // Guardar MOS
  const handleGuardarMos = async () => {
    if (!famId || !familia) return
    setGuardando(true)
    setErrorGuardado(null)

    try {
      const colRef = collection(db, 'familias', famId, 'valoraciones')
      const docRef = valMos ? doc(colRef, valMos.id) : doc(colRef)

      const respuestasArray: number[] = []
      for (let i = 2; i <= 20; i++) {
        respuestasArray.push(mosRespuestas[i] ?? 1)
      }

      const payload: PayloadMos = {
        amigosIntimos: mosAmigos,
        respuestas: respuestasArray,
      }

      const docData = {
        famId,
        orgId: usuario?.orgId ?? familia.orgId,
        tipo: 'mos' as TipoValoracion,
        payload,
        puntaje: resMos.global.puntaje,
        interpretacion: resMos.global.esAdecuado ? 'Apoyo social adecuado' : 'Apoyo social escaso',
        versionEscala: 'MOS-1991-UNRC',
        version: 1,
        fecha: serverTimestamp(),
        autorId: firebaseUser?.uid ?? 'anon',
        updatedAt: serverTimestamp(),
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
        schemaVersion: 1,
      }

      await setDoc(docRef, docData, { merge: true })
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)

      setValoraciones((prev) => [
        ...prev.filter((v) => v.tipo !== 'mos'),
        { id: docRef.id, ...docData } as any,
      ])
    } catch (err) {
      console.error('Error al guardar MOS:', err)
      setErrorGuardado('No se pudo guardar el cuestionario MOS.')
    } finally {
      setGuardando(false)
    }
  }

  // Eventos de Holmes filtrados
  const eventosHolmesFiltrados = useMemo(() => {
    if (!busquedaHolmes.trim()) return holmesData.items
    const q = busquedaHolmes.toLowerCase().trim()
    return holmesData.items.filter((it) => it.evento.toLowerCase().includes(q))
  }, [busquedaHolmes])

  // Toggle evento Holmes
  const toggleEventoHolmes = (num: number) => {
    setHolmesSeleccionados((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }

  if (cargando) {
    return (
      <div className="instrumentos-cargando" role="status">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
          <circle cx="24" cy="24" r="20" stroke="var(--linea)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" stroke="var(--lago)" strokeWidth="3" strokeDasharray="30 90" strokeLinecap="round" />
        </svg>
        <span className="text-apagado">Cargando instrumentos de valoración...</span>
      </div>
    )
  }

  return (
    <div className="instrumentos-pagina stack">
      {/* Cabecera Superior */}
      <header className="instrumentos-cabecera">
        <div className="cabecera-izq">
          <button
            type="button"
            className="btn-volver"
            onClick={() => navigate(`/familias/${famId}`)}
            aria-label="Volver a la Ficha Familiar"
          >
            <ArrowLeft size={18} />
            <span>Ficha familiar</span>
          </button>
          <div className="familia-info-corta">
            <h1 className="h3">Familia {familia?.apellido}</h1>
            <span className="text-apagado sub-info">
              {familia?.codigoFamiliar} · {barrio?.etiqueta ?? 'Barrio s/d'}
            </span>
          </div>
        </div>
      </header>

      {/* Alerta de error si existe */}
      {errorGuardado && (
        <div className="alerta-error" role="alert">
          <AlertCircle size={16} />
          <span>{errorGuardado}</span>
        </div>
      )}

      {/* Banner de Sugerencias y Alertas del motor clínico */}
      {sugerenciasYAlertas.length > 0 && (
        <section className="bloque-sugerencias-motor stack" aria-label="Sugerencias clínicas del motor de reglas">
          {sugerenciasYAlertas.map((sug, i) => (
            <div
              key={i}
              className={`alerta-sugerencia-item ${sug.tipo === 'alerta' ? 'alerta-critica' : 'alerta-info'}`}
            >
              {sug.tipo === 'alerta' ? (
                <ShieldAlert size={20} className="icono-alerta-critica" />
              ) : (
                <Sparkles size={20} className="icono-sugerencia" />
              )}
              <div className="sugerencia-texto">
                <strong>{sug.tipo === 'alerta' ? 'Alerta Clínica' : 'Sugerencia de valoración'}</strong>
                <p>{sug.mensaje}</p>
              </div>
              {sug.instrumentoTarget && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => cambiarInstrumento(sug.instrumentoTarget!)}
                >
                  Ir a {sug.instrumentoTarget.toUpperCase()}
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Selector de Pestañas de Instrumentos */}
      <nav className="tabs-instrumentos tarjeta" aria-label="Instrumentos disponibles">
        <button
          type="button"
          className={`tab-item ${instrumentoActivo === 'apgar' ? 'activo' : ''}`}
          onClick={() => cambiarInstrumento('apgar')}
        >
          <div className="tab-item-top">
            <strong>APGAR Familiar</strong>
            {valApgar ? (
              <span className="badge-completado"><Check size={12} /> {resApgar.puntaje}/10</span>
            ) : (
              <span className="badge-pendiente">Pendiente</span>
            )}
          </div>
          <small className="text-apagado">Funcionalidad familiar percibida</small>
        </button>

        <button
          type="button"
          className={`tab-item ${instrumentoActivo === 'holmes' ? 'activo' : ''}`}
          onClick={() => cambiarInstrumento('holmes')}
        >
          <div className="tab-item-top">
            <strong>Holmes y Rahe</strong>
            {valHolmes ? (
              <span className="badge-completado"><Check size={12} /> {resHolmes.puntaje} UCV</span>
            ) : (
              <span className="badge-pendiente">Pendiente</span>
            )}
          </div>
          <small className="text-apagado">Estrés y reajuste social</small>
        </button>

        <button
          type="button"
          className={`tab-item ${instrumentoActivo === 'mos' ? 'activo' : ''}`}
          onClick={() => cambiarInstrumento('mos')}
        >
          <div className="tab-item-top">
            <strong>Cuestionario MOS</strong>
            {valMos ? (
              <span className="badge-completado"><Check size={12} /> {resMos.global.puntaje} pts</span>
            ) : (
              <span className="badge-pendiente">Pendiente</span>
            )}
          </div>
          <small className="text-apagado">Redes de apoyo social</small>
        </button>
      </nav>

      {/* ────────────────────────────────────────────────── */}
      {/* 1. INSTRUMENTO: APGAR FAMILIAR                    */}
      {/* ────────────────────────────────────────────────── */}
      {instrumentoActivo === 'apgar' && (
        <main className="tarjeta stack instrumento-cuerpo" aria-labelledby="titulo-apgar">
          <header className="inst-cabecera">
            <div>
              <h2 id="titulo-apgar" className="h3">APGAR Familiar</h2>
              <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                {apgarData.descripcion} (Jacquier et al., 2014, p. 173)
              </p>
            </div>

            {/* Score Live */}
            <div className={`score-badge nivel-${resApgar.corte.nivel}`}>
              <span className="score-num">{resApgar.puntaje} / 10</span>
              <span className="score-eti">{resApgar.corte.etiqueta}</span>
            </div>
          </header>

          <div className="campo">
            <label htmlFor="select-parentesco-apgar" className="campo-etiqueta">
              Integrante que responde el cuestionario
            </label>
            <select
              id="select-parentesco-apgar"
              className="input-control"
              value={apgarParentesco}
              onChange={(e) => setApgarParentesco(e.target.value)}
              disabled={guardando}
            >
              <option value="Referente familiar">Referente familiar (Índice)</option>
              {integrantes.map((i) => (
                <option key={i.id} value={`${i.parentesco} (${i.edadAprox ? `${i.edadAprox}a` : 's/d'})`}>
                  {i.parentesco} {i.edadAprox ? `(${i.edadAprox} años)` : ''}
                </option>
              ))}
              <option value="Cónyuge / Pareja">Cónyuge / Pareja</option>
              <option value="Hijo / Hija mayor de edad">Hijo / Hija mayor de edad</option>
              <option value="Otro integrante">Otro integrante conviviente</option>
            </select>
          </div>

          <div className="apgar-items-lista stack">
            {apgarData.items.map((item) => {
              const valorActual = apgarRespuestas[item.n] ?? 0
              return (
                <div key={item.n} className="apgar-item-fila">
                  <div className="item-enunciado-bloque">
                    <span className="item-dim-badge">{item.dimension}</span>
                    <strong className="item-enunciado">{item.enunciado}</strong>
                  </div>

                  <div className="opciones-selector-horizontal" role="radiogroup">
                    {apgarData.escala.opciones.map((opc) => {
                      const seleccionado = valorActual === opc.valor
                      return (
                        <button
                          key={opc.valor}
                          type="button"
                          role="radio"
                          aria-checked={seleccionado}
                          className={`opcion-radio-btn ${seleccionado ? 'activo' : ''}`}
                          onClick={() =>
                            setApgarRespuestas((prev) => ({
                              ...prev,
                              [item.n]: opc.valor,
                            }))
                          }
                          disabled={guardando}
                        >
                          <span className="opc-valor">+{opc.valor}</span>
                          <span className="opc-texto">{opc.etiqueta}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="cuadro-interpretacion-clinica">
            <h4 className="h4">Cortes clínicos de referencia (Smilkstein):</h4>
            <div className="cortes-grilla">
              <div className={`corte-chip ${resApgar.puntaje >= 7 ? 'activo' : ''}`}>
                <strong>7 a 10: Funcional</strong>
                <small>Familia con capacidad adecuada de respuesta afectiva y adaptativa</small>
              </div>
              <div className={`corte-chip ${resApgar.puntaje >= 3 && resApgar.puntaje <= 6 ? 'activo' : ''}`}>
                <strong>3 a 6: Disfunción leve</strong>
                <small>Conflictos o dificultades moderadas en los vínculos familiares</small>
              </div>
              <div className={`corte-chip ${resApgar.puntaje <= 2 ? 'activo' : ''}`}>
                <strong>0 a 2: Disfunción grave</strong>
                <small>Disfuncionalidad severa; requiere apoyo psicosocial prioritario</small>
              </div>
            </div>
          </div>

          <footer className="inst-footer">
            <button
              type="button"
              className="btn btn-primario"
              onClick={handleGuardarApgar}
              disabled={guardando}
            >
              {guardadoOk ? (
                <>
                  <Check size={16} />
                  <span>APGAR Guardado</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{guardando ? 'Guardando...' : 'Guardar APGAR'}</span>
                </>
              )}
            </button>
          </footer>
        </main>
      )}

      {/* ────────────────────────────────────────────────── */}
      {/* 2. INSTRUMENTO: HOLMES Y RAHE                     */}
      {/* ────────────────────────────────────────────────── */}
      {instrumentoActivo === 'holmes' && (
        <main className="tarjeta stack instrumento-cuerpo" aria-labelledby="titulo-holmes">
          <header className="inst-cabecera">
            <div>
              <h2 id="titulo-holmes" className="h3">Escala de Reajuste Social (Holmes y Rahe)</h2>
              <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                {holmesData.descripcion} (Jacquier et al., 2014, pp. 167-168)
              </p>
            </div>

            {/* Score Live */}
            <div className={`score-badge nivel-${resHolmes.corte.nivel}`}>
              <span className="score-num">{resHolmes.puntaje} UCV</span>
              <span className="score-eti">{resHolmes.corte.etiqueta}</span>
            </div>
          </header>

          <p className="inst-indicacion text-apagado">
            Tildá todos los acontecimientos vitales que hayan afectado a la familia en los últimos 12 meses.
            La escala suma automáticamente las <strong>Unidades de Cambio Vital (UCV)</strong>.
          </p>

          <div className="buscador-input-wrap">
            <Search size={16} className="icono-buscar" />
            <input
              type="search"
              className="input-buscar"
              placeholder="Buscar acontecimiento (ej. duelo, trabajo, mudanza, salud)..."
              value={busquedaHolmes}
              onChange={(e) => setBusquedaHolmes(e.target.value)}
            />
          </div>

          <div className="holmes-eventos-grilla">
            {eventosHolmesFiltrados.map((item) => {
              const seleccionado = holmesSeleccionados.includes(item.n)
              return (
                <button
                  key={item.n}
                  type="button"
                  className={`holmes-item-btn ${seleccionado ? 'seleccionado' : ''}`}
                  onClick={() => toggleEventoHolmes(item.n)}
                  disabled={guardando}
                >
                  <div className="checkbox-visual">
                    {seleccionado && <Check size={14} color="#ffffff" />}
                  </div>
                  <div className="holmes-evento-texto">
                    <span>{item.evento}</span>
                  </div>
                  <span className="ucv-badge">+{item.ucv} UCV</span>
                </button>
              )
            })}
          </div>

          <div className="campo">
            <label htmlFor="input-holmes-otros" className="campo-etiqueta">
              Otros acontecimientos vitales estresantes no listados (opcional)
            </label>
            <textarea
              id="input-holmes-otros"
              className="input-control"
              rows={2}
              placeholder="Ej. Incendio de vivienda, inundación, pérdida de documentación, conflicto judicial..."
              value={holmesOtros}
              onChange={(e) => setHolmesOtros(e.target.value)}
              disabled={guardando}
            />
          </div>

          <div className="cuadro-interpretacion-clinica">
            <h4 className="h4">Cortes de riesgo de crisis de salud en el próximo año:</h4>
            <div className="cortes-grilla">
              <div className={`corte-chip ${resHolmes.puntaje < 150 ? 'activo' : ''}`}>
                <strong>&lt; 150 UCV: Sin riesgo significativo</strong>
                <small>Baja probabilidad de crisis de salud asociada a reajuste vital</small>
              </div>
              <div className={`corte-chip ${resHolmes.puntaje >= 150 && resHolmes.puntaje < 300 ? 'activo' : ''}`}>
                <strong>150 a 299 UCV: Riesgo moderado</strong>
                <small>Aproximadamente 50% de probabilidad de cambio significativo en la salud</small>
              </div>
              <div className={`corte-chip ${resHolmes.puntaje >= 300 ? 'activo' : ''}`}>
                <strong>&ge; 300 UCV: Riesgo alto</strong>
                <small>Aproximadamente 80% de probabilidad de crisis o enfermedad en la familia</small>
              </div>
            </div>
          </div>

          <footer className="inst-footer">
            <button
              type="button"
              className="btn btn-primario"
              onClick={handleGuardarHolmes}
              disabled={guardando}
            >
              {guardadoOk ? (
                <>
                  <Check size={16} />
                  <span>Holmes y Rahe Guardado</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{guardando ? 'Guardando...' : 'Guardar Holmes y Rahe'}</span>
                </>
              )}
            </button>
          </footer>
        </main>
      )}

      {/* ────────────────────────────────────────────────── */}
      {/* 3. INSTRUMENTO: CUESTIONARIO MOS                  */}
      {/* ────────────────────────────────────────────────── */}
      {instrumentoActivo === 'mos' && (
        <main className="tarjeta stack instrumento-cuerpo" aria-labelledby="titulo-mos">
          <header className="inst-cabecera">
            <div>
              <h2 id="titulo-mos" className="h3">Cuestionario MOS de Apoyo Social</h2>
              <p className="text-apagado" style={{ fontSize: '0.85rem' }}>
                {mosData.descripcion} (Jacquier et al., 2014, pp. 169-171)
              </p>
            </div>

            {/* Score Live */}
            <div className={`score-badge ${resMos.global.esAdecuado ? 'nivel-ok' : 'nivel-critico'}`}>
              <span className="score-num">{resMos.global.puntaje} / 95 pts</span>
              <span className="score-eti">
                {resMos.global.esAdecuado ? 'Apoyo social adecuado' : 'Apoyo social escaso'}
              </span>
            </div>
          </header>

          {/* Pregunta descriptiva 1 */}
          <div className="pregunta-descriptiva-mos">
            <div className="p-num-mos">1</div>
            <div className="p-mos-contenido">
              <label htmlFor="input-amigos-mos" className="p-mos-eti">
                {mosData.preguntaDescriptiva.enunciado}
              </label>
              <input
                id="input-amigos-mos"
                type="number"
                min={0}
                max={50}
                className="input-control"
                style={{ maxWidth: '120px' }}
                value={mosAmigos}
                onChange={(e) => setMosAmigos(parseInt(e.target.value, 10) || 0)}
                disabled={guardando}
              />
              <span className="campo-ayuda">Dato cuantitativo descriptivo de la red personal</span>
            </div>
          </div>

          {/* Subescalas Resumen */}
          <div className="subescalas-resumen-grilla">
            {Object.entries(resMos.subescalas).map(([clave, sub]) => (
              <div key={clave} className={`subescala-card ${sub.esAdecuado ? 'adecuada' : 'escasa'}`}>
                <div className="sub-top">
                  <span className="sub-nombre">{sub.nombre}</span>
                  <span className="sub-score">
                    {sub.puntaje} / {sub.max}
                  </span>
                </div>
                <span className="sub-estado">
                  {sub.esAdecuado ? 'Nivel suficiente' : 'Bajo / Insuficiente'}
                </span>
              </div>
            ))}
          </div>

          {/* 19 Ítems con escala 1 a 5 */}
          <div className="mos-items-lista stack">
            {mosData.items.map((item) => {
              const valor = mosRespuestas[item.n] ?? 3
              return (
                <div key={item.n} className="mos-item-fila">
                  <div className="item-enunciado-bloque">
                    <span className="item-n-circulo">{item.n}</span>
                    <strong className="item-enunciado">{item.enunciado}</strong>
                  </div>

                  <div className="opciones-selector-horizontal mos-opciones" role="radiogroup">
                    {mosData.escala.opciones.map((opc) => {
                      const seleccionado = valor === opc.valor
                      return (
                        <button
                          key={opc.valor}
                          type="button"
                          role="radio"
                          aria-checked={seleccionado}
                          className={`opcion-radio-btn mos-btn ${seleccionado ? 'activo' : ''}`}
                          onClick={() =>
                            setMosRespuestas((prev) => ({
                              ...prev,
                              [item.n]: opc.valor,
                            }))
                          }
                          disabled={guardando}
                          title={opc.etiqueta}
                        >
                          <span className="opc-valor">{opc.valor}</span>
                          <span className="opc-texto">{opc.etiqueta}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <footer className="inst-footer">
            <button
              type="button"
              className="btn btn-primario"
              onClick={handleGuardarMos}
              disabled={guardando}
            >
              {guardadoOk ? (
                <>
                  <Check size={16} />
                  <span>MOS Guardado</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{guardando ? 'Guardando...' : 'Guardar Cuestionario MOS'}</span>
                </>
              )}
            </button>
          </footer>
        </main>
      )}

      {/* Estilos específicos de Instrumentos */}
      <style>{`
        .instrumentos-pagina {
          padding: var(--sp-4);
          max-width: 900px;
          margin: 0 auto;
        }

        .instrumentos-cargando {
          min-height: 50vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-3);
        }

        .instrumentos-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cabecera-izq {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }

        .btn-volver {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--azul);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .familia-info-corta h1 {
          font-size: 1.25rem;
          margin: 0;
        }

        .sub-info {
          font-size: 0.78rem;
        }

        /* Banner Sugerencias */
        .bloque-sugerencias-motor {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .alerta-sugerencia-item {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          flex-wrap: wrap;
        }

        .alerta-sugerencia-item.alerta-info {
          background: color-mix(in srgb, var(--azul) 10%, var(--tarjeta));
          border: 1px solid var(--azul);
        }

        .alerta-sugerencia-item.alerta-critica {
          background: color-mix(in srgb, var(--critico) 12%, var(--tarjeta));
          border: 1.5px solid var(--critico);
        }

        .icono-sugerencia {
          color: var(--azul);
        }

        .icono-alerta-critica {
          color: var(--critico);
        }

        .sugerencia-texto {
          flex: 1;
          font-size: 0.85rem;
          min-width: 200px;
        }

        .sugerencia-texto strong {
          display: block;
          margin-bottom: 2px;
        }

        .sugerencia-texto p {
          margin: 0;
          color: var(--tinta);
        }

        /* Tabs de Instrumentos */
        .tabs-instrumentos {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--sp-2);
          padding: var(--sp-2);
        }

        @media (max-width: 650px) {
          .tabs-instrumentos {
            grid-template-columns: 1fr;
          }
        }

        .tab-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid transparent;
          background: var(--papel);
          cursor: pointer;
          transition: all var(--dur-rapido) var(--ease);
        }

        .tab-item:hover {
          border-color: var(--azul);
        }

        .tab-item.activo {
          background: var(--tarjeta);
          border-color: var(--azul);
          box-shadow: 0 0 0 2px var(--azul);
        }

        .tab-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          font-size: 0.9rem;
        }

        .badge-completado {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--ok);
          background: color-mix(in srgb, var(--ok) 15%, transparent);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .badge-pendiente {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--apagado);
          background: color-mix(in srgb, var(--linea) 60%, transparent);
          padding: 1px 6px;
          border-radius: 4px;
        }

        /* Cuerpo del Instrumento */
        .instrumento-cuerpo {
          padding: var(--sp-4);
        }

        .inst-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-3);
          flex-wrap: wrap;
        }

        .score-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          background: var(--papel);
          border: 1px solid var(--linea);
        }

        .score-num {
          font-family: var(--font-titulo);
          font-size: 1.3rem;
          font-weight: 700;
        }

        .score-eti {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .score-badge.nivel-ok {
          border-color: var(--ok);
          color: var(--ok);
          background: color-mix(in srgb, var(--ok) 8%, var(--tarjeta));
        }

        .score-badge.nivel-atencion {
          border-color: var(--atencion);
          color: var(--atencion);
          background: color-mix(in srgb, var(--atencion) 10%, var(--tarjeta));
        }

        .score-badge.nivel-critico {
          border-color: var(--critico);
          color: var(--critico);
          background: color-mix(in srgb, var(--critico) 10%, var(--tarjeta));
        }

        /* APGAR Items */
        .apgar-items-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
        }

        .apgar-item-fila {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          background: var(--papel);
          border: 1px solid var(--linea);
        }

        .item-dim-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--azul);
          text-transform: uppercase;
          margin-right: 6px;
        }

        .opciones-selector-horizontal {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--sp-2);
        }

        .opcion-radio-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--sp-2);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          cursor: pointer;
          transition: all var(--dur-rapido) var(--ease);
        }

        .opcion-radio-btn:hover {
          border-color: var(--azul);
        }

        .opcion-radio-btn.activo {
          background: var(--azul);
          color: #ffffff;
          border-color: var(--azul);
          font-weight: 700;
        }

        .opc-valor {
          font-size: 0.85rem;
          font-weight: 700;
        }

        .opc-texto {
          font-size: 0.75rem;
        }

        /* Interpretación Clínica Cuadro */
        .cuadro-interpretacion-clinica {
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: var(--sp-3);
          margin-top: var(--sp-3);
        }

        .cortes-grilla {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--sp-2);
          margin-top: var(--sp-2);
        }

        .corte-chip {
          padding: var(--sp-2);
          border-radius: var(--r-campo);
          background: var(--tarjeta);
          border: 1px solid var(--linea);
          display: flex;
          flex-direction: column;
          gap: 2px;
          opacity: 0.6;
        }

        .corte-chip.activo {
          opacity: 1;
          border-color: var(--azul);
          box-shadow: 0 0 0 1.5px var(--azul);
        }

        .corte-chip strong {
          font-size: 0.8rem;
          color: var(--azul);
        }

        .corte-chip small {
          font-size: 0.72rem;
        }

        /* Holmes Items */
        .holmes-eventos-grilla {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: var(--sp-2);
          max-height: 400px;
          overflow-y: auto;
          padding: 4px;
        }

        .holmes-item-btn {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          cursor: pointer;
          text-align: left;
          transition: all var(--dur-rapido) var(--ease);
        }

        .holmes-item-btn:hover {
          border-color: var(--azul);
        }

        .holmes-item-btn.seleccionado {
          border-color: var(--atencion);
          background: color-mix(in srgb, var(--atencion) 10%, var(--tarjeta));
        }

        .checkbox-visual {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1.5px solid var(--linea);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--tarjeta);
          flex-shrink: 0;
        }

        .holmes-item-btn.seleccionado .checkbox-visual {
          background: var(--atencion);
          border-color: var(--atencion);
        }

        .holmes-evento-texto {
          flex: 1;
          font-size: 0.8rem;
          line-height: 1.3;
        }

        .ucv-badge {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--azul);
          background: var(--papel);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* MOS */
        .pregunta-descriptiva-mos {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          background: var(--papel);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
        }

        .p-num-mos {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--azul);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .p-mos-contenido {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .subescalas-resumen-grilla {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--sp-2);
        }

        .subescala-card {
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--papel);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .subescala-card.escasa {
          border-color: var(--critico);
          background: color-mix(in srgb, var(--critico) 8%, var(--tarjeta));
        }

        .sub-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sub-nombre {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .sub-score {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .sub-estado {
          font-size: 0.68rem;
          color: var(--apagado);
        }

        .mos-items-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          margin-top: var(--sp-2);
        }

        .mos-item-fila {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          background: var(--papel);
          border: 1px solid var(--linea);
        }

        .item-n-circulo {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--azul);
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 6px;
        }

        .mos-opciones {
          grid-template-columns: repeat(5, 1fr);
        }

        @media (max-width: 500px) {
          .mos-opciones {
            grid-template-columns: repeat(5, 1fr);
          }
          .mos-btn .opc-texto {
            display: none;
          }
        }

        .inst-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: var(--sp-3);
          border-top: 1px solid var(--linea);
        }
      `}</style>
    </div>
  )
}
