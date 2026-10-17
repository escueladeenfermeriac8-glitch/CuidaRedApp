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
| P-14 | **Cierre de sesión automático** — definir N días sin uso para auto-logout. Actualmente no implementado. | `src/contexts/AuthContext.tsx` | Belén |
| P-15 | **Respaldo manual .json** — exportar/importar familias del dispositivo con cifrado opcional (P1). | A implementar en paso 13 | — |

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

