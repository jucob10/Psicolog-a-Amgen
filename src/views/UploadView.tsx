// Carga del Excel de Bienestar360. Misma tubería que el gestor de casos
// original: readWorkbook (merges + detección de encabezados) → parser propio
// → store. Solo cambia el parser (parseBienestar360) y las etiquetas.

import { useRef, useState } from 'react'
import { parseBienestar360 } from '../lib/parsers/bienestar360'
import { useAppStore } from '../store/useAppStore'
import { Card, Skeleton } from '../components/ui'

type Status = { text: string; tone: 'info' | 'ok' | 'error' } | null

/** Cede el hilo hasta después del siguiente pintado (ver nota en el proyecto original). */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export function UploadView({ onLoaded }: { onLoaded: () => void }) {
  const setRows = useAppStore((s) => s.setRows)
  const clearRows = useAppStore((s) => s.clearRows)
  const rows = useAppStore((s) => s.rows)
  const toast = useAppStore((s) => s.toast)

  const [status, setStatus] = useState<Status>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setStatus({ text: 'Selecciona un archivo .xlsx, .xls o .csv', tone: 'error' })
      return
    }
    setBusy(true)
    setStatus({ text: `Leyendo ${file.name}…`, tone: 'info' })

    try {
      const buffer = await file.arrayBuffer()
      await afterPaint()
      const { rows: parsed, headerScore, errores } = parseBienestar360(buffer)

      if (parsed.length === 0) throw new Error('No se encontraron filas de gestión bajo el encabezado.')

      setRows(parsed)
      setStatus({ text: `${parsed.length} registros de gestión cargados correctamente.`, tone: 'ok' })
      toast(`Cargados ${parsed.length} registros de gestión`)
      if (errores.length > 0) console.warn('[Bienestar360]', errores, 'score:', headerScore)
      setTimeout(onLoaded, 600)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus({ text: `Error: ${msg}`, tone: 'error' })
      toast('No se pudo procesar el archivo', 'error')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const statusColor =
    status?.tone === 'ok' ? '#6ee7b7' : status?.tone === 'error' ? '#fca5a5' : '#93c5fd'

  return (
    <div className="grid-2">
      <Card title="Cargar matriz de Bienestar360" sub="Tablero_Bienestar360.xlsx">
        <div
          className={`dropzone${over ? ' over' : ''}${busy ? ' busy' : ''}`}
          onClick={() => {
            if (!busy) inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!busy) setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            if (busy) return
            const f = e.dataTransfer.files?.[0]
            if (f) void handleFile(f)
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            style={{ marginBottom: 12, opacity: 0.7 }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <h3>Arrastra la matriz aquí</h3>
          <p>o haz clic para seleccionarla · .xlsx, .xls o .csv</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
        </div>

        {status && (
          <p className="upload-status" style={{ color: statusColor }}>
            {status.text}
          </p>
        )}

        {busy && (
          <div style={{ marginTop: 14 }}>
            <Skeleton lines={5} />
          </div>
        )}

        {rows.length > 0 && (
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                clearRows()
                setStatus(null)
                toast('Base de gestión vaciada')
              }}
            >
              Vaciar base ({rows.length})
            </button>
          </div>
        )}
      </Card>

      <Card title="Columnas esperadas">
        <div className="note">
          <p style={{ marginBottom: 10 }}>
            El Excel debe traer estas columnas (el orden no importa, los acentos y espacios de más
            tampoco):
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Fecha de gestion</li>
            <li>Categorizacion</li>
            <li>Institucion</li>
            <li>Asistentes</li>
            <li>Tipo de poblacion</li>
            <li>Tipo de actividad</li>
            <li>Nombre actividad</li>
            <li>Ciudad</li>
            <li>Departamento</li>
            <li>Envio propuesta / respuesta de la propuesta / Estado propuesta</li>
            <li>Enfermero (psicóloga o profesional a cargo)</li>
            <li>Comentarios</li>
          </ul>
          <p style={{ marginTop: 10 }}>
            Las filas con Ciudad o Departamento = <b>"Virtual"</b> se cuentan aparte, en la tarjeta de
            actividad virtual — no se ubican en el mapa.
          </p>
        </div>
      </Card>
    </div>
  )
}
