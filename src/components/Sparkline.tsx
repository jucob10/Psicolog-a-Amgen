// Sparkline: la serie de un KPI, dentro de la propia tarjeta.
//
// Es SVG a mano y no ECharts a propósito. Una tarjeta de KPI puede repetirse
// siete veces en una fila y ECharts monta un <canvas>, un observador de tamaño y
// un bucle de animación por instancia. Para 12 puntos sin ejes, sin tooltip y
// sin interacción, eso es un motor de coche para mover una bicicleta.
//
// No lleva ejes ni escala: una sparkline no se lee en valores absolutos, se lee
// en forma. La cifra exacta ya está al lado, en grande.

interface Props {
  values: number[]
  color: string
  width?: number
  height?: number
  /** Texto para lectores de pantalla; sin él la gráfica es puro adorno. */
  label?: string
}

export function Sparkline({ values, color, width = 104, height = 26, label }: Props) {
  if (values.length < 2) return null

  const pad = 2.5
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min

  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1)
  // Serie constante → línea centrada. Sin este caso, span = 0 divide por cero.
  const y = (v: number) =>
    span === 0 ? height / 2 : pad + (height - pad * 2) * (1 - (v - min) / span)

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`

  const lastX = x(values.length - 1)
  const lastY = y(values[values.length - 1])
  const gradId = `spark-${color.replace('#', '')}`

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? `Evolución de los últimos ${values.length} meses`}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* El punto final ancla la lectura: "y hoy vamos por aquí". */}
      <circle cx={lastX} cy={lastY} r="2.6" fill={color} />
    </svg>
  )
}
