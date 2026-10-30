# PENDIENTES.md — CuidaRed

Archivo generado automáticamente. Contiene todos los `TODO(belen)` del código
y los ítems pendientes de validación de `DISENO_BASE.md §15`.

Última actualización: 17/10/2026 · Pasos 1–3 del plan.

---

## 🔴 Bloqueantes antes del piloto (26/10)

| ID | Descripción | Archivo | Quién |
|---|---|---|---|
| P-01 | **Texto del consentimiento informado** — redactar con la cátedra o autoridad del servicio. Actualmente hay un placeholder en la UI. | `src/i18n/es-AR.json` · clave `consentimiento.texto` | Belén + cátedra |
| P-02 | **Catálogo de resultados e intervenciones** — semilla mínima para el 26/10 (~30 diagnósticos con 2–3 intervenciones). Ver Anexo E de DISENO_BASE.md. | `src/catalogos/nandaPorPatron.json` (a crear en paso 4) | Belén + cátedra |
| P-03 | **Contraste de parámetros de escalas con el libro** — APGAR p. 173, MOS pp. 169–171, Holmes y Rahe pp. 167–168. Si difieren, prevalece el libro. | `src/catalogos/apgar.json`, `mos.json`, `holmes.json` (paso 4) | Belén |
| P-04 | **Edición NANDA-I del catálogo** — decidir la edición (actualmente semilla usa 2012–2014). Completar diagnósticos de comunidad y NOC/NIC. | `src/catalogos/nandaPorPatron.json` | Belén |
| P-05 | **Reglas de sugerencia de instrumentos** — validar criterios con docentes antes del piloto. | `src/catalogos/reglasInstrumentos.json` (paso 4) | Docentes |
| P-06 | **Firebase: cargar invitaciones** de las primeras usuarias (emails de Belén y docentes) antes de instalar la app. | Firebase Console | Belén |
| P-07 | **Firebase: variables de entorno** — completar `.env.dev` con el `firebaseConfig` real del proyecto dev. Ver `.env.example`. | `.env.dev` (no está en Git) | Belén |
| P-08 | **Firebase: habilitar Auth con Google** en el proyecto dev y agregar el dominio de Hosting como dominio autorizado. | Firebase Console | Belén |
| P-09 | **IDs de proyecto Firebase** — reemplazar `[ID_PROYECTO_DEV]` y `[ID_PROYECTO_PROD]` en el `.firebaserc`. | `.firebaserc` (a crear) | Belén |

---

## 🟡 Importantes antes del trabajo final

| ID | Descripción | Archivo | Quién |
|---|---|---|---|
| P-10 | **Nombre definitivo y logos** — actualmente "CuidaRed" es una constante `APP_NAME`. Registro de marca y dominio pendientes. | `src/constants/app.ts` | Belén |
| P-11 | **Favicon e iconos de la PWA** — Favicon temporal SVG + iconos `public/icons/icon-192.png` e `icon-512.png` generados con el anillo de 11 nodos (PWA instalable). Reemplazar si se define logo gráfico definitivo. | `public/icons/` | Belén / diseño |
| P-12 | **Política de retención de datos** — definir cuántos días se retienen los datos (`retencionDias` en el config de la organización). | DISENO_BASE.md §10 | Belén + cátedra |
| P-13 | **Protocolo de consentimiento** — redactar y aprobar con la autoridad del servicio. Incluir texto para la UI. | DISENO_BASE.md §10 | Cátedra |
| P-14 | **Cierre de sesión automático** — Implementado con parámetro por defecto de 7 días sin uso (`DIAS_INACTIVIDAD_MAX` en `AuthContext.tsx`). Validar con la cátedra si prefieren otro período (ej. 3 o 5 días). | `src/contexts/AuthContext.tsx` | Belén |
| P-15 | **Respaldo manual .json** — exportar copia de seguridad en JSON desde el dispositivo (P1). Implementado en Paso 11 (`useSync` y `SincronizarPage`). Importación/restauración de emergencia para Ola 2. | `src/hooks/useSync.ts`, `src/pages/sincronizar/SincronizarPage.tsx` | Antigravity |

---

## 🟠 Decisiones de arquitectura documentadas

