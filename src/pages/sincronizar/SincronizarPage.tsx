/**
 * SincronizarPage — Pantalla de sincronización y estado offline
 * DISENO_BASE.md §4, §7.5, §10
 *
 * Características:
 * - Diagnóstico de conectividad en tiempo real (Wifi / datos móviles / offline)
 * - Indicadores métricos: Enviados, Pendientes y A revisar
 * - Botón "Sincronizar ahora" con animación y confirmación
 * - Listado de familias locales con SyncBadge interactivo
 * - Respaldo manual en JSON (DISENO_BASE.md §4 P1)
 * - Limpieza de datos locales sincronizados (Ley 25.326 / DISENO_BASE.md §10)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  HardDrive,
  ShieldCheck,
  ChevronRight,
  Home,
  Check,
  X,
  Database,
} from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useSync } from '@/hooks/useSync'
import { SyncBadge } from '@/components/sync/SyncBadge'
import type { Familia } from '@/types'

export function SincronizarPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const {
    isOnline,
    sincronizando,
    pendientesCount,
    enviadosCount,
    revisarCount,
    totalCount,
    ultimaSincronizacion,
    errorSync,
    forzarSincronizacion,
    borrarDatosLocalesSincronizados,
    exportarRespaldoJson,
  } = useSync()

  const [familiasLocales, setFamiliasLocales] = useState<Familia[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [modalLimpiezaAbierto, setModalLimpiezaAbierto] = useState(false)
  const [limpiando, setLimpiando] = useState(false)
  const [exportando, setExportando] = useState(false)

  // Cargar lista de familias del usuario
  useEffect(() => {
    let activo = true

    async function cargarFamilias() {
      if (!usuario?.capsIds || usuario.capsIds.length === 0) {
        setCargandoLista(false)
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
        if (activo) {
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Familia[]
          setFamiliasLocales(docs)
          setCargandoLista(false)
        }
      } catch (err) {
        console.warn('[SincronizarPage] Error cargando lista local:', err)
        if (activo) setCargandoLista(false)
      }
    }

    cargarFamilias()
    return () => {
      activo = false
    }
  }, [usuario?.capsIds, sincronizando])

  // Manejar sincronización manual
  const handleSincronizar = async () => {
    setMensajeExito(null)
    const exito = await forzarSincronizacion()
    if (exito) {
      setMensajeExito('Sincronización completada con éxito. Todos los datos están en la central.')
      setTimeout(() => setMensajeExito(null), 5000)
    }
  }

  // Manejar exportación JSON de respaldo
  const handleExportar = async () => {
    setExportando(true)
    try {
      await exportarRespaldoJson()
      setMensajeExito('Respaldo JSON descargado correctamente.')
      setTimeout(() => setMensajeExito(null), 4000)
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Error al exportar respaldo')
    } finally {
      setExportando(false)
    }
  }

  // Manejar borrado local seguro (Ley 25.326)
  const handleConfirmarLimpieza = async () => {
    setLimpiando(true)
    try {
      const res = await borrarDatosLocalesSincronizados()
      setModalLimpiezaAbierto(false)
      setMensajeExito(`Limpieza completada. Se liberó la memoria local de ${res.borrados} familias sincronizadas.`)
      setTimeout(() => setMensajeExito(null), 6000)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo realizar la limpieza')
    } finally {
      setLimpiando(false)
    }
  }

  return (
    <div className="sincronizar-pagina stack">
      <header className="sincronizar-encabezado">
        <h1 className="h2 titulo-sincronizar">Sincronización y estado offline</h1>
        <p className="text-apagado">
          CuidaRed funciona sin conexión a internet en el terreno. Tus registros se resguardan en este teléfono
          y se sincronizan automáticamente con la central cuando hay red.
        </p>
      </header>

      {/* Mensaje de éxito temporal */}
      {mensajeExito && (
        <div className="alerta-exito-sync" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Mensaje de error si hubo fallo de sync */}
      {errorSync && (
        <div className="alerta-error-sync" role="alert">
          <AlertTriangle size={18} />
          <span>{errorSync}</span>
        </div>
      )}

      {/* Tarjeta de estado de conectividad */}
      <section className="tarjeta estado-red-card" aria-labelledby="titulo-estado-red">
        <div className="estado-red-cabecera">
          <div className="icono-red-wrapper" data-online={isOnline}>
            {isOnline ? (
              <Wifi size={24} strokeWidth={2.2} />
            ) : (
              <WifiOff size={24} strokeWidth={2.2} />
            )}
          </div>
          <div>
            <h2 id="titulo-estado-red" className="h4">
              {isOnline ? 'Conexión a internet activa' : 'Sin conexión a internet'}
            </h2>
            <p className="text-apagado estado-subtexto">
              {isOnline
                ? 'El dispositivo está conectado a la red. Las modificaciones se transmiten a la central.'
                : 'Modo campo: podés seguir creando y valorando normalmente. Tus datos están seguros.'}
            </p>
          </div>
        </div>

        <div className="detalles-tecnicos-sync">
          <div className="detalle-fila">
            <span className="detalle-etiqueta">
              <Database size={14} /> Base de datos local:
            </span>
            <span className="detalle-valor">Caché persistente IndexedDB activa</span>
          </div>

          <div className="detalle-fila">
            <span className="detalle-etiqueta">
              <ShieldCheck size={14} /> Protección de datos:
            </span>
            <span className="detalle-valor">Ley 25.326 (sin DNI ni nombres de pila)</span>
          </div>

          <div className="detalle-fila">
            <span className="detalle-etiqueta">
              <RefreshCw size={14} /> Última sincronización:
            </span>
            <span className="detalle-valor">
              {ultimaSincronizacion
                ? ultimaSincronizacion.toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Pendiente de confirmación inicial'}
            </span>
          </div>
        </div>

        <div className="acciones-sync-principales">
          <button
            type="button"
            className="btn btn-primario btn-sincronizar-accion"
            onClick={handleSincronizar}
            disabled={sincronizando || !isOnline}
          >
            <RefreshCw size={18} className={sincronizando ? 'icono-spin' : ''} />
            <span>{sincronizando ? 'Sincronizando con la central...' : 'Sincronizar ahora'}</span>
          </button>
          {!isOnline && (
            <small className="aviso-offline-btn text-apagado">
              El botón se habilitará automáticamente al detectar señal de red.
            </small>
          )}
        </div>
      </section>

      {/* Métricas rápidas de registros */}
      <section className="metricas-sync-grid" aria-label="Resumen de registros por estado">
        <div className="tarjeta metrica-card metrica-enviados">
          <div className="metrica-numero">{enviadosCount}</div>
          <div className="metrica-etiqueta">
            <SyncBadge estado="enviado" />
          </div>
          <span className="metrica-desc text-apagado">Guardados y confirmados en la central</span>
        </div>

        <div className="tarjeta metrica-card metrica-pendientes">
          <div className="metrica-numero">{pendientesCount}</div>
          <div className="metrica-etiqueta">
            <SyncBadge estado="pendiente" />
          </div>
          <span className="metrica-desc text-apagado">En cola local para enviar</span>
        </div>

        <div className="tarjeta metrica-card metrica-revisar">
          <div className="metrica-numero">{revisarCount}</div>
          <div className="metrica-etiqueta">
            <SyncBadge estado="revisar" />
          </div>
          <span className="metrica-desc text-apagado">Requieren revisión o fusión</span>
        </div>
      </section>

      {/* Lista de registros en el dispositivo */}
      <section className="tarjeta registros-locales-seccion">
        <header className="registros-locales-cabecera">
          <div>
            <h3 className="h4">Registros en este dispositivo</h3>
            <p className="text-apagado text-sm">
              {totalCount} {totalCount === 1 ? 'familia registrada' : 'familias registradas'} en tus CAPS asignados
            </p>
          </div>
        </header>

        {cargandoLista ? (
          <div className="cargando-lista text-apagado">Cargando estado de registros...</div>
        ) : familiasLocales.length === 0 ? (
          <div className="vacio-lista text-apagado">
            Todavía no hay familias registradas en este dispositivo.
          </div>
        ) : (
          <div className="lista-familias-sync">
            {familiasLocales.map((fam) => {
              const estadoDoc: 'enviado' | 'pendiente' | 'revisar' =
                fam.syncEstado ?? (isOnline ? 'enviado' : 'pendiente')

              return (
                <div
                  key={fam.id}
                  className="fila-familia-sync"
                  onClick={() => navigate(`/familias/${fam.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/familias/${fam.id}`)}
                >
                  <div className="fila-familia-info">
                    <div className="fila-familia-top">
                      <span className="codigo-chip">{fam.codigoFamiliar}</span>
                      <SyncBadge estado={estadoDoc} />
                    </div>
                    <strong className="apellido-sync">Familia {fam.apellido}</strong>
                    <span className="domicilio-sync text-apagado">
                      <Home size={12} /> {fam.domicilio}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-apagado" />
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Respaldo manual en JSON (DISENO_BASE.md §4 P1) */}
      <section className="tarjeta seccion-herramientas-sync">
        <div className="herramienta-item">
          <div className="herramienta-info">
            <div className="herramienta-titulo-fila">
              <Download size={18} className="icono-herramienta" />
              <h3 className="h4">Respaldo manual en JSON</h3>
            </div>
            <p className="text-apagado text-sm">
              Descargá una copia de seguridad con las familias de tu dispositivo para emergencias en el campo
              o para transferir datos si cambiás de celular.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportar}
            disabled={exportando || totalCount === 0}
          >
            <Download size={16} />
            <span>{exportando ? 'Generando archivo...' : 'Exportar respaldo (.json)'}</span>
          </button>
        </div>

        <hr className="divisor-sync" />

        {/* Limpieza de datos locales (DISENO_BASE.md §10 - Ley 25.326) */}
        <div className="herramienta-item">
          <div className="herramienta-info">
            <div className="herramienta-titulo-fila">
              <HardDrive size={18} className="icono-herramienta text-critico" />
              <h3 className="h4">Limpieza del dispositivo (Ley 25.326)</h3>
            </div>
            <p className="text-apagado text-sm">
              Liberá la memoria del teléfono borrando los registros temporales que ya fueron sincronizados
              con la central. Los registros pendientes de envío <strong style={{ color: 'var(--azul, #17375E)' }}>NUNCA</strong> se borran.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-peligro-borde"
            onClick={() => setModalLimpiezaAbierto(true)}
            disabled={pendientesCount > 0 || totalCount === 0}
            title={
              pendientesCount > 0
                ? 'Tenés registros pendientes. Sincronizalos antes de limpiar.'
                : 'Limpiar datos ya sincronizados'
            }
          >
            <Trash2 size={16} />
            <span>Borrar datos locales sincronizados</span>
          </button>
        </div>
      </section>

      {/* Modal de confirmación de limpieza */}
      {modalLimpiezaAbierto && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-limpieza"
        >
          <div className="modal-contenido tarjeta">
            <header className="modal-cabecera">
              <h2 id="titulo-modal-limpieza" className="h3">
                Confirmar limpieza local
              </h2>
              <button
                type="button"
                className="btn-cerrar"
                onClick={() => setModalLimpiezaAbierto(false)}
                disabled={limpiando}
              >
                <X size={20} />
              </button>
            </header>

            <div className="modal-cuerpo stack">
              <div className="alerta-aviso-limpieza">
                <AlertTriangle size={24} className="icono-aviso" />
                <p>
                  Esta acción eliminará de la memoria de este celular las familias que ya fueron
                  transmitidas a la central segura.
                </p>
              </div>

              <ul className="lista-puntos-limpieza text-sm">
                <li>
                  <Check size={14} className="text-ok" /> Tus valoraciones ya sincronizadas siguen
                  seguras en la central institucional.
                </li>
                <li>
                  <Check size={14} className="text-ok" /> Cumple con el principio de minimización de
                  la Ley 25.326 al concluir el trabajo de campo.
                </li>
                <li>
                  <Check size={14} className="text-ok" /> No afecta tu sesión ni tus permisos de
                  acceso.
                </li>
              </ul>

              <div className="modal-acciones-fila">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalLimpiezaAbierto(false)}
                  disabled={limpiando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-peligro"
                  onClick={handleConfirmarLimpieza}
                  disabled={limpiando}
                >
                  <Trash2 size={16} />
                  <span>{limpiando ? 'Limpiando...' : 'Sí, borrar datos sincronizados'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sincronizar-pagina {
          max-width: 680px;
          margin: 0 auto;
          padding-bottom: var(--sp-6);
        }

        .titulo-sincronizar {
          color: var(--azul, #17375E);
          margin-bottom: var(--sp-2);
        }

        .alerta-exito-sync {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          background: color-mix(in srgb, var(--ok, #2F9E6B) 12%, var(--tarjeta));
          border: 1px solid var(--ok, #2F9E6B);
          color: var(--ok, #2F9E6B);
          padding: var(--sp-3);
          border-radius: var(--r-campo, 10px);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .alerta-error-sync {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          background: color-mix(in srgb, var(--critico, #C8392F) 12%, var(--tarjeta));
          border: 1px solid var(--critico, #C8392F);
          color: var(--critico, #C8392F);
          padding: var(--sp-3);
          border-radius: var(--r-campo, 10px);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .estado-red-card {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .estado-red-cabecera {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-3);
        }

        .icono-red-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .icono-red-wrapper[data-online="true"] {
          background: color-mix(in srgb, var(--ok, #2F9E6B) 15%, var(--tarjeta));
          color: var(--ok, #2F9E6B);
        }

        .icono-red-wrapper[data-online="false"] {
          background: color-mix(in srgb, var(--atencion, #C98A00) 15%, var(--tarjeta));
          color: var(--atencion, #C98A00);
        }

        .estado-subtexto {
          font-size: 0.85rem;
          margin-top: 2px;
        }

        .detalles-tecnicos-sync {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          background: var(--fondo);
          padding: var(--sp-3);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--borde-suave);
          font-size: 0.82rem;
        }

        .detalle-fila {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }

        .detalle-etiqueta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--apagado, #5B6B7C);
          font-weight: 600;
        }

        .detalle-valor {
          font-weight: 600;
          color: var(--tinta, #0B1F33);
        }

        .acciones-sync-principales {
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
          margin-top: var(--sp-1);
        }

        .btn-sincronizar-accion {
          justify-content: center;
          padding: 12px;
          font-size: 0.95rem;
        }

        .aviso-offline-btn {
          text-align: center;
          font-size: 0.75rem;
        }

        .metricas-sync-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--sp-3);
        }

        .metrica-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--sp-1);
          padding: var(--sp-3);
        }

        .metrica-numero {
          font-family: var(--fuente-titulo, serif);
          font-size: 2rem;
          font-weight: 700;
          color: var(--azul, #17375E);
          line-height: 1;
        }

        .metrica-etiqueta {
          margin-top: 2px;
        }

        .metrica-desc {
          font-size: 0.72rem;
          line-height: 1.25;
        }

        .registros-locales-seccion {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        .registros-locales-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--borde-suave);
          padding-bottom: var(--sp-2);
        }

        .lista-familias-sync {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .fila-familia-sync {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--fondo);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--r-campo, 10px);
          border: 1px solid var(--borde-suave);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .fila-familia-sync:hover {
          border-color: var(--azul-medio, #3E6A9A);
          background: color-mix(in srgb, var(--azul-medio, #3E6A9A) 4%, var(--fondo));
        }

        .fila-familia-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .fila-familia-top {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        .codigo-chip {
          font-family: monospace;
          font-size: 0.72rem;
          font-weight: 700;
          background: color-mix(in srgb, var(--azul, #17375E) 10%, var(--tarjeta));
          color: var(--azul, #17375E);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .apellido-sync {
          color: var(--azul, #17375E);
          font-size: 0.9rem;
        }

        .domicilio-sync {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
        }

        .seccion-herramientas-sync {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        .herramienta-item {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }

        @media (min-width: 540px) {
          .herramienta-item {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .herramienta-titulo-fila {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icono-herramienta {
          color: var(--azul, #17375E);
        }

        .divisor-sync {
          border: 0;
          border-top: 1px solid var(--borde-suave);
          margin: 0;
        }

        .btn-peligro-borde {
          border-color: var(--critico, #C8392F);
          color: var(--critico, #C8392F);
        }

        .btn-peligro-borde:hover:not(:disabled) {
          background: color-mix(in srgb, var(--critico, #C8392F) 10%, transparent);
        }

        .alerta-aviso-limpieza {
          display: flex;
          gap: var(--sp-3);
          align-items: flex-start;
          background: color-mix(in srgb, var(--atencion, #C98A00) 12%, var(--fondo));
          border: 1px solid var(--atencion, #C98A00);
          color: var(--tinta);
          padding: var(--sp-3);
          border-radius: var(--r-campo);
          font-size: 0.85rem;
        }

        .icono-aviso {
          color: var(--atencion, #C98A00);
          flex-shrink: 0;
        }

        .lista-puntos-limpieza {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .lista-puntos-limpieza li {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .text-ok {
          color: var(--ok, #2F9E6B);
        }

        .text-critico {
          color: var(--critico, #C8392F);
        }

        .modal-acciones-fila {
          display: flex;
          justify-content: flex-end;
          gap: var(--sp-3);
          margin-top: var(--sp-3);
        }

        .btn-peligro {
          background-color: var(--critico, #C8392F);
          color: white;
          border: none;
        }

        .btn-peligro:hover:not(:disabled) {
          background-color: color-mix(in srgb, var(--critico, #C8392F) 85%, black);
        }
      `}</style>
    </div>
  )
}
