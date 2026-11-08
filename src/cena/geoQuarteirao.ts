import { BoxGeometry, BufferAttribute, BufferGeometry, Euler, Matrix4, PlaneGeometry, Quaternion, Vector3, type Texture } from 'three';
import { ALTURA_GUIA, LARGURA_CALCADA, LARGURA_RUA, RECUO_FACHADA } from '../data/rua';
import type { IdSegmento } from '../data/segmentos';
import { assarPostes, type Poste } from './assar';
import { comAtributos, escurecerBase, juntar, Montador, type Camada } from './kit';
import { construirLoja, M } from './lojaGeo';
import { cabecaDoPoste, COMPRIMENTO_QUADRA, LARGURA_TRANSVERSAL, MEIA_QUADRA, POSTES_QUADRA, ALTURA_POSTE, BRACO_POSTE, type LoteGerado } from './quarteiroes';
import { atlasInteriores, atlasLetreiros } from './texturas';

export interface InfoLoja {
  indice: number;
  id: string;
  nome: string;
  segmento: IdSegmento;
  lado: 1 | -1;
  xLocal: number;
  largura: number;
  altura: number;
  xPortaLocal: number;
}

export interface GeoQuarteirao {
  estaticas: Partial<Record<Camada, BufferGeometry>>;
  interior?: BufferGeometry;
  fundos?: BufferGeometry;
  letreiros?: BufferGeometry;
  halos?: BufferGeometry;
  lampadas?: BufferGeometry;
  /** caixas invisíveis de toque, uma por loja (raycast barato) */
  alvos?: BufferGeometry;
  atlas: Texture | null;
  lojas: InfoLoja[];
}

export const postesLocais = (): Poste[] => POSTES_QUADRA.map((p) => cabecaDoPoste(p));

/** Matriz de uma loja no quarteirão: fachada na calçada, virada para a rua. */
export function matrizDaLoja(x: number, lado: 'norte' | 'sul') {
  const m = new Matrix4();
  const q = new Quaternion().setFromEuler(new Euler(0, lado === 'norte' ? Math.PI : 0, 0));
  m.compose(new Vector3(x, ALTURA_GUIA, lado === 'norte' ? RECUO_FACHADA : -RECUO_FACHADA), q, new Vector3(1, 1, 1));
  return m;
}

function remapearUV(geo: BufferGeometry, r: [number, number, number, number]) {
  const uv = geo.getAttribute('uv') as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
  uv.needsUpdate = true;
}

