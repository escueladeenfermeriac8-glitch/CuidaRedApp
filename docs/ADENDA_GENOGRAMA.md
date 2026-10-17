# ADENDA_GENOGRAMA.md — CuidaRed

**Estado:** complementa a `DISENO_BASE.md` (sección 6.4 y modelo de datos de la sección 5).
**Fuente de dominio:** `Constructor_de_Genogramas.docx` (simbología McGoldrick y Gerson).
**Regla de precedencia:** si esta adenda contradice a `DISENO_BASE.md` en genograma, manda esta adenda. Si contradice al `.docx` en tecnología, manda esta adenda.

---

## 1. Qué se toma del .docx y qué no

| Del `.docx` | Decisión |
|---|---|
| Entidades, reglas de dominio, simbología, validaciones, criterios de aceptación | **Se adoptan** |
| PostgreSQL, UUID, backend propio | **Se descartan.** Persistencia = Firestore offline-first, ids de documento de Firestore |
| Capas modelo / motor de distribución / renderizador | **Se adoptan** (ver sección 6) |
| Relaciones interpersonales, acontecimientos vitales, información clínica detallada | **Solo modelo de datos en P0.** Sin UI hasta P1/P2 |

## 2. Alcance por prioridad

**P0 (para 20-21/10):**
- Tabla de integrantes con los campos de la sección 3.
- Foto del genograma hecho a mano (imagen comprimida, ya definida en el diseño base).
- Tipos TypeScript y reglas de Firestore ya preparados para el genograma automático.
- Validaciones de datos (sección 5) en el alta de integrantes.

**P1 (inmediatamente después):**
- Dibujo automático en SVG de 2 a 3 generaciones, con leyenda.
- Edición manual de posiciones sin perder vínculos.
- Exportación al PDF de familia (ya existente) y PNG.
- Contorno de hogar, persona índice, fallecidos, parejas, filiación.

**P2:** relaciones interpersonales con UI, acontecimientos vitales con UI, integración con ecomapa.

## 3. Modelo de datos (Firestore)

Todo bajo `organizaciones/{orgId}/.../familias/{familiaId}`, con `orgId` en cada documento, igual que el resto del esquema.

### 3.1 `integrantes/{id}` (extiende lo existente)

| Campo | Tipo | Nota |
|---|---|---|
| `nombre`, `apellido` | string \| null | Opcionales |
| `sexo` | `'varon' \| 'mujer' \| 'desconocido' \| null` | Nunca inferir del nombre |
| `identidadGenero` | string \| null | Solo si corresponde y es pertinente |
| `fechaNac` | string ISO \| null | |
| `fechaNacPrecision` | `'exacta' \| 'aproximada' \| 'anio' \| 'desconocida'` | Si solo se sabe el año, **no** guardar 1 de enero como fecha real: guardar el año con precisión `'anio'` |
| `edadAprox` | number \| null | Se usa cuando no hay fecha |
| `fallecido` | boolean | |
| `fechaFallecimiento` + `fechaFallecimientoPrecision` | igual que nacimiento | |
| `esIndice` | boolean | Una sola persona índice por familia |
| `conviveActual` | boolean | |
| `madreId`, `padreId` | string \| null | Referencias a otros integrantes |
| `tipoFiliacion` | `'biologica' \| 'adoptiva' \| 'otra'` | Default `'biologica'` |
| `partoMultipleId` | string \| null | Mismo valor para gemelos o mellizos |
| `tipoMultiple` | `'gemelos' \| 'mellizos' \| null` | |
| `ocupacion`, `escolaridad`, `obraSocial` | string \| null | Ya existen |
| `condiciones[]` | ver 3.4 | |
| `ordenManual` | number \| null | Para ordenar hijos si no hay fechas |
| `notas` | string \| null | |

### 3.2 `parejas/{id}` (subcolección nueva)

| Campo | Tipo |
|---|---|
| `personaAId`, `personaBId` | string |
| `tipo` | `'matrimonio' \| 'union_de_hecho' \| 'otra'` |
| `fechaInicio`, `fechaFin` + precisiones | igual que 3.1 |
| `motivoFin` | `'separacion' \| 'divorcio' \| 'fallecimiento' \| 'otra' \| null` |
| `notas` | string \| null |

`parejaDeIds[]` y `tipoVinculo` del diseño base **se reemplazan** por esta subcolección. Permite parejas sucesivas y simultáneas.

### 3.3 Convivencia

En P0 alcanza con `conviveActual` por integrante. El historial de hogares (`hogares/{id}` con `miembroIds`, `desde`, `hasta`) queda definido en tipos TypeScript y sin UI hasta P1.

### 3.4 `condiciones[]` dentro del integrante

```ts
{ nombre: string; tipo: 'diagnostico'|'antecedente'|'factor_riesgo'|'adiccion'|'otro';
  estado: 'actual'|'resuelto'|'historico'|'sospechado'|'desconocido';
  fechaInicio?: string; notas?: string }
```
El sistema **nunca infiere** diagnósticos. Los antecedentes familiares se distinguen de los diagnósticos actuales.

### 3.5 Colecciones solo-modelo en P0

- `relacionesInterpersonales/{id}`: `personaAId`, `personaBId`, `calidad` (`unida|fusionada|conflictiva|fusionada_conflictiva|distante|apartada`), `desde`, `hasta`, `notas`.
- `acontecimientosVitales/{id}`: `personaId?`, `tipo` (`migracion|perdida_laboral|fallecimiento|crisis|otro`), `descripcion`, `fecha` + precisión.

### 3.6 Separaciones obligatorias

