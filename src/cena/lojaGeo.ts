import { BufferAttribute, type BufferGeometry } from 'three';
import { PROFUNDIDADE_LOTE, type Lote } from '../data/rua';
import { escurecerBase, Montador, paredeComVaos, semente, type Camada } from './kit';

/**
 * Medidas de um sobrado comercial do interior (metros).
 * Coordenadas locais: x ao longo da fachada, fachada em z = 0 virada para +z (rua), y = 0 no piso da calçada.
 */
export const M = {
  terreo: 4.2,
  andar: 3.0,
  platibanda: 1.0,
  pilar: 0.38,
  testeira: 0.85,
  parede: 0.3,
  mureta: 0.45,
  fundoLoja: 4.6,
};

type Geos = Partial<Record<Camada, BufferGeometry>>;

export interface GeoLoja {
  corpo: Geos;
  frente: Geos;
  /** interior do térreo; a cor de vértice é a cor da luz (ver material de interior) */
  interior: BufferGeometry;
  lampadas?: BufferGeometry;
  fundo: { w: number; h: number; pos: [number, number, number] };
  letreiro?: { w: number; h: number; pos: [number, number, number]; disco?: boolean };
  persiana?: { w: number; h: number; pos: [number, number, number] };
  vao: { w: number; h: number };
  altura: number;
  /** véu de luz na abertura (brilho saindo da vitrine e da porta) */
  halo: { w: number; h: number; pos: [number, number, number] };
}

export const alturaDoLote = (l: Lote) =>
  l.andares === 0 ? 0 : M.terreo + (l.andares - 1) * M.andar + M.platibanda;

/** Sombreamento embutido no interior: luz vem do teto, fundo mais escuro que a frente. */
function assarLuzInterior(geo: BufferGeometry) {
  const cor = geo.getAttribute('color') as BufferAttribute;
  const nor = geo.getAttribute('normal') as BufferAttribute;
  const pos = geo.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < cor.count; i++) {
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    let f = ny > 0.5 ? 1 : ny < -0.5 ? 0.42 : nz > 0.5 ? 0.85 : 0.68;
    const z = pos.getZ(i);
    f *= 0.72 + 0.28 * Math.min(1, Math.max(0, 1 + z / M.fundoLoja));
    cor.setXYZ(i, cor.getX(i) * f, cor.getY(i) * f, cor.getZ(i) * f);
  }
  cor.needsUpdate = true;
}

