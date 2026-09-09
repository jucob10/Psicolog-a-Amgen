// Coroplético de Colombia por departamento o ciudad, adaptado del gestor de
// casos original (misma estrategia: GeoJSON de departamentos + capa de
// círculos proporcionales encima).
//
// Diferencia clave con el original: aquí el mapa tiene DOS NIVELES.
//   - departamento: coroplético puro, igual que el original.
//   - ciudad: no existe un GeoJSON de municipios tan liviano como el de
//     departamentos, así que el departamento queda como fondo tenue (para dar
//     contexto geográfico) y la magnitud por ciudad se lee en círculos
//     proporcionales sobre las coordenadas de lib/geo/ciudades.ts — el mismo
//     patrón que ya usaban los "focos" del mapa original, solo que aquí SON
//     el dato, no un adorno encima de él.
//
// El CROQUIS ES LA BASE, no el resultado de los datos. Colombia se dibuja
// siempre —con datos, sin ellos y en los dos niveles— como una plancha apoyada
// sobre la tarjeta: tierra en su propio tono, divisorias en un tono medio y una
// costa más firme que las divisorias, con un halo de mar que la despega del
// fondo. Los datos se pintan ENCIMA de esa plancha; nunca ocupan su sitio.
//
// Antes no era así y por eso el mapa no se leía: la tierra iba en el color de
// la tarjeta (en tema claro, blanco sobre blanco) y las divisorias también, así
// que en nivel ciudad había cinco círculos flotando sobre un rectángulo vacío,
// y sin Excel cargado el mapa se sustituía por un cartel de "sin datos".
//
// "Virtual" nunca entra aquí: se filtra antes de llegar (ver agregaciones.ts),
// porque no es una zona geográfica real.

import { useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { useInk } from '../../charts/useInk'
import { animation, asParam, FONT, toolbox, tooltipBase } from '../../charts/base'
import { MAP_BORDER, MAP_COAST, MAP_LAND_CTX, MAP_NO_DATA, MAP_RAMP, MAP_SEA } from '../../charts/palette'
import { Skeleton } from '../ui'
import type { CountMap } from '../../lib/kpis'
import type { NivelMapa } from '../../types'
import { CIUDADES_COORDS } from '../../lib/geo/ciudades'

const MAP_NAME = 'colombia-departamentos'

let registered = false
let featureNames: Set<string> = new Set()

interface Props {
  /** Departamento o ciudad → magnitud (actividades o asistentes, según el toggle del padre). */
  counts: CountMap
  nivel: NivelMapa
  selected?: string | null
  onPick?: (name: string) => void
  height?: number
  unit?: string
  exportName?: string
}

export function MapChart({
  counts,
  nivel,
  selected = null,
  onPick,
  height = 520,
  unit = 'actividades',
  exportName = 'mapa-bienestar360',
}: Props) {
  const { ink, theme } = useInk()
  const [ready, setReady] = useState(registered)

  useEffect(() => {
    if (registered) return
    let alive = true
    void import('../../lib/geo/colombia').then(({ COLOMBIA_DEPARTAMENTOS }) => {
      if (!registered) {
        echarts.registerMap(MAP_NAME, COLOMBIA_DEPARTAMENTOS as never)
        featureNames = new Set(COLOMBIA_DEPARTAMENTOS.features.map((f) => f.properties.name))
        registered = true
      }
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // Reparto de las cuentas entre lo que el mapa sabe dibujar y lo que no.
  const { mapData, puntos, max, noUbicados } = useMemo(() => {
    const mapData: Array<{ name: string; value: number }> = []
    const puntos: Array<{ name: string; value: [number, number, number] }> = []
    const noUbicados: Array<[string, number]> = []
    let max = 0

    Object.entries(counts).forEach(([name, value]) => {
      max = Math.max(max, value)
      if (nivel === 'departamento') {
        if (!ready || featureNames.has(name)) {
          mapData.push({ name, value })
        } else {
          noUbicados.push([name, value])
        }
      } else {
        const coord = CIUDADES_COORDS[name]
        if (coord) {
          puntos.push({ name, value: [coord[0], coord[1], value] })
        } else {
          noUbicados.push([name, value])
        }
      }
    })

    mapData.sort((a, b) => b.value - a.value)
    puntos.sort((a, b) => b.value[2] - a.value[2])

    return { mapData, puntos, max, noUbicados: noUbicados.sort((a, b) => b[1] - a[1]) }
  }, [counts, ready, nivel])

  const option = useMemo<EChartsOption>(
    () => ({
      ...animation,
      animationDelay: (i: number) => Math.min(i * 22, 460),
      animationDelayUpdate: 0,
      toolbox: toolbox(exportName, ink),
      tooltip: {
        ...tooltipBase(ink),
        trigger: 'item',
        formatter: (raw: unknown) => {
          const p = asParam(raw)
          if (nivel === 'ciudad') {
            const v = Array.isArray(p.value) ? (p.value as unknown as number[])[2] : null
            if (v === null || v === undefined) return `<b>${p.name}</b><br/>Sin gestión registrada`
            return `<b>${p.name}</b><br/>${v} ${unit}`
          }
          const value = typeof p.value === 'number' && !Number.isNaN(p.value) ? p.value : null
          if (value === null) return `<b>${p.name}</b><br/>Sin gestión registrada`
          return `<b>${p.name}</b><br/>${value} ${unit}`
        },
      },
      visualMap: {
        type: 'continuous',
        // Sin datos no hay magnitud que graduar: la barra sobraría y además
        // mentiría, anunciando una escala 0–1 que nadie ha medido.
        show: max > 0,
        min: 0,
        max: Math.max(max, 1),
        left: 6,
        bottom: 6,
        itemHeight: 88,
        itemWidth: 10,
        calculable: true,
        outOfRange: { color: MAP_NO_DATA[theme] },
        // Las asas de `calculable` YA escriben la cifra mientras se arrastran;
        // repetirla aquí pintaba "21" y "0" dos veces, una encima de otra. Los
        // extremos dicen ahora el sentido de la escala, que es lo que las asas
        // no pueden decir.
        text: ['más', 'menos'],
        textStyle: { color: ink.secondary, fontFamily: FONT, fontSize: 10.5 },
        inRange: { color: MAP_RAMP[theme] },
        // En nivel ciudad el visualMap solo controla el color de los círculos,
        // no del coroplético (que queda apagado a propósito, como contexto).
        seriesIndex: nivel === 'ciudad' ? [1] : [0],
      },
      // La plancha. Va DEBAJO de la serie y con la misma geometría, así que la
      // serie tapa su interior por completo y de ella solo queda a la vista lo
      // que sobresale: la mitad exterior del trazo —el contorno de Colombia— y
      // la sombra derramada alrededor. Es la forma de tener una costa más firme
      // que las divisorias internas sin partir el GeoJSON en dos capas.
      //
      // Siempre `silent`: el clic lo atiende la serie (departamento) o los
      // círculos (ciudad), nunca esta capa.
      geo: {
        map: MAP_NAME,
        roam: false,
        layoutCenter: ['52%', '50%'],
        layoutSize: '100%',
        aspectScale: 1,
        silent: true,
        itemStyle: {
          areaColor: nivel === 'ciudad' ? MAP_LAND_CTX[theme] : MAP_NO_DATA[theme],
          borderColor: MAP_COAST[theme],
          borderWidth: 2,
          shadowBlur: 18,
          shadowColor: MAP_SEA[theme],
          shadowOffsetY: 4,
        },
        emphasis: { disabled: true },
        select: { disabled: true },
      },
      series: [
        {
          type: 'map',
          id: 'mapa',
          map: MAP_NAME,
          roam: false,
          layoutCenter: ['52%', '50%'],
          layoutSize: '100%',
          aspectScale: 1,
          itemStyle:
            nivel === 'departamento'
              ? { areaColor: MAP_NO_DATA[theme], borderColor: MAP_BORDER[theme], borderWidth: 0.6 }
              : // Contexto en nivel ciudad: el color del DATO lo llevan los
                // círculos, pero la tierra sigue siendo tierra —opaca y con sus
                // divisorias— para que se sepa en qué departamento cae cada uno.
                { areaColor: MAP_LAND_CTX[theme], borderColor: MAP_BORDER[theme], borderWidth: 0.5 },
          label: { show: false },
          emphasis:
            nivel === 'departamento'
              ? {
                  focus: 'self',
                  label: { show: true, color: ink.primary, fontFamily: FONT, fontSize: 11, fontWeight: 700 },
                  itemStyle: { areaColor: undefined, borderColor: ink.primary, borderWidth: 1.4 },
                }
              : { disabled: true },
          blur: { itemStyle: { opacity: 0.35 } },
          select:
            nivel === 'departamento'
              ? {
                  label: { show: true, color: ink.primary, fontFamily: FONT, fontSize: 11, fontWeight: 700 },
                  itemStyle: { borderColor: ink.primary, borderWidth: 1.8 },
                }
              : undefined,
          selectedMode: nivel === 'departamento' ? 'single' : false,
          silent: nivel === 'ciudad',
          data:
            nivel === 'departamento'
              ? mapData.map((d) => ({ ...d, selected: selected === d.name }))
              : [],
        },
        {
          type: 'effectScatter',
          id: 'puntos-ciudad',
          coordinateSystem: 'geo',
          geoIndex: 0,
          zlevel: 1,
          symbolSize: (v: unknown) => {
            const n = Array.isArray(v) ? Number(v[2]) : 0
            return 10 + Math.sqrt(n / Math.max(max, 1)) * 34
          },
          rippleEffect: { scale: 2.6, brushType: 'stroke', period: 3.2 },
          itemStyle: {
            color: (param: unknown) => {
              const p = asParam(param)
              const n = Array.isArray(p.value) ? (p.value as unknown as number[])[2] : 0
              const ramp = MAP_RAMP[theme]
              const t = max > 0 ? Math.min(1, n / max) : 0
              // Desde el paso 1, no desde el 0: el extremo más claro de la
              // rampa está calculado para rellenar un departamento entero, y
              // en un círculo de 12 px sobre la tierra se borra. Tunja con 2
              // actividades tiene que verse tanto como Bogotá con 21 —lo que
              // las separa es el TAMAÑO, no si la marca existe o no—.
              const idx = 1 + Math.round(t * (ramp.length - 2))
              return selected && selected !== p.name ? MAP_NO_DATA[theme] : ramp[idx]
            },
            shadowBlur: 6,
            shadowColor: MAP_SEA[theme],
            // Contorno en el tono de la costa: el mismo trazo que define el
            // país define el círculo, y así la marca se recorta contra la
            // tierra por dibujo y no solo por color.
            borderColor: MAP_COAST[theme],
            borderWidth: 1.4,
          },
          label: {
            show: true,
            // A la derecha y no encima: los círculos se pisan entre sí en el
            // centro andino, y una etiqueta arriba cae sobre el vecino. A la
            // derecha sale hacia la Orinoquía, que está vacía.
            position: 'right',
            distance: 8,
            // Con la cifra al lado del nombre. El área de un círculo se estima
            // mal —nadie lee "esta es el doble que aquella" en dos discos— y
            // aquí el número cabe: son cinco ciudades, no cincuenta.
            formatter: (raw: unknown) => {
              const p = asParam(raw)
              const v = Array.isArray(p.value) ? (p.value as unknown as number[])[2] : ''
              return `{n|${p.name}}  {v|${v}}`
            },
            rich: {
              n: { color: ink.primary, fontFamily: FONT, fontSize: 11, fontWeight: 700 },
              v: { color: ink.secondary, fontFamily: 'IBM Plex Mono, ui-monospace, monospace', fontSize: 11 },
            },
            // El nombre cae sobre la tierra, no sobre la tarjeta: sin este
            // respaldo se mezclaría con las divisorias que tiene debajo.
            backgroundColor: ink.surface,
            borderColor: ink.border,
            borderWidth: 1,
            borderRadius: 4,
            padding: [3, 6],
          },
          // La guía es lo que hace honesto al reparto de etiquetas de abajo:
          // sin ella, una etiqueta apartada para no chocar acaba señalando el
          // círculo del vecino y el mapa miente.
          labelLine: { show: true, length2: 10, lineStyle: { color: MAP_COAST[theme], width: 1 } },
          // Colombia concentra la gestión en un puñado de kilómetros del centro
          // andino, así que los nombres nacen encimados. `shiftY` los separa en
          // vertical en vez de esconderlos: una ciudad sin etiqueta es una
          // ciudad que no está en el mapa.
          labelLayout: { moveOverlap: 'shiftY', hideOverlap: false },
          data: nivel === 'ciudad' ? puntos : [],
          silent: nivel === 'departamento',
        },
      ],
    }),
    [mapData, puntos, max, selected, ink, theme, exportName, nivel, unit],
  )

  if (!ready) return <Skeleton height={height} />

  // Sin nada que pintar el mapa NO se sustituye por un cartel. El croquis es lo
  // primero que hay que reconocer —«esto es Colombia»— y sigue siendo cierto
  // aunque el Excel no traiga una sola fila; el cartel se pone debajo, donde no
  // tapa el país.
  const sinDatos = nivel === 'departamento' ? mapData.length === 0 : puntos.length === 0

  return (
    <>
      <EChart option={option} height={height} onPick={onPick} />
      {sinDatos && (
        <p className="map-note">
          {nivel === 'ciudad'
            ? 'Ninguna ciudad con gestión registrada todavía.'
            : 'Ningún departamento con gestión registrada todavía.'}
        </p>
      )}
      {noUbicados.length > 0 && (
        <p className="map-note">
          Sin ubicar en el mapa:{' '}
          {noUbicados
            .slice(0, 4)
            .map(([n, v]) => `${n} (${v})`)
            .join(', ')}
          {noUbicados.length > 4 && ` y ${noUbicados.length - 4} más`}.
        </p>
      )}
    </>
  )
}