Pareja, filiación, convivencia y relación interpersonal son **cuatro conceptos independientes**. Ninguno se deduce de otro. Madre e hija pueden tener relación distante; convivir no implica parentesco.

### 3.7 Datos vs dibujo

Se guardan **datos**, nunca el diagrama como fuente de verdad. Las posiciones manuales (P1) van en `layoutConfig` aparte, de modo que borrar el layout no borre información familiar.

## 4. Convenciones gráficas (para P1)

Configurables a nivel de organización (`config.convencionGenograma`). Valores por defecto:

**Personas:** varón = cuadrado; mujer = círculo; desconocido = rombo (definido en leyenda); fallecido = X sobre el símbolo; índice = flecha apuntando al símbolo.

**Parejas:**

| Tipo | Trazo |
|---|---|
| Matrimonio | Línea continua |
| Unión de hecho | Línea discontinua |
| Separación | Una barra diagonal |
| Divorcio | Dos barras diagonales |

**Filiación:** biológica = línea continua; adoptiva = línea discontinua; gemelos idénticos = dos ramas desde un punto común unidas por una línea; mellizos = dos ramas sin línea de unión.

**Relaciones interpersonales (P2):** unida = una línea; fusionada = tres líneas paralelas; conflictiva = zigzag; fusionada-conflictiva = tres líneas con zigzag; distante = discontinua; apartada = línea cortada.

**Hogar:** contorno discontinuo alrededor de los convivientes actuales, sin tapar nombres, edades ni diagnósticos.

**Accesibilidad:** no usar color como único diferenciador. Todo sombreado o patrón se define en una **leyenda visible**.

## 5. Validaciones

**Bloquean el guardado:**
- Una persona no puede ser su propia madre/padre/hija/hijo.
- Sin ciclos imposibles en la filiación.
- Las referencias (`madreId`, `padreId`, parejas) deben apuntar a integrantes existentes de la misma familia.
- Fallecimiento no puede ser anterior al nacimiento cuando ambas fechas son conocidas. Se advierte; no se corrige solo.
- Una sola persona índice por familia.

**Solo advierten (nunca bloquean):**
- Menos de 3 generaciones documentadas.
- Faltan fechas de nacimiento.
- Faltan datos de pareja o filiación.
- Fechas aproximadas o incompletas.
- Personas sin información clínica.

Se permite guardar genogramas incompletos. **La ausencia de datos también es información de la valoración.**

## 6. Arquitectura del genograma automático (P1)

Tres capas separadas en código:

1. **Dominio:** funciones puras sobre los tipos (generaciones, orden de hijos, validaciones). Sin React ni coordenadas.
2. **Motor de distribución:** recibe el dominio y devuelve posiciones. Sin DOM.
3. **Renderizador SVG:** recibe posiciones y dibuja símbolos, trazos, etiquetas y leyenda. Sin lógica familiar.

Reglas del motor:
- La generación se calcula por **estructura** (filiación), no por edad.
- Pareja: varón a la izquierda y mujer a la derecha (configurable). Hijos de mayor a menor, izquierda a derecha, por fecha. Sin fechas, usar `ordenManual`.
- Nacimientos múltiples salen de un punto común.
- Minimizar cruces y superposiciones. Permitir mover nodos sin perder vínculos y recalcular al agregar o quitar integrantes.
- Debe funcionar **offline y en el cliente**, sin librerías pesadas. Para 2 a 3 generaciones se espera un algoritmo propio por capas. Si se evalúa una librería de grafos, justificarlo en `PENDIENTES.md` (peso del bundle y soporte offline).

## 7. Criterios de aceptación

**P0:**
- [ ] Se crean integrantes con todos los campos de 3.1 sin bloquear por datos opcionales.
- [ ] Se crean y editan parejas (3.2).
- [ ] Las validaciones de la sección 5 funcionan.
- [ ] Todo funciona sin conexión y sobrevive a cerrar y reabrir la app.
- [ ] Se puede adjuntar la foto del genograma.
- [ ] Los tipos TypeScript y las reglas de Firestore cubren las entidades 3.1 a 3.5.

**P1:**
- [ ] Se dibujan 3 generaciones con persona índice, fallecidos, parejas y filiación.
- [ ] Orden de hijos correcto y gemelos o mellizos bien representados.
- [ ] Contorno de hogar sin tapar texto.
- [ ] Leyenda visible.
- [ ] Posiciones editables manualmente y persistidas en `layoutConfig`.
- [ ] Exporta dentro del PDF de familia y como PNG.

## 8. Datos de prueba (ficticios, solo para emulador)

Familia de ejemplo adaptada del `.docx`: Luis (índice, varón), Analía (mujer), pareja de hecho desde 2005 (precisión `anio`), hijos Florencia (nacida en 1997, precisión `anio`) y Lucas, Julia (mujer) con relación distante con Luis, y el padre de Luis fallecido en 1970 (precisión `anio`). Hogar actual: Luis, Analía, Florencia y Lucas.

**No cargar datos clínicos reales en ambientes de prueba.**

## 9. Marco normativo (a revisar con asesoría legal)

Datos sanitarios y familiares. Considerar Ley 25.326 (datos personales) y Ley 26.529 (derechos del paciente). El control de acceso por rol y `orgId`, y la exportación protegida cuando hay datos identificatorios, ya están previstos en `DISENO_BASE.md` (sección de privacidad). Cualquier duda normativa va a `PENDIENTES.md`, no se resuelve por criterio propio.

## 10. Principio rector

El genograma representa información familiar **documentada**. La app facilita su construcción y lectura, pero **no infiere** parentescos, diagnósticos ni dinámicas familiares que el profesional no haya registrado o valorado.