| ID | Decisión tomada | Nota |
|---|---|---|
| D-01 | **Roles: mapeo docente → supervisor \| admin \| admin_global** en las reglas de Firestore. El esquema original (DISENO_BASE.md §10) usaba `docente`; se alinea con los roles de §3. | Confirmar con Belén antes del piloto. Ver `firestore.rules`. |
| D-02 | **Vulnerabilidades de npm audit** (4 high) en `@grpc/grpc-js` dentro de Firebase SDK. Afectan solo al SDK de servidor Node.js (gRPC), **no al bundle del browser**. `npm audit fix --force` requeriría bajar a firebase@9.14.0 (breaking change). Decisión: mantener la versión actual y monitorear actualizaciones de Firebase. | `package.json` |
| D-03 | **PWA sin iconos PNG** — la app arranca pero no se puede instalar como PWA hasta que existan `public/icons/icon-192.png` y `public/icons/icon-512.png`. Agregué los paths en `vite.config.ts` pero los archivos son generados por diseño. | `public/icons/` |
| D-04 | **Login con redirección en iOS/Android instalado como PWA** — puede fallar en algunos navegadores. Se implementó `signInWithPopup` según la recomendación de DISENO_BASE.md §4. Documentar comportamiento observado en prueba real. | `src/contexts/AuthContext.tsx` |
| D-05 | **Genograma P0 = tabla + foto** — el modelo de datos completo (integrantes, parejas, relaciones, hogares) está tipado en TypeScript y cubierto en las reglas de Firestore. El dibujo SVG automático es P1. | `src/types/index.ts`, `firestore.rules` |
| D-06 | **parejaDeIds[] y tipoVinculo** del diseño base reemplazados por la subcolección `parejas/{id}` según ADENDA_GENOGRAMA.md §3.2. Permite parejas sucesivas y simultáneas. | `src/types/index.ts` |

---

## 📋 Contenido clínico pendiente de contraste (⚠ del DISENO_BASE.md)

| ⚠ | Qué falta | Fuente |
|---|---|---|
| ⚠ A.1 | APGAR: cortes 7–10 / 3–6 / 0–2 (p. 173 del libro) | Jacquier et al., 2014 |
| ⚠ A.2 | Holmes y Rahe: eventos y UCV adaptados al contexto local (pp. 167–168) | Jacquier et al., 2014 |
| ⚠ A.3 | MOS: cuadro de interpretación (p. 171) | Jacquier et al., 2014 |
| ⚠ A.3 | MOS: corte de 300 UCV (la cátedra no lo define) | Cátedra |
| ⚠ B (todas) | Reglas de prioridad del FODA y criterios de cruces estratégicos | Docentes |
| ⚠ E | Completar catálogo NANDA-I: diagnósticos de comunidad + NOC/NIC + edición definitiva | Belén + cátedra |

---

## ✅ Completado en pasos 1–3

- [x] Scaffold React + TypeScript + Vite
- [x] `vite-plugin-pwa` con Workbox
- [x] Fuentes Fraunces + Atkinson Hyperlegible Next por npm (offline, sin CDN)
- [x] Tokens CSS completos (paleta, tipografía, espaciado, componentes base)
- [x] Constante `APP_NAME` como única fuente del nombre
- [x] Archivo `es-AR.json` con todos los textos (sin texto fijo en componentes)
- [x] `.env.example` y `.gitignore`
- [x] Firebase inicializado con caché persistente Firestore y Auth Google
- [x] Modelo de datos TypeScript completo (BaseDoc, Familia, Integrante, Pareja, Valoracion, Diagnostico, Plan, Evolucion, Catálogos, Métricas)
- [x] Modelo del genograma extendido según ADENDA_GENOGRAMA.md (Pareja como subcolección, RelacionInterpersonal, AcontecimientoVital, Hogar)
- [x] Reglas de Firestore con roles alineados, filtrado por orgId y capsId
- [x] Validaciones del genograma (bloquean vs. advierten) como funciones puras
- [x] Normalización de texto y distancia de edición para búsqueda de familias
- [x] Contexto de Auth con flujo completo: sesión → invitación → creación de usuario
- [x] Router con guarda de autenticación y rutas del campo
- [x] Layout con franja offline y barra de navegación inferior
- [x] `firebase.json` y `firestore.indexes.json`
- [x] Git init + `.gitignore`
- [x] `PENDIENTES.md` (este archivo)

---

## ✅ Completado en paso 4

- [x] Generación de iconos PWA instalables (`public/icons/icon-192.png` y `public/icons/icon-512.png`) con anillo de 11 nodos y fondo seguro maskable
- [x] Catálogo `src/catalogos/apgar.json` (5 dimensiones, escala 0-2, cortes funcional / disfunción leve / grave)
- [x] Catálogo `src/catalogos/holmes.json` (43 eventos vitales con UCV y cortes de riesgo psicosocial)
- [x] Catálogo `src/catalogos/mos.json` (pregunta descriptiva, 19 ítems en 4 subescalas, índice global y cortes)
- [x] Catálogo `src/catalogos/nandaPorPatron.json` (52 diagnósticos clasificados por los 11 patrones funcionales de Gordon, tipos problema/riesgo/disposición y sujetos)
- [x] Catálogo `src/catalogos/reglasInstrumentos.json` (reglas r1 a r6 de sugerencias y alertas psicosociales según Anexo A.4)
- [x] Módulo tipado `src/catalogos/index.ts` con funciones puras `calcularApgar`, `calcularHolmes`, `calcularMos` y `filtrarDiagnosticosNanda`

