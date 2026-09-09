// Componentes de UI compartidos, adaptados del gestor de casos original.
// Se quitó todo lo ligado a cross-filters de gráfica (CrossFilterBar, la
// versión de KpiCard con tendencia mensual) porque Bienestar360 no filtra por
// clic en gráfica todavía — el mecanismo de selección aquí es el mapa, que
// vive en su propio store (zonaSeleccionada).

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { CountMap } from '../lib/kpis'
import { rank } from '../lib/kpis'
import type { ColorScale } from '../charts/palette'

/* ─────────────── KPI ─────────────── */

interface KpiProps {
  label: string
  value: string | number
  accent?: string
  hint?: string
  animate?: boolean
  size?: 'normal' | 'hero'
}

export function KpiCard({ label, value, accent, hint, animate = false, size = 'normal' }: KpiProps) {
  const numeric = typeof value === 'number'
  const shown = useCountUp(numeric && animate ? value : null)

  return (
    <div
      className={`kpi-card${size === 'hero' ? ' kpi-card-hero' : ''}`}
      style={accent ? ({ '--kpi-accent': accent } as never) : undefined}
    >
      <span className="kpi-label">{label}</span>
      <div className="kpi-main">
        <span className="kpi-value">{numeric && animate ? shown : value}</span>
      </div>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  )
}

function useCountUp(target: number | null) {
  const [shown, setShown] = useState(target ?? 0)
  const raf = useRef<number>()

  useEffect(() => {
    if (target === null) return
    const from = shown
    const delta = target - from
    if (delta === 0) return
    const start = performance.now()
    const dur = 520

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(from + delta * eased))
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return shown
}

/* ─────────────── Tarjeta contenedora ─────────────── */

export function Card({
  title,
  sub,
  children,
  actions,
  breakBefore = false,
}: {
  title: string
  sub?: ReactNode
  children: ReactNode
  actions?: ReactNode
  breakBefore?: boolean
}) {
  return (
    <section className={`card${breakBefore ? ' print-break' : ''}`}>
      <header className="card-head">
        <h3 className="card-title">{title}</h3>
        {sub && <span className="card-sub">{sub}</span>}
        {actions && <span className="card-actions no-print">{actions}</span>}
      </header>
      {children}
    </section>
  )
}

/* ─────────────── Esqueleto de carga ─────────────── */

export function Skeleton({ height = 280, lines = 0 }: { height?: number; lines?: number }) {
  if (lines > 0) {
    return (
      <div className="skeleton-stack" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 14, width: `${92 - i * 7}%` }} />
        ))}
      </div>
    )
  }
  return <div className="skeleton" style={{ height }} aria-hidden="true" />
}

/* ─────────────── Tabla resumen ─────────────── */

interface SummaryProps {
  data: CountMap
  dimension: string
  onPick?: (key: string) => void
  selected?: string | null
  scale?: ColorScale
  maxHeight?: number
  unitLabel?: string
}

export function SummaryTable({
  data,
  dimension,
  onPick,
  selected = null,
  scale,
  maxHeight,
  unitLabel = 'Cant.',
}: SummaryProps) {
  const { rows, total } = rank(data)

  if (rows.length === 0) {
    return (
      <div className="chart-empty" style={{ height: 120 }}>
        Sin datos
      </div>
    )
  }

  return (
    <div className="table-scroll" style={maxHeight ? { maxHeight } : undefined}>
      <table className="summary-table">
        <thead>
          <tr>
            <th>{dimension}</th>
            <th className="num">{unitLabel}</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={[onPick ? 'row-clickable' : '', selected === r.key ? 'row-active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={onPick ? () => onPick(r.key) : undefined}
              style={{ '--w': `${r.pct}%` } as CSSProperties}
            >
              <td>
                {scale && <span className="swatch" style={{ background: scale.get(r.key) }} />}
                {r.key}
              </td>
              <td className="num">{r.count}</td>
              <td className="num">{r.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td className="num">{total}</td>
            <td className="num">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* ─────────────── Estado vacío ─────────────── */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </svg>
      <h2>{title}</h2>
      <p>{children}</p>
      {action && <div className="empty-actions">{action}</div>}
    </div>
  )
}

/* ─────────────── Toggle de nivel (ciudad / departamento) ─────────────── */

export function LevelToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="subtabs" role="group" aria-label="Nivel de agregación del mapa">
      {options.map((o) => (
        <button
          key={o.id}
          className={`subtab${value === o.id ? ' active' : ''}`}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
