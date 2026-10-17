# CuidaRed · Documento base de diseño

Versión 1.2 · 17/10/2026 · Producto: Belén Gómez · Arquitectura y diseño: Claude · Desarrollo: Antigravity

**Nombre:** el nombre es CuidaRed. Usá una constante `APP_NAME` (valor actual: "CuidaRed"; el registro de marca y de dominio está pendiente) y nunca lo escribas fijo en textos ni en el código.

## 0. Cómo usar este documento (leer primero)

- Este documento es la fuente de verdad. Si algo no está definido, **no lo inventes**: dejá un `TODO(belen)` en el código y listalo en el archivo `PENDIENTES.md`.
- Prioridades: **P0** = imprescindible para el 2.º encuentro sincrónico (lunes 26/10/2026), **P1** = deseable en Ola 1, **P2** = Ola 2.
- Orden de trabajo sugerido: (1) esqueleto PWA + Firebase + login, (2) modelo de datos y reglas, (3) flujo de familia y ficha, (4) instrumentos, (5) PDF, (6) central, (7) pulido de diseño.
- Todo contenido clínico (ítems de escalas, cortes, preguntas, diagnósticos, intervenciones) vive en **catálogos de datos versionados**, nunca en el código de la interfaz. Los Anexos A a E de este documento son la fuente de esos catálogos: no hace falta consultar el libro para implementar. Los valores marcados ⚠ están pendientes de contraste con la cátedra.
- Idioma de la interfaz: español rioplatense (voseo) como `es-AR`, con archivos de idioma preparados para `es-CO`.

## 1. Contexto y objetivo

**Qué es:** una herramienta de enfermería comunitaria para valorar **comunidades (barrios)** y **familias** en el primer nivel de atención, siguiendo la bibliografía de las cátedras de Enfermería Comunitaria de la UNRC (libro *Introducción a la enfermería comunitaria*, Jacquier, Dos Santos, Wolhein y Martínez, 2014, y guía de valoración comunitaria por patrones funcionales).

**Para quién:** equipos de atención primaria que valoran comunidades y familias. En Ola 1: estudiantes y docentes de Enfermería en Salud Comunitaria I (Cód. 103) en prácticas en CAPS de Río Cuarto. Después: profesionales de CAPS y de otros servicios en uso asistencial (sección 17). En Ola 2: estudiantes de UniSinú (Cartagena) en modo lectura anonimizada.

**Problema:** la ficha en papel se pierde, se completa a mano sin cálculo de escalas, no se sabe si una familia ya fue valorada y los datos no llegan a quien debe analizarlos.

**Resultado esperado:** recolección offline en el celular → sincronización a una central web → diagnósticos y plan → historial fechado por familia → PDF estructurado.

**Contexto de uso real:** a la calle, con una mano, con sol, con conexión mala o nula, con interrupciones constantes, usuarios que recién empiezan la carrera.

**Fechas:** 19/10 primer encuentro sincrónico; 26/10 segundo encuentro (uso de la herramienta en los grupos mixtos con UniSinú). El MVP tiene que estar instalable por los estudiantes alrededor del 20–21/10.

### Fuera de alcance de Ola 1

Mapa geográfico real, envío de historias a otro CAPS por mail, acceso de estudiantes colombianos, integración con sistemas de historia clínica oficiales, dibujo automático de genograma si no alcanza el tiempo (ver 6.4).

## 2. Principios de producto

1. **Offline primero.** Todo lo que hace quien valora en el campo funciona sin internet. La conexión solo se necesita para el primer ingreso y para sincronizar.
2. **La bibliografía manda.** Estructura, campos y escalas salen de los Anexos A a E de este documento, elaborados sobre la bibliografía base de la cátedra (Jacquier et al., 2014) y las fuentes originales de cada instrumento. No se agregan puntajes ni semáforos inventados.
3. **La persona decide.** La app sugiere (instrumentos, diagnósticos candidatos, plan); quien valora confirma y el supervisor valida. Nada se diagnostica solo.
4. **Privacidad por diseño.** Mínimos datos personales, capas separadas, acceso por rol.
5. **El historial no se pisa.** Cada valoración es un registro fechado y con autor. Corregir = nueva versión.
6. **Una tarea por pantalla.** Pensado para usar parado, con una mano.
7. **Abierta a otros equipos.** Reglas, escalas, preguntas y etiquetas viven en catálogos configurables por organización, de modo que la misma app sirve a una cátedra, a un CAPS o a una red de servicios (sección 17).

## 3. Usuarios, roles y permisos

| Rol | Quién | Puede |
|---|---|---|
| `valorador` | Estudiante en práctica o profesional de un servicio | Crear y editar sus valoraciones; ver familias y barrios de sus CAPS asignados; generar PDF; sincronizar |
| `supervisor` | Docente, tutora, ayudante o coordinador/a de CAPS | Todo lo del valorador en su organización, más ver la central, validar diagnósticos y plan, fusionar duplicados |
| `admin` | Administrador/a de la organización (hoy, Belén) | Todo en su organización, más invitar usuarios, asignar CAPS y editar catálogos locales |
| `admin_global` | Equipo responsable de la plataforma | Crear organizaciones y publicar catálogos base |
| `invitado_externo` | Ola 2 (por ejemplo, UniSinú) | Solo lectura de casos anonimizados |

**Alta de usuarios:** cerrada y por organización. El admin carga una invitación por email (`invitaciones/{email}`) con rol, organización y CAPS. El primer login con Google crea `usuarios/{uid}` solo si existe la invitación. Sin invitación, la app muestra "Tu cuenta todavía no tiene acceso. Pedíselo a quien administra tu organización".

## 4. Arquitectura técnica

| Capa | Decisión |
|---|---|
| Cliente | **PWA** instalable. React + TypeScript + Vite. Estilos con CSS variables (tokens de la sección 8) y Tailwind opcional |
| PWA | `vite-plugin-pwa` (Workbox): precache de la app, catálogos y fuentes; aviso de "Nueva versión disponible" |
| Auth | Firebase Authentication, proveedor Google. Sesión persistente |
| Base de datos | **Cloud Firestore** con caché persistente (`persistentLocalCache` + `persistentMultipleTabManager`) para offline y sincronización automática |
| Hosting | Firebase Hosting |
| Reglas | Firestore Security Rules con roles (ver 10). Probar con el emulador |
| PDF | Generación **en el cliente** (offline), con `pdf-lib` o `@react-pdf/renderer`, fuentes incluidas en el bundle |
| Genograma | SVG propio generado desde datos (ver 6.4) |
| Funciones en la nube | **No usar en el MVP** (evita plan de pago). Lógica en el cliente y en reglas |
| Entornos | `dev` y `prod`: dos proyectos de Firebase |

**Decisiones que Belén debe tomar al crear el proyecto de Firebase:**

- La **ubicación de Firestore no se puede cambiar después**. Elegir `southamerica-east1` (São Paulo).
- Activar Authentication con Google y agregar el dominio de Hosting como dominio autorizado.
- Plan Spark (gratuito) alcanza para el MVP; vigilar cuotas.

**Notas de implementación:**

- Probar el login en iOS y Android instalados como PWA. El inicio de sesión por redirección puede fallar en algunos navegadores; preferir ventana emergente y documentar el comportamiento observado.
- Con la caché de Firestore, las consultas offline solo devuelven lo que ya se leyó. Por eso, al iniciar sesión con conexión, mantener un `onSnapshot` sobre las familias y barrios de los CAPS asignados para que queden en el celular.
- Guardar siempre fechas como UTC (`Timestamp`) más la zona del dispositivo. Argentina y Colombia tienen husos distintos.
- Incluir un **respaldo manual**: exportar e importar un archivo `.json` con las familias del dispositivo (con cifrado opcional por clave) para emergencias sin sincronización. Prioridad P1.

## 5. Modelo de datos (Firestore)

Todos los documentos llevan `createdAt`, `createdBy` (uid), `deviceId`, `schemaVersion`. Los borrados son lógicos (`eliminado: true`). Los registros de valoración son **append-only**.

