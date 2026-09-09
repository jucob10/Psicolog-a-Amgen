// Paleta de series y escala de color estable.
//
// Regla que el proyecto original rompía: el color debe seguir a la ENTIDAD,
// nunca a su posición en el ranking. Antes, `CHART_COLORS.slice(0, n)` sobre
// datos ya ordenados hacía que al filtrar "Sanitas" pasara de azul a naranja.
// Aquí el color se fija una vez contra el dataset COMPLETO y no se mueve.

import type { CountMap } from '../lib/kpis'
import type { ThemeId } from '../store/useTheme'

/**
 * Ocho slots validados sobre la superficie #1e2130. Orden fijo, nunca ciclado.
 *
 * Los mismos ocho tonos valen en el tema claro y no hizo falta una segunda
 * paleta: al haber sido elegidos dentro de una banda media de luminosidad,
 * todos superan también 3:1 contra el blanco (el más ajustado es el amarillo
 * #c98500, con 3.07:1). Es decir, el color de "Sanitas" es el mismo en los dos
 * temas — lo que cambia con el tema es el CHROME, nunca la identidad del dato.
 */
export const SERIES = [
  '#3987e5', // 1 azul
  '#d95926', // 2 naranja
  '#199e70', // 3 aqua
  '#c98500', // 4 amarillo
  '#d55181', // 5 magenta
  '#008300', // 6 verde
  '#9085e9', // 7 violeta
  '#e66767', // 8 rojo
] as const

/** Novena categoría en adelante: se agrupan en "Otros", nunca se genera un tono nuevo. */
export const OTHER_COLOR = '#6b7280'
export const OTHER_LABEL = 'Otros'
export const MAX_SLOTS = SERIES.length

export interface ColorScale {
  /** Color estable para una categoría. */
  get: (key: string) => string
  /** Categorías que ocupan slot propio, en orden de asignación. */
  named: string[]
}

/**
 * Construye la escala a partir del dataset COMPLETO (sin filtrar).
 * Las 8 categorías más frecuentes reciben un slot; el resto comparte "Otros".
 */
export function buildColorScale(fullData: CountMap): ColorScale {
  const named = Object.entries(fullData)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, MAX_SLOTS)
    .map(([k]) => k)

  const map = new Map<string, string>()
  named.forEach((k, i) => map.set(k, SERIES[i]))

  return {
    named,
    get: (key) => map.get(key) ?? OTHER_COLOR,
  }
}

export interface Slice {
  name: string
  value: number
  color: string
}

export interface SliceResult {
  slices: Slice[]
  /** Cuántas categorías se plegaron en "Otros". */
  folded: number
  /** Pacientes que suman esas categorías plegadas. */
  foldedCount: number
  /**
   * Los NOMBRES de las categorías plegadas.
   *
   * Existe porque "Otros" no es una categoría: es un saco. Sin esta lista, un
   * clic en esa porción intentaría filtrar por un valor llamado literalmente
   * «Otros», no encontraría ningún paciente y el dashboard se quedaría en cero
   * sin decir por qué. Con ella, el clic filtra por «cualquiera de estas».
   *
   * Y tiene que salir de AQUÍ y no de `scale.named`: la escala se fija contra el
   * dataset completo, mientras que lo que se pliega depende del ranking de la
   * selección actual. No son siempre las mismas ocho.
   */
  foldedNames: string[]
}

/**
 * Reduce un CountMap a como mucho 8 categorías + "Otros".
 * Devuelve también cuántas se plegaron, para poder decirlo en pantalla
 * (nunca truncar en silencio).
 */
export function toSlices(data: CountMap, scale: ColorScale, limit = MAX_SLOTS): SliceResult {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))

  const head = entries.slice(0, limit)
  const tail = entries.slice(limit)

  const slices: Slice[] = head.map(([name, value]) => ({
    name,
    value,
    color: scale.get(name),
  }))

  const foldedCount = tail.reduce((s, [, v]) => s + v, 0)
  if (tail.length > 0) {
    slices.push({ name: OTHER_LABEL, value: foldedCount, color: OTHER_COLOR })
  }

  return {
    slices,
    folded: tail.length,
    foldedCount,
    foldedNames: tail.map(([name]) => name),
  }
}

