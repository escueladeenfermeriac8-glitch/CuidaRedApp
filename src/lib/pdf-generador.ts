/**
 * Motor de Generación de PDF Offline para CuidaRed
 * DISENO_BASE.md §9 y §10
 *
 * Funciona 100% en el cliente sin conexión a internet usando pdf-lib.
 * Genera informes estructurados en tamaño A4 para:
 * 1. Ficha Familiar (encabezado, integrantes, genograma, vivienda, 11 patrones con anillo, instrumentos y firmas).
 * 2. Valoración Comunitaria (datos del barrio, 11 patrones y matriz FODA).
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import type {
  Familia,
  Barrio,
  Integrante,
  Valoracion,
  ValoracionComunidad,
  PayloadPatrones,
} from '@/types'

// Constantes de diseño A4 (puntos: 1 pt = 1/72 pulgada)
const A4_ANCHO = 595.28
const A4_ALTO = 841.89
const MARGEN = 40
const ANCHO_UTIL = A4_ANCHO - MARGEN * 2

// Paleta de colores para PDF (RGB de 0 a 1)
const COLOR_TINTA = rgb(0.04, 0.12, 0.20)     // #0B1F33
const COLOR_AZUL = rgb(0.09, 0.22, 0.37)      // #17375E
const COLOR_APAGADO = rgb(0.36, 0.42, 0.49)   // #5B6B7C
const COLOR_LINEA = rgb(0.85, 0.88, 0.91)     // #D9E0E8
const COLOR_FONDO_SECCION = rgb(0.96, 0.97, 0.98) // #F5F7FA
const COLOR_OK = rgb(0.18, 0.62, 0.42)        // #2F9E6B
const COLOR_ATENCION = rgb(0.79, 0.54, 0.0)   // #C98A00
const COLOR_CRITICO = rgb(0.78, 0.22, 0.18)   // #C8392F
const COLOR_BLANCO = rgb(1, 1, 1)

export interface DatosExportacionFamiliar {
  familia: Familia
  barrio?: Barrio | null
  integrantes: Integrante[]
  valoraciones: Valoracion[]
  nombreValorador?: string
  rolValorador?: string
}

export interface DatosExportacionComunidad {
  barrio: Barrio
  valoracion: ValoracionComunidad
  nombreValorador?: string
}

/**
 * Genera el PDF estructurado de la Ficha Familiar (P0/P1)
 */
export async function generarPdfFamiliar(datos: DatosExportacionFamiliar): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let pagina = pdfDoc.addPage([A4_ANCHO, A4_ALTO])
  let y = A4_ALTO - MARGEN

  // Helper para nueva página
  const verificarEspacio = (alturaRequerida: number): void => {
    if (y - alturaRequerida < MARGEN + 40) {
      pagina = pdfDoc.addPage([A4_ANCHO, A4_ALTO])
      engancharDrawTextSeguro(pagina)
      y = A4_ALTO - MARGEN
      dibujarEncabezadoPaginaSiguiente(pagina, datos.familia, fontBold)
      y -= 35
    }
  }

  engancharDrawTextSeguro(pagina)

  // 1. ENCABEZADO INSTITUCIONAL
  y = dibujarEncabezadoPrincipal(pagina, y, datos, fontRegular, fontBold)

  // 2. IDENTIFICACIÓN Y CONSENTIMIENTO
  verificarEspacio(80)
  y = dibujarSeccionIdentificacion(pagina, y, datos.familia, datos.barrio, fontRegular, fontBold)

  // 3. INTEGRANTES DEL HOGAR
  verificarEspacio(60 + datos.integrantes.length * 20)
  y = dibujarSeccionIntegrantes(pagina, y, datos.integrantes, fontRegular, fontBold)

  // 4. VIVIENDA, CARTOGRAFÍA Y GENOGRAMA MANUAL
  verificarEspacio(140)
  y = await dibujarSeccionVivienda(pdfDoc, pagina, y, datos.familia, fontRegular, fontBold)

  // 5. VALORACIÓN DE 11 PATRONES DE GORDON Y ANILLO
  verificarEspacio(200)
  y = dibujarSeccionPatrones(pagina, y, datos.valoraciones, fontRegular, fontBold, verificarEspacio)

  // 6. INSTRUMENTOS FAMILIARES (APGAR, HOLMES, MOS)
  verificarEspacio(150)
  y = dibujarSeccionInstrumentos(pagina, y, datos.valoraciones, fontRegular, fontBold, verificarEspacio)

  // 7. FIRMAS Y SELLOS
  verificarEspacio(100)
  dibujarFirmas(pagina, y, datos.nombreValorador, fontRegular, fontBold)

  // 8. PIE DE PÁGINA EN TODAS LAS PÁGINAS
  const totalPaginas = pdfDoc.getPageCount()
  for (let i = 0; i < totalPaginas; i++) {
    const p = pdfDoc.getPage(i)
    dibujarPiePagina(p, i + 1, totalPaginas, datos.familia, fontRegular)
  }

  return await pdfDoc.save()
}

