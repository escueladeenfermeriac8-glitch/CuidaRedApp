/**
 * Firebase · Inicialización y exportaciones
 *
 * Las variables de entorno viven en .env.dev (fuera de Git).
 * Ver .env.example para la lista completa.
 *
 * NOTAS DE IMPLEMENTACIÓN (DISENO_BASE.md §4):
 * - Usar persistentLocalCache + persistentMultipleTabManager para offline.
 * - Preferir signInWithPopup sobre signInWithRedirect en PWA instalada.
 * - El login con redirección puede fallar en algunos navegadores iOS/Android
 *   instalados como PWA → documentar comportamiento observado en PENDIENTES.md.
 */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
)

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoLocalPlaceholderKey99999',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cuidared-app.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-cuidared',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-cuidared.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:demo1234567890',
}

// Verificación en desarrollo: avisa si falta alguna variable real
if (import.meta.env.DEV && !isFirebaseConfigured) {
  console.info(
    '[CuidaRed] Ejecutando en modo de prueba local (sin variables de Firebase reales).\n' +
    'Podés usar los perfiles de demostración en el login o completar .env.dev para conectar a la nube.'
  )
}

export const app = initializeApp(firebaseConfig)

// Auth con sesión persistente (sobrevive a cierre de pestaña)
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)

// Proveedor Google
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Firestore con caché persistente offline
// persistentMultipleTabManager permite usar la app en múltiples pestañas
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
