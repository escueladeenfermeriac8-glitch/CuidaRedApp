/**
 * AuthContext — Contexto de autenticación
 *
 * Flujo:
 * 1. onAuthStateChanged detecta la sesión de Google.
 * 2. Si hay usuario, busca su documento en usuarios/{uid}.
 * 3. Si no existe el documento → verifica invitaciones/{emailMin}.
 * 4. Si hay invitación → crea el documento de usuario.
 * 5. Si no hay invitación → estado 'sin_acceso'.
 *
 * DISENO_BASE.md §3: "Sin invitación, la app muestra 'Tu cuenta todavía
 * no tiene acceso. Pedíselo a quien administra tu organización.'"
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type FieldValue,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import type { Usuario, Invitacion } from '@/types'

// ─── Estado de sesión ────────────────────────
export type EstadoSesion =
  | 'cargando'          // aún no sabemos
  | 'sin_sesion'        // no hay usuario de Google
  | 'sin_acceso'        // hay usuario pero no invitación
  | 'activo'            // sesión válida con rol

export interface AuthState {
  estado: EstadoSesion
  firebaseUser: User | null
  usuario: Usuario | null
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

// ─── Context ─────────────────────────────────
const AuthContext = createContext<AuthState | null>(null)

// ─── Provider ────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando')
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null)
        setUsuario(null)
        setEstado('sin_sesion')
        return
      }

      setFirebaseUser(fbUser)

      // Suscripción en tiempo real al documento del usuario
      const usuarioRef = doc(db, 'usuarios', fbUser.uid)
      const unsubUsuario = onSnapshot(usuarioRef, async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Usuario
          if (!data.activo) {
            setEstado('sin_acceso')
            setUsuario(null)
            return
          }
          setUsuario(data)
          setEstado('activo')
          return
        }

        // No existe el documento → buscar invitación
        const emailMin = fbUser.email?.toLowerCase() ?? ''
        const invRef = doc(db, 'invitaciones', emailMin)
        try {
          const invSnap = await getDoc(invRef)
          if (!invSnap.exists()) {
            setEstado('sin_acceso')
            setUsuario(null)
            return
          }

          const inv = invSnap.data() as Invitacion
          if (inv.usada) {
            // Invitación ya usada pero usuario no existe aún (edge case)
            setEstado('sin_acceso')
            return
          }

          // Crear documento de usuario
          // serverTimestamp() devuelve FieldValue; Firestore lo convierte a Timestamp al guardar
          const nuevoUsuario: Omit<Usuario, 'createdAt'> & { createdAt: FieldValue } = {
            email: fbUser.email ?? '',
            nombre: fbUser.displayName ?? fbUser.email ?? '',
            rol: inv.rol,
            orgId: inv.orgId,
            capsIds: inv.capsIds,
            comision: inv.comision,
            activo: true,
            createdAt: serverTimestamp(),
            createdBy: fbUser.uid,
            deviceId: getDeviceId(),
            schemaVersion: 1,
          }

          await setDoc(usuarioRef, nuevoUsuario)
          // Marcar invitación como usada
          await setDoc(invRef, { usada: true }, { merge: true })

          // onSnapshot actualizará automáticamente el estado
        } catch (err) {
          console.error('[Auth] Error al verificar invitación:', err)
          setError('Error al verificar tu acceso. Intentalo de nuevo.')
          setEstado('sin_acceso')
        }
      })

      return () => unsubUsuario()
    })

    return () => unsubAuth()
  }, [])

  const login = async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      // onAuthStateChanged se encarga del resto
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Ignorar cierre de popup por el usuario
      if (msg.includes('popup-closed-by-user')) return
      console.error('[Auth] Error en login:', err)
      setError('No pudimos iniciar sesión. Intentalo de nuevo.')
    }
  }

  const logout = async () => {
    await signOut(auth)
    setFirebaseUser(null)
    setUsuario(null)
    setEstado('sin_sesion')
  }

  return (
    <AuthContext.Provider
      value={{ estado, firebaseUser, usuario, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}

// ─── Utilidad: ID de dispositivo ─────────────
function getDeviceId(): string {
  const key = 'cuida_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
