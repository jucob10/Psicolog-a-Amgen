// Portado literal de app.js (cleanNumber).

/**
 * Convierte a número tolerando formato europeo ("1.234,56") y
 * americano ("1,234.56"), símbolos de moneda y espacios.
 * Devuelve 0 en vez de NaN para que los promedios nunca se envenenen.
 */
export function cleanNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val

  let strVal = String(val).trim()
  if (strVal === '') return 0

  // Remover caracteres no numéricos excepto punto, coma y signo menos
  strVal = strVal.replace(/[^0-9,.\-]/g, '')
  if (strVal === '' || strVal === '-') return 0

  const dotCount = (strVal.match(/\./g) || []).length
  const commaCount = (strVal.match(/,/g) || []).length

  let cleaned: string
  if (commaCount > 1) {
    // "1,234,567" → separadores de miles americanos → quitar comas
    cleaned = strVal.replace(/,/g, '')
  } else if (dotCount > 1) {
    // "1.234.567" → separadores de miles europeos → quitar puntos
    cleaned = strVal.replace(/\./g, '')
  } else if (commaCount === 1 && dotCount === 1) {
    // Determinar cuál es decimal según posición: "1,234.56" vs "1.234,56"
    const lastDot = strVal.lastIndexOf('.')
    const lastComma = strVal.lastIndexOf(',')
    if (lastComma > lastDot) {
      // Europeo: "1.234,56"
      cleaned = strVal.replace(/\./g, '').replace(',', '.')
    } else {
      // Americano: "1,234.56"
      cleaned = strVal.replace(/,/g, '')
    }
  } else if (commaCount === 1) {
    // Solo una coma → probablemente decimal europeo: "1234,56"
    cleaned = strVal.replace(',', '.')
  } else {
    cleaned = strVal
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}
