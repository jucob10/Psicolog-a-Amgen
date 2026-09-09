// Fragmentos de opciones compartidos por todas las gráficas.
// Reemplazan al CHART_DEFAULTS del proyecto original.
//
// Todo lo de aquí es función del tema. ECharts pinta sobre <canvas>, así que no
// hereda variables CSS: si el tema cambia, hay que reconstruir las opciones.
// Por eso `ink` se pasa explícitamente y `theme` entra en las dependencias del
// useMemo de cada gráfica — un tema nuevo es un repintado, no un parche de color.

import type { ThemeId } from '../store/useTheme'

export interface Ink {
  primary: string
  secondary: string
  muted: string
  grid: string
  /** Fondo de la tarjeta: es el que se usa para separar marcas y al exportar PNG. */
  surface: string
  surfaceUp: string
  border: string
}

const DARK: Ink = {
  primary: '#e8eaed',
  secondary: '#9aa0b0',
  muted: '#6b7280',
  grid: 'rgba(58, 61, 78, 0.55)',
  surface: '#1e2130',
  surfaceUp: '#252840',
  border: '#3a3d4e',
}

const LIGHT: Ink = {
  primary: '#1a1d29',
  secondary: '#5b6272',
  muted: '#858c9c',
  grid: 'rgba(26, 29, 41, 0.10)',
  surface: '#ffffff',
  surfaceUp: '#ffffff',
  border: '#dbe1ec',
}

export function inkFor(theme: ThemeId): Ink {
  return theme === 'light' ? LIGHT : DARK
}

/** Tinta por defecto, para el código que aún no es reactivo al tema. */
export const INK_TOKENS = DARK

export const FONT = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'

/** Tooltip, consistente en todas las gráficas y en los dos temas. */
export const tooltipBase = (ink: Ink) => ({
  backgroundColor: ink.surfaceUp,
  borderColor: ink.border,
  borderWidth: 1,
  padding: [9, 12] as [number, number],
  textStyle: { color: ink.primary, fontFamily: FONT, fontSize: 12 },
  extraCssText:
    ink === LIGHT
      ? 'border-radius:8px; box-shadow:0 10px 30px rgba(26,29,41,.16);'
      : 'border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,.5);',
})

/** Ejes recesivos: la tinta la lleva el dato, no la rejilla. */
export const axisLabel = (ink: Ink) => ({
  color: ink.secondary,
  fontFamily: FONT,
  fontSize: 11,
})

export const valueAxis = (ink: Ink) => ({
  type: 'value' as const,
  splitLine: { lineStyle: { color: ink.grid, type: 'dashed' as const } },
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: axisLabel(ink),
  minInterval: 1,
})

export const categoryAxis = (ink: Ink) => ({
  type: 'category' as const,
  axisLine: { lineStyle: { color: ink.border } },
  axisTick: { show: false },
  splitLine: { show: false },
  axisLabel: axisLabel(ink),
})

/** Etiqueta directa sobre la marca, en tinta de texto (nunca en el color de la serie). */
export const directLabel = (ink: Ink) => ({
  show: true,
  color: ink.primary,
  fontFamily: FONT,
  fontSize: 11,
  fontWeight: 700 as const,
})

/**
 * Botón de descarga PNG en la esquina de cada gráfica.
 * Es la función nativa de ECharts: exporta a la resolución de pantalla ×2
 * y con el fondo de la tarjeta DEL TEMA ACTUAL, para que se pueda pegar en un
 * informe sin un rectángulo oscuro alrededor.
 */
export function toolbox(name: string, ink: Ink) {
  return {
    show: true,
    right: 2,
    top: -2,
    itemSize: 13,
    iconStyle: { borderColor: ink.muted },
    emphasis: { iconStyle: { borderColor: ink.primary } },
    feature: {
      saveAsImage: {
        title: 'Descargar PNG',
        name,
        pixelRatio: 2,
        backgroundColor: ink.surface,
      },
    },
  }
}