/** Junta todas as lojas de um quarteirão em poucas malhas (uma por camada) e assa a luz dos postes. */
export function montarQuarteirao(lotes: LoteGerado[], postes: Poste[] = postesLocais()): GeoQuarteirao {
  const camadas = new Map<Camada, BufferGeometry[]>();
  const interiores: BufferGeometry[] = [];
  const fundos: BufferGeometry[] = [];
  const letreiros: BufferGeometry[] = [];
  const halos: BufferGeometry[] = [];
  const lampadas: BufferGeometry[] = [];
  const lojas: InfoLoja[] = [];
  const alvos: BufferGeometry[] = [];
  const atlasInt = atlasInteriores();

  const comLetreiro = lotes.filter((l) => l.letreiro && l.letreiro.estilo !== 'logo');
  const geos = lotes.map((l) => ({ l, g: construirLoja(l) }));
  const atlas = comLetreiro.length
    ? atlasLetreiros(
        geos.filter(({ l }) => l.letreiro && l.letreiro.estilo !== 'logo').map(({ l, g }) => ({ l: l.letreiro!, w: g.letreiro!.w, h: g.letreiro!.h })),
      )
    : null;
  let iAtlas = 0;

  for (const { l, g } of geos) {
    const m = matrizDaLoja(l.x, l.lado);
    const lado: 1 | -1 = l.lado === 'norte' ? 1 : -1;
    const add = (c: Camada, geo?: BufferGeometry) => {
      if (!geo) return;
      geo.applyMatrix4(m);
      comAtributos(geo, l.indice);
      const lista = camadas.get(c) ?? [];
      lista.push(geo);
      camadas.set(c, lista);
    };
    for (const [c, geo] of Object.entries(g.corpo) as [Camada, BufferGeometry][]) add(c, geo);
    for (const [c, geo] of Object.entries(g.frente) as [Camada, BufferGeometry][]) add(c, geo);
    for (const [c, geo] of Object.entries(g.frenteD) as [Camada, BufferGeometry][]) add(c, geo);
    if (g.persiana) {
      // oficina genérica: porta de enrolar meio abaixada, fixa
      const p = new Montador();
      p.bloco('metal', g.persiana.w, g.persiana.h * 0.42, 0.04, 0, g.persiana.h * 0.58, -0.12, '#7d8286');
      add('metal', p.geometrias().metal);
    }
    g.interior.applyMatrix4(m);
    interiores.push(comAtributos(g.interior, l.indice));
    const f = new PlaneGeometry(g.fundo.w, g.fundo.h);
    remapearUV(f, atlasInt.uv(l.vitrine ?? 'roupas'));
    f.translate(g.fundo.pos[0], g.fundo.pos[1], g.fundo.pos[2]);
    f.applyMatrix4(m);
    fundos.push(comAtributos(f, l.indice));
    const h = new PlaneGeometry(g.halo.w, g.halo.h);
    h.translate(g.halo.pos[0], g.halo.pos[1], g.halo.pos[2]);
    h.applyMatrix4(m);
    halos.push(comAtributos(h, l.indice));
    if (g.lampadas) {
      g.lampadas.applyMatrix4(m);
      lampadas.push(comAtributos(g.lampadas, l.indice));
    }
    if (g.letreiro && atlas && l.letreiro && l.letreiro.estilo !== 'logo') {
      const b = new BoxGeometry(g.letreiro.w, g.letreiro.h, 0.1);
      const uv = b.getAttribute('uv') as BufferAttribute;
      const r = atlas.uv[iAtlas++];
      for (let i = 0; i < uv.count; i++) {
        if (i >= 16 && i < 20) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
        else uv.setXY(i, atlas.escuro[0], atlas.escuro[1]);
      }
      b.translate(g.letreiro.pos[0], g.letreiro.pos[1], g.letreiro.pos[2]);
      b.applyMatrix4(m);
      letreiros.push(comAtributos(b, l.indice));
    }
    const alvo = new BoxGeometry(l.largura - 0.1, g.altura, (l.profundidade ?? 11) - 0.2);
    alvo.translate(0, g.altura / 2, -((l.profundidade ?? 11) - 0.2) / 2 + 0.6);
    alvo.applyMatrix4(m);
    alvos.push(comAtributos(alvo, l.indice));
    // porta fica à direita de quem olha da rua: no norte (girado) isso é -x no mundo
    const portaLocal = g.vao.w / 2 - 0.25 - 0.525;
    lojas.push({
      indice: l.indice,
      id: l.id,
      nome: l.nome,
      segmento: l.segmentoId,
      lado,
      xLocal: l.x,
      largura: l.largura,
      altura: g.altura,
      xPortaLocal: l.x + (lado === 1 ? -portaLocal : portaLocal),
    });
  }

  const estaticas: Partial<Record<Camada, BufferGeometry>> = {};
  for (const [c, lista] of camadas) {
    const geo = juntar(lista);
    if (!geo) continue;
    if (c === 'pintura' || c === 'concreto' || c === 'metal' || c === 'tecido') assarPostes(geo, postes);
    estaticas[c] = geo;
    lista.forEach((x) => x.dispose());
  }
  return {
    estaticas,
    interior: juntar(interiores),
    fundos: juntar(fundos),
    letreiros: juntar(letreiros),
    halos: juntar(halos),
    lampadas: juntar(lampadas),
    alvos: juntar(alvos),
    atlas: atlas?.textura ?? null,
    lojas,
  };
}

export interface GeoRua {
  calcadas: BufferGeometry;
  concreto?: BufferGeometry;
  metal?: BufferGeometry;
  lampadas?: BufferGeometry;
  pocasDeLuz: BufferGeometry;
  faixas?: BufferGeometry;
  transversal: BufferGeometry;
}