```
organizaciones/{orgId}      nombre, tipo(catedra|caps|municipio|red), pais,
                            config{modoDocente, etiquetas, versionesEscalas, retencionDias, idioma}
usuarios/{uid}              email, nombre, rol, orgId, capsIds[], comision(opcional), activo
invitaciones/{emailMin}     rol, orgId, capsIds[], comision(opcional)
caps/{capsId}               orgId, nombre, municipio, pais, emailInstitucional(Ola 2)
barrios/{barrioId}          orgId, nombre, cardinal, capsId, etiqueta ("Barrio Alberdi (Sur)"), claveUnica
  valoracionesComunidad/{id}  patrones{p1..p11:{subjetivos,objetivos,observaciones,alterado:boolean}},
                              foda{fortalezas[],debilidades[],oportunidades[],amenazas[]},
                              estado(borrador|final), version, fecha, autorId
familias/{famId}            orgId, codigoFamiliar, barrioId, capsId, apellido, apellidoNorm, domicilio,
                            domicilioNorm, ordenEnDomicilio, referenteParentesco,
                            consentimiento{otorgado,fecha,modalidad}, estado, vivienda{}, cartografia{}
  integrantes/{id}          parentesco, sexo, fechaNac|edad, vivo, convive, escolaridad,
                            obraSocial, condiciones[], madreId, padreId, parejaDeIds[], tipoVinculo
  valoraciones/{id}         tipo(patrones|apgar|mos|holmes), payload, puntaje, interpretacion,
                            versionEscala, version, fecha, autorId
  diagnosticos/{id}         patron, nandaCodigo, etiqueta, caracteristicasObservadas[], enunciadoPES,
                            estado(propuesto|confirmado|descartado), validadoPor, fecha
  plan/{id}                 diagnosticoId, resultadoEsperado, intervencion, fijada:boolean,
                            fechaObjetivo, responsable
  evoluciones/{id}          S, O, E, P, fecha, autorId
catalogos/{nombre}          version, fuente, items[]   (base global + ajustes por organización)
metricas/{id}               evento, modulo, duracionSeg, offline:boolean, rol   (sin datos personales)
```

**Reglas de modelado:**

- `claveUnica` del barrio = `nombreNorm + cardinal` (ej. `alberdi-sur`). Cardinal ∈ N, NE, E, SE, S, SO, O, NO.
- `codigoFamiliar` legible y corto: `{CAPS}-{AA}-{secuencia}` generado con un prefijo por dispositivo para evitar choques offline.
- Varias familias en un domicilio: mismo `domicilioNorm`, distinto `ordenEnDomicilio` y distinto referente.
- No se guarda DNI ni nombre de pila. Identificación = apellido, parentesco, edad.
- Las ediciones crean nueva versión; la vista "actual" es la de mayor `version`.

## 6. Reglas de negocio

### 6.1 Búsqueda de familia (identidad)

Al ingresar apellido, domicilio y barrio:

1. Normalizar: minúsculas, sin tildes ni puntuación, abreviaturas unificadas (Av./Avenida, Bv./Bulevar, Pje./Pasaje), números separados.
2. Buscar en la caché local por `domicilioNorm` exacto o con distancia de edición ≤ 2 y apellido similar.
3. Si hay coincidencias, mostrar tarjetas "¿Es esta familia?" con fecha de la última valoración y estado. El usuario confirma; la app **nunca** fusiona sola.
4. Si hay otra familia en el mismo domicilio con otro referente: ofrecer "Crear Familia 2 en este domicilio".
5. Si no hay coincidencias: crear familia y mostrar la **campanita** con los pasos pendientes.
6. Aviso offline: "Sin conexión no puedo ver lo que cargaron otras comisiones. Revisaremos duplicados al sincronizar". En la central, el docente tiene la herramienta **Fusionar familias** (P1).

### 6.2 Lista de pendientes (campanita)

Por familia, estos pasos con estado `pendiente | en curso | completo`: consentimiento, integrantes, genograma, vivienda y cartografía, patrones, APGAR, Holmes y Rahe, MOS, notas. El ícono de campana muestra la cantidad de familias con pasos pendientes y por barrio también aparece "Valoración comunitaria pendiente".

### 6.3 Instrumentos (según el libro) ⚠ validar con la cátedra

- **APGAR familiar:** ítems, puntajes y cortes en el Anexo A.1.
- **Escala de reajuste social (Holmes y Rahe):** 43 eventos con sus unidades de cambio vital (UCV) en el Anexo A.2; riesgo desde 150 UCV.
- **MOS de apoyo social:** ítems, subescalas y valores de referencia en el Anexo A.3.
- Los textos de los ítems son configurables en los catálogos y cada valoración guarda la versión de escala usada. ⚠ Contrastar con el libro de la cátedra antes del piloto.

**Sugerencia del siguiente instrumento** (reglas editables en el catálogo `reglasInstrumentos`):

| Si… | Entonces sugerir |
|---|---|
| APGAR leve o grave | MOS y Holmes y Rahe |
| APGAR funcional y Holmes y Rahe ≥ 150 | MOS |
| Holmes y Rahe ≥ 150 y MOS bajo | Marcar alerta de riesgo psicosocial en la central |

La app **sugiere**, no obliga. Las alertas se derivan solo de estos instrumentos y de las señales que el estudiante marca a mano ("requiere atención prioritaria"). No hay puntaje general ni semáforo numérico.

### 6.4 Genograma

- Datos desde la tabla de integrantes (`madreId`, `padreId`, `parejaDeIds`, `tipoVinculo`).
- Simbología según el capítulo 11 del libro (cuadrado varón, círculo mujer, línea de unión, descendencia, fallecido, convivencia).
- **P0:** tabla de integrantes más adjuntar foto del genograma hecho a mano (guardada como imagen comprimida).
- **P1:** dibujo automático de 2 a 3 generaciones en SVG, exportable al PDF.

### 6.5 Valoración comunitaria y FODA

- Cuestionario con los 11 patrones; por cada uno, preguntas de datos subjetivos y objetivos y un campo de observaciones con la fuente del dato (Anexo D).
- Quien valora marca cada patrón como **conservado** o **alterado**, con una frase de justificación.
- **Asistente de FODA:** Fortalezas y Debilidades salen de los patrones (reglas en el Anexo B.2). Oportunidades y Amenazas salen del banco de preguntas socioeconómicas y emocionales (Anexo B.3 a B.6). Todo se edita a mano.

### 6.6 Diagnósticos y plan (central)

1. Por cada patrón alterado de una familia, la central muestra los **diagnósticos posibles** del catálogo `nandaPorPatron` (rótulo y código; ver Anexo E).
2. El valorador o el supervisor tilda las **características observadas** y redacta el enunciado en formato PES. Estado `propuesto`.
3. El supervisor lo `confirma` o `descarta`.
4. Para cada diagnóstico confirmado, el plan ofrece resultados e intervenciones del catálogo `planSugerido`. Al tildar una sugerencia queda **fijada** con fecha y responsable.
5. Cada evolución se registra en SOEP.

- ⚠ Cargar solo rótulo y código de NANDA-I. No copiar definiciones ni características definitorias. Los catálogos de resultados e intervenciones los define la cátedra (semilla inicial: ~30 diagnósticos con 2 a 3 intervenciones cada uno).

## 7. Experiencia de usuario

### 7.1 Navegación

Barra inferior en el celular, 5 destinos: **Inicio · Familias · Pendientes · Sincronizar · Perfil**. En la central (PC): barra lateral con **Panel · Barrios · Familias · Diagnósticos y plan · Usuarios · Catálogos**.

### 7.2 Pantallas del campo (P0)

```
INICIO
+-----------------------------+
| Hola, Belén        [campana]|
| Barrio Alberdi (Sur)  CAPS 5|
|                             |
| [ Valorar la comunidad  ]   |
| [ Valorar una familia   ]   |
|                             |
| Pendientes (3)              |
|  Pérez · Calle X 123        |
|  APGAR y MOS sin hacer      |
| Sin enviar: 4 registros     |
+-----------------------------+

FICHA FAMILIAR
+-----------------------------+
| Familia Pérez (2 de 2)      |
|     [ anillo de 11 patrones]|
| Consentimiento      completo|
| Integrantes (5)     completo|
| Genograma           en curso|
| Vivienda y mapa     pendiente|
| Patrones            3 de 11 |
| APGAR / Holmes / MOS pendiente|
| [ Generar PDF ]             |
+-----------------------------+
```

