// Lectura de Excel. Portado literal de app.js:
//   expandMergedCells + detección de fila de encabezados por scoring + getValueFromExcelRow
// Toda la inteligencia de mapeo de columnas vive aquí y es pura.

import * as XLSX from 'xlsx'
import type { WorkSheet } from 'xlsx'
import { normalizeKey } from './normalize'
import type { ExcelRow } from '../types'

/**
 * Rellena las celdas vacías que resultan de un "merge" en Excel con el valor
 * de la celda origen. Crítico para que los encabezados combinados se lean bien.
 */
export function expandMergedCells(worksheet: WorkSheet): void {
  const merges = worksheet['!merges']
  if (!merges || merges.length === 0) return

  merges.forEach((merge) => {
    const baseAddr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })
    const baseCell = worksheet[baseAddr]
    if (!baseCell) return

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue // celda origen
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!worksheet[addr]) {
          worksheet[addr] = Object.assign({}, baseCell)
        }
      }
    }
  })
}

/** Palabras clave de las matrices de pacientes (Raras y Vectibix). */
export const HEADER_KEYWORDS = [
  'psp', 'paciente', 'documento', 'eps', 'estado', 'mipres', 'fecha',
  'nombre', 'edad', 'regimen', 'departamento', 'identificacion', 'cedula',
  'radicacion', 'formulacion', 'aprobacion', 'tiempo', 'municipio',
]

/** El Excel de Pre-Código tiene otras columnas, así que puntúa distinto. */
export const PC_HEADER_KEYWORDS = [
  'informacion', 'terapia', 'eps', 'regimen', 'ciudad', 'medico', 'fecha',
  'consecutivo', 'observacion', 'hc',
]

export interface SheetReadResult {
  rows: ExcelRow[]
  headers: string[]
  headerIndex: number
  score: number
}

/**
 * Encuentra la fila de encabezados real (las matrices de PSP suelen tener
 * títulos y logos arriba) puntuando cada una de las primeras 30 filas
 * por cuántas palabras clave contiene.
 */
export function detectHeaderRow(
  rowsArray: unknown[][],
  keywords: string[] = HEADER_KEYWORDS,
): { headerIndex: number; score: number } {
  let headerIndex = 0
  let bestScore = 0
  const limit = Math.min(rowsArray.length, 30)

  for (let i = 0; i < limit; i++) {
    const row = rowsArray[i]
    if (!row || !Array.isArray(row)) continue
    const rowStr = normalizeKey(row.map((c) => (c == null ? '' : String(c))).join('|'))
    const score = keywords.filter((kw) => rowStr.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      headerIndex = i
    }
  }
  return { headerIndex, score: bestScore }
}

/**
 * Convierte una hoja en objetos { encabezado: valor }.
 *
 * Se construyen manualmente desde la matriz cruda en vez de usar
 * sheet_to_json({range}) porque así:
 *   - no se pierde ninguna fila,
 *   - los tipos son los originales (Date / number / string),
 *   - funciona aunque haya filas parcialmente vacías al final.
 */
export function sheetToObjects(
  worksheet: WorkSheet,
  keywords: string[] = HEADER_KEYWORDS,
): SheetReadResult {
  expandMergedCells(worksheet)

  const rowsArray = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  })

  const { headerIndex, score } = detectHeaderRow(rowsArray, keywords)

  const headerRow = (rowsArray[headerIndex] || []) as unknown[]
  const headers = headerRow.map((h, i) => {
    if (h == null) return `__col_${i}__`
    const str = String(h).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
    return str !== '' ? str : `__col_${i}__`
  })

  const dataRows = rowsArray
    .slice(headerIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => cell != null && cell !== ''))

  const rows: ExcelRow[] = dataRows.map((row) => {
    const obj: ExcelRow = {}
    headers.forEach((h, i) => {
      const val = (row as unknown[])[i]
      obj[h] = val !== undefined && val !== null ? val : ''
    })
    return obj
  })

  return { rows, headers, headerIndex, score }
}

/** Lee un ArrayBuffer de .xlsx/.xls/.csv y devuelve las filas de la primera hoja. */
export function readWorkbook(
  buffer: ArrayBuffer,
  keywords: string[] = HEADER_KEYWORDS,
): SheetReadResult {
  const data = new Uint8Array(buffer)
  // cellDates:true → las celdas de fecha se parsean como objetos Date
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) throw new Error('El archivo no contiene hojas legibles.')
  return sheetToObjects(worksheet, keywords)
}

/**
 * Busca en una fila el valor de la primera columna que coincida con alguno
 * de los nombres candidatos. Primero exacto, después parcial con exclusiones
 * de contexto.
 *
 * Las exclusiones son la parte delicada y están ajustadas contra matrices
 * reales — no simplificar sin tests:
 *   - "Tipo de Documento" nunca debe ganarle a "Número de Documento"
 *   - buscar una entidad (EPS, paciente, PSP) nunca debe caer en una columna de fecha
 *   - "Estado" nunca debe caer en "Estado del MIPRES" ni en "Razón de estado"
 */
export function getValueFromExcelRow(
  row: ExcelRow,
  possibleMatches: string[],
): unknown {
  const keys = Object.keys(row)
  const normalizedKeys = keys.map((k) => ({ original: k, normalized: normalizeKey(k) }))

  // 1. Coincidencia exacta (prioridad máxima)
  for (const match of possibleMatches) {
    const normMatch = normalizeKey(match)
    const found = normalizedKeys.find((nk) => nk.normalized === normMatch)
    if (found) {
      const v = row[found.original]
      return v !== null && v !== undefined ? v : ''
    }
  }

  // 2. Coincidencia parcial con exclusiones de contexto
  for (const match of possibleMatches) {
    const normMatch = normalizeKey(match)
    if (normMatch.length < 3) continue

    for (const nk of normalizedKeys) {
      const normKey = nk.normalized

      // BLOQUEO DE TIPO: evita tomar "Tipo de Documento" como "Documento"
      const isIdentifier = ['documento', 'identificacion', 'cedula', 'eps', 'psp'].some((s) =>
        normMatch.includes(s),
      )
      if (isIdentifier && normKey.includes('tipo')) continue

      // REGLA DE ORO: buscando un identificador o nombre → ignorar columnas de fecha/tiempo
      const isEntitySearch = ['psp', 'eps', 'paciente', 'nombre', 'documento', 'entidad'].some(
        (s) => normMatch.includes(s),
      )
      if (isEntitySearch) {
        const isForbidden = [
          'fecha', 'tiempo', 'date', 'time', 'vencimiento', 'reporte', 'formulacion', 'radicacion',
        ].some((s) => normKey.includes(s))
        if (isForbidden) continue
      }

      // Exclusiones específicas
      if (normMatch === 'estado' && (normKey.includes('mipres') || normKey.includes('razon'))) continue
      if (normMatch === 'eps' && (normKey.includes('identidad') || normKey.includes('documento'))) continue
      if (normMatch === 'departamento' && normKey.includes('nacimiento')) continue

      if (normKey.includes(normMatch)) {
        const v = row[nk.original]
        return v !== null && v !== undefined ? v : ''
      }
    }
  }

  return ''
}
