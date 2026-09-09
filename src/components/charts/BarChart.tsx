import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { useInk } from '../../charts/useInk'
import {
  animation,
  apagado,
  asParam,
  asParams,
  axisLabel,
  categoryAxis,
  directLabel,
  markOpacity,
  realce,
  toolbox,
  tooltipBase,
  valueAxis,
  zoomStyle,
} from '../../charts/base'
import type { Slice } from '../../charts/palette'

interface Props {
  slices: Slice[]
  /** 'h' = barras horizontales (mejor para etiquetas largas como EPS o IPS). */
  orientation?: 'v' | 'h'
  height?: number
  selected?: string | null
  onPick?: (name: string) => void
  unit?: string
  /** Activa el control de zoom cuando hay muchas categorías. */
  zoom?: boolean
  exportName?: string
}

export function BarChart({
  slices,
  orientation = 'v',
  height = 280,
  selected = null,
  onPick,
  unit = 'pacientes',
  zoom = false,
  exportName = 'grafica',
}: Props) {
  const { ink, theme } = useInk()

  const option = useMemo<EChartsOption>(() => {
    const horizontal = orientation === 'h'
    // En horizontal ECharts pinta de abajo hacia arriba: invertimos para
    // que el mayor quede arriba.
    const data = horizontal ? [...slices].reverse() : slices
    const names = data.map((s) => s.name)
    const showZoom = zoom && slices.length > 12

    return {
      ...animation,
      // La cascada tiene que arrancar SIEMPRE por la barra mayor. En horizontal
      // el array va invertido —ECharts pinta de abajo arriba y se le da la
      // vuelta para que el mayor quede arriba—, así que ahí el índice 0 es el
      // menor y hay que contar al revés. Sin esto, media gráfica entraría
      // empezando por la barra más corta y la cascada no diría nada del orden.
      animationDelay: (i: number) =>
        Math.min((horizontal ? data.length - 1 - i : i) * 24, 480),
      animationDelayUpdate: 0,
      toolbox: toolbox(exportName, ink),
      grid: {
        left: horizontal ? 4 : 6,
        right: horizontal ? 30 : 10,
        top: 22,
        bottom: showZoom ? 34 : 4,
        containLabel: true,
      },
      tooltip: {
        ...tooltipBase(ink),
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: theme === 'light' ? 'rgba(26,29,41,0.05)' : 'rgba(255,255,255,0.04)',
          },
        },
        formatter: (raw: unknown) => {
          const p = asParams(raw)[0]
          const total = slices.reduce((s, x) => s + x.value, 0)
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0'
          return `<b>${p.name}</b><br/>${p.value} ${unit} · ${pct}%`
        },
      },
      xAxis: horizontal
        ? { ...valueAxis(ink) }
        : {
            ...categoryAxis(ink),
            data: names,
            axisLabel: {
              ...axisLabel(ink),
              interval: 0,
              rotate: names.length > 7 ? 32 : 0,
              hideOverlap: true,
            },
          },
      yAxis: horizontal
        ? {
            ...categoryAxis(ink),
            data: names,
            axisLabel: { ...axisLabel(ink), width: 140, overflow: 'truncate' },
          }
        : { ...valueAxis(ink) },
      dataZoom: showZoom
        ? [
            {
              type: 'slider',
              [horizontal ? 'yAxisIndex' : 'xAxisIndex']: 0,
              height: horizontal ? undefined : 16,
              bottom: horizontal ? undefined : 6,
              start: 0,
              end: horizontal ? 100 : 60,
              ...zoomStyle(ink),
            },
          ]
        : undefined,
      series: [
        {
          type: 'bar',
          // `id` estable: sin él, y con `notMerge`, cada cross-filter crearía una
          // serie nueva y la entrada escalonada se repetiría en cada clic.
          id: 'barras',
          // Marcas delgadas + 4px de radio en el extremo del dato,
          // anclado a la línea base.
          barMaxWidth: horizontal ? 15 : 34,
          itemStyle: {
            borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          },
          // Antes no había NADA al pasar el cursor: la barra es pulsable —aplica
          // cross-filter— y no lo parecía. La cifra sube de peso a la vez, para
          // que el ojo no tenga que ir a buscarla al tooltip.
          emphasis: {
            ...realce(ink),
            label: { fontWeight: 800 as const },
          },
          blur: apagado,
          label: {
            ...directLabel(ink),
            position: horizontal ? 'right' : 'top',
            formatter: (raw: unknown) => {
              const v = asParam(raw).value
              return v ? String(v) : ''
            },
          },
          data: data.map((s) => ({
            name: s.name,
            value: s.value,
            itemStyle: { color: s.color, opacity: markOpacity(selected, s.name) },
          })),
        },
      ],
    }
  }, [slices, orientation, selected, unit, zoom, exportName, ink, theme])

  return <EChart option={option} height={height} onPick={onPick} empty={slices.length === 0} />
}
