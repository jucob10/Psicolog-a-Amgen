// Agregaciones específicas de Bienestar360.
//
// Todo lo de aquí es puro: recibe GestionBienestar[] y devuelve estructuras
// que las vistas y las gráficas consumen directamente. Nada sabe que existe
// un mapa o un DOM — eso vive en los componentes.

import { groupBy, rank, sumBy, type CountMap } from './kpis'
import type { GestionBienestar } from '../types'

/** Filas con ubicación geográfica real (excluye "Virtual"). */
export function filasGeograficas(rows: GestionBienestar[]): GestionBienestar[] {
  return rows.filter((r) => !r.esVirtual)
}

/** Filas de actividad virtual (Ciudad o Departamento = "Virtual"). */
export function filasVirtuales(rows: GestionBienestar[]): GestionBienestar[] {
  return rows.filter((r) => r.esVirtual)
}

/** Actividades (conteo de filas) por ciudad. Solo filas geográficas. */
export function actividadesPorCiudad(rows: GestionBienestar[]): CountMap {
  return groupBy(filasGeograficas(rows), 'ciudad')
}

/** Actividades por departamento. Solo filas geográficas. */
export function actividadesPorDepartamento(rows: GestionBienestar[]): CountMap {
  return groupBy(filasGeograficas(rows), 'departamento')
}

/** Asistentes (suma) por ciudad. Solo filas geográficas. */
export function asistentesPorCiudad(rows: GestionBienestar[]): CountMap {
  return sumBy(filasGeograficas(rows), 'ciudad', (r) => r.asistentes)
}

/** Asistentes (suma) por departamento. Solo filas geográficas. */
export function asistentesPorDepartamento(rows: GestionBienestar[]): CountMap {
  return sumBy(filasGeograficas(rows), 'departamento', (r) => r.asistentes)
}

export function porInstitucion(rows: GestionBienestar[]): CountMap {
  return groupBy(rows, 'institucion')
}

export function porTipoActividad(rows: GestionBienestar[]): CountMap {
  return groupBy(rows, 'tipoActividad')
}

export function porTipoPoblacion(rows: GestionBienestar[]): CountMap {
  return groupBy(rows, 'tipoPoblacion')
}

export function porCategorizacion(rows: GestionBienestar[]): CountMap {
  return groupBy(rows, 'categorizacion')
}

export function porEstadoPropuesta(rows: GestionBienestar[]): CountMap {
  const map: CountMap = {}
  rows.forEach((r) => {
    const key = r.estadoPropuesta ?? 'n/a'
    map[key] = (map[key] || 0) + 1
  })
  return map
}

/** Cuenta de filas por profesional. Una fila con varios profesionales cuenta una vez por cada uno. */
export function porProfesional(rows: GestionBienestar[]): CountMap {
  const map: CountMap = {}
  rows.forEach((r) => {
    const nombres = r.profesionales.length > 0 ? r.profesionales : ['Sin asignar']
    nombres.forEach((n) => {
      map[n] = (map[n] || 0) + 1
    })
  })
  return map
}

/** Lista de nombres de profesionales únicos, ordenada. */
export function profesionalesUnicos(rows: GestionBienestar[]): string[] {
  const set = new Set<string>()
  rows.forEach((r) => r.profesionales.forEach((n) => set.add(n)))
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Serie mensual "YYYY-MM" → cantidad de actividades, ordenada cronológicamente. */
export function serieMensual(rows: GestionBienestar[]): Array<{ ym: string; value: number }> {
  const map: CountMap = {}
  rows.forEach((r) => {
    if (!r.fechaGestion) return
    const ym = r.fechaGestion.slice(0, 7)
    map[ym] = (map[ym] || 0) + 1
  })
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, value]) => ({ ym, value }))
}

/** KPIs resumidos de un conjunto de filas (usado tanto para el total como para una ciudad). */
export interface ResumenGestion {
  totalActividades: number
  totalAsistentes: number
  totalInstituciones: number
  totalProfesionales: number
  propuestasRealizadas: number
}

export function resumen(rows: GestionBienestar[]): ResumenGestion {
  const instituciones = new Set(
    rows.map((r) => r.institucion).filter((i) => i && i !== 'General' && i !== 'Focalizado'),
  )
  return {
    totalActividades: rows.length,
    totalAsistentes: rows.reduce((s, r) => s + r.asistentes, 0),
    totalInstituciones: instituciones.size,
    totalProfesionales: profesionalesUnicos(rows).length,
    propuestasRealizadas: rows.filter((r) => r.estadoPropuesta === 'Realizada').length,
  }
}

/** Filas de una ciudad concreta (comparación exacta, ya normalizada por el parser). */
export function filasDeCiudad(rows: GestionBienestar[], ciudad: string): GestionBienestar[] {
  return rows.filter((r) => r.ciudad === ciudad)
}

export function filasDeDepartamento(rows: GestionBienestar[], departamento: string): GestionBienestar[] {
  return rows.filter((r) => r.departamento === departamento)
}

export { rank }
export type { CountMap }
