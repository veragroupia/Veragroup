import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Kit de maquete: acumula peças (caixas com chanfro, cilindros, planos) por camada de material
 * e devolve uma geometria mesclada por camada. Uma loja inteira vira poucos draw calls.
 */
export type Camada = 'pintura' | 'metal' | 'vidro' | 'tecido' | 'concreto' | 'escuro' | 'luzFixa';

type Vec3 = [number, number, number];

interface Opcoes {
  /** raio do chanfro em metros (0 = caixa reta) */
  chanfro?: number;
  rot?: Vec3;
}

const tmpCor = new Color();
const m4 = new Matrix4();
const q = new Quaternion();
const e = new Euler();
const s = new Vector3(1, 1, 1);
const p = new Vector3();

function pintar(geo: BufferGeometry, cor: string) {
  tmpCor.set(cor);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = tmpCor.r;
    arr[i * 3 + 1] = tmpCor.g;
    arr[i * 3 + 2] = tmpCor.b;
  }
  geo.setAttribute('color', new BufferAttribute(arr, 3));
  return geo;
}

function normalizar(geo: BufferGeometry) {
  // mergeGeometries exige o mesmo conjunto de atributos e todas indexadas
  if (!geo.index) {
    const n = geo.getAttribute('position').count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    geo.setIndex(new BufferAttribute(idx, 1));
  }
  for (const nome of Object.keys(geo.attributes)) {
    if (!['position', 'normal', 'uv', 'color'].includes(nome)) geo.deleteAttribute(nome);
  }
  return geo;
}

export class Montador {
  private pecas = new Map<Camada, BufferGeometry[]>();

  private add(camada: Camada, geo: BufferGeometry, pos: Vec3, cor: string, rot?: Vec3) {
    e.set(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0);
    q.setFromEuler(e);
    p.set(pos[0], pos[1], pos[2]);
    m4.compose(p, q, s);
    geo.applyMatrix4(m4);
    pintar(geo, cor);
    normalizar(geo);
    const lista = this.pecas.get(camada) ?? [];
    lista.push(geo);
    this.pecas.set(camada, lista);
  }

  /** Caixa centrada em `pos`. */
  caixa(camada: Camada, w: number, h: number, d: number, pos: Vec3, cor: string, o: Opcoes = {}) {
    const r = Math.min(o.chanfro ?? 0, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const geo = r > 0.002 ? new RoundedBoxGeometry(w, h, d, 1, r) : new BoxGeometry(w, h, d);
    this.add(camada, geo, pos, cor, o.rot);
  }

  /** Caixa apoiada: `base` é o y de baixo. */
  bloco(camada: Camada, w: number, h: number, d: number, x: number, base: number, z: number, cor: string, o: Opcoes = {}) {
    this.caixa(camada, w, h, d, [x, base + h / 2, z], cor, o);
  }

  cilindro(camada: Camada, rTopo: number, rBase: number, h: number, pos: Vec3, cor: string, o: Opcoes & { lados?: number } = {}) {
    const geo = new CylinderGeometry(rTopo, rBase, h, o.lados ?? 16, 1);
    this.add(camada, geo, pos, cor, o.rot);
  }

  esfera(camada: Camada, r: number, pos: Vec3, cor: string, escala: Vec3 = [1, 1, 1]) {
    const geo = new SphereGeometry(r, 20, 14);
    geo.scale(escala[0], escala[1], escala[2]);
    this.add(camada, geo, pos, cor);
  }

  plano(camada: Camada, w: number, h: number, pos: Vec3, cor: string, rot?: Vec3) {
    this.add(camada, new PlaneGeometry(w, h), pos, cor, rot);
  }

  geometrias(): Partial<Record<Camada, BufferGeometry>> {
    const out: Partial<Record<Camada, BufferGeometry>> = {};
    for (const [camada, lista] of this.pecas) {
      const geo = mergeGeometries(lista, false);
      if (!geo) continue;
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      out[camada] = geo;
      lista.forEach((g) => g.dispose());
    }
    this.pecas.clear();
    return out;
  }
}

/**
 * Parede com vãos de janela de verdade (recortados em faixas), para que o vidro fique recuado
 * e a luz desenhe peitoril e verga. Coordenadas locais: parede no plano XY, face externa em z = 0.
 */
export function paredeComVaos(
  m: Montador,
  camada: Camada,
  opts: {
    largura: number;
    altura: number;
    espessura: number;
    x: number;
    base: number;
    z: number;
    cor: string;
    vaos: { x: number; y: number; w: number; h: number }[]; // relativos ao canto inferior esquerdo da parede
  },
) {
  const { largura, altura, espessura, x, base, z, cor, vaos } = opts;
  const esq = x - largura / 2;
  const zc = z - espessura / 2;
  // Faixas verticais entre vãos (assume vãos numa mesma linha horizontal)
  const ordenados = [...vaos].sort((a, b) => a.x - b.x);
  const yMin = Math.min(...ordenados.map((v) => v.y));
  const yMax = Math.max(...ordenados.map((v) => v.y + v.h));
  // faixa de baixo e de cima inteiras
  if (yMin > 0.001) m.bloco(camada, largura, yMin, espessura, x, base, zc, cor);
  if (altura - yMax > 0.001) m.bloco(camada, largura, altura - yMax, espessura, x, base + yMax, zc, cor);
  // pilaretes entre vãos
  let cursor = 0;
  for (const v of ordenados) {
    const w = v.x - cursor;
    if (w > 0.001) m.bloco(camada, w, yMax - yMin, espessura, esq + cursor + w / 2, base + yMin, zc, cor);
    // completa acima/abaixo do vão se ele for menor que a faixa
    if (v.y > yMin + 0.001) m.bloco(camada, v.w, v.y - yMin, espessura, esq + v.x + v.w / 2, base + yMin, zc, cor);
    if (v.y + v.h < yMax - 0.001)
      m.bloco(camada, v.w, yMax - (v.y + v.h), espessura, esq + v.x + v.w / 2, base + v.y + v.h, zc, cor);
    cursor = v.x + v.w;
  }
  if (largura - cursor > 0.001)
    m.bloco(camada, largura - cursor, yMax - yMin, espessura, esq + cursor + (largura - cursor) / 2, base + yMin, zc, cor);
}

/** Gerador pseudoaleatório estável (mesma rua em todo carregamento). */
export function semente(n: number) {
  let t = n >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Escurece a base das paredes (sujeira de rodapé e oclusão do chão), clareando para cima.
 * Assenta o prédio no chão sem precisar de uma passada de AO.
 */
export function escurecerBase(geo: BufferGeometry | undefined, intensidade = 0.3, altura = 2.4) {
  if (!geo) return;
  const cor = geo.getAttribute('color') as BufferAttribute;
  const pos = geo.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < cor.count; i++) {
    const t = Math.min(1, Math.max(0, pos.getY(i) / altura));
    const f = 1 - intensidade * (1 - t * t * (3 - 2 * t));
    cor.setXYZ(i, cor.getX(i) * f, cor.getY(i) * f, cor.getZ(i) * f);
  }
  cor.needsUpdate = true;
}
