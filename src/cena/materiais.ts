import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type Plane,
  type Texture,
} from 'three';
import type { Camada } from './kit';

/**
 * Materiais da maquete: foscos, sem brilho de plástico.
 * - A luz dos postes chega pelo atributo `luz` (assada): `albedo × luz` entra como emissivo.
 * - Cada conjunto tem seus planos de corte (corte da fileira e, nas lojas que abrem, o corte da loja).
 */
const cache = new Map<string, Record<Camada, Material>>();

function comLuzAssada<T extends MeshStandardMaterial>(m: T, chave: string): T {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 luz;\nvarying vec3 vLuzAssada;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLuzAssada = luz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLuzAssada;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vLuzAssada;');
  };
  m.customProgramCacheKey = () => 'luz-assada-' + chave;
  return m;
}

export function recortar<T>(m: T, planos?: Plane[]): T {
  if (planos && planos.length) {
    const mat = m as unknown as Material;
    mat.clippingPlanes = planos;
    mat.clipShadows = true;
  }
  return m;
}

/** Conjunto de materiais por chave (ex.: 'norte', 'sul', 'loja:erk'), com seus planos de corte. */
export function materiaisBase(chave: string, planos: Plane[] = []): Record<Camada, Material> {
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const r = <T,>(m: T) => recortar(m, planos);
  const set: Record<Camada, Material> = {
    pintura: r(comLuzAssada(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), 'pintura')),
    concreto: r(comLuzAssada(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), 'concreto')),
    metal: r(comLuzAssada(new MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.7, envMapIntensity: 0.9 }), 'metal')),
    vidro: r(
      new MeshPhysicalMaterial({
        color: new Color('#0c1116'),
        roughness: 0.06,
        metalness: 0,
        transparent: true,
        opacity: 0.4,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.5,
        depthWrite: false,
        side: DoubleSide,
      }),
    ),
    tecido: r(comLuzAssada(new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: DoubleSide }), 'tecido')),
    escuro: r(new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 })),
    luzFixa: r(new MeshBasicMaterial({ vertexColors: true })),
  };
  cache.set(chave, set);
  return set;
}

/** Miolo das paredes cortadas: chapado, como o "poché" de uma planta. */
const poches = new Map<string, MeshBasicMaterial>();
export function materialPoche(chave: string, planos: Plane[]) {
  let m = poches.get(chave);
  if (!m) {
    m = recortar(new MeshBasicMaterial({ color: new Color('#262830'), side: BackSide }), planos);
    poches.set(chave, m);
  }
  return m;
}

/**
 * Material de interior de UMA loja: a cor de vértice é a luz do ambiente (sombreamento já assado).
 * `emissiveIntensity` liga e desliga a loja.
 */
export function materialInterior(planos?: Plane[]): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
    color: new Color('#8c8c8c'),
    emissive: new Color('#ffcf8f'),
    emissiveIntensity: 0,
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;');
  };
  m.customProgramCacheKey = () => 'interior-emissivo-por-vertice';
  return recortar(m, planos);
}

/**
 * Materiais "por loja" de um quarteirão inteiro mesclado: cada vértice sabe de qual loja é
 * (atributo `loja`) e o uniforme `uLuz[]` diz o quanto cada loja está acesa (0…~1,1).
 * Um quarteirão de 16 lojas acende e apaga loja por loja com um draw call por camada.
 */
export const MAX_LOJAS = 24;

export interface MaterialPorLoja extends MeshBasicMaterial {
  userData: { uLuz: { value: Float32Array } };
}

export function materialPorLoja(opts: {
  base: number;
  ganho: number;
  mapa?: Texture | null;
  aditivo?: boolean;
  corVertice?: boolean;
  cor?: string;
  planos?: Plane[];
  chave: string;
}): MaterialPorLoja {
  const m = new MeshBasicMaterial({
    vertexColors: opts.corVertice ?? false,
    map: opts.mapa ?? null,
    color: new Color(opts.cor ?? '#ffffff'),
    transparent: Boolean(opts.aditivo),
    depthWrite: !opts.aditivo,
  }) as MaterialPorLoja;
  if (opts.aditivo) m.blending = AdditiveBlending;
  const uLuz = { value: new Float32Array(MAX_LOJAS) };
  m.userData = { uLuz };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLuz = uLuz;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float loja;\nuniform float uLuz[${MAX_LOJAS}];\nvarying float vAcesa;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAcesa = uLuz[int(loja + 0.5)];');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAcesa;')
      .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= (${opts.base.toFixed(3)} + vAcesa * ${opts.ganho.toFixed(3)});`);
  };
  m.customProgramCacheKey = () => `por-loja-${opts.chave}`;
  return recortar(m, opts.planos);
}

export function materialAditivo(cor: string, opacidade = 1): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color(cor),
    transparent: true,
    opacity: opacidade,
    blending: AdditiveBlending,
    depthWrite: false,
  });
}

export const CORES = {
  sodio: '#ffb066',
  vitrine: '#ffc98a',
  ouro: '#c9a96e',
  lua: '#8fa7c4',
  nevoa: '#080a10',
  ceuTopo: '#05060a',
  ceuHorizonte: '#0e1119',
};