---

## ✅ Completado en paso 5

- [x] Flujo de autenticación cerrada: consulta reactiva de `invitaciones/{emailMin}` y creación automática de `usuarios/{uid}` al primer ingreso válido
- [x] Manejo de pantalla `sin_acceso`: muestra cuenta actual, explicación amigable, botón para reintentar verificación y botón para cambiar de cuenta de Google
- [x] Cierre de sesión automático por inactividad tras 7 días sin uso (`DIAS_INACTIVIDAD_MAX`), registrando actividad del usuario en `cuida_ultimo_acceso`
- [x] Actualización de `firestore.rules` para permitir que el nuevo usuario canjee su invitación y cree su propio perfil de forma segura sin Cloud Functions
- [x] Aviso en pantalla de login recordando la recomendación de seguridad de activar bloqueo de pantalla (PIN/huella) en el dispositivo
- [x] Loader accesible con el anillo de 11 nodos animado durante la verificación de sesión

---

## ✅ Completado en paso 6

- [x] Selector visual de punto cardinal con brújula (`SelectorCardinal.tsx`), abarcando los 8 puntos cardinales (N, NE, E, SE, S, SO, O, NO) con aguja orientable
- [x] Modal de alta rápida de barrio (`ModalCrearBarrio.tsx`) con previsualización de etiqueta `"Barrio X (Cardinal)"`, cálculo de `claveUnica` y validación de duplicados
- [x] Catálogo `src/catalogos/guiaComunitaria.json` con los 11 patrones de Gordon según Wolhein y Martínez (Anexo D), detallando guías de datos subjetivos y objetivos
- [x] Catálogo `src/catalogos/bancoFODA.json` con las 24 preguntas socioeconómicas y emocionales de Anexo B.3
- [x] Pantalla de valoración comunitaria (`ValoracionComunidadPage.tsx`) con stepper de 11 nodos, autoguardado en Firestore offline y registro de datos subjetivos/objetivos/fuente
- [x] Asistente FODA con generación automática de Fortalezas (patrones conservados con evidencia) y Debilidades (patrones alterados con justificación) según Anexo B.2
- [x] Banco asistido de Oportunidades y Amenazas con cálculo automático de prioridades 1 a 5 según Anexo B.4
- [x] Renovación de la pantalla de Inicio (`InicioPage.tsx`) con badge de barrio activo, selector territorial, campana de pendientes y accesos directos a valorar comunidad y familia

---

## ✅ Completado en paso 7

- [x] Búsqueda y creación de familias (`FamiliasPage.tsx`) con normalización de domicilio, tolerancia a errores ortográficos (Levenshtein ≤ 2) y advertencia visual "¿Es esta familia?"
- [x] Generación estandarizada de código familiar `{CAPS}-{AA}-{seq}` y soporte explícito para convivencia de múltiples familias en el mismo domicilio ("Familia 2")
- [x] Modal de consentimiento informado (`ConsentimientoModal.tsx`) con bloqueo de avances, modalidad oral/escrita, fecha y registro del valorador (Ley 25.326)
- [x] Gestor de integrantes del hogar y genograma (`IntegrantesManager.tsx`) con alta rápida, parentesco, persona índice, condiciones de salud y validación clínica en tiempo real (ADENDA §5)
- [x] Sección de vivienda y cartografía (`ViviendaCartografiaSection.tsx`) con cálculo automático de hacinamiento por habitante/habitación, servicios básicos y foto del genograma manual con compresión en canvas (P0)
- [x] Ficha familiar integral (`FichaFamiliarPage.tsx`) con cabecera, anillo de 11 patrones de Gordon interactivo, campanita de pendientes reactiva y pestañas de trabajo
- [x] Pantalla global de pendientes (`PendientesPage.tsx`) con seguimiento de valoraciones comunitarias y pasos pendientes por familia, filtros territoriales y buscador
- [x] Enrutamiento en `AppRouter.tsx` para `/familias`, `/familias/:famId` y `/pendientes`

---

## ✅ Completado en paso 8

