import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { useInk } from '../../charts/useInk'
import {
  animation,
  asParams,
  categoryAxis,
  toolbox,
  tooltipBase,
  valueAxis,
  zoomStyle,
} from '../../charts/base'
import { SERIES } from '../../charts/palette'
import { fmtYM } from '../../lib/dates'

export interface MonthPoint {
  ym: string
  value: number
}

interface Props {
  points: MonthPoint[]
  height?: number
  label?: string
  /** Desglose opcional que se muestra dentro del tooltip de cada mes. */
  breakdown?: Record<string, Array<{ name: string; value: number }>>
  exportName?: string
}

/**
 * Serie mensual con zoom por arrastre. Un solo dato → sin leyenda:
 * el título de la tarjeta ya nombra la serie.
 */
export function TimeSeriesChart({
  points,
  height = 280,
  label = 'Pacientes',
  breakdown,
  exportName = 'serie-mensual',
}: Props) {
  const { ink } = useInk()

  const option = useMemo<EChartsOption>(() => {
    const labels = points.map((p) => fmtYM(p.ym))
    const showZoom = points.length > 10

    return {
      ...animation,
      toolbox: toolbox(exportName, ink),
      grid: { left: 6, right: 12, top: 24, bottom: showZoom ? 40 : 6, containLabel: true },
      tooltip: {
        ...tooltipBase(ink),
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: { color: ink.border, width: 1, type: 'solid' },
          // La guía se queda dibujada mientras el cursor se mueve dentro de la
          // gráfica: da la sensación de recorrer la serie en vez de consultarla
          // mes a mes.
          snap: true,
          animation: true,
          animationDurationUpdate: 180,
          animationEasingUpdate: 'cubicOut' as const,
        },
        formatter: (raw: unknown) => {
          const p = asParams(raw)[0]
          const ym = points[p.dataIndex]?.ym ?? ''
          let html = `<b>${fmtYM(ym)}</b><br/>${p.value} ${label.toLowerCase()}`
          // Tooltip enriquecido: top 3 del mes, algo que una tabla no da de un vistazo.
          const top = breakdown?.[ym]?.slice(0, 3)
          if (top?.length) {
            html +=
              `<div style="margin-top:7px;padding-top:6px;border-top:1px solid ${ink.border};font-size:11.5px;color:${ink.secondary}">` +
              top.map((t) => `${t.name} · <b style="color:${ink.primary}">${t.value}</b>`).join('<br/>') +
              '</div>'
          }
          return html
        },
      },
      xAxis: { ...categoryAxis(ink), data: labels, boundaryGap: false },
      yAxis: { ...valueAxis(ink) },
      dataZoom: showZoom
        ? [
            { type: 'inside', start: 0, end: 100 },
            { type: 'slider', height: 18, bottom: 6, start: 0, end: 100, ...zoomStyle(ink) },
          ]
        : undefined,
      series: [
        {
          type: 'line',
          id: 'serie',
          name: label,
          data: points.map((p) => p.value),
          smooth: 0.28,
          showSymbol: points.length <= 24,
          symbol: 'circle',
          symbolSize: 8,
          // Aquí tampoco pasaba nada al pasar el cursor. Con esto, el punto del
          // mes bajo el cursor crece — y aparece aunque la serie sea larga y los
          // puntos estén ocultos, que es cuando más falta hace saber en cuál
          // estás.
          emphasis: {
            focus: 'series' as const,
            scale: 2.4,
            itemStyle: {
              color: SERIES[0],
              borderColor: ink.surface,
              borderWidth: 2.5,
              shadowBlur: 12,
              shadowColor: SERIES[0],
            },
          },
          lineStyle: { width: 2, color: SERIES[0] },
          itemStyle: { color: SERIES[0], borderColor: ink.surface, borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(57,135,229,0.28)' },
                { offset: 1, color: 'rgba(57,135,229,0.01)' },
              ],
            },
          },
        },
      ],
    }
  }, [points, label, breakdown, exportName, ink])

  return <EChart option={option} height={height} empty={points.length === 0} />
}
