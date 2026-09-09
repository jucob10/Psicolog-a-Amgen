// Tipos del dominio de Bienestar360.
//
// Reflejan 1:1 las columnas del Excel real (Tablero_Bienestar360.xlsx), ya
// normalizadas por el parser: fechas a "YYYY-MM-DD", "n/a" a null, "Ciudad "
// (con espacio final en el Excel) a "ciudad", y "Enfermero" (nombre real de la
// columna, aunque en este programa es la psicóloga/profesional a cargo) a un
// array de nombres.

/** Fila cruda del Excel: { "Nombre de la columna": valor } */
export type ExcelRow = Record<string, unknown>

export type Categorizacion = 'Impacto Institucional' | 'Talleres Virtuales'

export type TipoPoblacion = 'Pacientes' | 'Personal de Salud'

export type EstadoPropuesta = 'Realizada' | null

/**
 * Una fila de gestión ya parseada y normalizada.
 *
 * `esVirtual` es la bandera clave para la vista de mapa: "Virtual" no es una
 * ciudad geográfica real (el Excel usa Ciudad="Virtual" / Departamento="Virtual"
 * para talleres virtuales sin sede física), así que estos registros nunca se
 * intentan ubicar en el mapa de Colombia — se cuentan aparte.
 */
export interface GestionBienestar {
  id: number
  fechaGestion: string // "YYYY-MM-DD" o '' si no se pudo parsear
  categorizacion: Categorizacion | string
  institucion: string
  asistentes: number
  tipoPoblacion: TipoPoblacion | string
  tipoActividad: string
  nombreActividad: string
  ciudad: string
  departamento: string
  esVirtual: boolean
  envioPropuesta: string | null
  respuestaPropuesta: string | null
  estadoPropuesta: string | null
  profesionales: string[] // "Enfermero" separado por "/"
  comentarios: string
}

/** Resultado de parsear el Excel: filas + lo que no se pudo interpretar. */
export interface ParseResult {
  rows: GestionBienestar[]
  headerScore: number
  errores: string[]
}

/** Nivel de agregación geográfica del mapa. */
export type NivelMapa = 'ciudad' | 'departamento'
