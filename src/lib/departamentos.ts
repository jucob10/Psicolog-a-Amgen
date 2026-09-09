// Portado literal de app.js (getDepartamentoLabel).
// Normaliza departamentos y mapea capitales/municipios frecuentes a su departamento.

import { normalizeKey } from './normalize'

const MAP: Record<string, string> = {
  // Departamentos
  antioquia: 'Antioquia', valle: 'Valle del Cauca', 'valle del cauca': 'Valle del Cauca',
  cundinamarca: 'Cundinamarca', santander: 'Santander', bolivar: 'Bolívar',
  atlantico: 'Atlántico', boyaca: 'Boyacá', caldas: 'Caldas',
  cauca: 'Cauca', cesar: 'Cesar', cordoba: 'Córdoba',
  huila: 'Huila', magdalena: 'Magdalena', meta: 'Meta',
  narino: 'Nariño', 'norte de santander': 'N. Santander', risaralda: 'Risaralda',
  tolima: 'Tolima', quindio: 'Quindío', sucre: 'Sucre',
  'la guajira': 'La Guajira', choco: 'Chocó', putumayo: 'Putumayo',
  amazonas: 'Amazonas', arauca: 'Arauca', casanare: 'Casanare',
  caqueta: 'Caquetá', guainia: 'Guainía', guaviare: 'Guaviare',
  'san andres': 'San Andrés', vaupes: 'Vaupés', vichada: 'Vichada',
  // Ciudades capitales y municipios frecuentes → departamento
  medellin: 'Antioquia', bello: 'Antioquia', itagui: 'Antioquia',
  envigado: 'Antioquia', apartado: 'Antioquia',
  cali: 'Valle del Cauca', palmira: 'Valle del Cauca', buenaventura: 'Valle del Cauca',
  manizales: 'Caldas', pereira: 'Risaralda', armenia: 'Quindío',
  ibague: 'Tolima', neiva: 'Huila',
  popayan: 'Cauca', pasto: 'Nariño',
  bucaramanga: 'Santander', barrancabermeja: 'Santander',
  cucuta: 'N. Santander', ocana: 'N. Santander',
  cartagena: 'Bolívar', magangue: 'Bolívar',
  barranquilla: 'Atlántico', soledad: 'Atlántico',
  'santa marta': 'Magdalena', villavicencio: 'Meta',
  monteria: 'Córdoba', sincelejo: 'Sucre',
  valledupar: 'Cesar', florencia: 'Caquetá',
  mocoa: 'Putumayo', quibdo: 'Chocó',
  tunja: 'Boyacá', duitama: 'Boyacá', sogamoso: 'Boyacá',
  riohacha: 'La Guajira', yopal: 'Casanare',
  leticia: 'Amazonas', mitu: 'Vaupés',
  inirida: 'Guainía', 'puerto carreno': 'Vichada',
  'san jose del guaviare': 'Guaviare',
  zipaquira: 'Cundinamarca', soacha: 'Cundinamarca', chia: 'Cundinamarca',
  girardot: 'Cundinamarca', fusagasuga: 'Cundinamarca',
}

const BOGOTA = new Set(['bogota', 'distrito especial', 'bogota d.c.', 'bogota dc', 'd.c.'])

export function getDepartamentoLabel(value: unknown): string {
  if (!value || String(value).trim() === '') return 'Sin dato'
  const norm = normalizeKey(value)
  if (!norm) return 'Sin dato'

  if (BOGOTA.has(norm)) return 'Bogotá'
  if (MAP[norm]) return MAP[norm]

  // Sin match → respetar lo que viene del Excel
  return String(value).trim()
}
