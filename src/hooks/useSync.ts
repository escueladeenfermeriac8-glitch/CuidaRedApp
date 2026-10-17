/**
 * Hook de sincronización offline
 * DISENO_BASE.md §4, §7.5
 *
 * Detecta el estado de conexión y expone:
 * - isOnline: boolean
 * - pendientes: número de documentos sin enviar
 *
 * La sincronización real ocurre automáticamente por Firestore offline cache.
 * Este hook solo expone el estado para la UI.
 */

import { useEffect, useState } from 'react'

export interface SyncState {
  isOnline: boolean
}

export function useSync(): SyncState {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