export function construirLoja(l: Lote): GeoLoja {
  const corpo = new Montador();
  const frente = new Montador();
  const dentro = new Montador();
  const lamp = new Montador();
  const r = semente(l.id.length * 131 + Math.round(l.x * 10));

  const w = l.largura;
  const H = alturaDoLote(l);
  const D = l.profundidade ?? PROFUNDIDADE_LOTE;
  const vaoW = w - 2 * M.pilar;
  const vaoH = M.terreo - M.testeira;
  const { parede, detalhe, esquadria } = l.fachada;
  const barrado = l.fachada.barrado ?? detalhe;
  const concretoClaro = '#b9b4aa';
  const metalEscuro = '#26292d';
  const oficina = l.vitrine === 'oficina';

  // ——— volumes ———
  // fundo do térreo (atrás do salão)
  corpo.bloco('pintura', w, M.terreo, D - M.fundoLoja, 0, 0, -M.fundoLoja - (D - M.fundoLoja) / 2, parede);
  if (l.andares >= 2) {
    const hCima = H - M.platibanda - M.terreo;
    corpo.bloco('pintura', w, hCima, D - M.parede, 0, M.terreo, -M.parede - (D - M.parede) / 2, parede);
  }
  // laje sobre o salão (fecha o interior visto de cima)
  corpo.bloco('pintura', w, 0.4, M.fundoLoja, 0, M.terreo - 0.4, -M.fundoLoja / 2, parede);
  // paredes laterais do salão (meeiras)
  for (const s of [-1, 1]) corpo.bloco('pintura', 0.2, M.terreo, M.fundoLoja, s * (w / 2 - 0.1), 0, -M.fundoLoja / 2, parede);

  // cobertura + caixa d'água
  const topoLaje = H - M.platibanda;
  if (l.andares === 1) {
    // telhado de fibrocimento caindo para os fundos, escondido atrás da platibanda (típico de loja térrea)
    const alto = H - 0.25;
    const baixo = topoLaje + 0.15;
    const prof = D - M.parede - 0.2;
    const ang = Math.atan2(alto - baixo, prof);
    const len = Math.hypot(prof, alto - baixo);
    const zc = -M.parede - 0.1 - prof / 2;
    const yc = (alto + baixo) / 2;
    const passo = 0.177;
    for (let x = -w / 2 + 0.2; x < w / 2 - 0.2; x += passo) {
      corpo.caixa('concreto', passo * 0.55, 0.05, len, [x + passo * 0.27, yc + 0.02, zc], '#6f6c66', { rot: [-ang, 0, 0] });
      corpo.caixa('concreto', passo * 0.5, 0.03, len, [x + passo * 0.77, yc, zc], '#5d5a55', { rot: [-ang, 0, 0] });
    }
    // calha nos fundos
    corpo.bloco('metal', w - 0.3, 0.12, 0.16, 0, baixo - 0.12, -D + 0.12, '#4b4d50');
  } else {
    corpo.bloco('concreto', w - 0.02, 0.08, D - M.parede, 0, topoLaje, -M.parede - (D - M.parede) / 2, '#3a3c3f');
  }
  const lado = r() > 0.5 ? 1 : -1;
  if (l.andares >= 2) {
    corpo.cilindro('pintura', 0.55, 0.6, 0.95, [lado * w * 0.22, topoLaje + 0.08 + 0.475, -D + 1.6], '#566f80', { lados: 20 });
    corpo.cilindro('pintura', 0.32, 0.58, 0.14, [lado * w * 0.22, topoLaje + 0.08 + 0.95 + 0.07, -D + 1.6], '#4b6272', { lados: 20 });
  }
  if (l.andares >= 2) corpo.bloco('pintura', 1.4, 1.1, 1.6, -lado * w * 0.2, topoLaje + 0.08, -D + 2.4, detalhe, { chanfro: 0.03 });

  // ——— platibanda ———
  corpo.bloco('pintura', w, M.platibanda, M.parede, 0, H - M.platibanda, -M.parede / 2, parede, { chanfro: 0.02 });
  corpo.bloco('concreto', w + 0.06, 0.07, M.parede + 0.12, 0, H, -M.parede / 2 + 0.02, concretoClaro, { chanfro: 0.015 });
  // laterais da platibanda (para quem vê de cima)
  for (const s of [-1, 1])
    corpo.bloco('pintura', 0.18, M.platibanda, D - M.parede, s * (w / 2 - 0.09), H - M.platibanda, -M.parede - (D - M.parede) / 2, parede);

  // ——— andares de cima ———
  const nJan = w >= 6.4 ? 3 : 2;
  const janW = nJan === 3 ? 1.2 : 1.35;
  const janH = 1.45;
  for (let k = 1; k < l.andares; k++) {
    const base = M.terreo + (k - 1) * M.andar;
    const passo = w / nJan;
    const vaos = Array.from({ length: nJan }, (_, i) => ({ x: passo * i + (passo - janW) / 2, y: 0.95, w: janW, h: janH }));
    paredeComVaos(corpo, 'pintura', { largura: w, altura: M.andar, espessura: M.parede, x: 0, base, z: 0, cor: parede, vaos });
    for (const v of vaos) {
      const cx = -w / 2 + v.x + v.w / 2;
      const yb = base + v.y;
      corpo.bloco('concreto', v.w + 0.16, 0.05, 0.16, cx, yb - 0.05, 0.02, concretoClaro, { chanfro: 0.01 });
      corpo.plano('vidro', v.w, v.h, [cx, yb + v.h / 2, -0.17], '#ffffff');
      // interior do apartamento: quase sempre escuro, às vezes uma cortina acesa fraca
      const acesa = r() < 0.18;
      corpo.plano(acesa ? 'luzFixa' : 'escuro', v.w, v.h, [cx, yb + v.h / 2, -0.27], acesa ? (r() > 0.5 ? '#3a2a18' : '#2a2a30') : '#0b0d10');
      // caixilho: travessa e montante
      corpo.bloco('metal', v.w, 0.04, 0.05, cx, yb + v.h * 0.62, -0.15, esquadria);
      corpo.bloco('metal', 0.04, v.h, 0.05, cx, yb, -0.15, esquadria);
      for (const s of [-1, 1]) corpo.bloco('metal', 0.05, v.h, 0.06, cx + s * (v.w / 2 - 0.025), yb, -0.15, esquadria);
      corpo.bloco('metal', v.w, 0.05, 0.06, cx, yb + v.h - 0.05, -0.15, esquadria);
    }
    // friso entre andares
    corpo.bloco('concreto', w + 0.02, 0.12, M.parede + 0.08, 0, base - 0.06, -M.parede / 2 + 0.04, detalhe, { chanfro: 0.015 });
  }

  // ——— térreo: pilares e testeira (fixos) ———
  for (const s of [-1, 1])
    corpo.bloco('pintura', M.pilar, M.terreo, 0.44, s * (w / 2 - M.pilar / 2), 0, -0.14, detalhe, { chanfro: 0.025 });
  corpo.bloco('pintura', w, M.testeira, 0.44, 0, vaoH, -0.14, detalhe, { chanfro: 0.025 });
  if (l.andares >= 2)
    corpo.bloco('concreto', w + 0.04, 0.12, 0.52, 0, M.terreo - 0.06, -0.12, concretoClaro, { chanfro: 0.015 });

  // ——— frente do térreo (é ela que abre quando a loja é tocada) ———
  const esqVao = -vaoW / 2;
  const zVidro = -0.34;
  frente.bloco('metal', vaoW, 0.3, 0.34, 0, vaoH - 0.3, -0.2, metalEscuro, { chanfro: 0.01 }); // caixa da porta de enrolar
  const topoVidro = vaoH - 0.3;
  let persiana: GeoLoja['persiana'];
  if (oficina) {
    persiana = { w: vaoW - 0.04, h: topoVidro, pos: [0, topoVidro / 2, -0.12] };
    for (const s of [-1, 1]) frente.bloco('metal', 0.08, topoVidro, 0.12, s * (vaoW / 2 - 0.04), 0, -0.12, metalEscuro);
  } else {
    const portaW = 1.05;
    const portaX = vaoW / 2 - 0.25 - portaW / 2; // porta à direita (vista da rua)
    const vitW = vaoW - portaW - 0.25 - 0.05;
    const vitCx = esqVao + vitW / 2;
    // mureta + vidro da vitrine
    frente.bloco('pintura', vitW, M.mureta, 0.3, vitCx, 0, zVidro + 0.05, barrado, { chanfro: 0.02 });
    frente.plano('vidro', vitW, topoVidro - M.mureta, [vitCx, M.mureta + (topoVidro - M.mureta) / 2, zVidro], '#ffffff');
    // porta e bandeira
    frente.plano('vidro', portaW, 2.45, [portaX, 1.25, zVidro], '#ffffff');
    frente.plano('vidro', portaW, topoVidro - 2.55, [portaX, 2.55 + (topoVidro - 2.55) / 2, zVidro], '#ffffff');
    // trecho de parede à direita da porta
    frente.bloco('pintura', 0.25, topoVidro, 0.3, vaoW / 2 - 0.125, 0, zVidro + 0.05, barrado);
    // caixilhos
    const fr = (cw: number, ch: number, x: number, y: number) => frente.bloco('metal', cw, ch, 0.07, x, y, zVidro + 0.02, esquadria);
    fr(vitW, 0.06, vitCx, M.mureta);
    fr(vaoW - 0.25, 0.07, esqVao + (vaoW - 0.25) / 2, topoVidro - 0.07);
    fr(0.06, topoVidro, esqVao + 0.03, 0);
    const nMont = Math.max(1, Math.round(vitW / 1.7));
    for (let i = 1; i < nMont; i++) fr(0.05, topoVidro - M.mureta, esqVao + (vitW / nMont) * i, M.mureta);
    for (const s of [-1, 1]) fr(0.07, topoVidro, portaX + s * (portaW / 2 + 0.035), 0);
    fr(portaW, 0.08, portaX, 2.47);
    frente.bloco('metal', 0.035, 0.75, 0.05, portaX - portaW / 2 + 0.16, 0.75, zVidro + 0.09, '#c9ccd0'); // puxador
    // soleira
    frente.bloco('concreto', vaoW, 0.04, 0.5, 0, 0, -0.1, concretoClaro);
  }

  // toldo de lona ou marquise de concreto
  if (l.toldo) {
    const prof = 1.3;
    const queda = 0.6;
    const len = Math.hypot(prof, queda);
    const ang = Math.atan2(queda, prof);
    const tw = vaoW + 0.3;
    corpo.caixa('tecido', tw, 0.03, len, [0, vaoH + 0.05 - queda / 2, 0.08 + prof / 2], l.toldo.cor, { rot: [ang, 0, 0] });
    corpo.bloco('tecido', tw, 0.3, 0.025, 0, vaoH + 0.05 - queda - 0.3, 0.08 + prof, l.toldo.sanefa ?? l.toldo.cor);
    for (const s of [-1, 1]) {
      // braço de ferro
      corpo.caixa('metal', 0.03, 0.03, len, [s * (tw / 2 - 0.05), vaoH + 0.02 - queda / 2, 0.08 + prof / 2], metalEscuro, { rot: [ang, 0, 0] });
    }
  } else if (l.marquise) {
    corpo.bloco('concreto', w - 0.04, 0.16, 1.3, 0, vaoH, 0.08 + 0.6, concretoClaro, { chanfro: 0.02 });
    const n = Math.max(2, Math.round(w / 1.8));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5);
      lamp.cilindro('luzFixa', 0.09, 0.09, 0.02, [x, vaoH - 0.012, 0.75], '#ffd9a6', { lados: 14 });
    }
  }

  // letreiro
  let letreiro: GeoLoja['letreiro'];
  if (l.letreiro) {
    if (l.letreiro.estilo === 'logo') {
      letreiro = { w: 1.9, h: 1.9, pos: [0, M.terreo + 0.05, 0.17], disco: true };
    } else {
      const base = l.marquise ? vaoH + 0.22 : vaoH + 0.12;
      const topo = M.terreo - 0.08;
      const lw = Math.min(vaoW - 0.2, w - 1.0);
      letreiro = { w: lw, h: topo - base, pos: [0, (base + topo) / 2, 0.14] };
    }
  }

  // ——— interior do salão ———
  const xi = w / 2 - 0.2;
  const tetoI = vaoH + 0.25;
  const corPiso = l.vitrine === 'joias' ? '#6a5040' : l.vitrine === 'oficina' ? '#4d5052' : '#cbb79c';
  const corParede = l.vitrine === 'joias' ? '#8a7260' : l.vitrine === 'academia' ? '#3a3c40' : '#efe6d8';
  dentro.bloco('pintura', 2 * xi, 0.02, M.fundoLoja, 0, 0, -M.fundoLoja / 2, corPiso);
  dentro.bloco('pintura', 2 * xi, 0.02, M.fundoLoja, 0, tetoI, -M.fundoLoja / 2, '#f4ece0');
  for (const s of [-1, 1]) dentro.bloco('pintura', 0.02, tetoI, M.fundoLoja, s * xi, 0, -M.fundoLoja / 2, corParede);
  // faixas de luz no teto (brilham mais que tudo)
  for (const z of [-1.3, -3.1]) dentro.bloco('pintura', 2 * xi - 0.8, 0.03, 0.14, 0, tetoI - 0.03, z, '#ffffff');
  // móveis por segmento
  switch (l.vitrine) {
    case 'joias':
      dentro.bloco('pintura', 2.4, 1.0, 0.6, -0.3, 0, -2.2, '#2a1e17', { chanfro: 0.03 });
      dentro.bloco('pintura', 2.4, 0.03, 0.6, -0.3, 1.0, -2.2, '#fff6e6');
      dentro.bloco('pintura', 0.6, 1.0, 1.6, xi - 0.5, 0, -3.2, '#2a1e17');
      break;
    case 'doces':
      dentro.bloco('pintura', 3.0, 1.05, 0.7, -0.4, 0, -2.0, '#e8d6c3', { chanfro: 0.03 });
      dentro.bloco('pintura', 3.0, 0.5, 0.7, -0.4, 1.05, -2.0, '#fff4e8');
      break;
    case 'roupas':
      for (const x of [-1.4, 0.3]) {
        dentro.bloco('pintura', 1.2, 0.03, 0.03, x, 1.55, -2.0, '#9a9a9a');
        for (let i = 0; i < 6; i++) dentro.bloco('pintura', 0.12, 0.9, 0.42, x - 0.5 + i * 0.2, 0.62, -2.0, ['#2d3a4a', '#b9a58b', '#7d2f2f', '#d8d3c8'][i % 4]);
      }
      dentro.bloco('pintura', 0.42, 1.75, 0.3, xi - 0.6, 0, -1.2, '#d6d0c6'); // manequim
      break;
    case 'clinica':
      dentro.bloco('pintura', 2.0, 1.1, 0.6, 0.6, 0, -2.6, '#e8eeee', { chanfro: 0.03 });
      for (let i = 0; i < 3; i++) dentro.bloco('pintura', 0.5, 0.45, 0.5, -1.6 + i * 0.6, 0, -1.2, '#2f6f73');
      break;
    case 'academia':
      for (let i = 0; i < 3; i++) dentro.bloco('pintura', 0.7, 1.2, 1.6, -1.8 + i * 1.6, 0, -2.4, '#18191b');
      break;
    case 'pet':
      dentro.bloco('pintura', 2.0, 1.0, 0.6, 0.8, 0, -2.4, '#e9e4d8');
      for (let i = 0; i < 2; i++) dentro.bloco('pintura', 0.4, 1.8, 2.0, -xi + 0.3, 0, -1.4 - i * 2.1, '#d07a3a');
      break;
    case 'oficina':
      dentro.cilindro('pintura', 0.32, 0.32, 0.25, [-1.6, 0.13, -2.2], '#1b1c1d', { lados: 18 });
      dentro.bloco('pintura', 1.8, 1.4, 3.8, 1.2, 0, -2.6, '#7d2b26', { chanfro: 0.18 }); // carro no elevador
      dentro.bloco('pintura', 0.2, 2.2, 0.2, 2.3, 0, -1.0, '#c8a33c');
      break;
  }
  const geoDentro = dentro.geometrias();
  const interior = geoDentro.pintura!;
  assarLuzInterior(interior);
  // faixas do teto em HDR: mais fortes que o resto
  const cor = interior.getAttribute('color') as BufferAttribute;
  const pos = interior.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < cor.count; i++) {
    if (pos.getY(i) > tetoI - 0.04 && pos.getY(i) < tetoI - 0.001 && Math.abs(pos.getX(i)) < xi - 0.39) {
      cor.setXYZ(i, 6, 5.2, 4.2);
    }
  }

  const geoCorpo = corpo.geometrias();
  const geoFrente = frente.geometrias();
  escurecerBase(geoCorpo.pintura, 0.32, 2.6);
  escurecerBase(geoFrente.pintura, 0.25, 1.2);
  return {
    corpo: geoCorpo,
    frente: geoFrente,
    interior,
    lampadas: lamp.geometrias().luzFixa,
    fundo: { w: 2 * xi, h: tetoI, pos: [0, tetoI / 2, -M.fundoLoja + 0.02] },
    letreiro,
    persiana,
    vao: { w: vaoW, h: vaoH },
    altura: H,
    halo: { w: vaoW - 0.1, h: vaoH - 0.35, pos: [0, (vaoH - 0.35) / 2, -0.3] },
  };
}