- [x] Catálogo clínico `src/catalogos/guiaFamiliar.json` con los 11 patrones funcionales de Marjory Gordon adaptados a la familia (Jacquier et al., 2014), preguntas sugeridas, observables y criterios de alteración
- [x] Pantalla de valoración familiar de patrones (`ValoracionPatronesPage.tsx`) accesible desde la ficha familiar (`/familias/:famId/patrones`)
- [x] Stepper interactivo de 11 nodos (Gordon Ring) con estado visual en tiempo real (conservado, alterado, sin valorar) y contador de avances
- [x] Guía clínica desplegable para cada patrón con preguntas indagatorias para la familia y elementos a observar en la visita
- [x] Registro clínico estructurado de datos subjetivos (manifestado por la familia), datos objetivos (signos del hogar e integrantes) y fuente del dato
- [x] Veredicto clínico de enfermería con marcación explícita de `conservado` vs. `alterado` y justificación clínica obligatoria para patrones alterados
- [x] Asistente de diagnósticos NANDA-I candidatos sugeridos por patrón (Anexo E) para preparación de enunciados PES en la Central
- [x] Autoguardado reactivo y persistencia offline en Firestore en la subcolección `familias/{famId}/valoraciones/{id}` con `tipo: 'patrones'`
- [x] Sincronización bidireccional con el anillo de 11 patrones de la Ficha Familiar (`FichaFamiliarPage.tsx`)

---

## ✅ Completado en paso 9

- [x] Pantalla unificada de instrumentos de valoración familiar (`InstrumentosPage.tsx`) accesible desde `/familias/:famId/instrumentos` con soporte para selección por query param (`?tipo=apgar|holmes|mos`)
- [x] Cuestionario APGAR Familiar (Smilkstein): selector del integrante que responde, 5 dimensiones con botones táctiles accesibles (0 a 2 pts), cálculo dinámico de puntaje y clasificación funcional (7-10 funcional, 3-6 leve, 0-2 grave)
- [x] Escala de Holmes y Rahe: buscador de eventos vitales en tiempo real, selección de los 43 eventos con UCV ponderadas, suma automática de riesgo (&lt;150 bajo, 150-299 moderado, &ge;300 alto) y campo para otros estresores
- [x] Cuestionario MOS de apoyo social (Sherbourne &amp; Stewart): pregunta descriptiva de red íntima, 19 ítems (escala 1 a 5), desglose de las 4 subescalas e índice global de apoyo social adecuado vs. escaso
- [x] Motor de sugerencias y alertas psicosociales (`reglasInstrumentos.json`): detección reactiva de disfunción familiar y alerta de riesgo psicosocial crítico cuando coexisten alto estrés (&ge;150 UCV) y bajo apoyo social
- [x] Persistencia reactiva offline en Firestore (`familias/{famId}/valoraciones`) e integración con la Ficha Familiar y la Campanita de Pendientes

---

## ✅ Completado en paso 10

- [x] Motor de exportación PDF offline (`src/lib/pdf-generador.ts`) con `pdf-lib` (sin requerir conexión a internet ni llamadas a servidores externos)
- [x] Generación de documento A4 estructurado con membrete institucional, CAPS, barrio y código familiar
- [x] Sección de identificación y consentimiento informado según Ley 25.326 de Protección de Datos Personales
- [x] Tabla de composición del hogar e integrantes con condiciones clínicas registradas y persona índice
- [x] Sección de vivienda y cartografía con cálculo de hacinamiento e inserción de la foto del genograma manual en canvas (P0)
- [x] Renderizado vectorial del Anillo de 11 nodos (Gordon Ring) con códigos de color de estado (verde conservado, ámbar alterado, gris sin valorar) y detalle de los 11 patrones
- [x] Resumen cuantitativo y cortes clínicos de los tres instrumentos: APGAR, Holmes y Rahe, y MOS de apoyo social
- [x] Líneas de firma y matrícula para el estudiante valorador y supervisor/a docente
- [x] Integración de modal interactivo y descarga directa en la Ficha Familiar (`FichaFamiliarPage.tsx`)

---

## ✅ Completado en paso 11

