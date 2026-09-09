// Portado literal de app.js (normalizeKey / toSafeString).
// Funciones puras: no tocan el DOM y por eso son testeables.

/** Marcas diacríticas combinantes (acentos) — U+0300..U+036F */
const DIACRITICS = /[̀-ͯ]/g

/**
 * Normaliza un encabezado de Excel para poder compararlo:
 * minúsculas, sin acentos, sin saltos de línea, espacios colapsados.
 */
export function normalizeKey(str: unknown): string {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[\r\n\t]+/g, ' ') // colapsar saltos de línea y tabulaciones
    .replace(/\s+/g, ' ') // colapsar múltiples espacios en uno
    .trim()
}

/** Igual que normalizeKey pero conservando mayúsculas/minúsculas originales. */
export function stripAccents(str: unknown): string {
  if (!str) return ''
  return String(str).normalize('NFD').replace(DIACRITICS, '')
}

/**
 * Convierte cualquier valor a string seguro.
 * Impide que un objeto Date accidentalmente en una columna de texto
 * se guarde como "[object Date]".
 */
export function toSafeString(val: unknown): string {
  if (val === null || val === undefined || val === '') return ''
  if (val instanceof Date) {
    // Una fecha en una columna de texto es probablemente un PSP o doc numérico
    // formateado como fecha por accidente. Devolvemos algo legible.
    const y = val.getUTCFullYear()
    const m = String(val.getUTCMonth() + 1).padStart(2, '0')
    const d = String(val.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(val).trim()
}