1. **Ingreso y consentimiento:** login con Google, aviso breve de privacidad, aceptación.
2. **Elegir barrio:** lista de barrios del CAPS con etiqueta `Barrio (Cardinal)`; botón para crear barrio nuevo (nombre + cardinal con selector visual de brújula).
3. **Valoración comunitaria:** stepper de 11 pasos (uno por patrón) y paso final de FODA. Autoguardado en cada respuesta. Se puede salir y volver.
4. **Buscar o crear familia:** tres campos y resultados "¿Es esta familia?" (6.1).
5. **Consentimiento informado de la familia:** texto corto, casilla y fecha. Sin esto no se avanza.
6. **Integrantes:** tarjetas con alta rápida (parentesco, sexo, edad, condiciones). Vínculos con selectores "hijo/a de" y "pareja de".
7. **Genograma, vivienda y cartografía** (campos del Anexo I adaptados: sin datos de feria; ubicación rural, urbana o periurbana; referencias y croquis o foto).
8. **Patrones familiares:** guía del Anexo II, una pantalla por patrón con las preguntas de la cátedra y marca conservado o alterado.
9. **Instrumentos:** un ítem por pantalla, resultado e interpretación al final, y tarjeta "Siguiente instrumento sugerido".
10. **PDF:** vista previa y botón de compartir o guardar.
11. **Sincronizar:** estado de cada registro y botón "Enviar ahora".

### 7.3 Pantallas de la central (P0 y P1)

- **Panel:** familias por CAPS y barrio, valoraciones pendientes, alertas de instrumentos, última actividad por comisión.
- **Barrio:** valoración comunitaria con FODA, lista de familias.
- **Familia:** línea de tiempo fechada (valoraciones, diagnósticos, plan, evoluciones), genograma, instrumentos y PDF.
- **Diagnósticos y plan:** flujo 6.6 en dos columnas (datos de la familia / candidatos).
- **Usuarios y catálogos** (admin).

### 7.4 Estados que hay que diseñar siempre

Vacío, cargando, sin conexión, error con acción de reintento, guardado, pendiente de envío, enviado, conflicto o duplicado, sesión vencida, versión nueva disponible, almacenamiento casi lleno.

### 7.5 Indicadores de sincronización

Icono chico en cada tarjeta: nube con tilde (enviado), nube con reloj (pendiente), nube con alerta (revisar). En la parte superior, una franja fina "Sin conexión · tus datos se guardan en este celular" con el contador de pendientes.

### 7.6 Microcopy (voseo, claro, sin tecnicismos)

- Botones con verbo: "Guardar familia", "Enviar ahora", "Generar PDF".
- Errores sin disculpas vagas: "No pudimos enviar 3 registros. Se reintenta solo cuando haya conexión".
- Vacío como invitación: "Todavía no valoraste esta comunidad. Empezá por el primer patrón".
- Nada de jerga informática en pantallas del estudiante.

### 7.7 Accesibilidad y uso en campo

- Contraste mínimo AA (4,5:1), objetivo AAA en textos de formularios.
- Objetivos táctiles de al menos 48 px; texto base de 16 px o más; admitir texto ampliado del sistema.
- Uso con una mano: acciones principales en la mitad inferior.
- El estado nunca se comunica solo con color: siempre ícono y texto.
- Modo claro y oscuro; modo claro con alto contraste para exteriores.
- Respetar `prefers-reduced-motion`.

## 8. Sistema visual

**Concepto:** *cuidado en red*. La app acompaña el recorrido valorar → diagnosticar → cuidar, y los puntos cardinales identifican cada barrio. Tono sobrio, profesional y cercano; nada de estética de hospital genérica ni de panel de empresa.

**Elemento memorable (usarlo con disciplina, solo acá):** el **anillo de patrones**, un círculo de 11 nodos conectados, uno por patrón funcional de Gordon, que se van encendiendo a medida que se valora y forman la red. Aparece en la ficha de familia, en la tarjeta de barrio, en el PDF y como animación única al terminar una valoración. El resto de la interfaz es calmo y simple.

### 8.1 Paleta (tokens)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--tinta` | `#0B1F33` | `#E8EEF5` | Texto principal |
| `--azul` | `#17375E` | `#8DB4E2` | Color primario, botones, encabezados |
| `--azul-medio` | `#3E6A9A` | `#6C9AD0` | Enlaces, íconos activos |
| `--lago` | `#1AA6A0` | `#3CCFC8` | Acento: progreso, pendiente (campanita), anillo |
| `--papel` | `#F5F7FA` | `#0C1622` | Fondo de pantalla |
| `--tarjeta` | `#FFFFFF` | `#14212F` | Superficies |
| `--linea` | `#D9E0E8` | `#273647` | Bordes y divisores |
| `--apagado` | `#5B6B7C` | `#9AA9BA` | Texto secundario |
| `--ok` | `#2F9E6B` | `#4CC38A` | Completo, conservado, enviado |
| `--atencion` | `#C98A00` | `#E7B13A` | Alerta moderada |
| `--critico` | `#C8392F` | `#F07A70` | Alerta alta, error |

Notas: el acento `--lago` se usa para progreso y pendientes; **los tres colores de estado se reservan para estados clínicos y de sistema**, siempre con ícono y texto. Evitar fondos crema y terracota, y evitar degradados decorativos.

### 8.2 Tipografía

Incluir las fuentes **dentro del bundle** (sin CDN, para que funcionen offline).

- Títulos y nombres de barrio: **Fraunces** (variable, licencia OFL), pesos 600 y 700.
- Interfaz y formularios: **Atkinson Hyperlegible Next** (OFL), diseñada para máxima legibilidad.
- Escala: 13 / 16 / 18 / 22 / 28 / 36. Interlineado 1,45 en cuerpo. Líneas de menos de 70 caracteres en la central.
- Etiquetas en minúsculas con mayúscula inicial. No usar mayúsculas sostenidas.

### 8.3 Forma y espacio

- Grilla de 4 px. Espaciado: 4 / 8 / 12 / 16 / 24 / 32.
- Radios: tarjetas 14 px, campos 10 px, botones 12 px, chips 999 px.
- Elevación mínima; separar con bordes de `--linea`, no con sombras.
- Íconos de trazo uniforme de 1,75 px (Lucide). Un ícono de brújula propio para el cardinal del barrio.

### 8.4 Componentes clave

Botón primario (azul), secundario (borde), peligro (borde crítico); campo con etiqueta fija arriba y ayuda debajo; selector de respuesta en botones grandes (para 0/1/2 y Sí/No); tarjeta de familia; chip de barrio con cardinal; anillo de patrones; franja de conexión; hoja inferior para acciones; tabla densa para la central.

### 8.5 Movimiento

Solo para mostrar cambios de estado: guardado, transición entre pasos, completado del anillo. Duración de 150 a 250 ms. Sin animaciones de entrada decorativas.

## 9. PDF estructurado

- Tamaño A4. Se genera sin conexión. Si hay datos sin sincronizar, marcar el pie con "Contiene datos sin enviar".
- **PDF de familia:** encabezado (CAPS, barrio con cardinal, código familiar, fecha, autor), identificación y consentimiento, integrantes, genograma, vivienda y cartografía, valoración por patrones con el anillo, instrumentos con puntaje e interpretación, diagnósticos y plan si ya existen, evoluciones SOEP, línea de firma y matrícula.
- **PDF de comunidad:** datos del barrio, los 11 patrones con datos subjetivos y objetivos, FODA en cuadrante de 2×2.
- Pie con página x de y, código del documento y "Elaboración propia" en los esquemas. Espacios reservados para logos institucionales (**no incluir escudos sin autorización**).
- Tipografía de la app, tinta oscura sobre blanco, color solo en el anillo y en las alertas. Debe imprimirse bien en blanco y negro.

## 10. Seguridad y privacidad

**Marco:** Ley 25.326 de Protección de Datos Personales y Ley 26.529 de derechos del paciente (Argentina); Ley 1581 de 2012 (Colombia, para Ola 2). Esto es un diseño técnico, no asesoramiento legal.

