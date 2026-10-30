# CuidaRed · Aplicación de Enfermería Comunitaria y Familiar

Herramienta de atención primaria de la salud (APS) para valorar **comunidades (barrios)** y **familias** en el primer nivel de atención.

Diseñada siguiendo la bibliografía y guías clínicas de las cátedras de Enfermería Comunitaria de la **Universidad Nacional de Río Cuarto (UNRC)** (*Introducción a la enfermería comunitaria*, Jacquier, Dos Santos, Wolhein y Martínez, 2014) y los 11 patrones funcionales de Marjory Gordon.

---

## 🚀 Características Principales

1. **Offline Primero (PWA Instalable):** Funciona al 100% en el terreno sin requerir conexión a internet ni consumo de datos móviles. Las mutaciones se resguardan en caché persistente IndexedDB y se sincronizan automáticamente con la central al recuperar conectividad.
2. **Cumplimiento de Privacidad (Ley 25.326):** Privacidad por diseño. No almacena número de documento (DNI) ni nombres de pila de las familias. Exige registro de Consentimiento Informado previo a la valoración y ofrece mecanismo seguro de borrado de datos locales post-sincronización.
3. **Valoración Comunitaria y Asistente FODA:** Guía de 11 patrones barriales orientada por puntos cardinales con matriz estratégica FODA en cuadrante 2×2.
4. **Ficha Familiar Integral:**
   - Composición del hogar, integrantes, vínculos de pareja y persona índice.
   - Genograma manuscrito con captura fotográfica en canvas y validaciones estructurales.
   - Vivienda, servicios y cálculo automático de hacinamiento.
5. **Anillo Vectorial de 11 Nodos de Gordon:** Stepper clínico y visualización interactiva de patrones conservados vs. alterados con justificación obligatoria.
6. **Instrumentos Clínicos Estandarizados:**
   - **APGAR Familiar (Smilkstein):** 5 dimensiones con clasificación funcional.
   - **Escala de Holmes y Rahe:** 43 eventos estresantes con suma ponderada de unidades de cambio vital (UCV).
   - **Cuestionario MOS:** Soporte social global y subescalas emocional, instrumental, afectiva e interacción positiva.
   - **Motor de sugerencias y alertas psicosociales:** Detección de riesgo cuando coexisten alto estrés y bajo apoyo social.
7. **Generador de Ficha Familiar en PDF (Offline):** Generación de documentos oficiales A4 en el dispositivo mediante `pdf-lib`, con membrete de CAPS, composición, foto de genograma, anillo vectorial de patrones, puntajes y líneas de firma/matrícula.
8. **Central Web de Supervisión y Docencia (`/central`):**
   - Panel con KPIs de cobertura por CAPS y progreso por sector cardinal de barrio.
   - Tabla densa de seguimiento de familias con filtros avanzados y exportación a **CSV**.
   - Asistente diagnóstico NANDA-I con redactor guiado en formato **PES** (*Problema · Etiología · Signos y Síntomas*) y flujo de validación docente (`propuesto` $\to$ `confirmado` $\to$ `descartado`).
   - Plan de intervenciones fijables con metas familiares, responsable y notas de evolución longitudinal en formato estructurado **SOEP** (*Subjetivo, Objetivo, Evaluación, Plan*).
   - Herramienta de detección de duplicados con algoritmo de distancia de edición para apellidos compuestos y direcciones similares.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite.
- **PWA:** `vite-plugin-pwa` (Workbox) con precaché de fuentes, catálogos y assets.
- **Base de datos:** Cloud Firestore con `persistentLocalCache` y `persistentMultipleTabManager`.
- **Autenticación:** Firebase Authentication con proveedor Google y control estricto de invitaciones (`invitaciones/{email}`).
- **Estilos:** Vanilla CSS con sistema formal de tokens visuales (`--azul`, `--lago`, `--tinta`, `--papel`, `--linea`, `--ok`, `--atencion`, `--critico`). *Sin Tailwind*.
- **Tipografía Embebida (Offline):** Fraunces (títulos y marcas) y Atkinson Hyperlegible Next (cuerpo y formularios) servidas localmente sin CDN.
- **Íconos:** Lucide React (trazo uniforme de 1.75px).
- **PDF:** `pdf-lib` (procesamiento binario del lado del cliente).

---

## 📋 Requisitos Previos

- **Node.js:** Versión 20 o superior.
- **npm:** Versión 10 o superior.
- **Firebase CLI:** Instalado globalmente (`npm install -g firebase-tools`).
- **Proyecto Firebase:** Configurado con Authentication (Google) y Firestore en región `southamerica-east1` (São Paulo).

---

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/escueladeenfermeriac8-glitch/CuidaRedApp.git
   cd CuidaRedApp
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copiar la plantilla `.env.example` y completar con las credenciales de Firebase de tu entorno:
   ```bash
   cp .env.example .env.dev
   ```

   Variables requeridas:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```

4. **Ejecutar en modo de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación se iniciará en `http://localhost:5173`.

