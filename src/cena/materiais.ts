import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { Camada } from './kit';
import { planos, type Fileira } from './corte';

/**
 * Materiais da maquete: foscos, sem brilho de plástico. Um conjunto por fileira da rua
 * (cada fileira tem o seu plano de corte) e um conjunto "livre" para rua, postes e árvores.
 */
type Conjunto = 'livre' | Fileira;
const cache = new Map<Conjunto, Record<Camada, Material>>();

export function recortar<T>(m: T, fileira?: Fileira): T {
  if (fileira) {
    const mat = m as unknown as Material;
    mat.clippingPlanes = [planos[fileira]];
    mat.clipShadows = true;
  }
  return m;
}

export function materiaisBase(fileira?: Fileira): Record<Camada, Material> {
  const chave: Conjunto = fileira ?? 'livre';
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const r = <T extends Material>(m: T) => recortar(m, fileira);
  const set: Record<Camada, Material> = {
    pintura: r(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 })),
    concreto: r(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })),
    metal: r(new MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.75, envMapIntensity: 0.9 })),
    vidro: r(
      new MeshPhysicalMaterial({
        color: new Color('#0d1419'),
        roughness: 0.06,
        metalness: 0,
        transparent: true,
        opacity: 0.42,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.6,
        depthWrite: false,
        side: DoubleSide,
      }),
    ),
    tecido: r(new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: DoubleSide })),
    escuro: r(new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 })),
    luzFixa: r(new MeshBasicMaterial({ vertexColors: true })),
  };
  cache.set(chave, set);
  return set;
}

/** Miolo das paredes cortadas: preto chapado, como o "poché" de uma planta. */
const poches = new Map<Fileira, MeshBasicMaterial>();
export function materialPoche(fileira: Fileira) {
  let m = poches.get(fileira);
  if (!m) {
    m = recortar(new MeshBasicMaterial({ color: new Color('#33363b'), side: BackSide }), fileira);
    poches.set(fileira, m);
  }
  return m;
}

/**
 * Material de interior: a cor de vértice é a luz do ambiente (com sombreamento já assado).
 * `emissiveIntensity` liga e desliga a loja inteira.
 */
export function materialInterior(fileira?: Fileira): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
    color: new Color('#8c8c8c'),
    emissive: new Color('#ffb46a'),
    emissiveIntensity: 0,
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      'vec3 totalEmissiveRadiance = emissive;',
      'vec3 totalEmissiveRadiance = emissive * vColor.rgb;',
    );
  };
  m.customProgramCacheKey = () => 'interior-emissivo-por-vertice';
  return recortar(m, fileira);
}

export function materialAditivo(cor: string, opacidade = 1): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color(cor),
    transparent: true,
    opacity: opacidade,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: true,
  });
}

export const CORES = {
  sodio: '#ff9f4a',
  vitrine: '#ffb15e',
  lua: '#8fb0d6',
  nevoa: '#0c1a20',
  ceuTopo: '#06080b',
  ceuHorizonte: '#0f242b',
};