- **Minimización:** apellido, parentesco, edad y domicilio; sin DNI ni nombres de pila.
- **Capas:** los datos identificatorios (`apellido`, `domicilio`) están en el documento de familia y solo los ven el autor, los docentes del CAPS y el admin. Las vistas compartidas con UniSinú usan una colección anonimizada (`casosAnonimos`, Ola 2) sin apellido, domicilio ni barrio exacto.
- **Reglas de Firestore (esquema para implementar y probar con emulador):**

```
function activo(){ return request.auth != null &&
  exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) &&
  get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.activo == true; }
function rol(){ return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol; }
function docente(){ return activo() && rol() in ['docente','admin']; }
function enMisCaps(capsId){ return capsId in get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.capsIds; }
match /familias/{id} {
  allow read: if activo() && (enMisCaps(resource.data.capsId) || docente());
  allow create: if activo() && request.resource.data.createdBy == request.auth.uid;
  allow update: if activo() && (resource.data.createdBy == request.auth.uid || docente());
  allow delete: if false;
}
```

(Nota para el desarrollo: el esquema usa `docente`; los roles definidos en la sección 3 son `supervisor` y `admin`. Alinear los nombres al implementar y filtrar también por `orgId`.)

- **Dispositivo:** pedir bloqueo de pantalla; cierre de sesión automático tras N días sin uso (parámetro); opción "Borrar datos locales" luego de sincronizar; advertencia si no hay bloqueo de pantalla.
- **Consentimiento:** texto breve, claro y registrado con fecha. Redactarlo con la cátedra o con la autoridad del servicio.
- **Auditoría:** registrar quién vio o exportó una familia en la central.
- **Rotulado:** el título depende del tipo de organización: "registro de seguimiento familiar docente" en una cátedra y "registro de seguimiento familiar" en un CAPS. En ambos casos no reemplaza la historia clínica oficial ni afirma validez legal de una HCE. Su uso con personas reales en un servicio requiere aprobación de la autoridad sanitaria y revisión legal (sección 17).
- **Retención y baja:** definir con la organización; prever botón de baja a pedido de la familia.

## 11. Internacionalización (Argentina y Colombia)

- Textos en archivos `es-AR` y `es-CO`; ningún texto fijo en componentes.
- Términos configurables por país: barrio / comuna o localidad, CAPS / IPS o puesto de salud, DNI / documento.
- Los cortes de escalas son parámetros del catálogo. Registrar la **versión de cada escala** en cada valoración, para poder comparar entre países.
- Ola 2: mapa por país y límites territoriales propios de cada ciudad.

## 12. Backlog por prioridad

**P0 (Ola 1, para el 26/10)**

1. Login con Google, invitaciones y roles.
2. Barrios con cardinal y asignación a CAPS.
3. Valoración comunitaria con autoguardado y FODA asistido.
4. Búsqueda e identidad de familia, campanita de pendientes.
5. Consentimiento, integrantes, vivienda y cartografía descriptiva, foto del genograma.
6. Patrones familiares (Anexo II) con marca conservado o alterado.
7. APGAR, Holmes y Rahe, MOS con interpretación y sugerencia de siguiente instrumento.
8. PDF de familia y de comunidad.
9. Sincronización con estados visibles; central con panel, barrio y familia.
10. Diagnósticos candidatos y plan con sugerencias fijables; evolución SOEP.

**P1** Dibujo automático de genograma, respaldo `.json` cifrado, fusión de duplicados, filtros y exportación a CSV, métricas de uso, modo alto contraste.

**P2 (Ola 2)** Mapa y cartografía real, envío a otro CAPS por mail, acceso anonimizado para UniSinú, versión `es-CO` completa, panel comparativo binacional.

**Criterios de aceptación transversales (cada historia):** funciona sin conexión; se puede cerrar y reabrir la app sin perder datos; muestra los 4 estados (vacío, cargando, error, ok); respeta los tokens de la sección 8; textos desde archivos de idioma.

## 13. Pruebas y piloto

**Pruebas técnicas:** modo avión de principio a fin; sincronización tras reconexión; dos dispositivos editando la misma familia; búsqueda de duplicados con apellidos compuestos y tildes; instalación en Android e iOS; app cerrada a mitad de formulario; reglas de seguridad con el emulador (un estudiante no ve CAPS ajenos).

**Piloto con estudiantes (aporta al trabajo final):** medir tiempo por módulo, errores de cálculo de escalas frente a la ficha en papel, porcentaje de registros hechos sin conexión, y aplicar la **Escala de Usabilidad de Sistemas (SUS)**. Guardar solo métricas sin datos personales en `metricas`.

## 14. Despliegue

- Proyectos `dev` y `prod`; variables de entorno fuera del repositorio.
- Hosting con cabeceras de caché adecuadas para el service worker.
- Script de **carga de catálogos** (semilla) versionado en el repositorio, con la fuente (libro y página) de cada ítem.
- Documentar en el README: crear proyecto de Firebase, cargar invitaciones, publicar reglas, desplegar.

## 15. Pendientes de validación (⚠) y riesgos

| Tema | Quién | Cuándo |
|---|---|---|
| Contraste de los parámetros de los Anexos A y B con el libro de la cátedra (APGAR p. 173, MOS pp. 169–171, Holmes y Rahe pp. 167–168) | Belén | Antes de cargar catálogos |
| Verificar el Anexo E contra el libro, decidir la edición NANDA-I del catálogo y completar diagnósticos de comunidad y NOC/NIC | Belén | Antes del 26/10 |
| Reglas de sugerencia de instrumentos y criterios de priorización del FODA | Docentes | Antes del piloto |
| Texto del consentimiento y política de retención | Cátedra | Antes del piloto |
| Catálogo de resultados e intervenciones | Cátedra | Semilla mínima para el 26/10 |
| Requisitos para uso asistencial en CAPS (sección 17) | Belén con la autoridad sanitaria | Antes de usarla con personas reales fuera de la práctica |
| Nombre definitivo, logos y autorización de escudos | Belén | Antes del trabajo final |

**Riesgos principales:** tiempo hasta el 26/10 (mitigación: P0 estricto y respaldo `.json`); login con Google en PWA instalada (probar temprano); duplicados offline (mitigación: aviso y fusión en la central); datos sensibles en celulares personales (mitigación: capas, bloqueo y borrado local); derechos de autor de las tablas (mitigación: permiso y citación).

## 16. Entregables esperados de Antigravity

1. Repositorio con README de instalación y despliegue.
2. PWA desplegada en Firebase Hosting (entorno `dev` primero).
3. Reglas de seguridad con pruebas en el emulador.
4. Catálogos semilla y script de carga.
5. Archivo `PENDIENTES.md` con todos los `TODO(belen)`.
6. Guía breve de uso para estudiantes (una página).

## 17. Apertura a CAPS y otros equipos (multi-organización)

La app nace en una cátedra, pero el diseño sirve a cualquier equipo de atención primaria: la cátedra es un tipo de organización más.

### 17.1 Modelo

- Toda entidad lleva `orgId` y las reglas de seguridad filtran por organización. Tipos: `catedra`, `caps`, `municipio`, `red`.
- Cada organización tiene su `config`: etiquetas (barrio o comuna, CAPS o IPS), idioma, versiones de escalas, retención de datos y modo docente.
- Los textos de pantalla son neutros ("valorar", "valorador"), sin referencias fijas a estudiantes.

### 17.2 Dos modos de uso

| | Modo docente | Modo asistencial |
|---|---|---|
| Quién | Estudiantes, tutoras y docentes | Profesionales y coordinación del CAPS |
| Funciones propias | Comisiones, tutoría, validación docente, SUS y métricas | Seguimiento longitudinal por familia, agenda de visitas domiciliarias, derivaciones e interconsultas, indicadores del CAPS (Ola 3) |
| Título del registro | Registro de seguimiento familiar docente | Registro de seguimiento familiar |
| Quién confirma el diagnóstico | El docente | El profesional responsable |

### 17.3 Gobierno de catálogos

- Catálogo base global y versionado, más ajustes de cada organización (`overrides`) con control de cambios: quién, cuándo y por qué.
- Un cambio entra en vigencia solo con aprobación del admin de la organización.
- Cada valoración guarda la versión del catálogo con que se hizo.

### 17.4 Requisitos antes de usarla con personas reales en un servicio

