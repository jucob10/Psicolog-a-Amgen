// Agregaciones genéricas (groupBy / rank), portadas del proyecto original.
// Puras: no saben que existe un DOM ni un mapa.

export type CountMap = Record<string, number>

/** Agrupa y SUMA (no cuenta filas) un valor numérico por un campo. Los vacíos caen en 'Sin dato'. */
export function sumBy<T extends object>(
  items: T[],
  key: keyof T,
  value: (item: T) => number,
): CountMap {
  const result: CountMap = {}
  items.forEach((item) => {
    const raw = item[key]
    const val = !raw || String(raw).trim() === '' ? 'Sin dato' : String(raw)
    result[val] = (result[val] || 0) + value(item)
  })
  return result
}

/** Agrupa y cuenta filas por un campo. Los vacíos caen en 'Sin dato'. */
export function groupBy<T extends object>(items: T[], key: keyof T): CountMap {
  return sumBy(items, key, () => 1)
}

/** CountMap → array ordenado de mayor a menor, con porcentaje. */
export interface RankedRow {
  key: string
  count: number
  pct: number
}

export function rank(data: CountMap): { rows: RankedRow[]; total: number } {
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  const rows = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      count,
      pct: total > 0 ? (count / total) * 100 : 0,
    }))
  return { rows, total }
}
