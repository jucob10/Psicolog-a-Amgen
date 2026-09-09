// Parser del Excel de Bienestar360.
//
// Reutiliza la misma tubería del proyecto original (`readWorkbook` /
// `getValueFromExcelRow` en lib/excel.ts): detección de fila de encabezados
// por puntaje + búsqueda de columna tolerante a variaciones. Aquí solo cambian
// las palabras clave y el mapeo de columnas — la lógica de lectura del .xlsx
// (SheetJS) no se toca.

import { getValueFromExcelRow, readWorkbook } from '../excel'
import { parseExcelDate } from '../dates'
import { cleanNumber } from '../numbers'
import { toSafeString } from '../normalize'
import { getDepartamentoLabel } from '../departamentos'
import type { ExcelRow, GestionBienestar, ParseResult } from '../../types'

/** Palabras clave para localizar la fila de encabezados en la matriz de Bienestar360. */
export const BIENESTAR_HEADER_KEYWORDS = [
  'fecha de gestion',
  'categorizacion',
  'institucion',
  'asistentes',
  'tipo de poblacion',
  'tipo de actividad',
  'nombre actividad',
  'ciudad',
  'departamento',
  'enfermero',
]

/** "n/a" (en cualquier caja) o vacío → null. Cualquier otra cosa se conserva. */
function naToNull(val: unknown): string | null {
  const s = toSafeString(val)
  if (s === '' || s.trim().toLowerCase() === 'n/a') return null
  return s
}

/**
 * "Alisson Moscoso / Juan Perez" → ["Alisson Moscoso", "Juan Perez"].
 * Sin barra, un único nombre. Vacío → [].
 */
export function splitProfesionales(val: unknown): string[] {
  const s = toSafeString(val)
  if (!s) return []
  return s
    .split('/')
    .map((n) => n.trim())
    .filter(Boolean)
}

/** "n/a"/vacío → null; cualquier otro valor de fecha → "YYYY-MM-DD" o null si no se pudo parsear. */
function parseDateOrNull(val: unknown): string | null {
  if (naToNull(val) === null) return null
  const d = parseExcelDate(val)
  return d || null
}

/** Convierte una fila cruda del Excel en un registro tipado. */
export function parseRow(row: ExcelRow, id: number): GestionBienestar {
  // "Ciudad " en el Excel real trae un espacio final en el encabezado.
  // getValueFromExcelRow normaliza (normalizeKey colapsa espacios) al buscar,
  // así que "Ciudad" y "Ciudad " coinciden igual — no hace falta tocar el
  // Excel, solo pedir el nombre limpio.
  const ciudad = toSafeString(getValueFromExcelRow(row, ['Ciudad']))
  const departamentoRaw = toSafeString(getValueFromExcelRow(row, ['Departamento']))

  const esVirtual =
    ciudad.trim().toLowerCase() === 'virtual' || departamentoRaw.trim().toLowerCase() === 'virtual'

  // Normaliza a la MISMA etiqueta que usa el GeoJSON de departamentos
  // (getDepartamentoLabel: "Boyaca" → "Boyacá", etc.) para que el mapa se una
  // sin traducir nada en tiempo de ejecución. "Virtual" no tiene equivalente
  // en el mapa y se deja tal cual — nunca se busca ahí, por `esVirtual`.
  const departamento = esVirtual ? departamentoRaw : getDepartamentoLabel(departamentoRaw)

  return {
    id,
    fechaGestion: parseExcelDate(getValueFromExcelRow(row, ['Fecha de gestion', 'Fecha de gestión'])),
    categorizacion: toSafeString(getValueFromExcelRow(row, ['Categorizacion', 'Categorización'])),
    institucion: toSafeString(getValueFromExcelRow(row, ['Institucion', 'Institución'])),
    asistentes: cleanNumber(getValueFromExcelRow(row, ['Asistentes'])),
    tipoPoblacion: toSafeString(getValueFromExcelRow(row, ['Tipo de poblacion', 'Tipo de población'])),
    tipoActividad: toSafeString(getValueFromExcelRow(row, ['Tipo de actividad'])),
    nombreActividad: toSafeString(getValueFromExcelRow(row, ['Nombre actividad'])),
    ciudad,
    departamento,
    esVirtual,
    envioPropuesta: parseDateOrNull(getValueFromExcelRow(row, ['Envio propuesta', 'Envío propuesta'])),
    respuestaPropuesta: parseDateOrNull(
      getValueFromExcelRow(row, ['respuesta de la propuesta']),
    ),
    estadoPropuesta: naToNull(getValueFromExcelRow(row, ['Estado propuesta'])),
    profesionales: splitProfesionales(getValueFromExcelRow(row, ['Enfermero'])),
    comentarios: toSafeString(getValueFromExcelRow(row, ['Comentarios'])),
  }
}

/** Lee un ArrayBuffer de .xlsx/.xls/.csv y devuelve las filas de gestión ya parseadas. */
export function parseBienestar360(buffer: ArrayBuffer): ParseResult {
  const { rows, headerIndex, score } = readWorkbook(buffer, BIENESTAR_HEADER_KEYWORDS)

  const errores: string[] = []
  if (score < 3) {
    errores.push(
      `Puntaje bajo de encabezados (${score}) en la fila ${headerIndex + 1}: revisa que el Excel tenga las columnas esperadas.`,
    )
  }

  const parsed = rows.map((row, i) => parseRow(row, i + 1))

  return { rows: parsed, headerScore: score, errores }
}