- [ ] Aprobación de la autoridad sanitaria (municipio, provincia o dirección del CAPS).
- [ ] Revisión legal: Ley 25.326, Ley 26.529 y normativa vigente de historia clínica digital; acuerdo de tratamiento de datos con el proveedor de nube.
- [ ] Evaluación de impacto de privacidad y decisión de dónde se alojan los datos.
- [ ] Revisión clínica de catálogos, reglas y sugerencias por un comité responsable.
- [ ] Plan de respaldo, soporte y continuidad si la app deja de funcionar.
- [ ] Capacitación del equipo y protocolo de consentimiento.
- [ ] Evaluación de integración o exportación con el sistema de historia clínica del servicio (CSV o estándar de interoperabilidad).

### 17.5 Traslado entre organizaciones (Ola 3)

Por mudanza de una familia: solicitud, consentimiento, aceptación de la organización receptora y copia trazable. La historia original queda con su registro. Reemplaza el envío por mail.

## Anexo A. Instrumentos de valoración familiar: parámetros

Los tres instrumentos son los de la bibliografía base de la cátedra (Smilkstein, 1978; Holmes y Rahe, 1967; Sherbourne y Stewart, 1991). Enunciados y valores están escritos acá para implementar sin consultar el libro. ⚠ Contrastar con las páginas citadas: si difieren, **prevalece el libro** y se corrige el catálogo.

### A.1 APGAR familiar (`instrumentos.apgar`)

Responde un miembro de la familia elegido por quien valora, y se registra su parentesco. Cada ítem vale: casi nunca = 0, a veces = 1, casi siempre = 2. Total de 0 a 10.

| N.º | Dimensión | Enunciado |
|---|---|---|
| 1 | Adaptación | Estoy satisfecho/a con la ayuda que recibo de mi familia cuando algo me preocupa |
| 2 | Participación | Estoy satisfecho/a con la forma en que mi familia conversa y comparte los problemas conmigo |
| 3 | Crecimiento | Mi familia acepta y apoya mis deseos de emprender nuevas actividades o cambios |
| 4 | Afecto | Estoy satisfecho/a con cómo mi familia expresa afecto y responde a mis emociones (rabia, tristeza, amor) |
| 5 | Resolución | Estoy satisfecho/a con el tiempo que compartimos en familia (tiempo juntos, espacios, dinero) |

| Total | Lectura (cátedra, p. 173) | Qué hace la app |
|---|---|---|
| 7 a 10 | Familia funcional | Sin alerta |
| 3 a 6 | Disfunción leve | Sugiere MOS y Holmes y Rahe |
| 0 a 2 | Disfunción grave | Alerta, sugiere MOS y Holmes y Rahe, y permite marcar "requiere atención prioritaria" |

Existen versiones del APGAR con escala 0 a 4 y otros cortes. El catálogo guarda `escala` y `cortes` para poder comparar con UniSinú.

### A.2 Escala de reajuste social de Holmes y Rahe (`instrumentos.holmes`)

Un miembro tilda los eventos que le ocurrieron a la familia en el último año. La app suma las unidades de cambio vital (UCV).

| N.º | Evento | UCV |
|---|---|---|
| 1 | Muerte del cónyuge | 100 |
| 2 | Divorcio | 73 |
| 3 | Separación matrimonial | 65 |
| 4 | Encarcelación | 63 |
| 5 | Muerte de un familiar cercano | 63 |
| 6 | Lesión o enfermedad personal | 53 |
| 7 | Matrimonio | 50 |
| 8 | Despido del trabajo | 47 |
| 9 | Reconciliación matrimonial | 45 |
| 10 | Jubilación | 45 |
| 11 | Cambio en la salud de un familiar | 44 |
| 12 | Embarazo | 40 |
| 13 | Dificultades sexuales | 39 |
| 14 | Llegada de un nuevo miembro a la familia | 39 |
| 15 | Reajuste en el negocio o el trabajo | 39 |
| 16 | Cambio en la situación económica | 38 |
| 17 | Muerte de un amigo íntimo | 37 |
| 18 | Cambio a un tipo de trabajo diferente | 36 |
| 19 | Cambio en el número de discusiones con el cónyuge | 35 |
| 20 | Hipoteca o préstamo importante | 31 |
| 21 | Ejecución de hipoteca o préstamo | 30 |
| 22 | Cambio de responsabilidades en el trabajo | 29 |
| 23 | Hijo o hija que deja el hogar | 29 |
| 24 | Problemas con la familia política | 29 |
| 25 | Logro personal destacado | 28 |
| 26 | El cónyuge comienza o deja de trabajar | 26 |
| 27 | Comienzo o fin de la escolaridad | 26 |
| 28 | Cambio en las condiciones de vida | 25 |
| 29 | Revisión de hábitos personales | 24 |
| 30 | Problemas con el jefe | 23 |
| 31 | Cambio de horario o condiciones de trabajo | 20 |
| 32 | Cambio de residencia | 20 |
| 33 | Cambio de colegio | 20 |
| 34 | Cambio en las actividades recreativas | 19 |
| 35 | Cambio en las actividades religiosas | 19 |
| 36 | Cambio en las actividades sociales | 18 |
| 37 | Hipoteca o préstamo menor | 17 |
| 38 | Cambio en los hábitos de sueño | 16 |
| 39 | Cambio en el número de reuniones familiares | 15 |
| 40 | Cambio en los hábitos alimentarios | 15 |
| 41 | Vacaciones | 13 |
| 42 | Fiestas de fin de año | 12 |
| 43 | Infracciones menores de la ley | 11 |

| Suma de UCV | Lectura | Qué hace la app |
|---|---|---|
| Menos de 150 | Sin riesgo significativo | Sin alerta |
| 150 a 299 | Puede afectar la salud o la dinámica familiar (umbral de la cátedra) | Sugiere MOS |
| 300 o más | Riesgo alto (corte de la escala original; ⚠ la cátedra no lo define) | Alerta y sugiere MOS |

Hay un campo libre "Otros eventos importantes", sin puntaje. ⚠ El libro adapta la lista al contexto local: contrastar eventos y valores con las pp. 167 y 168.

### A.3 Cuestionario MOS de apoyo social (`instrumentos.mos`)

La pregunta 1 registra el número de amigos íntimos y familiares cercanos (dato descriptivo, sin puntaje). Las preguntas 2 a 20 se introducen con "¿Con qué frecuencia dispone de cada uno de estos apoyos cuando lo necesita?" y se responden de 1 a 5: nunca = 1, pocas veces = 2, algunas veces = 3, la mayoría de las veces = 4, siempre = 5.

| N.º | Alguien que… | Subescala |
|---|---|---|
| 2 | le ayude cuando tenga que estar en la cama | Ayuda material |
| 3 | lo escuche cuando necesita hablar | Emocional/informacional |
| 4 | le aconseje cuando tenga problemas | Emocional/informacional |
| 5 | lo lleve al médico cuando lo necesita | Ayuda material |
| 6 | le muestre amor y afecto | Apoyo afectivo |
| 7 | le haga pasar un buen rato | Relaciones sociales de ocio |
| 8 | le informe y le ayude a entender una situación | Emocional/informacional |
| 9 | sea alguien en quien confiar o con quien hablar de sí mismo y de sus preocupaciones | Emocional/informacional |
| 10 | le abrace | Apoyo afectivo |
| 11 | le permita relajarse | Relaciones sociales de ocio |
| 12 | le prepare la comida si no puede hacerlo | Ayuda material |
| 13 | cuyo consejo realmente desee | Emocional/informacional |
| 14 | haga cosas con usted para olvidar sus problemas | Relaciones sociales de ocio |
| 15 | le ayude en sus tareas domésticas si está enfermo | Ayuda material |
| 16 | comparta sus temores y problemas más íntimos | Emocional/informacional |
| 17 | le aconseje cómo resolver sus problemas personales | Emocional/informacional |
| 18 | se divierta con usted | Relaciones sociales de ocio |
| 19 | comprenda sus problemas | Emocional/informacional |
| 20 | ame y le haga sentirse querido | Apoyo afectivo |

| Subescala | Ítems | Mínimo | Medio | Máximo |
|---|---|---|---|---|
| Emocional/informacional | 3, 4, 8, 9, 13, 16, 17, 19 | 8 | 24 | 40 |
| Ayuda material | 2, 5, 12, 15 | 4 | 12 | 20 |
| Relaciones sociales de ocio | 7, 11, 14, 18 | 4 | 12 | 20 |
| Apoyo afectivo | 6, 10, 20 | 3 | 9 | 15 |
| Índice global | los 19 ítems | 19 | 57 | 95 |