/** Calçadas, guias, postes, faixas de pedestre e a rua transversal: iguais em todo quarteirão. */
export function montarRua(): GeoRua {
  const postes = postesLocais();
  const larg = LARGURA_CALCADA - 0.18;
  const calc: BufferGeometry[] = [];
  for (const lado of [1, -1]) {
    const g = new PlaneGeometry(COMPRIMENTO_QUADRA, larg, 90, 6);
    g.rotateX(-Math.PI / 2);
    g.translate(0, ALTURA_GUIA + 0.004, lado * (LARGURA_RUA / 2 + 0.18 + larg / 2));
    const uv = g.getAttribute('uv') as BufferAttribute;
    const pos = g.getAttribute('position') as BufferAttribute;
    const cor = new Float32Array(pos.count * 3);
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * COMPRIMENTO_QUADRA, uv.getY(i) * larg);
      // sombra de contato assada junto da fachada
      const dz = RECUO_FACHADA - Math.abs(pos.getZ(i));
      const f = 0.62 + 0.38 * Math.min(1, dz / 1.1);
      cor[i * 3] = cor[i * 3 + 1] = cor[i * 3 + 2] = f;
    }
    g.setAttribute('color', new BufferAttribute(cor, 3));
    comAtributos(g, 0);
    calc.push(g);
  }
  const calcadas = juntar(calc)!;
  assarPostes(calcadas, postes, undefined, 1.4, 7.5);

  const m = new Montador();
  const lamp = new Montador();
  for (const lado of [1, -1]) {
    m.bloco('concreto', COMPRIMENTO_QUADRA, ALTURA_GUIA + 0.02, 0.18, 0, -0.02, lado * (LARGURA_RUA / 2 + 0.09), '#8e8a82', { chanfro: 0.03 });
    m.bloco('concreto', COMPRIMENTO_QUADRA, ALTURA_GUIA - 0.02, larg, 0, -0.01, lado * (LARGURA_RUA / 2 + 0.18 + larg / 2), '#3a3936');
    m.bloco('concreto', COMPRIMENTO_QUADRA, 0.012, 0.4, 0, 0.002, lado * (LARGURA_RUA / 2 - 0.2), '#1b1d1f');
    // guias nas esquinas, entrando na transversal
    for (const xg of [-MEIA_QUADRA, MEIA_QUADRA])
      m.bloco('concreto', 0.18, ALTURA_GUIA + 0.02, LARGURA_CALCADA + 8, xg, -0.02, lado * (LARGURA_RUA / 2 + (LARGURA_CALCADA + 8) / 2), '#8e8a82', { chanfro: 0.03 });
  }
  for (const p of POSTES_QUADRA) {
    const zBase = p.lado * (LARGURA_RUA / 2 + 0.35);
    m.cilindro('concreto', 0.09, 0.15, ALTURA_POSTE, [p.x, ALTURA_POSTE / 2, zBase], '#77736b', { lados: 10 });
    m.caixa('metal', 0.07, 0.07, BRACO_POSTE + 0.2, [p.x, ALTURA_POSTE - 0.1, zBase - p.lado * (BRACO_POSTE / 2)], '#4b4d50');
    const h = cabecaDoPoste(p);
    m.caixa('metal', 0.36, 0.14, 0.7, [h.x, h.y + 0.18, h.z], '#3c3e41', { chanfro: 0.04 });
    lamp.caixa('luzFixa', 0.26, 0.03, 0.5, [h.x, h.y + 0.1, h.z], '#ffffff');
  }
  // semáforos nas duas esquinas da transversal (o carro para antes da faixa)
  for (const [x, lado] of [
    [MEIA_QUADRA + 0.6, 1],
    [MEIA_QUADRA + LARGURA_TRANSVERSAL - 0.6, -1],
  ] as const) {
    const z = lado * (LARGURA_RUA / 2 + 0.5);
    m.cilindro('metal', 0.06, 0.06, 3.4, [x, 1.7, z], '#2b2d30', { lados: 8 });
    m.caixa('metal', 0.32, 0.9, 0.26, [x, 3.5, z], '#1d1f22', { chanfro: 0.03 });
  }
  // faixas de pedestre: atravessando a transversal (na linha das calçadas) e a rua principal
  const faixas = new Montador();
  for (const lado of [1, -1]) {
    for (let i = 0; i < 8; i++) {
      const x = MEIA_QUADRA + 0.9 + i * 1.05;
      faixas.bloco('concreto', 0.5, 0.01, 2.4, x, 0.004, lado * (LARGURA_RUA / 2 + 1.6), '#8d8b86');
    }
  }
  for (let i = 0; i < 7; i++) {
    const z = -LARGURA_RUA / 2 + 0.75 + i * 1.25;
    faixas.bloco('concreto', 2.6, 0.01, 0.6, MEIA_QUADRA - 1.8, 0.004, z, '#8d8b86');
  }
  // poças de luz no chão embaixo de cada poste (aditivas, assadas no lugar)
  const pocas: BufferGeometry[] = [];
  for (const p of POSTES_QUADRA) {
    const h = cabecaDoPoste(p);
    const g = new PlaneGeometry(9, 9);
    g.rotateX(-Math.PI / 2);
    g.translate(h.x, 0.02, h.z + p.lado * 0.6);
    pocas.push(g);
  }
  const transversal = new PlaneGeometry(LARGURA_TRANSVERSAL, 220);
  transversal.rotateX(-Math.PI / 2);
  transversal.translate(MEIA_QUADRA + LARGURA_TRANSVERSAL / 2, 0.001, 0);

  const g = m.geometrias();
  for (const geo of Object.values(g)) if (geo) comAtributos(geo, 0);
  assarPostes(g.concreto, postes, undefined, 1.3);
  assarPostes(g.metal, postes, undefined, 1.0);
  escurecerBase(g.concreto, 0.2, 1.2);
  const fx = faixas.geometrias().concreto;
  if (fx) comAtributos(fx, 0);
  return {
    calcadas,
    concreto: g.concreto,
    metal: g.metal,
    lampadas: lamp.geometrias().luzFixa,
    pocasDeLuz: juntar(pocas.map((p) => comAtributos(p, 0)))!,
    faixas: fx,
    transversal,
  };
}

/** Lojas do quarteirão central que não são cases: mesma montagem, em coordenadas do mundo. */
export { M };
