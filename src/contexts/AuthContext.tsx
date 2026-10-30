/**
 * AuthContext — Contexto de autenticación e invitaciones
 * DISENO_BASE.md §3, §4, §10
 *
 * Flujo de acceso cerrado:
 * 1. onAuthStateChanged detecta la sesión de Google.
 * 2. Verifica si la sesión venció por inactividad (> 7 días sin uso).
 * 3. Si hay sesión válida, busca su documento en usuarios/{uid}.
 * 4. Si el documento existe:
 *    - activo === true → estado 'activo' (acceso concedido).
 *    - activo === false → estado 'sin_acceso' (cuenta desactivada).
 * 5. Si no existe el documento → busca invitaciones/{emailMin}.
 *    - Invitación válida y no usada → crea usuarios/{uid} y marca invitación como usada.
 *    - Sin invitación o usada → estado 'sin_acceso'.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
  Timestamp,
  type FieldValue,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import type { Usuario, Invitacion } from '@/types'

// Parámetro de seguridad: 7 días sin uso provocan cierre automático de sesión
export const DIAS_INACTIVIDAD_MAX = 7
const MS_POR_DIA = 24 * 60 * 60 * 1000
const STORAGE_KEY_ULTIMO_ACCESO = 'cuida_ultimo_acceso'
const STORAGE_KEY_DEVICE_ID = 'cuida_device_id'

export type EstadoSesion =
  | 'cargando'          // Inicializando
  | 'sin_sesion'        // No autenticado
  | 'sin_acceso'        // Autenticado en Google pero sin invitación autorizada
  | 'activo'            // Sesión activa con rol y organización

export interface AuthState {
  estado: EstadoSesion
  firebaseUser: User | null
  usuario: Usuario | null
  error: string | null
  sesionCaducadaPorInactividad: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  cambiarCuenta: () => Promise<void>
  reintentarVerificacion: () => Promise<void>
  borrarDatosLocales: () => void
  loginDemo: (rol: 'valorador' | 'supervisor') => void
  esDemo: boolean
}

const STORAGE_KEY_DEMO_ROL = 'cuida_demo_rol'

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando')
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sesionCaducadaPorInactividad, setSesionCaducadaPorInactividad] = useState<boolean>(false)
  const [esDemo, setEsDemo] = useState<boolean>(() => Boolean(localStorage.getItem(STORAGE_KEY_DEMO_ROL)))

  // Actualizar marca de último acceso (throttled a cada 5 minutos)
  const registrarActividad = useCallback(() => {
    try {
      const ahora = Date.now()
      const ultimo = Number(localStorage.getItem(STORAGE_KEY_ULTIMO_ACCESO) || '0')
      if (ahora - ultimo > 5 * 60 * 1000) {
        localStorage.setItem(STORAGE_KEY_ULTIMO_ACCESO, String(ahora))
      }
    } catch {
      // Ignorar errores de acceso a localStorage en modo privado
    }
  }, [])

  // Verificar si expiró por inactividad
  const verificarInactividad = useCallback((): boolean => {
    try {
      const ultimoStr = localStorage.getItem(STORAGE_KEY_ULTIMO_ACCESO)
      if (!ultimoStr) {
        localStorage.setItem(STORAGE_KEY_ULTIMO_ACCESO, String(Date.now()))
        return false
      }
      const ultimo = Number(ultimoStr)
      const ahora = Date.now()
      if (ahora - ultimo > DIAS_INACTIVIDAD_MAX * MS_POR_DIA) {
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Proceso de verificación y consumo de invitación
  const procesarUsuarioOInvitacion = useCallback(async (fbUser: User) => {
    const usuarioRef = doc(db, 'usuarios', fbUser.uid)

    try {
      const userSnap = await getDoc(usuarioRef)
      if (userSnap.exists()) {
        const data = userSnap.data() as Usuario
        if (!data.activo) {
          setEstado('sin_acceso')
          setUsuario(null)
          return
        }
        setUsuario(data)
        setEstado('activo')
        registrarActividad()
        return
      }

      // No existe usuario: verificar invitaciones/{emailMin}
      const emailMin = (fbUser.email ?? '').trim().toLowerCase()
      if (!emailMin) {
        setEstado('sin_acceso')
        setUsuario(null)
        return
      }

      const invRef = doc(db, 'invitaciones', emailMin)
      const invSnap = await getDoc(invRef)

      if (!invSnap.exists()) {
        setEstado('sin_acceso')
        setUsuario(null)
        return
      }

      const inv = invSnap.data() as Invitacion
      if (inv.usada) {
        // Invitación ya consumida previamente
        setEstado('sin_acceso')
        setUsuario(null)
        return
      }

      // Crear documento del nuevo usuario a partir de su invitación
      const nuevoUsuario: Omit<Usuario, 'createdAt'> & { createdAt: FieldValue } = {
        email: fbUser.email ?? '',
        nombre: fbUser.displayName ?? fbUser.email ?? '',
        rol: inv.rol,
        orgId: inv.orgId,
        capsIds: inv.capsIds ?? [],
        comision: inv.comision ?? undefined,
        activo: true,
        createdAt: serverTimestamp(),
        createdBy: fbUser.uid,
        deviceId: getDeviceId(),
        schemaVersion: 1,
      }

      await setDoc(usuarioRef, nuevoUsuario)
      await setDoc(
        invRef,
        {
          usada: true,
          usadaPorUid: fbUser.uid,
          usadaAt: serverTimestamp(),
        },
        { merge: true }
      )

      // Leer usuario recién creado
      const nuevoSnap = await getDoc(usuarioRef)
      if (nuevoSnap.exists()) {
        setUsuario(nuevoSnap.data() as Usuario)
        setEstado('activo')
        registrarActividad()
      }
    } catch (err) {
      console.error('[Auth] Error al procesar invitación de usuario:', err)
      setError('Ocurrió un error al verificar tu invitación. Por favor, reintentá.')
      setEstado('sin_acceso')
    }
  }, [registrarActividad])

  const loginDemo = useCallback((rol: 'valorador' | 'supervisor') => {
    localStorage.setItem(STORAGE_KEY_DEMO_ROL, rol)
    setEsDemo(true)
    const demoUser: Usuario = {
      email: rol === 'valorador' ? 'estudiante.demo@unrc.edu.ar' : 'docente.demo@unrc.edu.ar',
      nombre: rol === 'valorador' ? 'Estudiante UNRC' : 'Prof. Belén Docente',
      rol,
      orgId: 'org-unrc-enfermeria',
      capsIds: ['caps-1', 'caps-alberdi'],
      comision: rol === 'valorador' ? 'Comisión A - 2026' : undefined,
      activo: true,
      createdAt: Timestamp.now(),
      createdBy: 'sistema-demo',
      deviceId: getDeviceId(),
      schemaVersion: 1,
    }
    const demoFbUser = {
      uid: rol === 'valorador' ? 'usr-estudiante-demo' : 'usr-docente-demo',
      email: demoUser.email,
      displayName: demoUser.nombre,
    } as unknown as User

    setUsuario(demoUser)
    setFirebaseUser(demoFbUser)
    setEstado('activo')
    setError(null)
  }, [])

  useEffect(() => {
    const demoRol = localStorage.getItem(STORAGE_KEY_DEMO_ROL) as 'valorador' | 'supervisor' | null
    if (demoRol) {
      loginDemo(demoRol)
      return
    }

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null)
        setUsuario(null)
        setEstado('sin_sesion')
        return
      }

      // Chequeo de inactividad
      if (verificarInactividad()) {
        setSesionCaducadaPorInactividad(true)
        await signOut(auth)
        setFirebaseUser(null)
        setUsuario(null)
        setEstado('sin_sesion')
        return
      }

      setFirebaseUser(fbUser)
      await procesarUsuarioOInvitacion(fbUser)

      // Suscripción reactiva para cambios de estado o rol en tiempo real
      const usuarioRef = doc(db, 'usuarios', fbUser.uid)
      const unsubUsuario = onSnapshot(usuarioRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Usuario
          if (data.activo) {
            setUsuario(data)
            setEstado('activo')
          } else {
            setUsuario(null)
            setEstado('sin_acceso')
          }
        }
      })

      return () => unsubUsuario()
    })

    return () => unsubAuth()
  }, [verificarInactividad, procesarUsuarioOInvitacion, loginDemo])

  // Escuchar eventos del usuario para renovar timestamp de actividad
  useEffect(() => {
    if (estado !== 'activo') return

    const handler = () => registrarActividad()
    window.addEventListener('click', handler, { passive: true })
    window.addEventListener('keydown', handler, { passive: true })
    window.addEventListener('focus', handler)

    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('keydown', handler)
      window.removeEventListener('focus', handler)
    }
  }, [estado, registrarActividad])

  const login = async () => {
    setError(null)
    setSesionCaducadaPorInactividad(false)
    setEstado('cargando')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('popup-closed-by-user')) {
        setEstado(firebaseUser ? 'sin_acceso' : 'sin_sesion')
        return
      }
      console.error('[Auth] Error al iniciar sesión con Google:', err)
      setError('No pudimos iniciar sesión con Google. Verificá tu conexión y volvé a intentar.')
      setEstado('sin_sesion')
    }
  }

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY_DEMO_ROL)
    setEsDemo(false)
    try {
      await signOut(auth)
    } finally {
      setFirebaseUser(null)
      setUsuario(null)
      setEstado('sin_sesion')
    }
  }

  // Permite desconectar la cuenta actual de Google y abrir el popup para elegir otra
  const cambiarCuenta = async () => {
    await logout()
    await login()
  }

  // Reintentar verificación tras asignación de invitación por el docente/admin
  const reintentarVerificacion = async () => {
    if (!firebaseUser) return
    setError(null)
    setEstado('cargando')
    await procesarUsuarioOInvitacion(firebaseUser)
  }

  // Borrar datos locales y caché del dispositivo (DISENO_BASE.md §10)
  const borrarDatosLocales = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_ULTIMO_ACCESO)
      localStorage.removeItem(STORAGE_KEY_DEMO_ROL)
      // Preservamos el deviceId único para evitar colisiones de códigos familiares
    } catch {
      // Ignorar
    }
  }

  return (
    <AuthContext.Provider
      value={{
        estado,
        firebaseUser,
        usuario,
        error,
        sesionCaducadaPorInactividad,
        login,
        logout,
        cambiarCuenta,
        reintentarVerificacion,
        borrarDatosLocales,
        loginDemo,
        esDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}

function getDeviceId(): string {
  let id = ''
  try {
    id = localStorage.getItem(STORAGE_KEY_DEVICE_ID) || ''
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, id)
    }
  } catch {
    id = 'dev_' + Math.random().toString(36).substring(2, 9)
  }
  return id
}