Lectura: un valor por debajo del medio indica apoyo percibido bajo en esa dimensión; igual o por encima, adecuado. ⚠ Confirmar con el cuadro de interpretación del libro (p. 171).

### A.4 Cuándo un instrumento es insuficiente

| Situación | Qué hace la app |
|---|---|
| APGAR con disfunción leve o grave | Sugiere MOS y Holmes y Rahe |
| APGAR funcional y Holmes y Rahe de 150 o más | Sugiere MOS |
| Holmes y Rahe de 150 o más y MOS global menor a 57 | Alerta de riesgo psicosocial en la central |
| APGAR funcional pero patrón 8 (rol y relaciones) marcado como alterado | El resultado no coincide con lo observado: sugiere MOS y repetir el APGAR con otro miembro |
| Hogar de una sola persona | El APGAR no aplica: ofrece MOS y Holmes y Rahe |
| Respondió un solo miembro y se sospecha violencia | Sugiere entrevistar por separado, cuidando la seguridad de la persona, y seguir el protocolo de la organización |

## Anexo B. Reglas del FODA y banco de preguntas de Oportunidades y Amenazas

El FODA comunitario separa lo que la comunidad puede cambiar (Fortalezas y Debilidades) de lo que viene del entorno (Oportunidades y Amenazas). La app propone y el equipo decide. ⚠ Los criterios de prioridad son una propuesta de diseño: validar con la cátedra.

### B.1 Regla para clasificar

Pregunta de control: **¿la comunidad, junto con su CAPS, puede modificarlo por sí misma?** Si sí, es Fortaleza o Debilidad. Si no, es Oportunidad o Amenaza.

- Un comedor sostenido por vecinos es una Fortaleza; un programa provincial de asistencia alimentaria es una Oportunidad.
- La falta de organización vecinal es una Debilidad; el aumento de precios de los alimentos es una Amenaza.
- Si la respuesta describe algo que la comunidad sostiene por sí misma, pasa a Fortaleza o Debilidad.

### B.2 Fortalezas y Debilidades desde los patrones

| Marca del patrón | Resultado | Texto sugerido |
|---|---|---|
| Alterado | Debilidad | Patrón N (nombre): frase de justificación |
| Conservado, con evidencia | Fortaleza | Patrón N (nombre): frase de evidencia |
| Conservado, sin evidencia | No genera ítem | La app pide una evidencia antes de cerrar |

### B.3 Banco de preguntas

Tipo **R** = recurso del entorno (algo que ayuda). Tipo **K** = riesgo del entorno (algo que perjudica). Las preguntas se hacen sobre el barrio, en tercera persona.

Opciones de respuesta:

- Tipo R: **A** existe y es accesible · **B** existe pero con barreras o es insuficiente · **C** no existe o no se conoce.
- Tipo K: **A** afecta a muchas familias · **B** afecta a algunas · **C** no se observa.

Por cada respuesta se registran la **fuente** (observación, referente comunitario, familias del barrio, dato oficial) y una **evidencia** de una frase. Hay una marca opcional: "afecta sobre todo a niñez, personas mayores o embarazadas".

**Dimensión socioeconómica**

| ID | Pregunta | Tipo | Patrón |
|---|---|---|---|
| SE1 | ¿Hay empleo o changas cerca del barrio, formales o informales, para jóvenes y adultos? | R | 8 |
| SE2 | ¿Cuántos hogares dependen de ingresos inestables o de ayudas para cubrir lo básico? | K | 8 |
| SE3 | ¿Existen programas de asistencia alimentaria o de ingresos (nacionales, provinciales o municipales) a los que las familias puedan acceder? | R | 2 |
| SE4 | ¿Funcionan comedores, merenderos u ollas populares? ¿Con qué regularidad? | R | 2 |
| SE5 | ¿Los precios de alimentos, transporte o servicios dificultan que las familias cubran lo esencial? | K | 2, 4 |
| SE6 | ¿El transporte público conecta el barrio con el CAPS, las escuelas y el trabajo en tiempos razonables? | R | 4 |
| SE7 | ¿Hay problemas de acceso a vivienda segura (ocupaciones, alquileres informales, hacinamiento, riesgo de desalojo)? | K | 4 |
| SE8 | ¿Hay escuelas, centros de formación o cursos de oficios accesibles? | R | 6 |
| SE9 | ¿Hay cortes o faltantes de servicios básicos (agua, luz, gas, recolección de residuos)? | K | 2, 3 |
| SE10 | ¿Hay cooperativas, ferias o emprendimientos del barrio con apoyo externo? | R | 8 |
| SE11 | ¿Hay riesgos ambientales o productivos cerca del barrio (basurales, industrias, inundaciones, fumigaciones, rutas)? | K | 1, 3 |
| SE12 | ¿El CAPS, el municipio u otras instituciones llegan al barrio con operativos, campañas o actividades? | R | 1 |

**Dimensión emocional**

| ID | Pregunta | Tipo | Patrón |
|---|---|---|---|
| EM1 | ¿Hay espacios comunitarios (vecinal, club, iglesia, centro cultural) donde las personas se reúnen y se sienten acompañadas? | R | 8, 11 |
| EM2 | ¿Hay situaciones de violencia familiar, de género o en la calle que generen miedo o inseguridad? | K | 8 |
| EM3 | ¿Hay servicios o grupos de apoyo emocional o de salud mental accesibles (psicología, líneas de ayuda, grupos de pares)? | R | 10 |
| EM4 | ¿Se observa consumo problemático de alcohol u otras sustancias, sobre todo en adolescentes? | K | 10 |
| EM5 | ¿Las personas se sienten estigmatizadas o discriminadas por vivir en el barrio? | K | 7 |
| EM6 | ¿Hay referentes o líderes comunitarios reconocidos a los que la gente acude? | R | 8, 11 |
| EM7 | ¿Hay personas mayores o cuidadoras en aislamiento o con sobrecarga de cuidado y sin ayuda? | K | 8, 10 |
| EM8 | ¿Hay actividades recreativas, deportivas o culturales para niñas, niños, adolescentes y personas mayores? | R | 4 |
| EM9 | ¿Se observan desánimo, desesperanza o estrés sostenido en muchas personas (por trabajo, deudas o inseguridad)? | K | 7, 10 |
| EM10 | ¿La comunidad confía en el CAPS y en sus equipos? | R | 1 |
| EM11 | ¿Los jóvenes tienen pocas oportunidades de estudio, trabajo o proyecto de vida? | K | 6, 7 |
| EM12 | ¿Hay tradiciones, celebraciones o redes de solidaridad que fortalecen la identidad del barrio? | R | 7, 11 |

### B.4 Cómo se traduce cada respuesta

| Tipo | Respuesta | Resultado | Prioridad base |
|---|---|---|---|
| R | A | Oportunidad: aprovechar el recurso | 3 |
| R | B | Oportunidad condicionada: fortalecer el recurso o quitar la barrera | 2 |
| R | C | Amenaza por carencia del entorno | 1 |
| K | A | Amenaza alta | 3 |
| K | B | Amenaza moderada | 2 |
| K | C | No genera ítem | – |

### B.5 Prioridad

Prioridad = base + 1 si hay dos o más fuentes distintas (ítem **confirmado**) + 1 si afecta sobre todo a niñez, personas mayores o embarazadas. Rango de 1 a 5. Se ordenan de mayor a menor y los cinco primeros de Oportunidades y de Amenazas pasan al plan comunitario. El equipo puede subir o bajar un ítem con una justificación escrita.

### B.6 Cruces estratégicos

La app propone pares de ítems que comparten patrón (por ejemplo, una Fortaleza del patrón 8 con la Oportunidad EM1) y deja un campo "Estrategia" para que el equipo lo redacte.

| Cruce | Combina | Se redacta como |
|---|---|---|
| FO | Fortaleza + Oportunidad | Usar … para aprovechar … |
| DO | Debilidad + Oportunidad | Superar … gracias a … |
| FA | Fortaleza + Amenaza | Usar … para enfrentar … |
| DA | Debilidad + Amenaza | Reducir … y evitar … |

