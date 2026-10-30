/**
 * CentralDiagnosticosPage — Asistente Diagnóstico NANDA en Formato PES
 * DISENO_BASE.md §6.6, §7.3:
 * - Vista en dos columnas:
 *     Columna 1: Datos de la familia (Patrones alterados, justificación e instrumentos)
 *     Columna 2: Diagnósticos candidatos de nandaPorPatron.json y redactor PES
 * - Formulación PES:
 *     P (Problema / Diagnóstico NANDA)
 *     E (Etiología / Factores relacionados)
 *     S (Signos y Síntomas / Características definitorias)
 * - Flujo de validación docente: propuesto → confirmado → descartado
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { filtrarDiagnosticosNanda, ItemNanda } from '@/catalogos'
import type { Familia, Diagnostico, EstadoDiagnostico, Valoracion, PayloadPatrones } from '@/types'

export function CentralDiagnosticosPage() {
  const { famId } = useParams<{ famId?: string }>()
  const navigate = useNavigate()
  const { usuario, firebaseUser } = useAuth()

  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState<Familia | null>(null)
  const [valoracionPatrones, setValoracionPatrones] = useState<PayloadPatrones | null>(null)
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [cargando, setCargando] = useState(true)

  // Asistente PES state
  const [patronSeleccionadoNum, setPatronSeleccionadoNum] = useState<number>(1)
  const [diagnosticoCandidato, setDiagnosticoCandidato] = useState<ItemNanda | null>(null)
  const [etiologia, setEtiologia] = useState('')
  const [signosSintomas, setSignosSintomas] = useState('')
  const [guardandoDiagnostico, setGuardandoDiagnostico] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  // Cargar lista de familias
  useEffect(() => {
    let activo = true

    async function cargarFamilias() {
      if (!usuario?.capsIds || usuario.capsIds.length === 0) {
        setCargando(false)
        return
      }

      try {
        const capsQuery = usuario.capsIds.slice(0, 10)
        const qFam = query(
          collection(db, 'familias'),
          where('capsId', 'in', capsQuery),
          where('eliminado', '!=', true)
        )
        const snap = await getDocs(qFam)
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Familia[]

        if (activo) {
          setFamilias(docs)
          if (famId) {
            const match = docs.find((f) => f.id === famId)
            if (match) setFamiliaSeleccionada(match)
          } else if (docs.length > 0) {
            setFamiliaSeleccionada(docs[0])
          }
          setCargando(false)
        }
      } catch (err) {
        console.warn('[CentralDiagnosticos] Error cargando familias:', err)
        if (activo) setCargando(false)
      }
    }

    cargarFamilias()
    return () => {
      activo = false
    }
  }, [usuario?.capsIds, famId])

  // Cargar patrones familiares y diagnósticos existentes de la familia
  useEffect(() => {
    let activo = true
    if (!familiaSeleccionada?.id) return

    async function cargarDatosFamilia() {
      try {
        // Cargar valoraciones de patrones
        const qVal = query(
          collection(db, `familias/${familiaSeleccionada!.id}/valoraciones`),
          where('tipo', '==', 'patrones')
        )
        const snapVal = await getDocs(qVal)
        let patData: PayloadPatrones | null = null
        if (!snapVal.empty) {
          const valDoc = snapVal.docs[0].data() as Valoracion
          patData = valDoc.payload as PayloadPatrones
        }

        // Cargar diagnósticos formulados
        const qDiag = query(
          collection(db, `familias/${familiaSeleccionada!.id}/diagnosticos`)
        )
        const snapDiag = await getDocs(qDiag)
        const diagDocs = snapDiag.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Diagnostico[]

        if (activo) {
          setValoracionPatrones(patData)
          setDiagnosticos(diagDocs)

          // Seleccionar por defecto el primer patrón alterado si existe
          if (patData?.patrones) {
            const primerAlteradoKey = Object.keys(patData.patrones).find(
              (k) => patData.patrones[k]?.estado === 'alterado'
            )
            if (primerAlteradoKey) {
              const num = parseInt(primerAlteradoKey.replace('p', ''), 10)
              if (!isNaN(num)) setPatronSeleccionadoNum(num)
            }
          }
        }
      } catch (err) {
        console.warn('[CentralDiagnosticos] Error cargando diagnósticos:', err)
      }
    }

    cargarDatosFamilia()
    return () => {
      activo = false
    }
  }, [familiaSeleccionada])

  // Diagnósticos candidatos de NANDA para el patrón seleccionado
  const candidatosNanda = useMemo(() => {
    return filtrarDiagnosticosNanda({
      patron: patronSeleccionadoNum,
    })
  }, [patronSeleccionadoNum])

  // Enunciado PES generado dinámicamente
  const enunciadoPesCalculado = useMemo(() => {
    if (!diagnosticoCandidato) return ''
    const p = `[${diagnosticoCandidato.codigo}] ${diagnosticoCandidato.etiqueta}`
    const e = etiologia.trim() ? ` relacionado con ${etiologia.trim()}` : ''
    const s = signosSintomas.trim() ? ` manifestado por ${signosSintomas.trim()}` : ''
    return `${p}${e}${s}.`
  }, [diagnosticoCandidato, etiologia, signosSintomas])

  // Guardar propuesta de diagnóstico
  const handleGuardarDiagnostico = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familiaSeleccionada?.id || !diagnosticoCandidato) return

    setGuardandoDiagnostico(true)
    try {
      const nuevoDiag: Omit<Diagnostico, 'id'> = {
        famId: familiaSeleccionada.id,
        orgId: familiaSeleccionada.orgId || usuario?.orgId || 'org-demo',
        patron: `p${patronSeleccionadoNum}`,
        nandaCodigo: diagnosticoCandidato.codigo,
        etiqueta: diagnosticoCandidato.etiqueta,
        caracteristicasObservadas: signosSintomas ? [signosSintomas] : [],
        enunciadoPES: enunciadoPesCalculado,
        estado: 'propuesto',
        fecha: Timestamp.now(),
        createdAt: Timestamp.now(),
        createdBy: firebaseUser?.uid ?? usuario?.id ?? 'docente',
        deviceId: 'central-web',
        schemaVersion: 1,
        syncEstado: 'enviado',
      }

      const docRef = await addDoc(
        collection(db, `familias/${familiaSeleccionada.id}/diagnosticos`),
        nuevoDiag
      )

      setDiagnosticos((prev) => [{ id: docRef.id, ...nuevoDiag }, ...prev])
      setDiagnosticoCandidato(null)
      setEtiologia('')
      setSignosSintomas('')
      setMensajeExito('Diagnóstico propuesto con éxito en formato PES.')
      setTimeout(() => setMensajeExito(null), 4000)
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Error al guardar diagnóstico')
    } finally {
      setGuardandoDiagnostico(false)
    }
  }

  // Cambiar estado docente (confirmar / descartar)
  const handleCambiarEstado = async (diagId: string, nuevoEstado: EstadoDiagnostico) => {
    if (!familiaSeleccionada?.id) return

    try {
      await updateDoc(
        doc(db, `familias/${familiaSeleccionada.id}/diagnosticos/${diagId}`),
        {
          estado: nuevoEstado,
          validadoPor: firebaseUser?.uid ?? usuario?.id ?? 'supervisor',
          updatedAt: serverTimestamp(),
        }
      )

      setDiagnosticos((prev) =>
        prev.map((d) => (d.id === diagId ? { ...d, estado: nuevoEstado } : d))
      )
    } catch (err: unknown) {
      console.error(err)
      alert('Error al actualizar el estado del diagnóstico')
    }
  }

  // Nombre de patrones para selector
  const nombresPatrones: Record<number, string> = {
    1: 'Percepción y control de salud',
    2: 'Nutricional y metabólico',
    3: 'Eliminación',
    4: 'Actividad y ejercicio',
    5: 'Sueño y descanso',
    6: 'Cognitivo y perceptivo',
    7: 'Autopercepción y autoconcepto',
    8: 'Rol y relaciones',
    9: 'Sexualidad y reproducción',
    10: 'Afrontamiento y tolerancia al estrés',
    11: 'Valores y creencias',
  }

  if (cargando) {
    return <div className="tarjeta text-apagado">Cargando familias y asistente diagnóstico...</div>
  }

  return (
    <div className="central-diagnosticos-stack">
      <header className="diagnosticos-top-header">
        <div>
          <h1 className="h2 diagnosticos-titulo">Asistente Diagnóstico NANDA-I</h1>
          <p className="text-apagado">
            Formulación clínica en formato PES (Problema · Etiología · Signos y Síntomas) cruzado con patrones de Gordon.
          </p>
        </div>

        {/* Selector de familia */}
        <div className="selector-familia-box">
          <label className="text-sm text-apagado">Familia en evaluación:</label>
          <select
            className="select-familia"
            value={familiaSeleccionada?.id || ''}
            onChange={(e) => {
              const sel = familias.find((f) => f.id === e.target.value)
              if (sel) {
                setFamiliaSeleccionada(sel)
                navigate(`/central/familias/${sel.id}/diagnosticos`, { replace: true })
              }
            }}
          >
            {familias.map((f) => (
              <option key={f.id} value={f.id}>
                Familia {f.apellido} ({f.codigoFamiliar})
              </option>
            ))}
          </select>
        </div>
      </header>

      {mensajeExito && (
        <div className="alerta-exito-pes" role="status">
          <CheckCircle2 size={16} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Grid de 2 Columnas: Datos de la Familia vs Asistente NANDA */}
      <div className="diagnosticos-dos-columnas-grid">
        {/* Columna Izquierda: Datos y Patrones Alterados de la Familia */}
        <section className="tarjeta columna-familia stack">
          <header className="columna-header">
            <div>
              <h2 className="h4">Patrones Funcionales Relevados</h2>
              <p className="text-apagado text-sm">
                Seleccioná el patrón alterado para explorar diagnósticos NANDA
              </p>
            </div>
          </header>

          <div className="patrones-familia-selector-lista">
            {Array.from({ length: 11 }, (_, i) => i + 1).map((num) => {
              const pKey = `p${num}`
              const patData = valoracionPatrones?.patrones?.[pKey]
              const esAlterado = patData?.estado === 'alterado'
              const esConservado = patData?.estado === 'conservado'
              const seleccionado = patronSeleccionadoNum === num

              return (
                <button
                  key={num}
                  type="button"
                  className={`patron-btn-fila ${seleccionado ? 'patron-fila-activa' : ''}`}
                  onClick={() => {
                    setPatronSeleccionadoNum(num)
                    setDiagnosticoCandidato(null)
                  }}
                >
                  <div className="patron-fila-izq">
                    <span className="badge-p-num">P{num}</span>
                    <div className="patron-fila-textos">
                      <strong>{nombresPatrones[num]}</strong>
                      {patData?.justificacion ? (
                        <p className="patron-justificacion-preview text-apagado">
                          "{patData.justificacion}"
                        </p>
                      ) : (
                        <span className="sin-justificacion text-apagado">Sin notas clínicas</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`tag-estado-patron ${esAlterado ? 'tag-alterado' : esConservado ? 'tag-conservado' : 'tag-sin'}`}
                  >
                    {esAlterado ? 'Alterado' : esConservado ? 'Conservado' : 'S/D'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Columna Derecha: Asistente NANDA y Formulación PES */}
        <section className="tarjeta columna-asistente stack">
          <header className="columna-header">
            <div>
              <h2 className="h4">
                Diagnósticos Candidatos para P{patronSeleccionadoNum}
              </h2>
              <p className="text-apagado text-sm">
                {nombresPatrones[patronSeleccionadoNum]} ({candidatosNanda.length} disponibles)
              </p>
            </div>
          </header>

          {/* Lista de candidatos NANDA */}
          <div className="candidatos-nanda-scroll">
            {candidatosNanda.length === 0 ? (
              <p className="text-apagado text-sm">
                No hay diagnósticos catalogados para este patrón.
              </p>
            ) : (
              <div className="candidatos-cards-grid">
                {candidatosNanda.map((item) => {
                  const esSeleccionado = diagnosticoCandidato?.codigo === item.codigo
                  return (
                    <div
                      key={item.codigo}
                      className={`candidato-card ${esSeleccionado ? 'candidato-card-activo' : ''}`}
                      onClick={() => setDiagnosticoCandidato(item)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="candidato-top">
                        <span className="codigo-nanda-chip">[{item.codigo}]</span>
                        <span className={`tipo-nanda-badge tipo-${item.tipo}`}>{item.tipo}</span>
                      </div>
                      <strong className="candidato-etiqueta">{item.etiqueta}</strong>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Formulario de Redacción PES */}
          {diagnosticoCandidato && (
            <form onSubmit={handleGuardarDiagnostico} className="formulario-pes-tarjeta stack">
              <div className="pes-form-header">
                <Sparkles size={18} className="icono-pes" />
                <h3 className="h4">Redacción de Enunciado PES</h3>
              </div>

              {/* P */}
              <div className="campo">
                <label className="campo-etiqueta">
                  <strong>P</strong> · Problema (Diagnóstico NANDA)
                </label>
                <div className="campo-valor-estatico">
                  [{diagnosticoCandidato.codigo}] {diagnosticoCandidato.etiqueta}
                </div>
              </div>

              {/* E */}
              <div className="campo">
                <label htmlFor="input-etiologia" className="campo-etiqueta">
                  <strong>E</strong> · Etiología / Factor relacionado (relacionado con...)
                </label>
                <input
                  id="input-etiologia"
                  type="text"
                  className="input-control"
                  placeholder="Ej: crisis situacional, duelo reciente, falta de recursos económicos"
                  value={etiologia}
                  onChange={(e) => setEtiologia(e.target.value)}
                  required
                />
              </div>

              {/* S */}
              <div className="campo">
                <label htmlFor="input-signos" className="campo-etiqueta">
                  <strong>S</strong> · Signos y Síntomas / Características definitorias (manifestado por...)
                </label>
                <input
                  id="input-signos"
                  type="text"
                  className="input-control"
                  placeholder="Ej: dificultad para dormir, expresiones de angustia, llanto frecuente"
                  value={signosSintomas}
                  onChange={(e) => setSignosSintomas(e.target.value)}
                  required
                />
              </div>

              {/* Previsualización del Enunciado PES completo */}
              <div className="preview-pes-box">
                <span className="preview-pes-label">Enunciado PES completo:</span>
                <p className="preview-pes-texto">{enunciadoPesCalculado}</p>
              </div>

              <button
                type="submit"
                className="btn btn-primario"
                disabled={guardandoDiagnostico || !etiologia.trim() || !signosSintomas.trim()}
              >
                <Plus size={16} />
                <span>{guardandoDiagnostico ? 'Guardando...' : 'Proponer Diagnóstico PES'}</span>
              </button>
            </form>
          )}

          {/* Lista de Diagnósticos Registrados para la Familia */}
          <div className="diagnosticos-registrados-seccion stack">
            <h3 className="h4">
              Diagnósticos Formulados ({diagnosticos.length})
            </h3>

            {diagnosticos.length === 0 ? (
              <p className="text-apagado text-sm">
                Todavía no se propusieron diagnósticos para esta familia.
              </p>
            ) : (
              <div className="lista-diagnosticos-cards">
                {diagnosticos.map((diag) => (
                  <div key={diag.id} className="diagnostico-card-item">
                    <div className="diag-item-top">
                      <div className="diag-item-badges">
                        <span className="codigo-nanda-chip">[{diag.nandaCodigo}]</span>
                        <span className={`badge-estado-diag estado-${diag.estado}`}>
                          {diag.estado}
                        </span>
                      </div>
                      <span className="diag-fecha text-apagado">
                        {diag.fecha?.toDate
                          ? diag.fecha.toDate().toLocaleDateString('es-AR')
                          : 'Hoy'}
                      </span>
                    </div>

                    <p className="diag-enunciado-pes">
                      {diag.enunciadoPES || diag.etiqueta}
                    </p>

                    {/* Acciones de Validación Docente */}
                    <div className="diag-acciones-supervisor">
                      {diag.estado === 'propuesto' && (
                        <>
                          <button
                            type="button"
                            className="btn-validar btn-confirmar"
                            onClick={() => handleCambiarEstado(diag.id!, 'confirmado')}
                            title="Confirmar diagnóstico como supervisor docente"
                          >
                            <CheckCircle2 size={14} />
                            <span>Confirmar</span>
                          </button>
                          <button
                            type="button"
                            className="btn-validar btn-descartar"
                            onClick={() => handleCambiarEstado(diag.id!, 'descartado')}
                            title="Descartar propuesta"
                          >
                            <XCircle size={14} />
                            <span>Descartar</span>
                          </button>
                        </>
                      )}

                      {diag.estado === 'confirmado' && (
                        <div className="diag-plan-link-fila">
                          <span className="confirmado-label">
                            <CheckCircle2 size={14} /> Confirmado por supervisor
                          </span>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(`/central/familias/${familiaSeleccionada!.id}/plan`)}
                          >
                            <ArrowRight size={13} />
                            <span>Ir al Plan</span>
                          </button>
                        </div>
                      )}

                      {diag.estado === 'descartado' && (
                        <span className="descartado-label">
                          <XCircle size={14} /> Descartado en supervisión
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .central-diagnosticos-stack {
          display: flex;
          flex-direction: column;
          gap: var(--sp-6);
        }

        .diagnosticos-top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--sp-3);
        }

        .diagnosticos-titulo {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-1);
        }

        .selector-familia-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .select-familia {
          padding: 8px 12px;
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          font-size: 0.88rem;
          color: var(--azul);
          font-weight: 700;
        }

        .alerta-exito-pes {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          background: color-mix(in srgb, var(--ok) 12%, var(--tarjeta));
          border: 1px solid var(--ok);
          color: var(--ok);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .diagnosticos-dos-columnas-grid {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: var(--sp-6);
        }

        @media (max-width: 900px) {
          .diagnosticos-dos-columnas-grid {
            grid-template-columns: 1fr;
          }
        }

        .columna-header {
          border-bottom: 1px solid var(--linea);
          padding-bottom: var(--sp-3);
        }

        .patrones-familia-selector-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          max-height: 600px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .patron-btn-fila {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea);
          background: var(--fondo);
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .patron-btn-fila:hover {
          border-color: var(--azul-medio);
        }

        .patron-fila-activa {
          background: color-mix(in srgb, var(--azul) 8%, var(--tarjeta));
          border-color: var(--azul);
        }

        .patron-fila-izq {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .badge-p-num {
          font-size: 0.75rem;
          font-weight: 800;
          background: var(--azul);
          color: white;
          padding: 2px 6px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .patron-fila-textos strong {
          display: block;
          font-size: 0.85rem;
          color: var(--azul);
        }

        .patron-justificacion-preview {
          font-size: 0.75rem;
          margin: 2px 0 0;
          line-height: 1.25;
        }

        .sin-justificacion {
          font-size: 0.72rem;
          font-style: italic;
        }

        .tag-estado-patron {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .tag-alterado {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
        }

        .tag-conservado {
          background: color-mix(in srgb, var(--ok) 15%, transparent);
          color: var(--ok);
        }

        .tag-sin {
          background: var(--linea);
          color: var(--apagado);
        }

        .candidatos-nanda-scroll {
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .candidatos-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--sp-2);
        }

        .candidato-card {
          padding: var(--sp-2) var(--sp-3);
          border-radius: 8px;
          border: 1px solid var(--linea);
          background: var(--fondo);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .candidato-card:hover {
          border-color: var(--lago);
        }

        .candidato-card-activo {
          background: color-mix(in srgb, var(--lago) 12%, var(--tarjeta));
          border-color: var(--lago);
        }

        .candidato-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }

        .codigo-nanda-chip {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.72rem;
          color: var(--azul);
        }

        .tipo-nanda-badge {
          font-size: 0.62rem;
          text-transform: uppercase;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 4px;
        }

        .tipo-problema {
          background: color-mix(in srgb, var(--critico) 12%, transparent);
          color: var(--critico);
        }

        .tipo-riesgo {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
        }

        .tipo-disposicion {
          background: color-mix(in srgb, var(--ok) 15%, transparent);
          color: var(--ok);
        }

        .candidato-etiqueta {
          font-size: 0.8rem;
          color: var(--tinta);
          display: block;
          line-height: 1.25;
        }

        .formulario-pes-tarjeta {
          background: var(--fondo);
          padding: var(--sp-4);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--azul-medio);
        }

        .pes-form-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icono-pes {
          color: var(--lago);
        }

        .campo-valor-estatico {
          padding: 8px 12px;
          background: var(--tarjeta);
          border-radius: 8px;
          border: 1px solid var(--linea);
          font-weight: 700;
          color: var(--azul);
          font-size: 0.88rem;
        }

        .preview-pes-box {
          background: color-mix(in srgb, var(--azul) 6%, var(--tarjeta));
          padding: var(--sp-3);
          border-radius: 8px;
          border-left: 3px solid var(--azul);
        }

        .preview-pes-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--azul);
          display: block;
          margin-bottom: 2px;
        }

        .preview-pes-texto {
          font-size: 0.88rem;
          font-style: italic;
          color: var(--tinta);
          margin: 0;
          line-height: 1.35;
        }

        .lista-diagnosticos-cards {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .diagnostico-card-item {
          background: var(--fondo);
          padding: var(--sp-3);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .diag-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .diag-item-badges {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .badge-estado-diag {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
          text-transform: uppercase;
        }

        .estado-propuesto {
          background: color-mix(in srgb, var(--atencion) 15%, transparent);
          color: var(--atencion);
        }

        .estado-confirmado {
          background: color-mix(in srgb, var(--ok) 15%, transparent);
          color: var(--ok);
        }

        .estado-descartado {
          background: var(--linea);
          color: var(--apagado);
        }

        .diag-enunciado-pes {
          font-size: 0.88rem;
          color: var(--tinta);
          margin: 0;
          line-height: 1.35;
        }

        .diag-acciones-supervisor {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          border-top: 1px solid color-mix(in srgb, var(--linea) 60%, transparent);
          padding-top: var(--sp-2);
        }

        .btn-validar {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .btn-confirmar {
          background: color-mix(in srgb, var(--ok) 15%, transparent);
          color: var(--ok);
          border-color: var(--ok);
        }

        .btn-descartar {
          background: color-mix(in srgb, var(--critico) 12%, transparent);
          color: var(--critico);
          border-color: var(--critico);
        }

        .diag-plan-link-fila {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .confirmado-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--ok);
        }

        .descartado-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--apagado);
        }
      `}</style>
    </div>
  )
}
