// Envoltura única sobre ECharts.
//
// En el proyecto original cada gráfica llevaba su propia variable global
// `let chartXInstance` y su `.destroy()` manual. Aquí React gestiona el ciclo
// de vida y este componente es el ÚNICO sitio que habla con la librería.

import { Component, useCallback, useRef, type ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface Props {
  option: EChartsOption
  height?: number
  /** Se dispara al hacer clic en una marca. Devuelve el nombre de la categoría. */
  onPick?: (name: string) => void
  empty?: boolean
  emptyText?: string
}

export function EChart({ option, height = 280, onPick, empty, emptyText }: Props) {
  const ref = useRef<ReactECharts>(null)

  const onEvents = useCallback(
    () => ({
      click: (params: { name?: string }) => {
        if (!onPick || !params.name) return

        // Bajar el resaltado y el tooltip ANTES de cambiar los datos.
        //
        // El clic dispara un cross-filter, que reconstruye la opción entera
        // (`notMerge`). Si en ese momento sigue vivo el estado de hover, ECharts
        // se queda con referencias a elementos que la reconstrucción acaba de
        // tirar, y su manejador asíncrono revienta con un `getRawIndex` sobre
        // `undefined`. Es un fallo de la librería, pero el disparador es
        // nuestro: pulsar una marca sobre la que el cursor sigue encima.
        const inst = ref.current?.getEchartsInstance()
        if (inst) {
          inst.dispatchAction({ type: 'hideTip' })
          inst.dispatchAction({ type: 'downplay' })
        }

        onPick(params.name)
      },
    }),
    [onPick],
  )

  if (empty) {
    return (
      <div className="chart-empty" style={{ height }}>
        {emptyText ?? 'Sin datos para los filtros actuales'}
      </div>
    )
  }

  return (
    <ChartBoundary height={height}>
      {/* `notMerge` sí, `lazyUpdate` NO.

          `lazyUpdate` aplaza la nueva opción al siguiente fotograma. Combinado
          con `notMerge` —que reconstruye la opción entera— deja una ventana en
          la que ECharts ya descartó los elementos viejos pero todavía no ha
          dibujado los nuevos; cualquier evento de puntero que caiga ahí revienta
          con `getRawIndex` o `__ec_inner_N` sobre `undefined`. Se reproducía al
          pulsar un filtro con el cursor sobre una gráfica y al pulsar una fila
          de tabla mientras la página se desplazaba bajo el ratón.

          Sin `lazyUpdate` la actualización va con el commit de React y esa
          ventana no existe. El coste es nulo: aquí no hay opciones que cambien
          varias veces por fotograma. */}
      <ReactECharts
        ref={ref}
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge
        onEvents={onEvents()}
      />
    </ChartBoundary>
  )
}

/* ─────────────── Red de seguridad ─────────────── */

interface BoundaryProps {
  children: ReactNode
  height: number
}

/**
 * Aísla el fallo de una gráfica.
 *
 * ECharts es la única dependencia pesada que corre en cada tarjeta, y una
 * excepción suya durante el renderizado desmontaría TODO el árbol de React: el
 * dashboard entero en blanco por una gráfica. Con esto, lo que se pierde es esa
 * tarjeta —y se dice que se ha perdido, en vez de dejar un hueco— mientras los
 * KPIs, las tablas y el resto de gráficas siguen en pie.
 *
 * Los datos no se tocan: sigue estando todo en la tabla de al lado.
 */
class ChartBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('[gráfica] no se pudo dibujar:', error)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="chart-empty" style={{ height: this.props.height }}>
          No se pudo dibujar esta gráfica. Los mismos datos están en la tabla.
        </div>
      )
    }
    return this.props.children
  }
}
