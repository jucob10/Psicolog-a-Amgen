import { useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { MapView } from './views/MapView'
import { UploadView } from './views/UploadView'
import { ThemeToggle } from './components/ThemeToggle'
import { AmgenLogo } from './components/AmgenLogo'

type Tab = 'mapa' | 'cargar'

export default function App() {
  const rows = useAppStore((s) => s.rows)
  const toasts = useAppStore((s) => s.toasts)
  const [tab, setTab] = useState<Tab>(rows.length > 0 ? 'mapa' : 'cargar')

  return (
    <div className="app">
      <header className="app-header">
        <div className="marca-btn" style={{ cursor: 'default' }}>
          <AmgenLogo className="marca-logo" height={22} title="Amgen" />
          <span className="marca-sep" aria-hidden="true" />
          <span className="marca-textos">
            <span className="brand-title">Bienestar360</span>
            <span className="brand-sub">Gestión psicológica y bienestar de pacientes</span>
          </span>
        </div>

        <nav className="tabs" role="tablist" aria-label="Secciones" style={{ marginLeft: 'auto' }}>
          <button
            role="tab"
            aria-selected={tab === 'mapa'}
            className={`tab-btn${tab === 'mapa' ? ' active' : ''}`}
            onClick={() => setTab('mapa')}
          >
            Mapa
          </button>
          <button
            role="tab"
            aria-selected={tab === 'cargar'}
            className={`tab-btn${tab === 'cargar' ? ' active' : ''}`}
            onClick={() => setTab('cargar')}
          >
            Cargar Excel
          </button>
        </nav>

        <div className="header-right">
          <span className="data-status">
            {rows.length > 0 ? `${rows.length} registros en base` : 'Sin datos cargados'}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="main main-full">
        {tab === 'cargar' ? (
          <UploadView onLoaded={() => setTab('mapa')} />
        ) : (
          <MapView onGoUpload={() => setTab('cargar')} />
        )}
      </main>

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