### B.7 Reglas de redacción y ética

- Preguntas sobre el barrio, nunca sobre personas identificables.
- Lenguaje que describe condiciones y no culpa a personas ni grupos.
- Dato oficial: anotar fuente y año. Testimonio: anotar el rol de quien lo dice, no su nombre.
- Un ítem de FODA es una frase concreta y verificable, no una opinión general.
- El FODA no incluye datos de salud individuales.

## Anexo C. Esquemas de configuración de los catálogos

El motor de reglas solo interpreta estos archivos. No debe haber lógica clínica escrita en el código de la interfaz.

```json
// catalogos/instrumentos (apgar)
{ "id": "apgar", "version": "1.0", "escala": { "min": 0, "max": 2 },
  "items": [ { "n": 1, "dim": "adaptacion", "texto": "…" } ],
  "cortes": [ { "desde": 7, "hasta": 10, "etiqueta": "funcional" },
              { "desde": 3, "hasta": 6, "etiqueta": "disfuncion_leve" },
              { "desde": 0, "hasta": 2, "etiqueta": "disfuncion_grave" } ] }

// catalogos/reglasInstrumentos
{ "id": "r1", "si": { "apgar": ["disfuncion_leve", "disfuncion_grave"] },
  "entonces": { "sugerir": ["mos", "holmes"] } }
{ "id": "r3", "si": { "holmes": { "min": 150 }, "mosGlobal": { "max": 56 } },
  "entonces": { "alerta": "riesgo_psicosocial" } }

// catalogos/bancoFODA
{ "id": "EM3", "dimension": "emocional", "tipo": "R", "patrones": [10],
  "pregunta": "…", "plantillaItem": "…" }

// catalogos/reglasFODA
{ "tipo": "R", "respuesta": "B", "resultado": "oportunidad_condicionada", "base": 2 }
```

## Anexo D. Guía de valoración de la comunidad por patrones funcionales

Condensada de la guía de la cátedra (Wolhein y Martínez, cap. 14). Numeración de Gordon: la guía original lista el patrón cognitivo-perceptual antes que el de sueño y descanso. Cada patrón se responde con datos subjetivos (se preguntan) y objetivos (se observan o se buscan), con la fuente de cada dato.

| N.º | Patrón | Datos subjetivos | Datos objetivos |
|---|---|---|---|
| 1 | Percepción y manejo de la salud | Nivel de salud percibido (1 a 5); problema de salud importante; patrones culturales que influyen en las prácticas sanitarias; acceso percibido al sistema; suficiencia de recursos; demanda de algún servicio o programa; responsables del cuidado de los grupos; prevención secundaria y terciaria; problemas atendidos fuera del sistema oficial, quién los atiende y si se perciben eficaces; suficiencia de bomberos, policía y programas; inmunización | Datos demográficos; morbilidad, mortalidad e incapacidad por grupo de edad; accidentes; centros de salud y tipos; programas de prevención y su utilización; profesionales por habitante; edad legal para consumir alcohol; detenciones por consumo o conducción en estado de ebriedad; ubicación y servicios de curanderos; cobertura de inmunización |
| 2 | Nutricional-metabólico | Estado nutricional percibido (niñez, personas mayores); programas de suplemento alimentario y su uso; costo de los alimentos frente a los ingresos; acceso a comercios y reparto a domicilio; suministro, calidad y precio del agua; riesgo de que la población supere la capacidad de agua; costo de refrigeración y calefacción y programas de ayuda | Examen de enfermería: aspecto general, nutrición, dentición y ropa adecuada al clima en niñez y mayores; compra de alimentos observada; consumo de comida chatarra (por ejemplo, en el kiosco escolar) |
| 3 | Eliminación | Principales residuos, sistemas de eliminación y reciclaje; si la comunidad percibe problemas; control de plagas; inspección de servicios de alimentación (locales, vendedores ambulantes) | Estadísticas de enfermedades transmisibles y de contaminación del aire; basurales y microbasurales; cloacas y aguas servidas; reciclaje |
| 4 | Actividad y ejercicio | Transporte conveniente para trabajo, tiempo libre y servicios sanitarios; uso de centros comunitarios y recreativos por niñez, adultos y mayores; viviendas adecuadas, disponibilidad y costo, vivienda de protección oficial | Programas recreativos y culturales; ayudas para personas con discapacidad; residencias, cuidados prolongados y rehabilitación según necesidad; mantenimiento externo de casas y patios; nivel general de actividad; vías de acceso, comunicación, calidad del aire, arbolado, zonas de recreación y grupos deportivos |
| 5 | Sueño y descanso | Si hay tranquilidad nocturna en la mayor parte del barrio; horarios de comercios; actividad industrial las 24 horas | Niveles de actividad y ruido en zonas industriales y residenciales; recursos de seguridad |
| 6 | Cognitivo-perceptual | Idioma dominante y si se habla; nivel educativo; estado de las escuelas; educación de adultos; problemas que requieren decisiones comunitarias, cómo se toman y cómo mejorarlas | Centros escolares y tasa de abandono; estructura de gobierno de la comunidad y líneas de decisión |
| 7 | Autopercepción y autoconcepto | Si es una buena comunidad para vivir; si su nivel social sube, baja o se mantiene; antigüedad del barrio; grupo de edad predominante; estado de ánimo general; habilidades disponibles; funciones o eventos del barrio | Composición cultural; nivel socioeconómico; observaciones sobre el estado de ánimo |
| 8 | Rol y relaciones | Si las personas se sienten a gusto juntas; lugares de encuentro; confianza en que el gobierno escucha y participación política; trabajo suficiente, salarios y satisfacción; violencia, tumultos y maltrato a cónyuge, niñez o mayores; si la comunidad funciona | Interacción observada en general o en reuniones; estadísticas de violencia interpersonal; empleo, ingresos y pobreza; tasa de divorcio |
| 9 | Sexualidad y reproducción | Composición media de la familia; si se perciben problemas (pornografía, prostitución u otros); apoyo a la educación sexual en escuelas o en la comunidad | Tamaño de las familias y tipos de alojamiento; programas de educación sexual y planificación familiar; embarazo adolescente |
| 10 | Adaptación y tolerancia al estrés | Si algún grupo parece sometido a estrés; si se necesitan o existen líneas de ayuda y grupos de apoyo, relacionados o no con la salud | Estadísticas de delincuencia, abuso de drogas, alcoholismo, suicidio y enfermedades psiquiátricas; desempleo por sexo y grupo |
| 11 | Valores y creencias | Las cuatro cosas más importantes en la vida de las personas; participación en causas o campañas locales; grupos religiosos e iglesias; tolerancia a conductas socialmente desviadas | Legislación sobre conservación; informes del comité de salud del gobierno local; presupuesto de salud respecto del presupuesto general |

⚠ Diagnósticos posibles por patrón: ver Anexo E.

## Anexo E. Diagnósticos NANDA-I por patrón (`nandaPorPatron`)

Listado aportado por Belén (47 diagnósticos en dos versiones del archivo), ordenado por patrón de Gordon, con tipo y sujeto de cuidado. Cada código se contrastó con la tabla de conversión de códigos de NANDA-I 2012 del Servicio Andaluz de Salud (2015). ⚠ Contrastar con el libro de la cátedra (2014): usa códigos de ediciones anteriores y algunos diagnósticos cambiaron de nombre o se retiraron.

**La edición importa:** los códigos cambian entre ediciones de NANDA-I. Cada catálogo guarda `edicion` y la app nunca mezcla ediciones. Las descripciones del archivo original no se cargan al catálogo (derechos de NANDA-I): quien valora consulta su libro.

