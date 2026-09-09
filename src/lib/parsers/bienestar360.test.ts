import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseBienestar360 } from './bienestar360'
import { actividadesPorCiudad, actividadesPorDepartamento, filasVirtuales } from '../agregaciones'

const EJEMPLO = path.resolve(__dirname, '../../../ejemplo/Tablero_Bienestar360.xlsx')

function loadBuffer(): ArrayBuffer {
  const buf = readFileSync(EJEMPLO)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

describe('parseBienestar360', () => {
  it('lee todas las filas del Excel real', () => {
    const { rows, headerScore } = parseBienestar360(loadBuffer())
    expect(headerScore).toBeGreaterThanOrEqual(3)
    // El Excel de ejemplo trae 55 filas bajo el encabezado, pero la última
    // está completamente vacía (fila en blanco al final de la hoja) y se
    // descarta correctamente: quedan 53 filas de datos reales.
    expect(rows.length).toBe(53)
  })

  it('normaliza "n/a" a null en las columnas de propuesta', () => {
    const { rows } = parseBienestar360(loadBuffer())
    const conNA = rows.filter((r) => r.envioPropuesta === null)
    expect(conNA.length).toBeGreaterThan(0)
  })

  it('separa "Enfermero" en un array de nombres', () => {
    const { rows } = parseBienestar360(loadBuffer())
    rows.forEach((r) => expect(Array.isArray(r.profesionales)).toBe(true))
    const total = rows.reduce((s, r) => s + r.profesionales.length, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('marca esVirtual para filas con Ciudad o Departamento = Virtual', () => {
    const { rows } = parseBienestar360(loadBuffer())
    const virtuales = filasVirtuales(rows)
    expect(virtuales.length).toBeGreaterThan(0)
    virtuales.forEach((r) => expect(r.esVirtual).toBe(true))
  })

  it('agrega actividades por ciudad y por departamento sin perder filas geográficas', () => {
    const { rows } = parseBienestar360(loadBuffer())
    const geo = rows.filter((r) => !r.esVirtual)
    const porCiudad = actividadesPorCiudad(rows)
    const porDepto = actividadesPorDepartamento(rows)
    const totalCiudad = Object.values(porCiudad).reduce((a, b) => a + b, 0)
    const totalDepto = Object.values(porDepto).reduce((a, b) => a + b, 0)
    expect(totalCiudad).toBe(geo.length)
    expect(totalDepto).toBe(geo.length)
    console.log('Por ciudad:', porCiudad)
    console.log('Por departamento:', porDepto)
  })
})
