/**
 * CentralPlanPage — Plan de Cuidados e Intervenciones + Notas de Evolución SOEP
 * DISENO_BASE.md §6.6:
 * - Para cada diagnóstico confirmado, el plan ofrece resultados e intervenciones.
 * - Al tildar una sugerencia queda fijada con fecha y responsable.
 * - Registro de evolución clínica estructurado en formato SOEP:
 *     S (Subjetivo)
 *     O (Objetivo)
 *     E (Evaluación)
 *     P (Plan)
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Calendar,
  User,
  Plus,
  Send,
  Stethoscope,
  ArrowLeft,
  Pin,
  ClipboardList,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { Familia, Diagnostico, PlanItem, Evolucion } from '@/types'

export function CentralPlanPage() {
  const { famId } = useParams<{ famId?: string }>()
  const navigate = useNavigate()
  const { usuario, firebaseUser } = useAuth()

  const [familia, setFamilia] = useState<Familia | null>(null)
  const [diagnosticosConfirmados, setDiagnosticosConfirmados] = useState<Diagnostico[]>([])
  const [planes, setPlanes] = useState<PlanItem[]>([])
  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([])
  const [cargando, setCargando] = useState(true)

  // Formulario nueva intervención
  const [diagSeleccionadoId, setDiagSeleccionadoId] = useState<string>('')
  const [resultadoEsperado, setResultadoEsperado] = useState('')
  const [intervencion, setIntervencion] = useState('')
  const [responsable, setResponsable] = useState(usuario?.nombre || 'Equipo de salud')
  const [guardandoPlan, setGuardandoPlan] = useState(false)

  // Formulario nueva nota SOEP
  const [soepS, setSoepS] = useState('')
  const [soepO, setSoepO] = useState('')
  const [soepE, setSoepE] = useState('')
  const [soepP, setSoepP] = useState('')
  const [guardandoSoep, setGuardandoSoep] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    if (!famId) {
      setCargando(false)
      return
    }

    async function cargarDatos() {
      try {
        // Cargar familia
        const famSnap = await getDocs(
          query(collection(db, 'familias'), where('__name__', '==', famId))
        )
        let famDoc: Familia | null = null
        if (!famSnap.empty) {
          famDoc = { id: famSnap.docs[0].id, ...famSnap.docs[0].data() } as Familia
        }

        // Cargar diagnósticos confirmados
        const diagSnap = await getDocs(
          query(
            collection(db, `familias/${famId}/diagnosticos`),
            where('estado', '==', 'confirmado')
          )
        )
        const diags = diagSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Diagnostico[]

        // Cargar planes
        const planSnap = await getDocs(collection(db, `familias/${famId}/plan`))
        const itemsPlan = planSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanItem[]

        // Cargar evoluciones SOEP
        const evSnap = await getDocs(collection(db, `familias/${famId}/evoluciones`))
        const itemsEv = evSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Evolucion[]

        if (activo) {
          setFamilia(famDoc)
          setDiagnosticosConfirmados(diags)
          setPlanes(itemsPlan)
          setEvoluciones(itemsEv)
          if (diags.length > 0) {
            setDiagSeleccionadoId(diags[0].id!)
          }
          setCargando(false)
        }
      } catch (err) {
        console.warn('[CentralPlanPage] Error cargando datos:', err)
        if (activo) setCargando(false)
      }
    }

    cargarDatos()
    return () => {
      activo = false
    }
  }, [famId])

  // Agregar intervención al plan
  const handleAgregarIntervencion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!famId || !diagSeleccionadoId || !resultadoEsperado.trim() || !intervencion.trim()) return

    setGuardandoPlan(true)
    try {
      const nuevoItem: Omit<PlanItem, 'id'> = {
        famId,
        orgId: familia?.orgId || usuario?.orgId || 'org-demo',
        diagnosticoId: diagSeleccionadoId,
        resultadoEsperado: resultadoEsperado.trim(),
        intervencion: intervencion.trim(),
        fijada: true,
        responsable: responsable.trim(),
        createdAt: Timestamp.now(),
        createdBy: firebaseUser?.uid ?? usuario?.id ?? 'docente',
        deviceId: 'central-web',
        schemaVersion: 1,
        syncEstado: 'enviado',
      }

      const docRef = await addDoc(collection(db, `familias/${famId}/plan`), nuevoItem)
      setPlanes((prev) => [{ id: docRef.id, ...nuevoItem }, ...prev])
      setResultadoEsperado('')
      setIntervencion('')
      setMensajeExito('Intervención agregada y fijada al plan familiar.')
      setTimeout(() => setMensajeExito(null), 4000)
    } catch (err) {
      console.error(err)
      alert('Error al guardar intervención en el plan')
    } finally {
      setGuardandoPlan(false)
    }
  }

  // Alternar fijada
  const handleToggleFijada = async (planId: string, actualFijada: boolean) => {
    if (!famId) return
    try {
      await updateDoc(doc(db, `familias/${famId}/plan/${planId}`), {
        fijada: !actualFijada,
        updatedAt: serverTimestamp(),
      })
      setPlanes((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, fijada: !actualFijada } : p))
      )
    } catch (err) {
      console.error(err)
    }
  }

  // Guardar nota de evolución SOEP
  const handleGuardarSoep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!famId || (!soepS.trim() && !soepO.trim() && !soepE.trim() && !soepP.trim())) return

    setGuardandoSoep(true)
    try {
      const nuevaEv: Omit<Evolucion, 'id'> = {
        famId,
        orgId: familia?.orgId || usuario?.orgId || 'org-demo',
        S: soepS.trim(),
        O: soepO.trim(),
        E: soepE.trim(),
        P: soepP.trim(),
        fecha: Timestamp.now(),
        autorId: usuario?.nombre || firebaseUser?.uid || 'Enfermería',
        createdAt: Timestamp.now(),
        createdBy: firebaseUser?.uid ?? usuario?.id ?? 'docente',
        deviceId: 'central-web',
        schemaVersion: 1,
        syncEstado: 'enviado',
      }

      const docRef = await addDoc(collection(db, `familias/${famId}/evoluciones`), nuevaEv)
      setEvoluciones((prev) => [{ id: docRef.id, ...nuevaEv }, ...prev])
      setSoepS('')
      setSoepO('')
      setSoepE('')
      setSoepP('')
      setMensajeExito('Nota de evolución SOEP registrada correctamente.')
      setTimeout(() => setMensajeExito(null), 4000)
    } catch (err) {
      console.error(err)
      alert('Error al registrar nota de evolución SOEP')
    } finally {
      setGuardandoSoep(false)
    }
  }

  if (cargando) {
    return <div className="tarjeta text-apagado">Cargando plan de cuidados y notas SOEP...</div>
  }

  return (
    <div className="central-plan-stack">
      <header className="plan-header-top">
        <div className="plan-header-izq">
          <button
            type="button"
            className="btn-volver-tabla"
            onClick={() => navigate('/central/familias')}
          >
            <ArrowLeft size={16} />
            <span>Volver a Familias</span>
          </button>
          <h1 className="h2 plan-titulo">
            Plan de Cuidados y Evolución · {familia ? `Familia ${familia.apellido}` : 'Familia'}
          </h1>
          <p className="text-apagado">
            Planificación basada en diagnósticos confirmados y registro longitudinal en formato SOEP.
          </p>
        </div>
      </header>

      {mensajeExito && (
        <div className="alerta-exito-plan" role="status">
          <CheckCircle2 size={16} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Grid de 2 Columnas: Plan de Intervenciones vs Notas SOEP */}
      <div className="plan-soep-grid">
        {/* Columna Izquierda: Plan de Intervenciones */}
        <section className="tarjeta plan-intervenciones-card stack">
          <div className="card-cabecera-plan">
            <ClipboardList size={20} className="icono-card-cabecera" />
            <div>
              <h2 className="h4">Plan de Intervenciones de Enfermería</h2>
              <p className="text-apagado text-sm">
                Resultados esperados (NOC) e intervenciones fijadas (NIC)
              </p>
            </div>
          </div>

          {diagnosticosConfirmados.length === 0 ? (
            <div className="alerta-sin-confirmados">
              <Stethoscope size={18} />
              <span>
                No hay diagnósticos confirmados aún para esta familia. Confirmá los diagnósticos en el{' '}
                <button
                  type="button"
                  className="link-inline"
                  onClick={() => navigate(`/central/familias/${famId}/diagnosticos`)}
                >
                  Asistente NANDA
                </button>.
              </span>
            </div>
          ) : (
            <form onSubmit={handleAgregarIntervencion} className="form-intervencion stack">
              <div className="campo">
                <label className="campo-etiqueta">Diagnóstico NANDA relacionado:</label>
                <select
                  className="select-diag-plan"
                  value={diagSeleccionadoId}
                  onChange={(e) => setDiagSeleccionadoId(e.target.value)}
                >
                  {diagnosticosConfirmados.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.nandaCodigo}] {d.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="input-resultado" className="campo-etiqueta">
                  Resultado esperado (Objetivo familiar):
                </label>
                <input
                  id="input-resultado"
                  type="text"
                  className="input-control"
                  placeholder="Ej: La familia identificará 2 redes de apoyo barriales en 15 días"
                  value={resultadoEsperado}
                  onChange={(e) => setResultadoEsperado(e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="input-intervencion" className="campo-etiqueta">
                  Intervención de enfermería propuesta:
                </label>
                <input
                  id="input-intervencion"
                  type="text"
                  className="input-control"
                  placeholder="Ej: Fomentar la participación en el taller comunitario de salud del CAPS"
                  value={intervencion}
                  onChange={(e) => setIntervencion(e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="input-responsable" className="campo-etiqueta">
                  Responsable de seguimiento:
                </label>
                <input
                  id="input-responsable"
                  type="text"
                  className="input-control"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primario"
                disabled={guardandoPlan || !resultadoEsperado.trim() || !intervencion.trim()}
              >
                <Plus size={16} />
                <span>{guardandoPlan ? 'Agregando...' : 'Fijar Intervención al Plan'}</span>
              </button>
            </form>
          )}

          {/* Lista de intervenciones fijadas */}
          <div className="intervenciones-fijadas-lista stack">
            <h3 className="h5">Intervenciones en Curso ({planes.length})</h3>
            {planes.length === 0 ? (
              <p className="text-apagado text-sm">
                No hay intervenciones programadas en el plan familiar.
              </p>
            ) : (
              <div className="planes-cards-lista">
                {planes.map((p) => {
                  const diagAsoc = diagnosticosConfirmados.find((d) => d.id === p.diagnosticoId)
                  return (
                    <div
                      key={p.id}
                      className={`plan-item-card ${p.fijada ? 'plan-item-fijada' : ''}`}
                    >
                      <div className="plan-item-top">
                        <button
                          type="button"
                          className={`btn-pin-toggle ${p.fijada ? 'pin-activo' : ''}`}
                          onClick={() => handleToggleFijada(p.id!, p.fijada)}
                          title={p.fijada ? 'Intervención fijada' : 'Fijar intervención'}
                        >
                          <Pin size={14} />
                          <span>{p.fijada ? 'Fijada' : 'Opcional'}</span>
                        </button>
                        {diagAsoc && (
                          <span className="diag-tag-mono">[{diagAsoc.nandaCodigo}]</span>
                        )}
                      </div>

                      <div className="plan-item-cuerpo">
                        <div className="resultado-fila">
                          <strong>Meta:</strong> <span>{p.resultadoEsperado}</span>
                        </div>
                        <div className="intervencion-fila">
                          <strong>Acción:</strong> <span>{p.intervencion}</span>
                        </div>
                      </div>

                      <div className="plan-item-pie text-apagado">
                        <User size={12} />
                        <span>Resp: {p.responsable || 'Equipo de salud'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Columna Derecha: Notas de Evolución Clínica SOEP */}
        <section className="tarjeta soep-seccion-card stack">
          <div className="card-cabecera-plan">
            <FileText size={20} className="icono-card-cabecera icono-soep" />
            <div>
              <h2 className="h4">Notas de Evolución (Formato SOEP)</h2>
              <p className="text-apagado text-sm">
                Subjetivo · Objetivo · Evaluación · Plan
              </p>
            </div>
          </div>

          <form onSubmit={handleGuardarSoep} className="form-soep stack">
            {/* S */}
            <div className="campo">
              <label htmlFor="soep-s" className="campo-etiqueta">
                <strong>S</strong> · Subjetivo (Lo que refiere la familia o referente):
              </label>
              <textarea
                id="soep-s"
                className="input-control textarea-soep"
                rows={2}
                placeholder="Ej: 'Esta semana estuvimos más tranquilos, pero nos cuesta conseguir los turnos...'"
                value={soepS}
                onChange={(e) => setSoepS(e.target.value)}
              />
            </div>

            {/* O */}
            <div className="campo">
              <label htmlFor="soep-o" className="campo-etiqueta">
                <strong>O</strong> · Objetivo (Hallazgos observables, entorno, controles):
              </label>
              <textarea
                id="soep-o"
                className="input-control textarea-soep"
                rows={2}
                placeholder="Ej: Domicilio ordenado, libre de recipientes con agua estancada. Calendario vacunal al día."
                value={soepO}
                onChange={(e) => setSoepO(e.target.value)}
              />
            </div>

            {/* E */}
            <div className="campo">
              <label htmlFor="soep-e" className="campo-etiqueta">
                <strong>E</strong> · Evaluación (Juicio de enfermería del avance):
              </label>
              <textarea
                id="soep-e"
                className="input-control textarea-soep"
                rows={2}
                placeholder="Ej: Buena adherencia al plan de cuidados. Disminución del nivel de estrés familiar."
                value={soepE}
                onChange={(e) => setSoepE(e.target.value)}
              />
            </div>

            {/* P */}
            <div className="campo">
              <label htmlFor="soep-p" className="campo-etiqueta">
                <strong>P</strong> · Plan (Próximas acciones o fecha de visita):
              </label>
              <textarea
                id="soep-p"
                className="input-control textarea-soep"
                rows={2}
                placeholder="Ej: Próxima visita domiciliaria programada para el 15/11. Gestionar turno con odontología."
                value={soepP}
                onChange={(e) => setSoepP(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primario"
              disabled={guardandoSoep || (!soepS.trim() && !soepO.trim() && !soepE.trim() && !soepP.trim())}
            >
              <Send size={16} />
              <span>{guardandoSoep ? 'Guardando evolución...' : 'Registrar Nota SOEP'}</span>
            </button>
          </form>

          {/* Historial de evoluciones SOEP */}
          <div className="historial-soep-lista stack">
            <h3 className="h5">Historial Longitudinal ({evoluciones.length})</h3>
            {evoluciones.length === 0 ? (
              <p className="text-apagado text-sm">
                No hay notas de evolución registradas aún.
              </p>
            ) : (
              <div className="lista-evoluciones-timeline">
                {evoluciones.map((ev) => (
                  <article key={ev.id} className="evolucion-card-item">
                    <header className="ev-header">
                      <div className="ev-autor">
                        <User size={13} />
                        <strong>{ev.autorId || 'Enfermero/a'}</strong>
                      </div>
                      <span className="ev-fecha text-apagado">
                        <Calendar size={12} />
                        {ev.fecha?.toDate
                          ? ev.fecha.toDate().toLocaleString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Hoy'}
                      </span>
                    </header>

                    <div className="soep-bloques">
                      {ev.S && (
                        <div className="bloque-letra">
                          <span className="letra-soep letra-s">S</span>
                          <p>{ev.S}</p>
                        </div>
                      )}
                      {ev.O && (
                        <div className="bloque-letra">
                          <span className="letra-soep letra-o">O</span>
                          <p>{ev.O}</p>
                        </div>
                      )}
                      {ev.E && (
                        <div className="bloque-letra">
                          <span className="letra-soep letra-e">E</span>
                          <p>{ev.E}</p>
                        </div>
                      )}
                      {ev.P && (
                        <div className="bloque-letra">
                          <span className="letra-soep letra-p">P</span>
                          <p>{ev.P}</p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .central-plan-stack {
          display: flex;
          flex-direction: column;
          gap: var(--sp-6);
        }

        .plan-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .btn-volver-tabla {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--azul-medio);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: var(--sp-2);
        }

        .plan-titulo {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-1);
        }

        .alerta-exito-plan {
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

        .plan-soep-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-6);
        }

        @media (max-width: 960px) {
          .plan-soep-grid {
            grid-template-columns: 1fr;
          }
        }

        .card-cabecera-plan {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          border-bottom: 1px solid var(--linea);
          padding-bottom: var(--sp-3);
        }

        .icono-card-cabecera {
          color: var(--azul);
        }

        .icono-soep {
          color: var(--lago);
        }

        .alerta-sin-confirmados {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          background: color-mix(in srgb, var(--atencion) 12%, var(--fondo));
          border: 1px solid var(--atencion);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          font-size: 0.85rem;
        }

        .link-inline {
          background: transparent;
          border: none;
          color: var(--azul);
          text-decoration: underline;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .form-intervencion, .form-soep {
          background: var(--fondo);
          padding: var(--sp-4);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--linea);
        }

        .select-diag-plan {
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          font-size: 0.85rem;
          color: var(--azul);
          font-weight: 600;
        }

        .planes-cards-lista {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .plan-item-card {
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--fondo);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .plan-item-fijada {
          border-left: 3px solid var(--lago);
          background: color-mix(in srgb, var(--lago) 5%, var(--tarjeta));
        }

        .plan-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-pin-toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--linea);
          background: var(--tarjeta);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }

        .pin-activo {
          background: var(--lago);
          color: white;
          border-color: var(--lago);
        }

        .diag-tag-mono {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.72rem;
          color: var(--azul);
        }

        .plan-item-cuerpo {
          font-size: 0.84rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .plan-item-pie {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          border-top: 1px solid color-mix(in srgb, var(--linea) 60%, transparent);
          padding-top: 4px;
        }

        .textarea-soep {
          resize: vertical;
          font-size: 0.84rem;
        }

        .lista-evoluciones-timeline {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          max-height: 480px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .evolucion-card-item {
          background: var(--fondo);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .ev-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid color-mix(in srgb, var(--linea) 60%, transparent);
          padding-bottom: 4px;
        }

        .ev-autor {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--azul);
        }

        .ev-fecha {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
        }

        .soep-bloques {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bloque-letra {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.82rem;
        }

        .bloque-letra p {
          margin: 0;
          line-height: 1.35;
        }

        .letra-soep {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.72rem;
          color: white;
          flex-shrink: 0;
        }

        .letra-s { background: var(--azul); }
        .letra-o { background: var(--lago); }
        .letra-e { background: var(--atencion); }
        .letra-p { background: var(--ok); }
      `}</style>
    </div>
  )
}
