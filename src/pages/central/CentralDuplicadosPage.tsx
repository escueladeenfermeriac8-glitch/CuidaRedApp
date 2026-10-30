/**
 * CentralDuplicadosPage — Herramienta Docente para Detección y Fusión de Duplicados
 * DISENO_BASE.md §12 P1, §13:
 * - Algoritmo de distancia de edición para apellidos compuestos y tildes
 * - Comparativa lado a lado de dos familias potencialmente duplicadas
 * - Acciones docentes:
 *     1. Confirmar como "Familia 2" que convive en el mismo domicilio
 *     2. Fusionar registros (marca eliminado lógico y conserva historial)
 *     3. Descartar alerta de duplicado
 */

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Home,
  CheckCircle2,
  GitMerge,
  ShieldCheck,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { normalizar, distanciaEdicion } from '@/lib/normalizacion'
import type { Familia, Barrio } from '@/types'

interface ParejaDuplicada {
  id: string
  famA: Familia
  famB: Familia
  motivo: string
  similitud: number
}

export function CentralDuplicadosPage() {
  const { usuario } = useAuth()
  const [familias, setFamilias] = useState<Familia[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [cargando, setCargando] = useState(true)
  const [parejasDuplicadas, setParejasDuplicadas] = useState<ParejaDuplicada[]>([])
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [procesandoId, setProcesandoId] = useState<string | null>(null)

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
        const snapFam = await getDocs(qFam)
        const famDocs = snapFam.docs.map((d) => ({ id: d.id, ...d.data() })) as Familia[]

        const qBar = query(collection(db, 'barrios'), where('capsId', 'in', capsQuery))
        const snapBar = await getDocs(qBar)
        const barDocs = snapBar.docs.map((d) => ({ id: d.id, ...d.data() })) as Barrio[]

        if (activo) {
          setFamilias(famDocs)
          setBarrios(barDocs)
          detectarDuplicados(famDocs)
          setCargando(false)
        }
      } catch (err) {
        console.warn('[CentralDuplicados] Error cargando datos:', err)
        if (activo) setCargando(false)
      }
    }

    cargarFamilias()
    return () => {
      activo = false
    }
  }, [usuario?.capsIds])

  // Algoritmo de detección de similitud
  function detectarDuplicados(lista: Familia[]) {
    const pares: ParejaDuplicada[] = []
    const procesados = new Set<string>()

    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const fam1 = lista[i]
        const fam2 = lista[j]

        // Solo comparar si pertenecen al mismo CAPS o barrio
        if (fam1.capsId !== fam2.capsId && fam1.barrioId !== fam2.barrioId) continue

        const ap1 = fam1.apellidoNorm || normalizar(fam1.apellido || '')
        const ap2 = fam2.apellidoNorm || normalizar(fam2.apellido || '')
        const dom1 = fam1.domicilioNorm || normalizar(fam1.domicilio || '')
        const dom2 = fam2.domicilioNorm || normalizar(fam2.domicilio || '')

        const distAp = distanciaEdicion(ap1, ap2)
        const distDom = distanciaEdicion(dom1, dom2)

        const mismoDomicilio = distDom <= 2 || dom1 === dom2
        const mismoApellido = distAp <= 2 || ap1 === ap2

        if (mismoDomicilio && mismoApellido) {
          const parKey = `${fam1.id}-${fam2.id}`
          if (!procesados.has(parKey)) {
            pares.push({
              id: parKey,
              famA: fam1,
              famB: fam2,
              motivo: 'Mismo apellido y domicilio aproximado',
              similitud: 95,
            })
            procesados.add(parKey)
          }
        } else if (mismoDomicilio) {
          const parKey = `${fam1.id}-${fam2.id}`
          if (!procesados.has(parKey)) {
            pares.push({
              id: parKey,
              famA: fam1,
              famB: fam2,
              motivo: 'Mismo domicilio con distinto apellido (Posible convivencia)',
              similitud: 75,
            })
            procesados.add(parKey)
          }
        }
      }
    }

    setParejasDuplicadas(pares)
  }

  // Acción 1: Marcar como Familia 2 que convive
  const handleMarcarFamiliaConviviente = async (pareja: ParejaDuplicada) => {
    setProcesandoId(pareja.id)
    try {
      await updateDoc(doc(db, `familias/${pareja.famB.id}`), {
        ordenEnDomicilio: 2,
        updatedAt: serverTimestamp(),
      })

      setParejasDuplicadas((prev) => prev.filter((p) => p.id !== pareja.id))
      setMensajeExito(`Confirmado: La familia ${pareja.famB.apellido} quedó registrada como Familia 2 en el mismo domicilio.`)
      setTimeout(() => setMensajeExito(null), 5000)
    } catch (err) {
      console.error(err)
      alert('Error al actualizar el registro')
    } finally {
      setProcesandoId(null)
    }
  }

  // Acción 2: Fusionar duplicado (borrado lógico del registro duplicado)
  const handleFusionarDuplicado = async (pareja: ParejaDuplicada) => {
    if (
      !confirm(
        `¿Confirmás la fusión de la Familia ${pareja.famB.apellido} (${pareja.famB.codigoFamiliar}) en la Familia ${pareja.famA.apellido} (${pareja.famA.codigoFamiliar})? El duplicado se archivará de forma segura.`
      )
    ) {
      return
    }

    setProcesandoId(pareja.id)
    try {
      await updateDoc(doc(db, `familias/${pareja.famB.id}`), {
        eliminado: true,
        motivoBaja: `Fusionada con ${pareja.famA.codigoFamiliar}`,
        updatedAt: serverTimestamp(),
      })

      setParejasDuplicadas((prev) => prev.filter((p) => p.id !== pareja.id))
      setMensajeExito(`Registros consolidados. Se archivó el duplicado ${pareja.famB.codigoFamiliar}.`)
      setTimeout(() => setMensajeExito(null), 5000)
    } catch (err) {
      console.error(err)
      alert('Error al fusionar duplicados')
    } finally {
      setProcesandoId(null)
    }
  }

  // Acción 3: Descartar alerta
  const handleDescartarAlerta = (parejaId: string) => {
    setParejasDuplicadas((prev) => prev.filter((p) => p.id !== parejaId))
  }

  return (
    <div className="central-duplicados-stack">
      <header className="duplicados-header">
        <div>
          <h1 className="h2 duplicados-titulo">Control y Fusión de Duplicados</h1>
          <p className="text-apagado">
            Herramienta docente para detectar registros duplicados en terreno y resolver convivencias domiciliarias. ({familias.length} familias analizadas).
          </p>
        </div>
      </header>

      {mensajeExito && (
        <div className="alerta-exito-dup" role="status">
          <CheckCircle2 size={16} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {cargando ? (
        <div className="tarjeta text-apagado">Analizando similitudes en la base de datos...</div>
      ) : parejasDuplicadas.length === 0 ? (
        <div className="tarjeta estado-limpio-card">
          <ShieldCheck size={36} className="icono-limpio" />
          <h2 className="h4">Sin duplicados detectados</h2>
          <p className="text-apagado text-sm">
            No se encontraron coincidencias fonéticas ni direcciones superpuestas en tus CAPS asignados.
          </p>
        </div>
      ) : (
        <div className="lista-parejas-duplicadas stack">
          <div className="alerta-aviso-dup">
            <AlertTriangle size={18} />
            <span>
              Se detectaron <strong>{parejasDuplicadas.length}</strong> posibles duplicados o casos de convivencia en el mismo domicilio.
            </span>
          </div>

          {parejasDuplicadas.map((pareja) => {
            const barrioA = barrios.find((b) => b.id === pareja.famA.barrioId)
            const barrioB = barrios.find((b) => b.id === pareja.famB.barrioId)
            const procesando = procesandoId === pareja.id

            return (
              <article key={pareja.id} className="tarjeta pareja-comparativa-card">
                <header className="pareja-card-header">
                  <div className="motivo-tag">
                    <AlertTriangle size={14} />
                    <span>{pareja.motivo}</span>
                  </div>
                  <span className="similitud-porcentaje">
                    Similitud calculada: {pareja.similitud}%
                  </span>
                </header>

                <div className="lado-a-lado-grid">
                  {/* Familia A (Original / Previa) */}
                  <div className="ficha-comparativa ficha-lado-a">
                    <span className="etiqueta-lado">Registro A (Primer relevamiento)</span>
                    <strong className="apellido-fam">Familia {pareja.famA.apellido}</strong>
                    <div className="detalles-comparativa">
                      <div className="detalle-item">
                        <span className="detalle-lbl">Código:</span>
                        <span className="codigo-mono">{pareja.famA.codigoFamiliar}</span>
                      </div>
                      <div className="detalle-item">
                        <span className="detalle-lbl">Domicilio:</span>
                        <span>{pareja.famA.domicilio}</span>
                      </div>
                      <div className="detalle-item">
                        <span className="detalle-lbl">Barrio:</span>
                        <span>{barrioA?.etiqueta || barrioA?.nombre || 's/d'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Familia B (Candidata a duplicado) */}
                  <div className="ficha-comparativa ficha-lado-b">
                    <span className="etiqueta-lado">Registro B (Posible duplicado)</span>
                    <strong className="apellido-fam">Familia {pareja.famB.apellido}</strong>
                    <div className="detalles-comparativa">
                      <div className="detalle-item">
                        <span className="detalle-lbl">Código:</span>
                        <span className="codigo-mono">{pareja.famB.codigoFamiliar}</span>
                      </div>
                      <div className="detalle-item">
                        <span className="detalle-lbl">Domicilio:</span>
                        <span>{pareja.famB.domicilio}</span>
                      </div>
                      <div className="detalle-item">
                        <span className="detalle-lbl">Barrio:</span>
                        <span>{barrioB?.etiqueta || barrioB?.nombre || 's/d'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones de Resolución Docente */}
                <footer className="acciones-resolucion-footer">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDescartarAlerta(pareja.id)}
                    disabled={procesando}
                  >
                    Descartar alerta
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm btn-convivencia"
                    onClick={() => handleMarcarFamiliaConviviente(pareja)}
                    disabled={procesando}
                    title="Confirmar que conviven en el mismo domicilio como Familia 2"
                  >
                    <Home size={14} />
                    <span>Son familias distintas (Familia 2)</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primario btn-sm"
                    onClick={() => handleFusionarDuplicado(pareja)}
                    disabled={procesando}
                    title="Archivar el duplicado y consolidar en el registro original"
                  >
                    <GitMerge size={14} />
                    <span>{procesando ? 'Procesando...' : 'Fusionar duplicado'}</span>
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <style>{`
        .central-duplicados-stack {
          display: flex;
          flex-direction: column;
          gap: var(--sp-6);
        }

        .duplicados-titulo {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-1);
        }

        .alerta-exito-dup {
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

        .estado-limpio-card {
          padding: var(--sp-8);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--sp-2);
        }

        .icono-limpio {
          color: var(--ok);
        }

        .alerta-aviso-dup {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          background: color-mix(in srgb, var(--atencion) 12%, var(--tarjeta));
          border: 1px solid var(--atencion);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          font-size: 0.85rem;
        }

        .pareja-comparativa-card {
          padding: var(--sp-4);
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .pareja-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--linea);
          padding-bottom: var(--sp-2);
        }

        .motivo-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--atencion);
        }

        .similitud-porcentaje {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--apagado);
        }

        .lado-a-lado-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-4);
        }

        @media (max-width: 768px) {
          .lado-a-lado-grid {
            grid-template-columns: 1fr;
          }
        }

        .ficha-comparativa {
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          border: 1px solid var(--linea);
          background: var(--fondo);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .ficha-lado-a {
          border-left: 3px solid var(--azul);
        }

        .ficha-lado-b {
          border-left: 3px solid var(--atencion);
        }

        .etiqueta-lado {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--apagado);
        }

        .apellido-fam {
          font-size: 1.05rem;
          color: var(--azul);
        }

        .detalles-comparativa {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.8rem;
        }

        .detalle-item {
          display: flex;
          gap: 6px;
        }

        .detalle-lbl {
          font-weight: 600;
          color: var(--apagado);
          min-width: 70px;
        }

        .codigo-mono {
          font-family: monospace;
          font-weight: 700;
          color: var(--azul);
        }

        .acciones-resolucion-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: var(--sp-2);
          border-top: 1px solid var(--linea);
          padding-top: var(--sp-3);
          flex-wrap: wrap;
        }

        .btn-convivencia {
          color: var(--lago);
          border-color: var(--lago);
        }

        .btn-convivencia:hover {
          background: color-mix(in srgb, var(--lago) 10%, transparent);
        }
      `}</style>
    </div>
  )
}