/**
  * Sanitiza una cadena para asegurar que sólo contenga caracteres codificables en WinAnsi (StandardFonts).
  * Evita excepciones como "WinAnsi cannot encode '⚠'" o caracteres invisibles que corrompen el flujo PDF.
  */
export function sanitizarTextoParaPdf(texto: string | null | undefined): string {
  if (!texto) return ''
  return String(texto)
    .replace(/\u26a0/g, '[!]')
    .replace(/[\u2022\u25cf]/g, '-')
    .replace(/[\u2192\u21d2]/g, '->')
    .replace(/[\u2190\u21d0]/g, '<-')
    .replace(/[\u2713\u2714]/g, '[OK]')
    .replace(/[\u2717\u2718]/g, '[X]')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, (char) => {
      const norm = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (/^[\x20-\x7E\xA0-\xFF]$/.test(norm)) return norm
      return ' '
    })
}

/**
 * Intercepta y sanitiza automáticamente todas las llamadas a drawText de la página,
 * garantizando que ningún carácter especial o emoji haga fallar la exportación del PDF.
 */
function engancharDrawTextSeguro(pagina: PDFPage): void {
  const originalDrawText = pagina.drawText.bind(pagina)
  pagina.drawText = (text: string, options?: Parameters<PDFPage['drawText']>[1]) => {
    return originalDrawText(sanitizarTextoParaPdf(text), options)
  }
}

/**
 * Descarga en el navegador el PDF generado como archivo asegurando encabezado y cuerpo válidos
 */
