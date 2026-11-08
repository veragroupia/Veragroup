/**
 * As 4 cidades atendidas, em coordenadas reais (centro aproximado de cada cidade).
 * O mapa 3D converte lat/lon para quilômetros a partir do centro do grupo.
 */
export interface CidadeMapa {
  nome: string;
  lat: number;
  lon: number;
}

export const cidadesMapa: CidadeMapa[] = [
  { nome: 'Indaiatuba', lat: -23.0816, lon: -47.2101 },
  { nome: 'Salto', lat: -23.2003, lon: -47.2869 },
  { nome: 'Itu', lat: -23.2642, lon: -47.2992 },
  { nome: 'Sorocaba', lat: -23.5015, lon: -47.4526 },
];

const LAT0 = -23.29;
const LON0 = -47.33;
const KM_LAT = 110.6;
const KM_LON = 111.3 * Math.cos((LAT0 * Math.PI) / 180);

/** x para leste, z para sul (em km), como no mundo 3D. */
export function paraKm(c: Pick<CidadeMapa, 'lat' | 'lon'>): [number, number] {
  return [(c.lon - LON0) * KM_LON, -(c.lat - LAT0) * KM_LAT];
}
