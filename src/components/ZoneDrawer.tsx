// Panel lateral deslizante con el detalle de gestión de una ciudad o
// departamento. Se abre AL CLIC en el mapa (MapView), se superpone sobre él
// (position: fixed) y nunca navega a otra página — así el mapa sigue de
// fondo, visible, cuando se cierra.

import { useMemo } from 'react'
import { BarChart } from './charts/BarChart'
import { DonutChart } from './charts/DonutChart'
import { TimeSeriesChart } from './charts/TimeSeriesChart'
import { Card, SummaryTable } from './ui'
import { buildColorScale, toSlices } from '../charts/palette'
import {
  filasDeCiudad,
  filasDeDepartamento,
  porCategorizacion,
  porEstadoPropuesta,
  porInstitucion,
  porTipoActividad,
  porTipoPoblacion,
  profesionalesUnicos,
  resumen,
  serieMensual,
} from '../lib/agregaciones'
import { formatDate } from '../lib/dates'
import type { GestionBienestar, NivelMapa } from '../types'

interface Props {
  nivel: NivelMapa
  zona: string | null
  rows: GestionBienestar[]
  onClose: () => void
}

export function ZoneDrawer({ nivel, zona, rows, onClose }: Props) {
  const filas = useMemo(() => {
    if (!zona) return []
    return nivel === 'ciudad' ? filasDeCiudad(rows, zona) : filasDeDepartamento(rows, zona)
  }, [rows, nivel, zona])

  const abierto = zona !== null

  const kpis = useMemo(() => resumen(filas), [filas])
  const profesionales = useMemo(() => profesionalesUnicos(filas), [filas])

  const tipoActividadScale = useMemo(() => buildColorScale(porTipoActividad(filas)), [filas])
  const tipoActividadSlices = useMemo(
    () => toSlices(porTipoActividad(filas), tipoActividadScale),
    [filas, tipoActividadScale],
  )

  const poblacionScale = useMemo(() => buildColorScale(porTipoPoblacion(filas)), [filas])
  const poblacionSlices = useMemo(
    () => toSlices(porTipoPoblacion(filas), poblacionScale),
    [filas, poblacionScale],
  )

  const categorizacionScale = useMemo(() => buildColorScale(porCategorizacion(filas)), [filas])
  const categorizacionSlices = useMemo(
    () => toSlices(porCategorizacion(filas), categorizacionScale),
    [filas, categorizacionScale],
  )

  const institucionCounts = useMemo(() => porInstitucion(filas), [filas])
  const estadoPropuestaCounts = useMemo(() => porEstadoPropuesta(filas), [filas])
  const serie = useMemo(() => serieMensual(filas), [filas])

  return (
    <>
      {/* Fondo oscurecido: clic fuera del panel cierra, igual que Escape. */}
      <div
        className={`drawer-scrim${abierto ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden={!abierto}
      />
      <aside
        className={`zone-drawer${abierto ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={zona ? `Gestión en ${zona}` : 'Detalle de zona'}
      >
        {zona && (
          <div className="zone-drawer-inner">
            <header className="zone-drawer-head">
              <div>
                <span className="zone-drawer-eyebrow">
                  {nivel === 'ciudad' ? 'Ciudad' : 'Departamento'}
                </span>
                <h2>{zona}</h2>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar panel">
                ✕
              </button>
            </header>

            <div className="zone-kpis">
              <div className="kpi-card">
                <span className="kpi-label">Actividades</span>
                <div className="kpi-main">
                  <span className="kpi-value">{kpis.totalActividades}</span>
                </div>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Asistentes</span>
                <div className="kpi-main">
                  <span className="kpi-value">{kpis.totalAsistentes}</span>
                </div>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Instituciones</span>
                <div className="kpi-main">
                  <span className="kpi-value">{kpis.totalInstituciones}</span>
                </div>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Propuestas realizadas</span>
                <div className="kpi-main">
                  <span className="kpi-value">{kpis.propuestasRealizadas}</span>
                </div>
              </div>
            </div>

            <Card title="Profesional(es) a cargo">
              {profesionales.length > 0 ? (
                <div className="chip-list">
                  {profesionales.map((p) => (
                    <span className="chip static" key={p}>
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="note">Sin profesional asignado en la matriz.</p>
              )}
            </Card>

            <Card title="Línea de tiempo de gestión">
              <TimeSeriesChart points={serie} label="Actividades" height={200} exportName={`serie-${zona}`} />
            </Card>

            <Card title="Por tipo de actividad">
              <BarChart
                slices={tipoActividadSlices.slices}
                orientation="h"
                height={Math.max(160, tipoActividadSlices.slices.length * 34)}
                unit="actividades"
                exportName={`tipo-actividad-${zona}`}
              />
            </Card>

            <div className="grid-2">
              <Card title="Por tipo de población">
                <DonutChart
                  slices={poblacionSlices.slices}
                  unit="actividades"
                  height={220}
                  exportName={`poblacion-${zona}`}
                />
              </Card>
              <Card title="Por categorización">
                <DonutChart
                  slices={categorizacionSlices.slices}
                  unit="actividades"
                  height={220}
                  exportName={`categorizacion-${zona}`}
                />
              </Card>
            </div>

            <Card title="Por institución">
              <SummaryTable data={institucionCounts} dimension="Institución" maxHeight={220} />
            </Card>

            <Card title="Estado de propuestas">
              <SummaryTable data={estadoPropuestaCounts} dimension="Estado" maxHeight={140} />
            </Card>

            <Card title="Detalle de actividades" sub={`${filas.length} registros`}>
              <div className="table-scroll" style={{ maxHeight: 320 }}>
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Actividad</th>
                      <th>Institución</th>
                      <th className="num">Asistentes</th>
                      <th>Profesional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas
                      .slice()
                      .sort((a, b) => (b.fechaGestion || '').localeCompare(a.fechaGestion || ''))
                      .map((f) => (
                        <tr key={f.id}>
                          <td>{formatDate(f.fechaGestion)}</td>
                          <td>{f.nombreActividad}</td>
                          <td>{f.institucion}</td>
                          <td className="num">{f.asistentes}</td>
                          <td>{f.profesionales.join(', ') || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </aside>
    </>
  )
}