export function descargarBlobPdf(pdfBytes: Uint8Array, nombreArchivo: string): void {
  // Asegurar que pasamos una copia limpia de los bytes exactos sin padding del pool
  const bytesLimpios = new Uint8Array(pdfBytes)
  const blob = new Blob([bytesLimpios as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

// ─────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES DE RENDERIZADO DEL PDF
// ─────────────────────────────────────────────────────────────

function dibujarEncabezadoPrincipal(
  pagina: PDFPage,
  y: number,
  datos: DatosExportacionFamiliar,
  fontRegular: PDFFont,
  fontBold: PDFFont
): number {
  const fam = datos.familia
  const barrio = datos.barrio

  // Barra de cabecera con fondo azul suave
  pagina.drawRectangle({
    x: MARGEN,
    y: y - 55,
    width: ANCHO_UTIL,
    height: 55,
    color: COLOR_FONDO_SECCION,
    borderColor: COLOR_AZUL,
    borderWidth: 1,
  })

  pagina.drawText('CUIDARED · REGISTRO DE SEGUIMIENTO FAMILIAR', {
    x: MARGEN + 12,
    y: y - 18,
    size: 13,
    font: fontBold,
    color: COLOR_AZUL,
  })

  const subTitulo = barrio ? `Barrio: ${barrio.etiqueta} · Primer Nivel de Atención (UNRC)` : 'Enfermería Comunitaria · Primer Nivel de Atención (UNRC)'
  pagina.drawText(subTitulo, {
    x: MARGEN + 12,
    y: y - 32,
    size: 9,
    font: fontRegular,
    color: COLOR_APAGADO,
  })

  const fechaStr = new Date().toLocaleDateString('es-AR')
  pagina.drawText(`Fecha de emisión: ${fechaStr}`, {
    x: MARGEN + 12,
    y: y - 46,
    size: 8,
    font: fontRegular,
    color: COLOR_APAGADO,
  })

  // Código familiar en esquina derecha
  const codTxt = fam.codigoFamiliar || 'S/C'
  pagina.drawRectangle({
    x: A4_ANCHO - MARGEN - 120,
    y: y - 42,
    width: 110,
    height: 28,
    color: COLOR_BLANCO,
    borderColor: COLOR_LINEA,
    borderWidth: 1,
  })

  pagina.drawText('CÓDIGO FAMILIAR', {
    x: A4_ANCHO - MARGEN - 112,
    y: y - 24,
    size: 7,
    font: fontBold,
    color: COLOR_APAGADO,
  })

  pagina.drawText(codTxt, {
    x: A4_ANCHO - MARGEN - 112,
    y: y - 37,
    size: 10,
    font: fontBold,
    color: COLOR_AZUL,
  })

  return y - 70
}

function dibujarEncabezadoPaginaSiguiente(
  pagina: PDFPage,
  fam: Familia,
  fontBold: PDFFont
): void {
  pagina.drawText(`CuidaRed · Familia ${fam.apellido} (${fam.codigoFamiliar})`, {
    x: MARGEN,
    y: A4_ALTO - MARGEN + 10,
    size: 8,
    font: fontBold,
    color: COLOR_APAGADO,
  })

  pagina.drawLine({
    start: { x: MARGEN, y: A4_ALTO - MARGEN + 4 },
    end: { x: A4_ANCHO - MARGEN, y: A4_ALTO - MARGEN + 4 },
    color: COLOR_LINEA,
    thickness: 0.5,
  })
}

function dibujarSeccionIdentificacion(
  pagina: PDFPage,
  y: number,
  fam: Familia,
  barrio: Barrio | null | undefined,
  fontRegular: PDFFont,
  fontBold: PDFFont
): number {
  pagina.drawText('1. IDENTIFICACIÓN Y CONSENTIMIENTO INFORMADO', {
    x: MARGEN,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_AZUL,
  })
  y -= 14

  pagina.drawLine({
    start: { x: MARGEN, y },
    end: { x: A4_ANCHO - MARGEN, y },
    color: COLOR_LINEA,
    thickness: 1,
  })
  y -= 15

  // Cuadro con datos
  const apellido = `Familia ${fam.apellido}`
  const orden = fam.ordenEnDomicilio > 1 ? ` (Familia ${fam.ordenEnDomicilio} en este domicilio)` : ''
  pagina.drawText(`Apellido familiar: ${apellido}${orden}`, {
    x: MARGEN,
    y,
    size: 9,
    font: fontBold,
    color: COLOR_TINTA,
  })

  pagina.drawText(`Domicilio: ${fam.domicilio}`, {
    x: MARGEN + 260,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_TINTA,
  })
  y -= 14

  const barrioTxt = barrio?.etiqueta ?? 'Sin asignar'
  pagina.drawText(`Barrio y punto cardinal: ${barrioTxt}`, {
    x: MARGEN,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_TINTA,
  })

  pagina.drawText(`Referente familiar: ${fam.referenteParentesco}`, {
    x: MARGEN + 260,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_TINTA,
  })
  y -= 14

  // Consentimiento
  const cOtorgado = fam.consentimiento?.otorgado ? 'SÍ (Otorgado)' : 'NO (Pendiente)'
  const cModo = fam.consentimiento?.modalidad ? `Modalidad: ${fam.consentimiento.modalidad}` : ''
  pagina.drawText(`Consentimiento Informado: ${cOtorgado} · ${cModo}`, {
    x: MARGEN,
    y,
    size: 8.5,
    font: fontBold,
    color: fam.consentimiento?.otorgado ? COLOR_OK : COLOR_CRITICO,
  })
  y -= 22

  return y
}

function dibujarSeccionIntegrantes(
  pagina: PDFPage,
  y: number,
  integrantes: Integrante[],
  fontRegular: PDFFont,
  fontBold: PDFFont
): number {
  pagina.drawText(`2. INTEGRANTES DEL HOGAR (${integrantes.length} registrados)`, {
    x: MARGEN,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_AZUL,
  })
  y -= 14

  pagina.drawLine({
    start: { x: MARGEN, y },
    end: { x: A4_ANCHO - MARGEN, y },
    color: COLOR_LINEA,
    thickness: 1,
  })
  y -= 14

  if (integrantes.length === 0) {
    pagina.drawText('No se registraron integrantes en el sistema.', {
      x: MARGEN,
      y,
      size: 8.5,
      font: fontRegular,
      color: COLOR_APAGADO,
    })
    return y - 20
  }

  // Encabezado de tabla
  const colX = [MARGEN, MARGEN + 110, MARGEN + 160, MARGEN + 210, MARGEN + 270, MARGEN + 350]
  pagina.drawRectangle({
    x: MARGEN,
    y: y - 4,
    width: ANCHO_UTIL,
    height: 16,
    color: COLOR_FONDO_SECCION,
  })

  pagina.drawText('Parentesco', { x: colX[0] + 4, y, size: 7.5, font: fontBold, color: COLOR_AZUL })
  pagina.drawText('Sexo', { x: colX[1], y, size: 7.5, font: fontBold, color: COLOR_AZUL })
  pagina.drawText('Edad', { x: colX[2], y, size: 7.5, font: fontBold, color: COLOR_AZUL })
  pagina.drawText('Convive', { x: colX[3], y, size: 7.5, font: fontBold, color: COLOR_AZUL })
  pagina.drawText('Rol / Filiación', { x: colX[4], y, size: 7.5, font: fontBold, color: COLOR_AZUL })
  pagina.drawText('Condiciones de salud', { x: colX[5], y, size: 7.5, font: fontBold, color: COLOR_AZUL })
  y -= 14

  // Filas
  for (const int of integrantes) {
    const parentesco = int.parentesco || 'S/D'
    const sexo = int.sexo || 'desc.'
    const edad = int.edadAprox ? `${int.edadAprox}a` : 's/d'
    const convive = int.conviveActual ? 'Sí' : 'No'
    const indice = int.esIndice ? 'Persona índice' : int.tipoFiliacion || 'Biológica'
    const conds = int.condiciones?.map((c) => c.nombre).join(', ') || 'Ninguna registrada'

    pagina.drawText(parentesco, { x: colX[0] + 4, y, size: 7.5, font: fontBold, color: COLOR_TINTA })
    pagina.drawText(sexo, { x: colX[1], y, size: 7.5, font: fontRegular, color: COLOR_TINTA })
    pagina.drawText(edad, { x: colX[2], y, size: 7.5, font: fontRegular, color: COLOR_TINTA })
    pagina.drawText(convive, { x: colX[3], y, size: 7.5, font: fontRegular, color: COLOR_TINTA })
    pagina.drawText(indice, { x: colX[4], y, size: 7.5, font: fontRegular, color: COLOR_TINTA })
    pagina.drawText(conds.substring(0, 32), { x: colX[5], y, size: 7, font: fontRegular, color: COLOR_APAGADO })

    y -= 12
  }

  y -= 10
  return y
}

async function dibujarSeccionVivienda(
  pdfDoc: PDFDocument,
  pagina: PDFPage,
  y: number,
  fam: Familia,
  fontRegular: PDFFont,
  fontBold: PDFFont
): Promise<number> {
  pagina.drawText('3. VIVIENDA, CARTOGRAFÍA Y GENOGRAMA EN TERRENO', {
    x: MARGEN,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_AZUL,
  })
  y -= 14

  pagina.drawLine({
    start: { x: MARGEN, y },
    end: { x: A4_ANCHO - MARGEN, y },
    color: COLOR_LINEA,
    thickness: 1,
  })
  y -= 14

  const viv = fam.vivienda
  const tipoViv = viv?.tipo ?? 'S/D'
  const tenencia = viv?.tenencia ?? 'S/D'
  const habs = viv?.cantHabitaciones ?? 0
  const conv = viv?.cantConvivientes ?? 1

  let hacinamientoTxt = 'Sin calcular'
  let hacinamientoColor = COLOR_APAGADO
  if (habs > 0) {
    const ratio = conv / habs
    if (ratio > 3) {
      hacinamientoTxt = `Crítico (${ratio.toFixed(1)} pers/hab)`
      hacinamientoColor = COLOR_CRITICO
    } else if (ratio >= 2) {
      hacinamientoTxt = `Moderado (${ratio.toFixed(1)} pers/hab)`
      hacinamientoColor = COLOR_ATENCION
    } else {
      hacinamientoTxt = `Sin hacinamiento (${ratio.toFixed(1)} pers/hab)`
      hacinamientoColor = COLOR_OK
    }
  }

  pagina.drawText(`Vivienda: ${tipoViv} · Tenencia: ${tenencia} · Habitaciones: ${habs} · Convivientes: ${conv}`, {
    x: MARGEN,
    y,
    size: 8.5,
    font: fontRegular,
    color: COLOR_TINTA,
  })
  y -= 12

  pagina.drawText(`Índice de hacinamiento: ${hacinamientoTxt}`, {
    x: MARGEN,
    y,
    size: 8.5,
    font: fontBold,
    color: hacinamientoColor,
  })
  y -= 12

  // Servicios
  const servs: string[] = []
  if (viv?.aguaPotable) servs.push('Agua potable')
  if (viv?.cloacas) servs.push('Red cloacal')
  if (viv?.electricidad) servs.push('Electricidad')
  if (viv?.gas) servs.push('Gas')
  if (viv?.recoleccionResiduos) servs.push('Recolección de basura')
  const servsTxt = servs.length > 0 ? servs.join(', ') : 'Servicios s/d'

  pagina.drawText(`Servicios básicos: ${servsTxt}`, {
    x: MARGEN,
    y,
    size: 8,
    font: fontRegular,
    color: COLOR_TINTA,
  })
  y -= 12

  // Cartografía
  const ubic = fam.cartografia?.ubicacion ? `Zona ${fam.cartografia.ubicacion}` : 'Zona s/d'
  const ref = fam.cartografia?.referencias ? `Refs: ${fam.cartografia.referencias}` : ''
  pagina.drawText(`Cartografía: ${ubic} · ${ref}`.substring(0, 95), {
    x: MARGEN,
    y,
    size: 8,
    font: fontRegular,
    color: COLOR_APAGADO,
  })
  y -= 16

  // Si existe fotoUrl de tipo data:image, embeber imagen comprimida del genograma (P0)
  if (fam.cartografia?.fotoUrl && fam.cartografia.fotoUrl.startsWith('data:image')) {
    try {
      const base64Data = fam.cartografia.fotoUrl.split(',')[1]
      const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const embeddedImage = fam.cartografia.fotoUrl.includes('png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes)

      const imgDims = embeddedImage.scaleToFit(180, 80)
      pagina.drawImage(embeddedImage, {
        x: MARGEN,
        y: y - imgDims.height,
        width: imgDims.width,
        height: imgDims.height,
      })
      pagina.drawText('[Genograma manual adjuntado en terreno - P0]', {
        x: MARGEN + imgDims.width + 12,
        y: y - 20,
        size: 7.5,
        font: fontBold,
        color: COLOR_APAGADO,
      })
      y -= imgDims.height + 14
    } catch (e) {
      console.warn('No se pudo embeber la imagen del genograma en el PDF:', e)
    }
  }

  y -= 8
  return y
}

function dibujarSeccionPatrones(
  pagina: PDFPage,
  y: number,
  valoraciones: Valoracion[],
  fontRegular: PDFFont,
  fontBold: PDFFont,
  verificarEspacio: (altura: number) => void
): number {
  verificarEspacio(80)

  pagina.drawText('4. VALORACIÓN DE 11 PATRONES DE GORDON Y ANILLO FAMILIAR', {
    x: MARGEN,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_AZUL,
  })
  y -= 14

  pagina.drawLine({
    start: { x: MARGEN, y },
    end: { x: A4_ANCHO - MARGEN, y },
    color: COLOR_LINEA,
    thickness: 1,
  })
  y -= 16

  // Obtener valoración de patrones
  const valPatrones = valoraciones.find((v) => v.tipo === 'patrones')
  const payload = valPatrones?.payload as PayloadPatrones | undefined

  const NOMBRES_PATRONES = [
    'Percepción y manejo de la salud',
    'Nutricional - metabólico',
    'Eliminación',
    'Actividad y ejercicio',
    'Sueño y descanso',
    'Cognitivo - perceptivo',
    'Autopercepción - autoconcepto',
    'Rol - relaciones',
    'Sexualidad y reproducción',
    'Adaptación y tolerancia al estrés',
    'Valores y creencias',
  ]

  // Dibujar vectorialmente el Anillo de Gordon (11 nodos circulares)
  const centroX = MARGEN + 45
  const centroY = y - 40
  const radioAnillo = 30

  for (let i = 0; i < 11; i++) {
    const angulo = (i * 2 * Math.PI) / 11 - Math.PI / 2
    const nx = centroX + radioAnillo * Math.cos(angulo)
    const ny = centroY + radioAnillo * Math.sin(angulo)

    const pKey = `p${i + 1}`
    const pData = payload?.patrones?.[pKey]
    const est = pData?.estado ?? 'sin_valorar'

    let colorNodo = COLOR_APAGADO
    if (est === 'conservado') colorNodo = COLOR_OK
    else if (est === 'alterado') colorNodo = COLOR_ATENCION

    // Nodo círculo
    pagina.drawCircle({
      x: nx,
      y: ny,
      size: 5,
      color: colorNodo,
    })
  }

  // Leyenda al costado del anillo
  pagina.drawText('Anillo de 11 nodos (Gordon Ring):', {
    x: centroX + radioAnillo + 25,
    y: centroY + 18,
    size: 8,
    font: fontBold,
    color: COLOR_AZUL,
  })

  pagina.drawCircle({ x: centroX + radioAnillo + 28, y: centroY + 5, size: 3.5, color: COLOR_OK })
  pagina.drawText('Verde: Conservado (Saludable)', {
    x: centroX + radioAnillo + 36,
    y: centroY + 2,
    size: 7.5,
    font: fontRegular,
    color: COLOR_TINTA,
  })

  pagina.drawCircle({ x: centroX + radioAnillo + 28, y: centroY - 8, size: 3.5, color: COLOR_ATENCION })
  pagina.drawText('Ámbar: Alterado (Disfunción / Riesgo)', {
    x: centroX + radioAnillo + 36,
    y: centroY - 11,
    size: 7.5,
    font: fontRegular,
    color: COLOR_TINTA,
  })

  pagina.drawCircle({ x: centroX + radioAnillo + 28, y: centroY - 21, size: 3.5, color: COLOR_APAGADO })
  pagina.drawText('Gris: Sin valorar', {
    x: centroX + radioAnillo + 36,
    y: centroY - 24,
    size: 7.5,
    font: fontRegular,
    color: COLOR_APAGADO,
  })

  y = centroY - radioAnillo - 22

  // Lista detallada de los 11 patrones
  for (let i = 0; i < 11; i++) {
    verificarEspacio(20)

    const pNum = i + 1
    const pKey = `p${pNum}`
    const pData = payload?.patrones?.[pKey]
    const estado = pData?.estado || 'sin_valorar'
    const justificacion = pData?.justificacion ? ` — ${pData.justificacion}` : ''

    let estColor = COLOR_APAGADO
    let estTxt = 'Sin valorar'
    if (estado === 'conservado') {
      estColor = COLOR_OK
      estTxt = 'Conservado'
    } else if (estado === 'alterado') {
      estColor = COLOR_ATENCION
      estTxt = 'ALTERADO'
    }

    pagina.drawText(`P${pNum}. ${NOMBRES_PATRONES[i]}: `, {
      x: MARGEN,
      y,
      size: 8,
      font: fontBold,
      color: COLOR_TINTA,
    })

    pagina.drawText(`[${estTxt}]`, {
      x: MARGEN + 195,
      y,
      size: 8,
      font: fontBold,
      color: estColor,
    })

    if (justificacion) {
      pagina.drawText(justificacion.substring(0, 55), {
        x: MARGEN + 265,
        y,
        size: 7.5,
        font: fontRegular,
        color: COLOR_APAGADO,
      })
    }

    y -= 13
  }

  y -= 10
  return y
}

function dibujarSeccionInstrumentos(
  pagina: PDFPage,
  y: number,
  valoraciones: Valoracion[],
  fontRegular: PDFFont,
  fontBold: PDFFont,
  verificarEspacio: (altura: number) => void
): number {
  verificarEspacio(80)

  pagina.drawText('5. INSTRUMENTOS DE VALORACIÓN FAMILIAR', {
    x: MARGEN,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_AZUL,
  })
  y -= 14

  pagina.drawLine({
    start: { x: MARGEN, y },
    end: { x: A4_ANCHO - MARGEN, y },
    color: COLOR_LINEA,
    thickness: 1,
  })
  y -= 16

  const valApgar = valoraciones.find((v) => v.tipo === 'apgar')
  const valHolmes = valoraciones.find((v) => v.tipo === 'holmes')
  const valMos = valoraciones.find((v) => v.tipo === 'mos')

  // APGAR
  pagina.drawText('APGAR Familiar (Smilkstein):', {
    x: MARGEN,
    y,
    size: 8.5,
    font: fontBold,
    color: COLOR_TINTA,
  })
  if (valApgar) {
    const punt = valApgar.puntaje ?? 0
    const interp = valApgar.interpretacion ?? 's/d'
    pagina.drawText(`${punt} / 10 puntos · ${interp}`, {
      x: MARGEN + 180,
      y,
      size: 8.5,
      font: fontBold,
      color: punt >= 7 ? COLOR_OK : COLOR_ATENCION,
    })
  } else {
    pagina.drawText('Pendiente de realización', {
      x: MARGEN + 180,
      y,
      size: 8.5,
      font: fontRegular,
      color: COLOR_APAGADO,
    })
  }
  y -= 14

  // Holmes y Rahe
  pagina.drawText('Escala de Holmes y Rahe (Estrés vital):', {
    x: MARGEN,
    y,
    size: 8.5,
    font: fontBold,
    color: COLOR_TINTA,
  })
  if (valHolmes) {
    const punt = valHolmes.puntaje ?? 0
    const interp = valHolmes.interpretacion ?? 's/d'
    pagina.drawText(`${punt} UCV · ${interp}`, {
      x: MARGEN + 180,
      y,
      size: 8.5,
      font: fontBold,
      color: punt >= 150 ? COLOR_ATENCION : COLOR_OK,
    })
  } else {
    pagina.drawText('Pendiente de realización', {
      x: MARGEN + 180,
      y,
      size: 8.5,
      font: fontRegular,
      color: COLOR_APAGADO,
    })
  }
  y -= 14

  // MOS
  pagina.drawText('Cuestionario MOS (Apoyo social):', {
    x: MARGEN,
    y,
    size: 8.5,
    font: fontBold,
    color: COLOR_TINTA,
  })
  if (valMos) {
    const punt = valMos.puntaje ?? 0
    const interp = valMos.interpretacion ?? 's/d'
    pagina.drawText(`${punt} pts · ${interp}`, {
      x: MARGEN + 180,
      y,
      size: 8.5,
      font: fontBold,
      color: interp.includes('adecuado') ? COLOR_OK : COLOR_CRITICO,
    })
  } else {
    pagina.drawText('Pendiente de realización', {
      x: MARGEN + 180,
      y,
      size: 8.5,
      font: fontRegular,
      color: COLOR_APAGADO,
    })
  }
  y -= 20

  return y
}

function dibujarFirmas(
  pagina: PDFPage,
  y: number,
  nombreValorador: string | undefined,
  fontRegular: PDFFont,
  fontBold: PDFFont
): void {
  pagina.drawLine({
    start: { x: MARGEN, y: y - 20 },
    end: { x: MARGEN + 200, y: y - 20 },
    color: COLOR_LINEA,
    thickness: 1,
  })

  pagina.drawLine({
    start: { x: A4_ANCHO - MARGEN - 200, y: y - 20 },
    end: { x: A4_ANCHO - MARGEN, y: y - 20 },
    color: COLOR_LINEA,
    thickness: 1,
  })

  pagina.drawText('Firma y Aclaración de quien valora', {
    x: MARGEN + 15,
    y: y - 32,
    size: 8,
    font: fontBold,
    color: COLOR_TINTA,
  })

  if (nombreValorador) {
    pagina.drawText(nombreValorador, {
      x: MARGEN + 15,
      y: y - 44,
      size: 7.5,
      font: fontRegular,
      color: COLOR_APAGADO,
    })
  }

  pagina.drawText('Firma y Sello Supervisor/a Docente', {
    x: A4_ANCHO - MARGEN - 190,
    y: y - 32,
    size: 8,
    font: fontBold,
    color: COLOR_TINTA,
  })
}

function dibujarPiePagina(
  pagina: PDFPage,
  paginaNum: number,
  totalPaginas: number,
  fam: Familia,
  fontRegular: PDFFont
): void {
  pagina.drawLine({
    start: { x: MARGEN, y: MARGEN + 16 },
    end: { x: A4_ANCHO - MARGEN, y: MARGEN + 16 },
    color: COLOR_LINEA,
    thickness: 0.5,
  })

  pagina.drawText('CuidaRed · Elaboración propia según Jacquier et al. (2014) · Confidencial bajo Ley 25.326', {
    x: MARGEN,
    y: MARGEN + 6,
    size: 6.8,
    font: fontRegular,
    color: COLOR_APAGADO,
  })

  if (fam.syncEstado && fam.syncEstado !== 'enviado') {
    pagina.drawText('[!] Contiene datos sin sincronizar con la Central', {
      x: MARGEN + 220,
      y: MARGEN + 6,
      size: 6.8,
      font: fontRegular,
      color: COLOR_ATENCION,
    })
  }

  pagina.drawText(`Página ${paginaNum} de ${totalPaginas}`, {
    x: A4_ANCHO - MARGEN - 55,
    y: MARGEN + 6,
    size: 7,
    font: fontRegular,
    color: COLOR_APAGADO,
  })
}