/** Terreno vazio com tapume, entulho organizado e uma luz de obra. */
export function construirTerreno(l: Lote) {
  const m = new Montador();
  const lamp = new Montador();
  const w = l.largura;
  const D = PROFUNDIDADE_LOTE;
  m.bloco('concreto', w, 0.06, D, 0, -0.03, -D / 2, '#2a2620'); // terra batida
  for (let i = 0; i < 9; i++) {
    const r = semente(i + 11);
    m.esfera('concreto', 0.5 + r() * 0.4, [-w / 2 + 0.8 + r() * (w - 1.6), 0.02, -1.8 - r() * (D - 3)], '#26301f', [1.6, 0.25, 1.2]);
  }
  // tapume de chapa com montantes
  const altura = 2.2;
  const nPlacas = Math.round(w / 1.1);
  const pw = w / nPlacas;
  for (let i = 0; i < nPlacas; i++) {
    const x = -w / 2 + pw * (i + 0.5);
    m.bloco('pintura', pw - 0.03, altura, 0.04, x, 0, -0.1, i % 2 ? l.fachada.parede : l.fachada.detalhe);
  }
  for (let i = 0; i <= nPlacas; i++) m.bloco('metal', 0.06, altura + 0.06, 0.06, -w / 2 + pw * i, 0, -0.15, '#3a3a3a');
  m.bloco('metal', w, 0.05, 0.06, 0, altura - 0.12, -0.15, '#3a3a3a');
  // material de obra
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3 - (i % 2); j++) m.bloco('pintura', 0.6, 0.3, 0.4, -1.4 + j * 0.62, i * 0.3, -4.2, '#8c4f36', { chanfro: 0.01 });
  m.cilindro('concreto', 0.0, 1.3, 0.9, [1.5, 0.45, -5.6], '#6f644f', { lados: 22 });
  // poste da luz de obra
  m.bloco('metal', 0.08, 3.2, 0.08, w / 2 - 0.6, 0, -0.5, '#3a3a3a');
  m.bloco('metal', 0.32, 0.22, 0.2, w / 2 - 0.6, 3.15, -0.4, '#2b2b2b');
  lamp.bloco('luzFixa', 0.26, 0.04, 0.16, w / 2 - 0.6, 3.12, -0.4, '#ffd08a');
  return { corpo: m.geometrias(), lampadas: lamp.geometrias().luzFixa, luzObra: [w / 2 - 0.6, 3.0, -0.4] as [number, number, number] };
}