/**
 * Traduce el clic en una marca al par que entiende el cross-filter.
 *
 * Para una categoría normal es identidad. Para "Otros" devuelve la lista de lo
 * que hay dentro del saco, y el filtro pasa a ser de pertenencia.
 */
export function crossFromPick(
  name: string,
  foldedNames: string[],
): { value: string; oneOf?: string[] } {
  if (name !== OTHER_LABEL || foldedNames.length === 0) return { value: name }
  return { value: OTHER_LABEL, oneOf: foldedNames }
}

/* ─────────────── Rampa secuencial (mapa) ─────────────── */

/**
 * Rampa de un solo tono para el coroplético.
 *
 * El mapa codifica MAGNITUD, no identidad: por eso no usa la paleta categórica
 * —que diría "Antioquia es azul y Meta naranja", cuando lo que hay que leer es
 * "Antioquia tiene más que Meta"—. Un solo matiz recorrido en claridad es lo
 * único que se ordena sin leyenda.
 */
export const MAP_RAMP: Record<ThemeId, string[]> = {
  dark: ['#22304a', '#1d5091', '#2477cf', '#4f9dea', '#8dc4f7'],
  light: ['#e8f1fc', '#b7d4f5', '#7fb2ef', '#3987e5', '#1a5fbf'],
}

/**
 * Relleno de un departamento SIN datos. Deliberadamente fuera de la rampa:
 * "cero pacientes" y "este departamento no aparece en la matriz" no son lo
 * mismo, y pintar los dos con el tono más bajo los confundiría.
 *
 * Es también el TONO DE TIERRA del mapa, y por eso no puede ser el color de la
 * tarjeta: antes valía #eef1f6 sobre una tarjeta blanca (1,06:1), es decir, el
 * croquis de Colombia era invisible en tema claro y una mancha sin bordes en
 * oscuro. Ahora separa de la superficie lo suficiente para que la silueta del
 * país se lea antes que cualquier dato encima de ella.
 *
 * Es pizarra y no azul a propósito: en luminancia queda cerca del primer paso
 * de la rampa, así que lo que los separa es el CROMA —13 frente a 20 en claro,
 * 30 frente a 40 en oscuro—. "Sin datos" se ve apagado; "poca gestión", teñido.
 */
export const MAP_NO_DATA: Record<ThemeId, string> = {
  dark: '#31364f',
  light: '#d6dbe3',
}

/**
 * Tierra en el nivel CIUDAD, donde el coroplético no lleva dato: es contexto,
 * un punto más callado que MAP_NO_DATA, pero contexto que SE VE. Lo que antes
 * había aquí —el color de la tarjeta rebajado al 55 %— no era contexto tenue,
 * era nada: los círculos flotaban sobre un rectángulo vacío.
 */
export const MAP_LAND_CTX: Record<ThemeId, string> = {
  dark: '#2c3147',
  light: '#e0e4eb',
}

/**
 * Línea entre departamentos.
 *
 * Tiene que sobrevivir a los DOS extremos de la rampa —el paso más claro y el
 * más oscuro—, así que es un tono medio y no el color de la tarjeta: contra
 * #e8f1fc da 2,4:1 y contra #1a5fbf, 2,3:1. Una divisoria en el color del
 * fondo solo funciona mientras el relleno sea claro; en cuanto un departamento
 * se pinta oscuro, deja de haber divisoria.
 */
export const MAP_BORDER: Record<ThemeId, string> = {
  dark: '#5b6a8c',
  light: '#94a3b8',
}

/**
 * Costa: el borde EXTERIOR del país, más firme que las divisorias internas.
 * Lo dibuja la capa `geo` por debajo de la serie (ver MapChart), que solo deja
 * ver la mitad de fuera del trazo — que es justo el contorno de Colombia.
 */
export const MAP_COAST: Record<ThemeId, string> = {
  dark: '#8496ba',
  light: '#5b6880',
}

/**
 * Halo de mar. Sombra que se derrama hacia fuera de la silueta para separarla
 * de la tarjeta: hace que Colombia se lea como una pieza apoyada encima y no
 * como un relleno del mismo plano.
 */
export const MAP_SEA: Record<ThemeId, string> = {
  dark: 'rgba(0, 0, 0, 0.55)',
  light: 'rgba(91, 104, 128, 0.28)',
}
