// Coordenadas (lon, lat) de las ciudades que aparecen en la matriz de
// Bienestar360. No existe un GeoJSON de municipios de Colombia tan liviano
// como el de departamentos (colombia.ts), así que el nivel "ciudad" del mapa
// se dibuja como círculos proporcionales sobre el mismo coroplético de
// departamentos, anclados a estas coordenadas — el mismo patrón que ya usan
// los "focos" de MapChart.tsx en el proyecto original.
//
// Ampliar esta lista es agregar una fila: cualquier ciudad del Excel que no
// esté aquí cae en "sin ubicar" y se avisa debajo del mapa, nunca en silencio.

export const CIUDADES_COORDS: Record<string, [number, number]> = {
  Bogota: [-74.0721, 4.711],
  Bucaramanga: [-73.1198, 7.1193],
  Pereira: [-75.6961, 4.8133],
  Tunja: [-73.3679, 5.5353],
  Villavicencio: [-73.6266, 4.142],
}
