// Vista principal: el mapa gigante de Colombia.
//
// Es la pantalla que pidió el usuario — todo lo demás (KPIs virtuales, el
// toggle de nivel) es contexto alrededor del mapa, nunca por delante de él.
// Al hacer clic en una zona se abre el panel lateral (ZoneDrawer) SOBRE el
// mapa, sin navegar a otra página.

import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { MapChart } from '../components/charts/MapChart'
import { Card, KpiCard, LevelToggle } from '../components/ui'
import { ZoneDrawer } from '../components/ZoneDrawer'
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart'
import {
  actividadesPorCiudad,
  actividadesPorDepartamento,
  asistentesPorCiudad,
  asistentesPorDepartamento,
  filasVirtuales,
  porTipoPoblacion,
  resumen,
  serieMensual,
} from '../lib/agregaciones'
import type { NivelMapa } from '../types'

const NIVELES: Array<{ id: NivelMapa; label: string }> = [
  { id: 'ciudad', label: 'Por ciudad' },
  { id: 'departamento', label: 'Por departamento' },
]

type Metric = 'actividades' | 'asistentes'

const ALL = 'Todas'

export function MapView({ onGoUpload }: { onGoUpload: () => void }) {
  const rows = useAppStore((s) => s.rows)
  const nivel = useAppStore((s) => s.nivelMapa)
  const setNivel = useAppStore((s) => s.setNivelMapa)
  const zona = useAppStore((s) => s.zonaSeleccionada)
  const seleccionarZona = useAppStore((s) => s.seleccionarZona)
  const [metric, setMetric] = useState<Metric>('actividades')
  const [population, setPopulation] = useState(ALL)
  const [professional, setProfessional] = useState(ALL)

  const populationOptions = useMemo(
    () => Object.keys(porTipoPoblacion(rows)).sort((a, b) => a.localeCompare(b, 'es')),
    [rows],
  )
  const professionalOptions = useMemo(
    () => [...new Set(rows.flatMap((row) => row.profesionales))].sort((a, b) => a.localeCompare(b, 'es')),
    [rows],
  )
  const filteredRows = useMemo(
    () => rows.filter((row) => {
      const matchesPopulation = population === ALL || row.tipoPoblacion === population
      const matchesProfessional = professional === ALL || row.profesionales.includes(professional)
      return matchesPopulation && matchesProfessional
    }),
    [rows, population, professional],
  )

  const virtual = useMemo(() => filasVirtuales(filteredRows), [filteredRows])
  const resumenVirtual = useMemo(() => resumen(virtual), [virtual])
  const kpis = useMemo(() => resumen(filteredRows), [filteredRows])
  const monthly = useMemo(() => serieMensual(filteredRows), [filteredRows])

  const countsActividades = useMemo(
    () => {
      if (metric === 'asistentes') {
        return nivel === 'ciudad' ? asistentesPorCiudad(filteredRows) : asistentesPorDepartamento(filteredRows)
      }
      return nivel === 'ciudad' ? actividadesPorCiudad(filteredRows) : actividadesPorDepartamento(filteredRows)
    },
    [filteredRows, nivel, metric],
  )

  return (
    <div className="mapview">
      <section className="dashboard-hero">
        <div>
          <span className="hero-kicker">Centro de inteligencia de bienestar</span>
          <h1>La gestión psicológica, vista como una red viva.</h1>
          <p>Explora cobertura, población atendida y actividad territorial desde una sola lectura.</p>
        </div>
        <div className="hero-signal" aria-label={`${kpis.totalActividades} actividades en el periodo filtrado`}>
          <span className="signal-dot" />
          <span>Monitor activo</span>
          <strong>{kpis.totalActividades.toLocaleString('es-CO')}</strong>
          <small>actividades</small>
        </div>
      </section>

      <section className="kpi-overview" aria-label="Resumen de indicadores">
        <KpiCard label="Actividades" value={kpis.totalActividades} accent="var(--accent-blue)" animate />
        <KpiCard label="Personas alcanzadas" value={kpis.totalAsistentes} accent="var(--accent-cyan)" animate />
        <KpiCard label="Instituciones" value={kpis.totalInstituciones} accent="var(--accent-green)" />
        <KpiCard label="Propuestas realizadas" value={kpis.propuestasRealizadas} accent="var(--accent-orange)" />
      </section>

      <section className="insight-bar" aria-label="Filtros del tablero">
        <div className="insight-copy"><span className="pulse-line" /> <strong>Lectura en tiempo real</strong><span>{filteredRows.length} registros visibles</span></div>
        <label> Población
          <select value={population} onChange={(e) => setPopulation(e.target.value)}>
            <option>{ALL}</option>
            {populationOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label> Profesional
          <select value={professional} onChange={(e) => setProfessional(e.target.value)}>
            <option>{ALL}</option>
            {professionalOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        {(population !== ALL || professional !== ALL) && (
          <button className="filter-clear" onClick={() => { setPopulation(ALL); setProfessional(ALL) }}>Limpiar filtros</button>
        )}
      </section>

      <div className="mapview-toolbar no-print">
        <LevelToggle options={NIVELES} value={nivel} onChange={setNivel} />

        <div className="metric-toggle" role="group" aria-label="Métrica del mapa">
          <button className={metric === 'actividades' ? 'active' : ''} onClick={() => setMetric('actividades')}>Actividades</button>
          <button className={metric === 'asistentes' ? 'active' : ''} onClick={() => setMetric('asistentes')}>Asistentes</button>
        </div>

        <div className="mapview-virtual" title="Talleres virtuales y actividad sin sede física">
          <span className="mapview-virtual-label">Actividad Virtual</span>
          <span className="mapview-virtual-value">{resumenVirtual.totalActividades}</span>
          <span className="mapview-virtual-sub">
            {resumenVirtual.totalAsistentes.toLocaleString('es-CO')} asistentes
          </span>
        </div>

        <button className="btn" onClick={onGoUpload}>
          Cargar otro Excel
        </button>
      </div>

      <div className="map-section-label"><span>01</span><div><strong>Cobertura territorial</strong><small>Selecciona una zona para abrir su pulso operativo</small></div></div>
      <div className="mapview-canvas">
        <MapChart
          counts={countsActividades}
          nivel={nivel}
          selected={zona}
          onPick={(name) => seleccionarZona(name)}
          height={720}
          unit={metric}
        />
      </div>

      <div className="dashboard-secondary">
        <Card title="Evolución de la gestión" sub="Actividades por mes">
          <TimeSeriesChart points={monthly} label="Actividades" height={220} exportName="evolucion-bienestar360" />
        </Card>
        <Card title="Actividad virtual" sub="Sin sede física">
          <div className="virtual-feature"><span className="virtual-orbit">◎</span><div><strong>{resumenVirtual.totalActividades.toLocaleString('es-CO')}</strong><span>actividades virtuales</span></div><small>{resumenVirtual.totalAsistentes.toLocaleString('es-CO')} personas alcanzadas</small></div>
          <p className="note">Los talleres virtuales se mantienen separados del mapa para no perder su alcance.</p>
        </Card>
      </div>

      {rows.length === 0 && (
        <p className="map-note" style={{ textAlign: 'center' }}>
          Carga un Excel para ver la gestión en el mapa.
        </p>
      )}

      <ZoneDrawer nivel={nivel} zona={zona} onClose={() => seleccionarZona(null)} rows={filteredRows} />
    </div>
  )
}