/** Relleno del control de zoom, en función del tema. */
export const zoomStyle = (ink: Ink) => ({
  borderColor: ink.border,
  backgroundColor: ink === LIGHT ? 'rgba(226,232,240,.5)' : 'rgba(37,40,64,.5)',
  fillerColor: 'rgba(57,135,229,.16)',
  handleStyle: { color: ink.secondary },
  textStyle: { color: ink.muted, fontSize: 10 },
})

/** Animación de entrada/transición común. */
export const animation = {
  animationDuration: 620,
  animationEasing: 'cubicOut' as const,
  animationDurationUpdate: 420,
  animationEasingUpdate: 'cubicInOut' as const,
  universalTransition: { enabled: true },
}

/**
 * Entrada escalonada: las marcas aparecen una tras otra en vez de todas a la vez.
 *
 * Los dos campos son la clave, y hay que leerlos juntos:
 *
 * · `animationDelay` corre en la ENTRADA — la primera vez que se dibuja la
 *   gráfica. Ahí la cascada es un acierto: la vista se compone delante de ti y
 *   el orden del ranking se percibe antes de leer una sola etiqueta.
 * · `animationDelayUpdate` corre en cada ACTUALIZACIÓN, y va a cero a propósito.
 *   Sin esa distinción, la misma cascada se repetiría en cada clic de
 *   cross-filter: en una herramienta que se usa a diario, media cascada veinte
 *   veces al día deja de ser encanto y pasa a ser espera.
 *
 * Para que ECharts sepa distinguir una cosa de la otra hace falta que la serie
 * lleve `id` estable (ver `serieId`): sin él, y con `notMerge`, cada opción
 * nueva es una serie nueva, todo cuenta como entrada y la cascada vuelve.
 *
 * El tope evita que una gráfica con 40 categorías tarde dos segundos en cuajar.
 */
export function entradaEscalonada(paso = 24, tope = 480) {
  return {
    animationDelay: (i: number) => Math.min(i * paso, tope),
    animationDelayUpdate: 0,
  }
}

/**
 * Realce al pasar el cursor.
 *
 * `focus: 'self'` es lo que hace el trabajo: apaga las demás marcas mientras el
 * cursor está sobre una. No es decoración —aísla lo que estás mirando, que es
 * justo lo que cuesta en una dona de doce porciones o en un mapa de treinta y
 * tres departamentos.
 *
 * El realce va en TINTA, no en color de serie: subirle la saturación a la marca
 * la movería dentro de la escala de color y parecería otra categoría.
 */
export function realce(ink: Ink) {
  return {
    focus: 'self' as const,
    blurScope: 'coordinateSystem' as const,
    itemStyle: {
      borderColor: ink.primary,
      borderWidth: 1.5,
      shadowBlur: 12,
      shadowColor: ink === LIGHT ? 'rgba(26, 29, 41, 0.22)' : 'rgba(0, 0, 0, 0.55)',
    },
  }
}

/**
 * Cómo quedan las marcas NO señaladas. 0,3 y no menos: por debajo de eso la
 * categoría desaparece, y el punto era compararla con la señalada, no perderla.
 */
export const apagado = { itemStyle: { opacity: 0.3 } }

/**
 * ECharts tipa los callbacks de formatter con uniones muy anchas.
 * Estos helpers estrechan a lo que realmente usamos, sin salpicar `any`:
 * el parámetro se declara `unknown` (siempre asignable) y se estrecha dentro.
 */
export interface FmtParam {
  name: string
  value: number
  percent: number
  dataIndex: number
  color: string
  data?: { name?: string; value?: number }
}

export const asParam = (raw: unknown): FmtParam => raw as FmtParam

export const asParams = (raw: unknown): FmtParam[] =>
  (Array.isArray(raw) ? raw : [raw]) as FmtParam[]

/** Opacidad de una marca cuando hay un cross-filter activo sobre otra categoría. */
export function markOpacity(selected: string | null, name: string): number {
  if (!selected) return 1
  return selected === name ? 1 : 0.22
}
