// Portado literal de app.js (parseExcelDate / formatDate).
// Incluye el fix de timezone con métodos UTC — no tocar.

import { SSF } from 'xlsx'

/**
 * Normaliza cualquier valor de fecha de Excel a "YYYY-MM-DD" (o '' si no es fecha).
 *
 * IMPORTANTE: para objetos Date se usan métodos UTC. XLSX almacena las fechas
 * como medianoche UTC; getDate() usa hora local → en Colombia (UTC-5) daría
 * el día anterior. getUTCDate() es siempre correcto.
 */
export function parseExcelDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return ''

  // Objeto Date de JS (viene de cellDates:true en XLSX.read)
  if (val instanceof Date) {
    const y = val.getUTCFullYear()
    const m = String(val.getUTCMonth() + 1).padStart(2, '0')
    const d = String(val.getUTCDate()).padStart(2, '0')
    if (y < 1900 || y > 2200) return '' // descartar seriales inválidos
    return `${y}-${m}-${d}`
  }

  // Número: serial de fecha de Excel (poco común con cellDates:true)
  if (typeof val === 'number') {
    // 1 = 1 ene 1900. Rango razonable: 10000–70000 (~1927–2091)
    if (val > 10000 && val < 70000) {
      try {
        const d = SSF.parse_date_code(val)
        if (d) {
          const y = d.y
          const m = String(d.m).padStart(2, '0')
          const day = String(d.d).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
      } catch {
        /* ignorar */
      }
    }
    return ''
  }

  // String — intentar varios formatos
  if (typeof val === 'string') {
    const str = val.split('T')[0].trim() // quitar parte de hora en ISO
    if (!str) return ''
    const parts = str.split(/[-/.]/)
    if (parts.length === 3) {
      let day: string, mon: string, yr: string
      if (parts[0].length === 4) {
        // YYYY-MM-DD | YYYY/MM/DD
        yr = parts[0]
        mon = parts[1]
        day = parts[2]
      } else {
        // DD-MM-YYYY | DD/MM/YYYY
        day = parts[0]
        mon = parts[1]
        yr = parts[2]
      }
      if (yr && yr.length === 4) {
        return `${yr}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      if (yr && yr.length === 2) {
        const fullYr = parseInt(yr, 10) <= 50 ? '20' + yr : '19' + yr
        return `${fullYr}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    // Último recurso
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10)
  }

  return ''
}

/** "2026-03-15" → "15/03/2026" */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  if (typeof dateStr === 'string' && dateStr.length === 10) {
    const parts = dateStr.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

/** Filtro de fecha por año/mes usado en Vectibix. `year === 'Todos'` deja pasar todo. */
export function dateMatch(dateStr: string, year: string, mes: string): boolean {
  if (year === 'Todos') return true
  if (!dateStr) return false
  if (dateStr.substring(0, 4) !== year) return false
  if (mes !== 'Todos' && dateStr.substring(5, 7) !== mes) return false
  return true
}

export const MESES_MAP: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

export const MES_CORTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

/** "2026-03" → "Mar 2026" */
export function fmtYM(ym: string): string {
  const [y, m] = ym.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MES_CORTO[idx] ?? m} ${y}`
}
