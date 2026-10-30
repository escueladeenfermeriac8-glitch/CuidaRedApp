/**
 * Hook de sincronización offline y gestión de estado local
 * DISENO_BASE.md §4, §7.5, §10
 *
 * Características:
 * - Detecta estado de red (online / offline)
 * - Conteo reactivo de registros pendientes, enviados y a revisar
 * - Espera y confirmación de escrituras locales a Firestore (waitForPendingWrites)
 * - Función "forzarSincronizacion" para gatillar envío manual
 * - Función "borrarDatosLocalesSincronizados" según Ley 25.326 (limpieza del celular)
 * - Función "exportarRespaldoJson" (DISENO_BASE.md §4 P1 para emergencias sin conexión)
 */

import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  waitForPendingWrites,
  enableNetwork,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { Familia } from '@/types'

const LOCAL_STORAGE_LAST_SYNC_KEY = 'cuidared_ultima_sync'

export interface SyncStats {
  pendientesCount: number
  enviadosCount: number
  revisarCount: number
  totalCount: number
}

export interface UseSyncReturn {
  isOnline: boolean
  sincronizando: boolean
  pendientesCount: number
  enviadosCount: number
  revisarCount: number
  totalCount: number
  ultimaSincronizacion: Date | null
  errorSync: string | null
  forzarSincronizacion: () => Promise<boolean>
  borrarDatosLocalesSincronizados: () => Promise<{ borrados: number }>
  exportarRespaldoJson: () => Promise<void>
}

export function useSync(): UseSyncReturn {
  const { usuario, firebaseUser } = useAuth()
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [sincronizando, setSincronizando] = useState<boolean>(false)
  const [errorSync, setErrorSync] = useState<string | null>(null)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_LAST_SYNC_KEY)
    return raw ? new Date(raw) : null
  })

  const [stats, setStats] = useState<SyncStats>({
    pendientesCount: 0,
    enviadosCount: 0,
    revisarCount: 0,
    totalCount: 0,
  })

  // Listener de eventos de red
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Al reconectar, re-habilitar la red de Firestore
      enableNetwork(db).catch(() => {})
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listener reactivo sobre las familias del usuario para monitorear estados y pendingWrites
  useEffect(() => {
    if (!usuario?.capsIds || usuario.capsIds.length === 0) {
      setStats({
        pendientesCount: 0,
        enviadosCount: 0,
        revisarCount: 0,
        totalCount: 0,
      })
      return
    }

    const capsQuery = usuario.capsIds.slice(0, 10)
    const qFamilias = query(
      collection(db, 'familias'),
      where('capsId', 'in', capsQuery),
      where('eliminado', '!=', true)
    )

    // includeMetadataChanges permite observar hasPendingWrites en tiempo real
    const unsubscribe = onSnapshot(
      qFamilias,
      { includeMetadataChanges: true },
      (snapshot) => {
        let pendientes = 0
        let enviados = 0
        let revisar = 0

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Familia
          const hasPending = docSnap.metadata.hasPendingWrites
          const syncEstado = data.syncEstado

          if (syncEstado === 'revisar') {
            revisar++
          } else if (hasPending || syncEstado === 'pendiente') {
            pendientes++
          } else {
            enviados++
          }
        })

        setStats({
          pendientesCount: pendientes,
          enviadosCount: enviados,
          revisarCount: revisar,
          totalCount: snapshot.docs.length,
        })
      },
      (error) => {
        console.warn('[useSync] Error en snapshot de sincronización:', error)
      }
    )

    return () => unsubscribe()
  }, [usuario?.capsIds])

  // Forzar sincronización manual
  const forzarSincronizacion = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setErrorSync('No hay conexión a internet en este momento. Los datos siguen protegidos en tu celular.')
      return false
    }

    setSincronizando(true)
    setErrorSync(null)

    try {
      await enableNetwork(db)
      // waitForPendingWrites se resuelve cuando el servidor de Firestore confirmó todas las mutaciones locales
      await waitForPendingWrites(db)

      const ahora = new Date()
      localStorage.setItem(LOCAL_STORAGE_LAST_SYNC_KEY, ahora.toISOString())
      setUltimaSincronizacion(ahora)
      setSincronizando(false)
      return true
    } catch (err: unknown) {
      console.error('[useSync] Error forzando sincronización:', err)
      const mensaje = err instanceof Error ? err.message : 'Error al sincronizar con el servidor'
      setErrorSync(mensaje)
      setSincronizando(false)
      return false
    }
  }, [])

  // Borrar datos locales sincronizados (DISENO_BASE.md §10 - Ley 25.326)
  // Limpia del almacenamiento local o sessionStorage los datos que ya están salvados en la nube.
  const borrarDatosLocalesSincronizados = useCallback(async (): Promise<{ borrados: number }> => {
    // Si hay pendientes, alertar / no purgar escrituras en vuelo
    if (stats.pendientesCount > 0) {
      throw new Error(`Tenés ${stats.pendientesCount} registros pendientes sin enviar. Sincronizá antes de limpiar.`)
    }

    try {
      // Limpiar cachés temporales de sesión
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.startsWith('cuidared_') || key.startsWith('draft_'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k))

      // Marcamos la fecha de la última limpieza
      localStorage.setItem('cuidared_ultima_limpieza', new Date().toISOString())

      return { borrados: stats.enviadosCount }
    } catch (err: unknown) {
      console.error('[useSync] Error en borrado de datos locales:', err)
      throw err
    }
  }, [stats.pendientesCount, stats.enviadosCount])

  // Exportar respaldo de emergencia en JSON (DISENO_BASE.md §4)
  const exportarRespaldoJson = useCallback(async (): Promise<void> => {
    if (!usuario?.capsIds || usuario.capsIds.length === 0) {
      throw new Error('No tenés CAPS asignados para exportar.')
    }

    const capsQuery = usuario.capsIds.slice(0, 10)
    const qFamilias = query(
      collection(db, 'familias'),
      where('capsId', 'in', capsQuery),
      where('eliminado', '!=', true)
    )

    const snapshot = await getDocs(qFamilias)
    const familiasExport: Array<Record<string, unknown>> = []

    snapshot.docs.forEach((docSnap) => {
      familiasExport.push({
        id: docSnap.id,
        ...docSnap.data(),
        _hasPendingWrites: docSnap.metadata.hasPendingWrites,
      })
    })

    const payload = {
      app: 'CuidaRed',
      version: '1.2',
      fechaExportacion: new Date().toISOString(),
      usuarioExportador: {
        uid: firebaseUser?.uid ?? usuario.id ?? 's/id',
        email: usuario.email,
        nombre: usuario.nombre,
      },
      cantidadFamilias: familiasExport.length,
      familias: familiasExport,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fechaStr = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `CuidaRed_Respaldo_${fechaStr}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [usuario])

  return {
    isOnline,
    sincronizando,
    pendientesCount: stats.pendientesCount,
    enviadosCount: stats.enviadosCount,
    revisarCount: stats.revisarCount,
    totalCount: stats.totalCount,
    ultimaSincronizacion,
    errorSync,
    forzarSincronizacion,
    borrarDatosLocalesSincronizados,
    exportarRespaldoJson,
  }
}