| Código | Etiqueta | Tipo | Sujeto de cuidado | Patrón | Corrección respecto del archivo |
|---|---|---|---|---|---|
| 00188 | Tendencia a adoptar conductas de riesgo para la salud | Riesgo | Individuo, familia | 1 | |
| 00078 | Gestión ineficaz de la propia salud | Problema | Individuo, familia | 1 | |
| 00215 | Salud deficiente de la comunidad | Problema | Comunidad | 1 | |
| 00098 | Deterioro del mantenimiento del hogar | Problema | Familia | 1 | |
| 00186 | Disposición para mejorar el estado de inmunización | Disposición | Individuo, familia | 1 | Etiqueta del libro. ⚠ NANDA-I 2012 lo marca como retirado |
| 00162 | Disposición para mejorar la gestión de la propia salud | Disposición | Individuo, familia | 1 | |
| 00002 | Desequilibrio nutricional: inferior a las necesidades corporales | Problema | Individuo, familia | 2 | |
| 00232 | Obesidad | Problema | Individuo, familia | 2 | |
| 00233 | Sobrepeso | Problema | Individuo, familia | 2 | ⚠ El archivo decía 00001, que no es sobrepeso |
| 00047 | Riesgo de deterioro de la integridad cutánea | Riesgo | Individuo, familia | 2 | |
| 00163 | Disposición para mejorar la nutrición | Disposición | Individuo, familia, comunidad | 2 | |
| 00011 | Estreñimiento | Problema | Individuo, familia | 3 | |
| 00015 | Riesgo de estreñimiento | Riesgo | Individuo, familia | 3 | |
| 00013 | Diarrea | Problema | Individuo, familia | 3 | |
| 00017 | Incontinencia urinaria de esfuerzo | Problema | Individuo | 3 | ⚠ El archivo decía 00016, que es deterioro de la eliminación urinaria |
| 00020 | Incontinencia urinaria funcional | Problema | Individuo | 3 | Mismo caso que el anterior |
| 00092 | Intolerancia a la actividad | Problema | Individuo | 4 | |
| 00097 | Déficit de actividades recreativas | Problema | Grupo, comunidad | 4 | |
| 00108 | Déficit de autocuidado: baño | Problema | Individuo | 4 | |
| 00182 | Disposición para mejorar el autocuidado | Disposición | Individuo, familia | 4 | |
| 00095 | Insomnio | Problema | Individuo, familia | 5 | El archivo lo juntaba con el siguiente |
| 00198 | Trastorno del patrón de sueño | Problema | Individuo, familia | 5 | Código propio, distinto de 00095 |
| 00165 | Disposición para mejorar el sueño | Disposición | Individuo, familia | 5 | |
| 00126 | Conocimientos deficientes | Problema | Individuo, familia, comunidad | 6 | |
| 00132 | Dolor agudo | Problema | Individuo | 6 | Son dos diagnósticos distintos |
| 00133 | Dolor crónico | Problema | Individuo | 6 | |
| 00161 | Disposición para mejorar los conocimientos | Disposición | Individuo, familia, comunidad | 6 | |
| 00120 | Baja autoestima situacional | Problema | Individuo | 7 | |
| 00153 | Riesgo de baja autoestima situacional | Riesgo | Individuo, familia | 7 | |
| 00146 | Ansiedad | Problema | Individuo, familia | 7 | |
| 00118 | Trastorno de la imagen corporal | Problema | Individuo | 7 | |
| 00061 | Cansancio del rol de cuidador | Problema | Familia, cuidador | 8 | |
| 00062 | Riesgo de cansancio del rol de cuidador | Riesgo | Familia, cuidador | 8 | |
| 00063 | Procesos familiares disfuncionales | Problema | Familia | 8 | |
| 00053 | Aislamiento social | Problema | Individuo, familia | 8 | |
| 00052 | Deterioro de la interacción social | Problema | Individuo, grupo | 8 | Del primer listado |
| 00159 | Disposición para mejorar los procesos familiares | Disposición | Familia | 8 | |
| 00059 | Disfunción sexual | Problema | Individuo, pareja | 9 | |
| 00065 | Patrón sexual ineficaz | Problema | Individuo, pareja | 9 | |
| 00221 | Proceso de maternidad ineficaz | Problema | Individuo, familia | 9 | |
| 00209 | Riesgo de alteración de la díada materno/fetal | Riesgo | Individuo, familia | 9 | ⚠ El archivo decía 00227, que es riesgo de proceso de maternidad ineficaz |
| 00208 | Disposición para mejorar el proceso de maternidad | Disposición | Individuo, familia | 9 | |
| 00069 | Afrontamiento ineficaz | Problema | Individuo | 10 | ⚠ El archivo lo rotulaba "familiar" y usaba 00074 para el individual |
| 00073 | Afrontamiento familiar incapacitante | Problema | Familia | 10 | ⚠ El archivo decía "comprometido" |
| 00074 | Afrontamiento familiar comprometido | Problema | Familia | 10 | ⚠ El archivo lo numeraba 00073 |
| 00077 | Afrontamiento inefectivo de la comunidad | Problema | Comunidad | 10 | |
| 00076 | Disposición para mejorar el afrontamiento de la comunidad | Disposición | Comunidad | 10 | Del primer listado |
| 00075 | Disposición para mejorar el afrontamiento familiar | Disposición | Familia | 10 | |
| 00066 | Sufrimiento espiritual | Problema | Individuo, familia | 11 | La edición 2012 puede rotularlo "angustia espiritual" |
| 00067 | Riesgo de sufrimiento espiritual | Riesgo | Individuo, familia | 11 | ⚠ El archivo decía 00170, que es riesgo de deterioro de la religiosidad |
| 00068 | Disposición para mejorar el bienestar espiritual | Disposición | Individuo, familia, comunidad | 11 | ⚠ El archivo decía 00006, que es hipotermia |
| 00183 | Disposición para mejorar el confort | Disposición | Individuo, familia, comunidad | 7 y 11 | Transversal |

Se retiró del catálogo el 00082 (manejo efectivo del régimen terapéutico): figura como eliminado en 2008.

### Reglas de uso

- **Sujeto de cuidado:** los diagnósticos de comunidad se proponen en la valoración comunitaria (y alimentan el plan comunitario); los de individuo o familia, en la ficha familiar.
- **Problema o disposición:** los diagnósticos de problema se proponen cuando el patrón está **alterado**; los de "Disposición para mejorar", cuando está **conservado con evidencia** y hay deseo expresado de mejorar (una Fortaleza que se puede potenciar, ver Anexo B.2).
- Siempre se tildan las características observadas y se redacta el enunciado PES (sección 6.6).

### Cobertura pendiente

| Falta | Qué completar |
|---|---|
| Diagnósticos de comunidad | Hay pocos (00215, 00076, 00077, 00097, 00126, 00161). Completar con los de la guía comunitaria del Anexo III del libro |
| Diagnósticos que conviene sumar | Riesgo de infección (00004) para saneamiento (patrón 3), estilo de vida sedentario (00168) y riesgo de caídas (00155) para el patrón 4, desesperanza (00124) para el patrón 7 y riesgo de violencia dirigida a otros (00138) para el patrón 8 |
| Edición única | Decidir la edición NANDA-I del catálogo. Hoy mezcla códigos del libro con códigos de 2012 |
| Resultados (NOC) e intervenciones (NIC) | Catálogo pendiente, a definir con la cátedra |

Formato del catálogo:

```json
{ "id": "nandaPorPatron", "edicion": "NANDA-I 2012-2014",
  "items": [ { "codigo": "00215", "etiqueta": "Salud deficiente de la comunidad",
               "sujeto": ["comunidad"], "patrones": [1], "tipo": "problema" } ] }
```

Valores de `tipo`: `problema`, `riesgo`, `disposicion`.

## Registro de cambios

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 15/10/2026 | Primera versión: arquitectura, modelo de datos, reglas, UX, sistema visual, PDF, seguridad y backlog |
| 1.1 | 17/10/2026 | Documento autocontenido: Anexos A a E (instrumentos, reglas y banco de preguntas del FODA, esquemas de catálogos, guía comunitaria, diagnósticos NANDA-I por patrón). Apertura a CAPS y otros equipos (sección 17), roles y modelo de datos multi-organización |
| 1.2 | 17/10/2026 | Nombre definido (CuidaRed) y concepto visual de red (anillo de 11 nodos conectados) |

## Antes de empezar a programar

1. Crear el proyecto de Firebase (`dev` y `prod`), con Firestore en `southamerica-east1` y login con Google.
2. Decidir la edición NANDA-I del catálogo (Anexo E) y contrastar los parámetros de los Anexos A y B con el libro de la cátedra.
3. Cargar las invitaciones de las primeras personas usuarias y los CAPS de la práctica.
4. Empezar por el orden de la sección 0: esqueleto PWA, modelo de datos y reglas, ficha de familia, instrumentos, PDF y central.
