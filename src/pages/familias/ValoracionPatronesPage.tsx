/**
 * Valoración de los 11 Patrones Funcionales de Gordon para Familias
 * DISENO_BASE.md §6.5, §7.2 paso 8 y Anexo II
 *
 * Características:
 * - Stepper interactivo de 11 nodos (Gordon Ring).
 * - Guía clínica basada en Jacquier et al. (2014) con preguntas sugeridas y observables.
 * - Registro de datos subjetivos, datos objetivos y fuente.
 * - Marcación clínica explícita: 'conservado' | 'alterado' con justificación obligatoria si es alterado.
 * - Asistente de diagnósticos NANDA-I sugeridos por patrón.
 * - Autoguardado reactivo en Firestore offline (familias/{famId}/valoraciones/{id}).
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { guiaFamiliarData, nandaData } from '@/catalogos'
import type {
  Familia,
  Barrio,
  Valoracion,
  ItemNanda,
  EstadoPatronFamiliar,
  PayloadPatrones,
} from '@/types'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Stethoscope,
  Info,
  FileCheck2,
} from 'lucide-react'

interface DatosPatronForm {
  estado: EstadoPatronFamiliar
  subjetivos: string
  objetivos: string
  fuente: string
  justificacion: string
}

export function ValoracionPatronesPage() {
  const { famId } = useParams<{ famId: string }>()
  const navigate = useNavigate()
  const { usuario, firebaseUser } = useAuth()

  const [familia, setFamilia] = useState<Familia | null>(null)
  const [barrio, setBarrio] = useState<Barrio | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  // Patrón activo (1 a 11)
  const [patronActivo, setPatronActivo] = useState<number>(1)
  const [guiaExpandida, setGuiaExpandida] = useState(false)
  const [verNanda, setVerNanda] = useState(false)

  // Estado del formulario para los 11 patrones (p1 a p11)
  const [patronesData, setPatronesData] = useState<Record<string, DatosPatronForm>>(() => {
    const inicial: Record<string, DatosPatronForm> = {}
    for (let i = 1; i <= 11; i++) {
      inicial[`p${i}`] = {
        estado: 'sin_valorar',
        subjetivos: '',
        objetivos: '',
        fuente: 'Referente familiar / Entrevista domiciliaria',
        justificacion: '',
      }
    }
    return inicial
  })

  // ID del documento de valoración existente
  const [valoracionDocId, setValoracionDocId] = useState<string | null>(null)

  // 1. Cargar familia y valoración previa de patrones
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

        // Buscar valoración de patrones existente
        const qVal = query(
          collection(db, 'familias', famId, 'valoraciones'),
          where('tipo', '==', 'patrones')
        )
        const valSnap = await getDocs(qVal)
        if (!valSnap.empty) {
          const vDoc = valSnap.docs[0]
          setValoracionDocId(vDoc.id)
          const vData = vDoc.data() as Valoracion
          const payload = vData.payload as PayloadPatrones

          if (payload?.patrones) {
            setPatronesData((prev) => {
              const actualizado = { ...prev }
              for (let i = 1; i <= 11; i++) {
                const pKey = `p${i}`
                const pExistente = payload.patrones[pKey] as any
                if (pExistente) {
                  actualizado[pKey] = {
                    estado: pExistente.estado || 'sin_valorar',
                    subjetivos: pExistente.subjetivos || pExistente.respuestas?.subjetivos || '',
                    objetivos: pExistente.objetivos || pExistente.respuestas?.objetivos || '',
                    fuente: pExistente.fuente || 'Referente familiar / Entrevista domiciliaria',
                    justificacion: pExistente.justificacion || '',
                  }
                }
              }
              return actualizado
            })
          }
        }
      } catch (err) {
        console.error('Error al cargar datos:', err)
        setErrorGuardado('Error de conexión al cargar la valoración.')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [famId])

  // Patrón actual del catálogo clínico
  const patronCatalogo = useMemo(() => {
    return guiaFamiliarData.patrones.find((p) => p.n === patronActivo)
  }, [patronActivo])

  // Datos del formulario para el patrón actual
  const actualKey = `p${patronActivo}`
  const formActual = patronesData[actualKey] || {
    estado: 'sin_valorar',
    subjetivos: '',
    objetivos: '',
    fuente: 'Referente familiar',
    justificacion: '',
  }

  // Diagnósticos NANDA sugeridos para el patrón activo
  const nandaSugeridos: ItemNanda[] = useMemo(() => {
    const items = nandaData.items as ItemNanda[]
    return items.filter(
      (it) =>
        it.patrones.includes(patronActivo) &&
        (it.sujeto.includes('familia') || it.sujeto.includes('individuo'))
    )
  }, [patronActivo])

  // Conteo global de avances
  const estadisticas = useMemo(() => {
    let valorados = 0
    let conservados = 0
    let alterados = 0
    for (let i = 1; i <= 11; i++) {
      const est = patronesData[`p${i}`]?.estado
      if (est && est !== 'sin_valorar') valorados++
      if (est === 'conservado') conservados++
      if (est === 'alterado') alterados++
    }
    return { valorados, conservados, alterados }
  }, [patronesData])

  // Actualizar campo del patrón actual
  const actualizarCampo = (campo: keyof DatosPatronForm, valor: any) => {
    setPatronesData((prev) => ({
      ...prev,
      [actualKey]: {
        ...prev[actualKey],
        [campo]: valor,
      },
    }))
    setGuardadoOk(false)
  }

  // Guardar en Firestore
  const guardarValoracion = async (mostrarFeedback = true) => {
    if (!famId || !familia) return

    setGuardando(true)
    setErrorGuardado(null)

    try {
      const colRef = collection(db, 'familias', famId, 'valoraciones')
      const docRef = valoracionDocId ? doc(colRef, valoracionDocId) : doc(colRef)

      // Ensamblar payload
      const payloadPatrones: Record<string, any> = {}
      for (let i = 1; i <= 11; i++) {
        const k = `p${i}`
        const p = patronesData[k]
        payloadPatrones[k] = {
          estado: p.estado,
          justificacion: p.justificacion,
          subjetivos: p.subjetivos,
          objetivos: p.objetivos,
          fuente: p.fuente,
          respuestas: {
            subjetivos: p.subjetivos,
            objetivos: p.objetivos,
            fuente: p.fuente,
          },
        }
      }

      const docData = {
        famId,
        orgId: usuario?.orgId ?? familia.orgId,
        tipo: 'patrones',
        payload: {
          patrones: payloadPatrones,
        },
        versionEscala: 'Gordon-UNRC-2014',
        version: 1,
        fecha: serverTimestamp(),
        autorId: firebaseUser?.uid ?? 'anon',
        updatedAt: serverTimestamp(),
        createdBy: firebaseUser?.uid ?? 'anon',
        deviceId: localStorage.getItem('cuida_device_id') || 'dev_local',
        schemaVersion: 1,
      }

      await setDoc(docRef, docData, { merge: true })
      setValoracionDocId(docRef.id)

      if (mostrarFeedback) {
        setGuardadoOk(true)
        setTimeout(() => setGuardadoOk(false), 3000)
      }
    } catch (err) {
      console.error('Error al guardar valoración de patrones:', err)
      setErrorGuardado('No se pudo guardar la valoración. Verificá la conexión.')
    } finally {
      setGuardando(false)
    }
  }

  // Cambiar de patrón con guardado automático
  const cambiarPatron = async (nuevoN: number) => {
    await guardarValoracion(false)
    setPatronActivo(nuevoN)
    setGuiaExpandida(false)
    setVerNanda(false)
  }

  // Siguiente / Anterior
  const irAnterior = () => {
    if (patronActivo > 1) cambiarPatron(patronActivo - 1)
  }

  const irSiguiente = () => {
    if (patronActivo < 11) cambiarPatron(patronActivo + 1)
  }

  // Finalizar y volver a la ficha
  const handleFinalizar = async () => {
    await guardarValoracion(false)
    navigate(`/familias/${famId}`)
  }

  if (cargando) {
    return (
      <div className="patrones-cargando" role="status">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
          <circle cx="24" cy="24" r="20" stroke="var(--linea)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" stroke="var(--lago)" strokeWidth="3" strokeDasharray="30 90" strokeLinecap="round" />
        </svg>
        <span className="text-apagado">Cargando valoración de patrones...</span>
      </div>
    )
  }

  return (
    <div className="patrones-pagina stack">
      {/* Barra Superior */}
      <header className="patrones-cabecera">
        <div className="cabecera-izq">
          <button
            type="button"
            className="btn-volver"
            onClick={handleFinalizar}
            aria-label="Volver a la ficha familiar"
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

        <div className="cabecera-der">
          <button
            type="button"
            className="btn btn-outline btn-sm btn-guardar"
            onClick={() => guardarValoracion(true)}
            disabled={guardando}
          >
            {guardadoOk ? (
              <>
                <Check size={14} color="var(--ok)" />
                <span>Guardado</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{guardando ? 'Guardando...' : 'Guardar'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Alerta de error si ocurre */}
      {errorGuardado && (
        <div className="alerta-error" role="alert">
          <AlertCircle size={16} />
          <span>{errorGuardado}</span>
        </div>
      )}

      {/* Gordon Ring / Stepper interactivo de los 11 patrones */}
      <nav className="gordon-stepper tarjeta" aria-label="Navegación de 11 patrones de Gordon">
        <div className="stepper-contador-fila">
          <div className="contador-texto">
            <strong>Patrón {patronActivo} de 11:</strong>
            <span className="text-apagado"> {patronCatalogo?.nombre}</span>
          </div>
          <div className="contador-badges">
            <span className="badge-stat">
              {estadisticas.valorados}/11 valorados
            </span>
            {estadisticas.alterados > 0 && (
              <span className="badge-stat alerta">
                {estadisticas.alterados} alterados
              </span>
            )}
          </div>
        </div>

        <div className="stepper-nodos-grid" role="group">
          {guiaFamiliarData.patrones.map((pat) => {
            const k = `p${pat.n}`
            const est = patronesData[k]?.estado || 'sin_valorar'
            const esActivo = pat.n === patronActivo

            return (
              <button
                key={pat.n}
                type="button"
                className={`nodo-btn estado-${est} ${esActivo ? 'nodo-activo' : ''}`}
                onClick={() => cambiarPatron(pat.n)}
                title={`P${pat.n}: ${pat.nombre} (${est.replace('_', ' ')})`}
                aria-label={`Patrón ${pat.n}: ${pat.nombre}`}
              >
                <span className="nodo-numero">{pat.n}</span>
                <span className="nodo-etiqueta">{pat.nombre.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Tarjeta del Patrón Activo */}
      <main className="tarjeta patron-tarjeta stack">
        {/* Cabecera del patrón */}
        <header className="patron-header">
          <div className="patron-titular">
            <div className="p-badge">P{patronActivo}</div>
            <div>
              <h2 className="h3">{patronCatalogo?.nombre}</h2>
              <p className="patron-desc text-apagado">{patronCatalogo?.descripcion}</p>
            </div>
          </div>

          <button
            type="button"
            className="btn-toggle-guia"
            onClick={() => setGuiaExpandida(!guiaExpandida)}
            aria-expanded={guiaExpandida}
          >
            <Info size={16} />
            <span>{guiaExpandida ? 'Ocultar guía clínica' : 'Ver guía clínica'}</span>
            {guiaExpandida ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </header>

        {/* Guía clínica desplegable (preguntas sugeridas y observables) */}
        {guiaExpandida && patronCatalogo && (
          <section className="guia-clinica-desplegable stack" aria-label="Guía clínica del patrón">
            <div className="guia-bloque">
              <strong className="guia-subtitulo">
                Preguntas sugeridas a la familia (Datos subjetivos):
              </strong>
              <ul className="guia-lista">
                {patronCatalogo.preguntasSugeridas.map((preg, idx) => (
                  <li key={idx}>{preg}</li>
                ))}
              </ul>
            </div>

            <div className="guia-bloque">
              <strong className="guia-subtitulo">
                Observables en la visita y el hogar (Datos objetivos):
              </strong>
              <ul className="guia-lista">
                {patronCatalogo.observables.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>

            <div className="guia-alerta-criterio">
              <Stethoscope size={16} color="var(--azul)" />
              <div>
                <strong>Orientación para juzgar alteración:</strong>
                <p>{patronCatalogo.criteriosAlteracion}</p>
              </div>
            </div>
          </section>
        )}

        {/* Formulario de valoración clínica */}
        <div className="patron-formulario stack">
          {/* Datos Subjetivos */}
          <div className="campo">
            <label htmlFor="input-subjetivos" className="campo-etiqueta">
              Datos subjetivos (lo manifestado por la familia)
            </label>
            <textarea
              id="input-subjetivos"
              className="input-control"
              rows={3}
              placeholder="Describí las respuestas, preocupaciones, hábitos o percepciones que los integrantes compartieron..."
              value={formActual.subjetivos}
              onChange={(e) => actualizarCampo('subjetivos', e.target.value)}
            />
          </div>

          {/* Datos Objetivos */}
          <div className="campo">
            <label htmlFor="input-objetivos" className="campo-etiqueta">
              Datos objetivos y signos observados
            </label>
            <textarea
              id="input-objetivos"
              className="input-control"
              rows={3}
              placeholder="Anotá lo observado en el hogar, carnets de salud, indumentaria, ambiente, interacciones directas..."
              value={formActual.objetivos}
              onChange={(e) => actualizarCampo('objetivos', e.target.value)}
            />
          </div>

          {/* Fuente del dato */}
          <div className="campo">
            <label htmlFor="input-fuente" className="campo-etiqueta">
              Fuente del dato
            </label>
            <input
              id="input-fuente"
              type="text"
              className="input-control"
              placeholder="Ej. Madre, Jefa de hogar, Observación en cocina, Libreta de vacunación..."
              value={formActual.fuente}
              onChange={(e) => actualizarCampo('fuente', e.target.value)}
            />
          </div>

          {/* Veredicto Clínico: Conservado vs. Alterado */}
          <div className="veredicto-bloque">
            <span className="campo-etiqueta">Veredicto clínico de enfermería</span>
            <div className="veredicto-botones">
              <button
                type="button"
                className={`btn-veredicto veredicto-conservado ${
                  formActual.estado === 'conservado' ? 'seleccionado' : ''
                }`}
                onClick={() => actualizarCampo('estado', 'conservado')}
              >
                <CheckCircle2 size={18} />
                <div>
                  <strong>Conservado</strong>
                  <small>Conductas protectoras / Saludable</small>
                </div>
              </button>

              <button
                type="button"
                className={`btn-veredicto veredicto-alterado ${
                  formActual.estado === 'alterado' ? 'seleccionado' : ''
                }`}
                onClick={() => actualizarCampo('estado', 'alterado')}
              >
                <AlertCircle size={18} />
                <div>
                  <strong>Alterado</strong>
                  <small>Disfunción / Riesgo para la salud</small>
                </div>
              </button>

              <button
                type="button"
                className={`btn-veredicto veredicto-sin-valorar ${
                  formActual.estado === 'sin_valorar' ? 'seleccionado' : ''
                }`}
                onClick={() => actualizarCampo('estado', 'sin_valorar')}
              >
                <HelpCircle size={18} />
                <div>
                  <strong>Sin valorar</strong>
                  <small>Pendiente de indagación</small>
                </div>
              </button>
            </div>
          </div>

          {/* Justificación obligatoria si está alterado */}
          <div className="campo">
            <label htmlFor="input-justificacion" className="campo-etiqueta">
              Justificación clínica del veredicto
              {formActual.estado === 'alterado' && (
                <span className="obligatorio-marca"> (Requerido para patrón alterado)</span>
              )}
            </label>
            <textarea
              id="input-justificacion"
              className={`input-control ${
                formActual.estado === 'alterado' && !formActual.justificacion.trim()
                  ? 'campo-invalido'
                  : ''
              }`}
              rows={2}
              placeholder={
                formActual.estado === 'alterado'
                  ? 'Explicá el motivo de la alteración para orientar el diagnóstico de enfermería (PES)...'
                  : 'Fundamento breve de la condición del patrón en esta familia...'
              }
              value={formActual.justificacion}
              onChange={(e) => actualizarCampo('justificacion', e.target.value)}
            />
            {formActual.estado === 'alterado' && !formActual.justificacion.trim() && (
              <span className="campo-ayuda-alerta">
                La justificación es necesaria para habilitar diagnósticos NANDA en la Central (Paso 12).
              </span>
            )}
          </div>

          {/* Asistente NANDA sugerido */}
          <div className="asistente-nanda-caja">
            <button
              type="button"
              className="btn-toggle-nanda"
              onClick={() => setVerNanda(!verNanda)}
            >
              <Stethoscope size={16} />
              <span>
                Diagnósticos NANDA-I sugeridos para este patrón ({nandaSugeridos.length})
              </span>
              {verNanda ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {verNanda && (
              <div className="nanda-lista-items stack">
                <p className="text-apagado" style={{ fontSize: '0.8rem' }}>
                  Estos diagnósticos son sugeridos por el modelo teórico (Anexo E). Quien valora o supervisa
                  formulará el enunciado PES y plan en la Central Web (Paso 12).
                </p>
                <div className="nanda-pills-grid">
                  {nandaSugeridos.map((nd) => (
                    <div key={nd.codigo} className={`nanda-item-card tipo-${nd.tipo}`}>
                      <div className="nanda-top">
                        <span className="nanda-codigo">{nd.codigo}</span>
                        <span className="nanda-tipo">{nd.tipo}</span>
                      </div>
                      <strong className="nanda-etiqueta">{nd.etiqueta}</strong>
                      <span className="nanda-sujetos text-apagado">
                        Sujeto: {nd.sujeto.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de Navegación Inferior (Anterior / Siguiente / Finalizar) */}
        <footer className="patron-footer-nav">
          <button
            type="button"
            className="btn btn-outline"
            onClick={irAnterior}
            disabled={patronActivo === 1}
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </button>

          <div className="nav-centro">
            {patronActivo < 11 ? (
              <button
                type="button"
                className="btn btn-primario"
                onClick={irSiguiente}
              >
                <span>Siguiente patrón</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primario"
                onClick={handleFinalizar}
              >
                <FileCheck2 size={16} />
                <span>Finalizar y volver a la Ficha</span>
              </button>
            )}
          </div>
        </footer>
      </main>

      {/* Estilos específicos */}
      <style>{`
        .patrones-pagina {
          padding: var(--sp-4);
          max-width: 900px;
          margin: 0 auto;
        }

        .patrones-cargando {
          min-height: 50vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-3);
        }

        .patrones-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
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

        /* Gordon Stepper */
        .gordon-stepper {
          padding: var(--sp-3);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .stepper-contador-fila {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .contador-badges {
          display: flex;
          gap: var(--sp-2);
        }

        .badge-stat {
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--papel);
          border: 1px solid var(--linea);
          padding: 2px 8px;
          border-radius: 999px;
        }

        .badge-stat.alerta {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
          border-color: var(--atencion);
        }

        .stepper-nodos-grid {
          display: grid;
          grid-template-columns: repeat(11, 1fr);
          gap: 4px;
        }

        @media (max-width: 600px) {
          .stepper-nodos-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        .nodo-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 2px;
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          cursor: pointer;
          transition: all var(--dur-rapido) var(--ease);
        }

        .nodo-btn:hover {
          border-color: var(--azul);
        }

        .nodo-btn.nodo-activo {
          border-color: var(--azul);
          box-shadow: 0 0 0 2px var(--azul);
          font-weight: 700;
        }

        .nodo-btn.estado-conservado {
          background: color-mix(in srgb, var(--ok) 15%, var(--tarjeta));
          border-color: var(--ok);
        }

        .nodo-btn.estado-conservado .nodo-numero {
          color: var(--ok);
        }

        .nodo-btn.estado-alterado {
          background: color-mix(in srgb, var(--atencion) 20%, var(--tarjeta));
          border-color: var(--atencion);
        }

        .nodo-btn.estado-alterado .nodo-numero {
          color: var(--atencion);
        }

        .nodo-numero {
          font-size: 0.85rem;
          font-weight: 700;
        }

        .nodo-etiqueta {
          font-size: 0.62rem;
          color: var(--apagado);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        /* Tarjeta Principal */
        .patron-tarjeta {
          padding: var(--sp-4);
        }

        .patron-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-3);
          flex-wrap: wrap;
        }

        .patron-titular {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-3);
          flex: 1;
          min-width: 250px;
        }

        .p-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--azul);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
        }

        .patron-desc {
          font-size: 0.82rem;
          margin-top: 2px;
        }

        .btn-toggle-guia {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: 6px var(--sp-3);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--azul);
          cursor: pointer;
        }

        /* Guía Desplegable */
        .guia-clinica-desplegable {
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: var(--sp-3);
        }

        .guia-subtitulo {
          font-size: 0.82rem;
          color: var(--azul);
          display: block;
          margin-bottom: 4px;
        }

        .guia-lista {
          padding-left: var(--sp-4);
          font-size: 0.8rem;
          color: var(--tinta);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .guia-alerta-criterio {
          display: flex;
          gap: var(--sp-2);
          background: var(--tarjeta);
          padding: var(--sp-2) var(--sp-3);
          border-radius: 4px;
          border-left: 3px solid var(--azul);
          font-size: 0.78rem;
        }

        .guia-alerta-criterio p {
          margin: 2px 0 0 0;
        }

        /* Formulario */
        .patron-formulario {
          margin-top: var(--sp-2);
        }

        /* Veredicto Bloque */
        .veredicto-bloque {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .veredicto-botones {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--sp-2);
        }

        .btn-veredicto {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1.5px solid var(--linea);
          background: var(--tarjeta);
          cursor: pointer;
          text-align: left;
          transition: all var(--dur-rapido) var(--ease);
        }

        .btn-veredicto strong {
          display: block;
          font-size: 0.88rem;
        }

        .btn-veredicto small {
          display: block;
          font-size: 0.7rem;
          color: var(--apagado);
        }

        .veredicto-conservado:hover,
        .veredicto-conservado.seleccionado {
          border-color: var(--ok);
          background: color-mix(in srgb, var(--ok) 10%, var(--tarjeta));
          color: var(--ok);
        }

        .veredicto-alterado:hover,
        .veredicto-alterado.seleccionado {
          border-color: var(--atencion);
          background: color-mix(in srgb, var(--atencion) 12%, var(--tarjeta));
          color: var(--atencion);
        }

        .veredicto-sin-valorar.seleccionado {
          border-color: var(--apagado);
          background: var(--papel);
        }

        .obligatorio-marca {
          color: var(--atencion);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .campo-invalido {
          border-color: var(--atencion);
          background: color-mix(in srgb, var(--atencion) 5%, var(--tarjeta));
        }

        .campo-ayuda-alerta {
          font-size: 0.75rem;
          color: var(--atencion);
          font-weight: 600;
        }

        /* Asistente NANDA */
        .asistente-nanda-caja {
          border-top: 1px dashed var(--linea);
          padding-top: var(--sp-3);
        }

        .btn-toggle-nanda {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: var(--papel);
          border: 1px solid var(--linea);
          border-radius: var(--r-campo);
          padding: var(--sp-2) var(--sp-3);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--azul);
          cursor: pointer;
        }

        .nanda-pills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--sp-2);
          margin-top: var(--sp-2);
        }

        .nanda-item-card {
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nanda-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nanda-codigo {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--azul);
        }

        .nanda-tipo {
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          background: var(--papel);
        }

        .nanda-etiqueta {
          font-size: 0.8rem;
          color: var(--tinta);
        }

        .nanda-sujetos {
          font-size: 0.7rem;
        }

        /* Navegación Footer */
        .patron-footer-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-2);
          padding-top: var(--sp-3);
          border-top: 1px solid var(--linea);
        }
      `}</style>
    </div>
  )
}
