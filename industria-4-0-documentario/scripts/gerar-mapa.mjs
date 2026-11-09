// Gera o contorno do Brasil (Natural Earth via world-atlas, domínio público) em coordenadas SVG.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const paises = feature(topo, topo.objects.countries);
const brasil = paises.features.find((f) => f.properties.name === 'Brazil');
const W = 760, H = 760;
const proj = geoMercator().fitExtent([[20, 20], [W - 20, H - 20]], brasil);
const path = geoPath(proj);
const vizinhos = paises.features.filter((f) => ['Argentina','Uruguay','Paraguay','Bolivia','Peru','Colombia','Venezuela','Guyana','Suriname','Chile','Ecuador'].includes(f.properties.name) || f.id === '254');
const campinas = proj([-47.0608, -22.9056]);
writeFileSync(new URL('../src/data/mapa-brasil.json', import.meta.url), JSON.stringify({
  largura: W, altura: H,
  brasil: path(brasil),
  vizinhos: vizinhos.map((f) => path(f)).filter(Boolean),
  campinas: campinas.map((n) => Math.round(n * 10) / 10),
  fonte: 'Natural Earth 1:50m (domínio público), via pacote npm world-atlas',
}));
console.log('ok', campinas);