- [x] Componente `SyncBadge` (`src/components/sync/SyncBadge.tsx`) con 3 estados (`enviado`, `pendiente`, `revisar`), íconos semánticos accesibles y tokens de color (`--ok`, `--lago`, `--critico`).
- [x] Hook `useSync` (`src/hooks/useSync.ts`) con monitoreo reactivo de `snapshot.metadata.hasPendingWrites`, contador de registros locales, detección de online/offline, reconexión de red (`enableNetwork`) y resolución de escrituras pendientes (`waitForPendingWrites`).
- [x] Franja offline dinámica en `AppLayout` (`src/layouts/AppLayout.tsx`) con indicación en tiempo real de registros pendientes y enlace directo a `/sincronizar`.
- [x] Pantalla de sincronización y estado offline (`src/pages/sincronizar/SincronizarPage.tsx`):
  - Diagnóstico de conexión en tiempo real (Wifi / offline) y estado de la caché persistente IndexedDB.
  - Métricas visuales de registros (enviados, pendientes, a revisar).
  - Botón "Sincronizar ahora" con animación de progreso y confirmación de fecha/hora.
  - Respaldo manual en archivo `.json` de emergencia (DISENO_BASE.md §4 P1).
  - Mecanismo de borrado seguro de datos locales sincronizados conforme a la Ley 25.326 de Protección de Datos Personales (DISENO_BASE.md §10), protegiendo registros pendientes.
  - Lista de familias locales con navegación directa a sus fichas e indicadores de sincronización por registro.
- [x] Integración de `SyncBadge` en tarjetas del listado de familias (`FamiliasPage.tsx`) y en la cabecera de la ficha familiar (`FichaFamiliarPage.tsx`).

---

## ✅ Completado en paso 12

- [x] Layout desktop de la Central (`src/layouts/CentralLayout.tsx`) con barra lateral de navegación estructurada (Panel, Barrios, Familias, Diagnósticos, Duplicados) y acceso bidireccional a la app de campo.
- [x] Panel de supervisión docente (`src/pages/central/CentralDashboardPage.tsx`) con KPIs en tiempo real (familias, barrios, porcentaje con consentimiento, valoraciones completas) y progreso por sector cardinal.
- [x] Supervisión de comunidades y barrios (`src/pages/central/CentralBarriosPage.tsx`) con selector de barrios, matriz estratégica FODA en cuadrante 2x2 y desglose de patrones alterados.
- [x] Tabla densa de familias (`src/pages/central/CentralFamiliasPage.tsx`) con filtros combinados (CAPS, barrio, estado, consentimiento), buscador instantáneo y exportación de padrón a formato CSV (P1).
- [x] Asistente diagnóstico NANDA en formato PES (`src/pages/central/CentralDiagnosticosPage.tsx`):
  - Vista en dos columnas: datos y justificaciones de patrones familiares vs. candidatos de `nandaPorPatron.json`.
  - Redactor guiado de enunciados en formato PES (Problema, Etiología, Signos y Síntomas).
  - Flujo de supervisión docente: `propuesto` → `confirmado` → `descartado`.
- [x] Plan de intervenciones y registro de evoluciones SOEP (`src/pages/central/CentralPlanPage.tsx`):
  - Banco de intervenciones fijables con metas familiares, responsable y fecha.
  - Registro cronológico longitudinal en formato clínico SOEP (Subjetivo, Objetivo, Evaluación, Plan) con autoría y fecha.
- [x] Herramienta docente para control y fusión de duplicados (`src/pages/central/CentralDuplicadosPage.tsx`):
  - Algoritmo de distancia de edición para apellidos compuestos y direcciones similares.
  - Comparativa lado a lado y resolución como "Familia 2 conviviente" o fusión con borrado lógico trazable.
- [x] Configuración de rutas `/central/*` en `AppRouter.tsx` y enlace contextual en la pantalla de inicio para supervisores.

---

## ✅ Completado en paso 13 (Cierre y Entrega Final)

- [x] Guía breve de uso para estudiantes (`docs/GUIA_ESTUDIANTE.md`): instructivo de 1 página redactado en español rioplatense (voseo) para estudiantes de enfermería comunitaria en prácticas de CAPS. Cubre preparación antes de salir al terreno, resguardo de privacidad (Ley 25.326 sin DNI ni nombres), recorrido paso a paso (búsqueda, consentimiento, integrantes, genograma, vivienda, patrones de Gordon e instrumentos), generación del PDF offline, sincronización y limpieza segura del teléfono personal.
- [x] Documentación exhaustiva en `README.md`: arquitectura técnica, principios de producto, requisitos previos, variables de entorno, configuración de Firebase Auth y reglas de Firestore con emulador, comandos de despliegue en Firebase Hosting (`dev` y `prod`), estructura del repositorio y referencias a la bibliografía base.
- [x] Consolidación de `PENDIENTES.md` con el estado final de todos los entregables requeridos por `DISENO_BASE.md §16` y bitácora completa de los 13 pasos ejecutados con éxito.
- [x] Verificación de calidad final: `npx tsc --noEmit` con 0 errores y compilación `npm run build` exitosa con generación de service worker Workbox y manifiesto PWA.










