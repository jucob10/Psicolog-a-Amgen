import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { useInk } from '../../charts/useInk'
import {
  animation,
  apagado,
  asParam,
  entradaEscalonada,
  FONT,
  markOpacity,
  realce,
  toolbox,
  tooltipBase,
} from '../../charts/base'
import type { Slice } from '../../charts/palette'

interface Props {
  slices: Slice[]
  height?: number
  /** Categoría con cross-filter activo: se resalta y las demás se atenúan. */
  selected?: string | null
  onPick?: (name: string) => void
  unit?: string
  /** Nombre del archivo al descargar el PNG. */
  exportName?: string
}

export function DonutChart({
  slices,
  height = 280,
  selected = null,
  onPick,
  unit = 'pacientes',
  exportName = 'grafica',
}: Props) {
  const { ink } = useInk()
  const total = slices.reduce((s, x) => s + x.value, 0)

  const option = useMemo<EChartsOption>(
    () => ({
      ...animation,
      ...entradaEscalonada(),
      toolbox: toolbox(exportName, ink),
      tooltip: {
        ...tooltipBase(ink),
        trigger: 'item',
        formatter: (raw: unknown) => {
          const p = asParam(raw)
          return `<b>${p.name}</b><br/>${p.value} ${unit} · ${p.percent}%`
        },
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 0,
        top: 26,
        bottom: 8,
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 9,
        icon: 'roundRect',
        textStyle: { color: ink.secondary, fontFamily: FONT, fontSize: 11.5 },
        pageTextStyle: { color: ink.muted },
        pageIconColor: ink.secondary,
        pageIconInactiveColor: ink.border,
      },
      series: [
        {
          type: 'pie',
          // `id` estable: mantiene la actualización como actualización, así la
          // entrada escalonada no se repite en cada cross-filter.
          id: 'dona',
          radius: ['54%', '82%'],
          center: ['33%', '50%'],
          avoidLabelOverlap: true,
          // Anillo del color de la superficie: separa las porciones sin
          // introducir una línea nueva.
          itemStyle: { borderColor: ink.surface, borderWidth: 2, borderRadius: 3 },
          label: {
            show: true,
            position: 'center',
            formatter: () => `{v|${total}}\n{l|${unit.toUpperCase()}}`,
            rich: {
              v: { color: ink.primary, fontSize: 25, fontWeight: 800, fontFamily: FONT },
              l: { color: ink.muted, fontSize: 10, fontWeight: 700, padding: [5, 0, 0, 0], fontFamily: FONT },
            },
          },
          emphasis: {
            // Ya crecía y cambiaba el centro; lo que faltaba era apagar el
            // resto. En una dona de doce porciones, aislar la señalada es la
            // diferencia entre comparar y adivinar.
            ...realce(ink),
            scale: true,
            scaleSize: 6,
            label: {
              show: true,
              formatter: (raw: unknown) => {
                const p = asParam(raw)
                return `{v|${p.value}}\n{p|${p.percent}%}\n{l|${p.name}}`
              },
              rich: {
                v: { color: ink.primary, fontSize: 25, fontWeight: 800, fontFamily: FONT },
                p: { color: ink.secondary, fontSize: 13, fontWeight: 700, fontFamily: FONT },
                l: { color: ink.muted, fontSize: 10.5, fontWeight: 600, padding: [3, 0, 0, 0], fontFamily: FONT },
              },
            },
          },
          blur: apagado,
          labelLine: { show: false },
          data: slices.map((s) => ({
            name: s.name,
            value: s.value,
            itemStyle: { color: s.color, opacity: markOpacity(selected, s.name) },
          })),
        },
      ],
    }),
    [slices, selected, total, unit, exportName, ink],
  )

  return (
    <EChart option={option} height={height} onPick={onPick} empty={slices.length === 0} />
  )
}