5. **Validación estática y compilación:**
   ```bash
   # Comprobación de tipos TypeScript
   npx tsc --noEmit

   # Compilación y empaquetado para producción
   npm run build
   ```

---

## 🔒 Reglas de Seguridad y Acceso Cerrado

El acceso a CuidaRed es cerrado por organización:
1. Una persona administradora o docente registra el correo en la colección `invitaciones/{email}` con su `rol` (`valorador`, `supervisor`, `admin`) y sus `capsIds`.
2. Al iniciar sesión con Google por primera vez, el sistema valida la existencia de la invitación autorizada antes de dar de alta el registro en `usuarios/{uid}`.
3. Las reglas de seguridad en `firestore.rules` garantizan que:
   - Solo usuarios activos pertenecientes a la misma organización pueden leer y crear registros.
   - Las estudiantes y valoradores solo ven familias y barrios pertenecientes a sus CAPS asignados.
   - Las familias solo pueden ser editadas por su autor/a o por supervisoras/docentes.
   - Los borrados físicos están prohibidos (`allow delete: if false;`), aplicándose borrado lógico (`eliminado: true`).

Para probar las reglas en el emulador local:
```bash
firebase emulators:start --only firestore
```

---

## 🚀 Despliegue en Firebase Hosting

1. **Iniciar sesión en Firebase CLI:**
   ```bash
   firebase login
   ```

2. **Asociar proyectos (Desarrollo y Producción):**
   ```bash
   firebase use --add
   ```

3. **Desplegar Reglas de Firestore e Índices:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

4. **Compilar y Desplegar la PWA:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 📁 Estructura del Código Fuente

```
App CuidaRed/
├── docs/
│   ├── DISENO_BASE.md         → Fuente de verdad y especificaciones del producto
│   ├── ADENDA_GENOGRAMA.md    → Especificación técnica del genograma y parejas
│   └── GUIA_ESTUDIANTE.md     → Instructivo práctico de campo para estudiantes (1 página)
├── public/
│   └── icons/                 → Iconos PWA (icon-192.png y icon-512.png con anillo de 11 nodos)
├── src/
│   ├── catalogos/             → Catálogos clínicos semilla (APGAR, Holmes, MOS, NANDA-I, Guías)
│   ├── components/            → Componentes reutilizables (SyncBadge, Genograma, Vivienda, Modales)
│   ├── constants/             → APP_NAME y configuraciones globales
│   ├── contexts/              → AuthContext con flujo de invitaciones y auto-logout por inactividad
│   ├── hooks/                 → useSync (detección de red, pendingWrites, respaldo JSON y limpieza)
│   ├── i18n/                  → Textos en español rioplatense (es-AR.json)
│   ├── layouts/               → AppLayout (mobile campo) y CentralLayout (desktop supervisión)
│   ├── lib/                   → firebase.ts, normalizacion.ts, genograma-validaciones.ts, pdf-generador.ts
│   ├── pages/
│   │   ├── central/           → Panel, Barrios, Familias, Diagnósticos NANDA PES, Plan y Duplicados
│   │   ├── comunidad/         → Valoración de 11 patrones barriales y FODA asistido
│   │   ├── familias/          → Listado, Ficha Familiar, Patrones de Gordon e Instrumentos
│   │   ├── pendientes/        → Campanita de pasos pendientes
│   │   └── sincronizar/       → Diagnóstico de conexión, métricas de sync, respaldo y borrado local
│   ├── types/                 → Modelo de datos TypeScript completo
│   ├── AppRouter.tsx          → Enrutador con guardas de autenticación
│   ├── index.css              → Tokens de diseño (Fraunces + Atkinson Hyperlegible Next)
│   └── main.tsx               → Punto de entrada de la aplicación
├── firestore.rules            → Reglas de seguridad de Firestore
├── firestore.indexes.json     → Índices compuestos de consulta
├── PENDIENTES.md              → Registro de validaciones clínicas y bitácora de pasos
└── vite.config.ts             → Configuración de Vite y plugin PWA
```

---

## 📚 Documentación de Referencia

- [DISENO_BASE.md](file:///docs/DISENO_BASE.md) — Documento integral de arquitectura, bibliografía y requerimientos.
- [GUIA_ESTUDIANTE.md](file:///docs/GUIA_ESTUDIANTE.md) — Guía rápida de uso en terreno para estudiantes.
- [PENDIENTES.md](file:///PENDIENTES.md) — Bitácora de ítems pendientes de validación con la cátedra.
- [ADENDA_GENOGRAMA.md](file:///docs/ADENDA_GENOGRAMA.md) — Estructura y reglas del genograma familiar.

---
*CuidaRed · Desarrollado para las prácticas comunitarias de la UNRC · 2026*
