# CuidaRed

Herramienta de enfermería comunitaria para valorar **comunidades (barrios)** y **familias** en el primer nivel de atención.

Sigue la bibliografía de las cátedras de Enfermería Comunitaria de la UNRC (Jacquier, Dos Santos, Wolhein y Martínez, 2014).

## Stack

- **Frontend:** React + TypeScript + Vite
- **PWA:** `vite-plugin-pwa` (Workbox), funciona offline
- **Backend:** Firebase (Auth, Firestore, Hosting) — sin Cloud Functions en el MVP
- **Estilos:** CSS variables (tokens), sin Tailwind
- **Tipografía:** Fraunces + Atkinson Hyperlegible Next (embebidas, offline)
- **Íconos:** Lucide React (trazo 1.75px)
- **PDF:** `pdf-lib` (generación en el cliente, offline)

## Requisitos

- Node.js 20+
- Cuenta de Firebase con Auth (Google) y Firestore habilitados
- Variables de entorno en `.env.dev` (ver `.env.example`)

## Instalación

```bash
# Clonar el repositorio
git clone <URL_REPO>
cd "App CuidaRed"

# Instalar dependencias
npm install

# Copiar y completar variables de entorno
cp .env.example .env.dev

# Desarrollo
npm run dev

# Build de producción
npm run build
```

## Firebase

```bash
# Login (una sola vez)
firebase login

# Emulador para probar reglas de seguridad
firebase emulators:start

# Desplegar reglas
firebase deploy --only firestore:rules

# Desplegar hosting
npm run build
firebase deploy --only hosting
```

## Estructura del proyecto

```
src/
  constants/    → APP_NAME y constantes globales
  contexts/     → AuthContext (sesión, invitaciones, roles)
  hooks/        → useSync (detección offline)
  i18n/         → es-AR.json (textos de la interfaz, voseo)
  layouts/      → AppLayout (nav inferior, franja offline)
  lib/          → firebase.ts, normalizacion.ts, genograma-validaciones.ts
  pages/        → LoginPage, InicioPage (más en pasos 4–13)
  types/        → Modelo de datos completo (Firestore)
  index.css     → Sistema de tokens visuales (sección 8 del diseño)

firestore.rules → Reglas de seguridad con roles y orgId
PENDIENTES.md   → TODO(belen) y decisiones documentadas
```

## Documentación

- `DISENO_BASE.md` — Fuente de verdad del proyecto
- `ADENDA_GENOGRAMA.md` — Modelo extendido de integrantes y parejas
- `PENDIENTES.md` — Ítems pendientes de validación con la cátedra
