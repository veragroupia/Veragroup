import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { Letreiro, Vitrine } from '../data/rua';
import { semente } from './kit';

// Fontes dos letreiros (OFL). Ficam só no pacote da cena.
import '@fontsource/big-shoulders-display/500';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/cinzel/600';

const SINAL = '"Big Shoulders Display"';
const MARCA = 'Cinzel';
const SYNE = 'Syne';

export async function carregarFontesDaCena() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`800 64px ${SINAL}`),
    document.fonts.load(`500 64px ${SINAL}`),
    document.fonts.load(`600 64px ${MARCA}`),
    document.fonts.load(`700 64px ${SYNE}`),
  ]);
}

export function tela(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

export function textura(c: HTMLCanvasElement, cor = true): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = cor ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = src;
  });
}

function ajustarTexto(ctx: CanvasRenderingContext2D, texto: string, fonte: string, peso: number, alturaMax: number, larguraMax: number, esp: number) {
  let tam = alturaMax;
  for (let i = 0; i < 40; i++) {
    ctx.font = `${peso} ${tam}px ${fonte}`;
    ctx.letterSpacing = `${tam * esp}px`;
    if (ctx.measureText(texto).width <= larguraMax) break;
    tam *= 0.94;
  }
  return tam;
}

/**
 * Desenha um letreiro num retângulo do canvas. `brilho` desenha a máscara do que acende
 * (letras brancas; na caixa luminosa o acrílico inteiro).
 */
export function desenharLetreiro(ctx: CanvasRenderingContext2D, l: Letreiro, x: number, y: number, W: number, H: number, brilho = false) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, W, H);
  ctx.clip();
  const fonte = l.fonte === 'marca' ? MARCA : l.fonte === 'syne' ? SYNE : SINAL;
  const peso = l.fonte === 'marca' ? 600 : l.fonte === 'syne' ? 700 : 800;
  if (l.estilo === 'caixa') {
    ctx.fillStyle = l.fundo;
    ctx.fillRect(x, y, W, H);
    if (brilho) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, W, H);
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = brilho ? '#000' : l.fundo;
    ctx.fillRect(x, y, W, H);
  }
  const temSub = Boolean(l.sub);
  const esp = l.fonte === 'marca' ? 0.14 : l.fonte === 'syne' ? -0.01 : 0.05;
  const tam = ajustarTexto(ctx, l.texto, fonte, peso, H * (temSub ? 0.5 : 0.64), W * 0.86, esp);
  ctx.font = `${peso} ${tam}px ${fonte}`;
  ctx.letterSpacing = `${tam * esp}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = brilho && l.estilo !== 'caixa' ? '#ffffff' : l.tinta;
  ctx.fillText(l.texto, x + W / 2 + (tam * esp) / 2, y + H * (temSub ? 0.46 : 0.53));
  if (l.sub) {
    const ts = H * 0.13;
    ctx.font = `500 ${ts}px ${SINAL}`;
    ctx.letterSpacing = `${ts * 0.32}px`;
    ctx.globalAlpha = 0.82;
    ctx.fillText(l.sub, x + W / 2 + (ts * 0.32) / 2, y + H * 0.8);
  }
  ctx.restore();
}

const PX_M = 200;

/** Letreiro de uma loja só (cases e a loja do visitante): cor + máscara de brilho. */
export async function texturaLetreiro(l: Letreiro, wM: number, hM: number): Promise<{ cor: Texture; brilho: Texture }> {
  const W = wM * PX_M;
  const H = hM * PX_M;
  const a = tela(W, H);
  const b = tela(W, H);
  if (l.estilo === 'logo' && l.imagem) {
    const img = await carregarImagem(l.imagem);
    for (const { ctx } of [a, b]) {
      ctx.fillStyle = l.fundo;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
    }
  } else {
    desenharLetreiro(a.ctx, l, 0, 0, W, H, false);
    desenharLetreiro(b.ctx, l, 0, 0, W, H, true);
  }
  return { cor: textura(a.c), brilho: textura(b.c) };
}

/**
 * Atlas de letreiros de um quarteirão inteiro: um canvas, uma textura, um material.
 * Devolve o retângulo (UV) de cada letreiro e um ponto escuro para as laterais das caixas.
 */
export function atlasLetreiros(itens: { l: Letreiro; w: number; h: number }[]) {
  const LARG = 2048;
  const escala = 110; // px por metro no atlas
  let x = 8;
  let y = 8;
  let alturaLinha = 0;
  const pos: { x: number; y: number; w: number; h: number }[] = [];
  for (const it of itens) {
    const w = Math.round(it.w * escala);
    const h = Math.round(it.h * escala);
    if (x + w > LARG - 8) {
      x = 8;
      y += alturaLinha + 6;
      alturaLinha = 0;
    }
    pos.push({ x, y, w, h });
    x += w + 6;
    alturaLinha = Math.max(alturaLinha, h);
  }
  const ALT = Math.pow(2, Math.ceil(Math.log2(y + alturaLinha + 8)));
  const { c, ctx } = tela(LARG, ALT);
  ctx.fillStyle = '#101114';
  ctx.fillRect(0, 0, LARG, ALT);
  itens.forEach((it, i) => desenharLetreiro(ctx, it.l, pos[i].x, pos[i].y, pos[i].w, pos[i].h, false));
  const uv = pos.map((p) => [p.x / LARG, 1 - (p.y + p.h) / ALT, (p.x + p.w) / LARG, 1 - p.y / ALT] as [number, number, number, number]);
  const escuro: [number, number] = [2 / LARG, 1 - 2 / ALT];
  return { textura: textura(c), uv, escuro };
}

const TIPOS_VITRINE: Vitrine[] = ['joias', 'doces', 'roupas', 'clinica', 'academia', 'pet', 'oficina'];

function pintarInterior(ctx: CanvasRenderingContext2D, v: Vitrine, ox: number, oy: number) {
  const W = 512;
  const H = 256;
  const r = semente(v.length * 97);
  const ret = (x: number, y: number, w: number, h: number, cor: string) => {
    ctx.fillStyle = cor;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
  switch (v) {
    case 'joias':
      ret(0, 0, W, H, '#5a4434');
      for (let i = 0; i < 3; i++) {
        const x = 60 + i * 150;
        ret(x, 50, 92, 120, '#2a1e17');
        const g = ctx.createLinearGradient(0, oy + 50, 0, oy + 170);
        g.addColorStop(0, '#fff3dc');
        g.addColorStop(1, '#a8885e');
        ctx.fillStyle = g;
        ctx.fillRect(ox + x + 6, oy + 56, 80, 108);
        for (let k = 0; k < 7; k++) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ox + x + 16 + (k % 4) * 18, oy + 80 + Math.floor(k / 4) * 44, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ret(0, 196, W, 60, '#3a2a20');
      break;
    case 'doces':
      ret(0, 0, W, H, '#f2e2cf');
      ret(30, 30, 150, 96, '#2f2a26');
      ctx.fillStyle = '#e9e2d6';
      for (let i = 0; i < 5; i++) ctx.fillRect(ox + 44, oy + 46 + i * 15, 60 + r() * 60, 4);
      for (let p = 0; p < 2; p++) {
        const y = 70 + p * 70;
        ret(220, y + 34, 270, 6, '#b48a6a');
        for (let i = 0; i < 5; i++) {
          const x = 236 + i * 52;
          const cores = ['#6b3b2a', '#f4d9de', '#e8b4bd', '#c98a4a', '#fff6ea'];
          ctx.fillStyle = cores[(i + p) % cores.length];
          ctx.beginPath();
          ctx.ellipse(ox + x + 16, oy + y + 22, 20, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ret(x - 4, y + 22, 40, 12, cores[(i + p + 2) % cores.length]);
        }
      }
      ret(0, 206, W, 50, '#d9bfa6');
      break;
    case 'roupas': {
      ret(0, 0, W, H, '#ece9e3');
      ret(20, 60, W - 40, 5, '#8a8a8a');
      const cores = ['#2d3a4a', '#b9a58b', '#7d2f2f', '#d8d3c8', '#3e4b3a', '#c8b7a6', '#1f1f22'];
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = cores[i % cores.length];
        ctx.fillRect(ox + 30 + i * 29, oy + 66, 22, 90 + r() * 40);
      }
      ret(0, 210, W, 46, '#d7d2c8');
      break;
    }
    case 'clinica':
      ret(0, 0, W, H, '#eef2f2');
      ret(0, 120, W, 14, '#2f6f73');
      ret(150, 150, 220, 70, '#dfe6e6');
      ret(60, 40, 90, 60, '#d6dede');
      break;
    case 'academia':
      ret(0, 0, W, H, '#3a3c40');
      ret(0, 30, W, 120, '#5a6068');
      ret(0, 150, W, 10, '#e9c64a');
      for (let i = 0; i < 5; i++) ret(40 + i * 95, 120, 60, 80, '#1d1e21');
      ret(0, 200, W, 56, '#25262a');
      break;
    case 'pet':
      ret(0, 0, W, H, '#e9e4d8');
      for (let p = 0; p < 3; p++) {
        ret(20, 60 + p * 55, W - 40, 5, '#9a8f7e');
        for (let i = 0; i < 18; i++) {
          const cores = ['#d07a3a', '#2b5c61', '#e8c55a', '#7aa36d', '#c94f4f', '#5b7fb0'];
          ctx.fillStyle = cores[Math.floor(r() * cores.length)];
          ctx.fillRect(ox + 26 + i * 26, oy + 30 + p * 55, 20, 30);
        }
      }
      ret(0, 222, W, 34, '#cfc7b6');
      break;
    case 'oficina':
      ret(0, 0, W, H, '#6d7276');
      ret(30, 30, 260, 120, '#8b8f90');
      ctx.strokeStyle = '#2b2e30';
      ctx.lineWidth = 5;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(ox + 45 + i * 20, oy + 45);
        ctx.lineTo(ox + 45 + i * 20, oy + 70 + r() * 60);
        ctx.stroke();
      }
      ret(0, 222, W, 34, '#4b4e50');
      break;
  }
}

let atlasInt: { textura: Texture; uv: (v: Vitrine) => [number, number, number, number] } | null = null;

/** Atlas dos fundos de loja vistos pela vitrine (7 tipos num canvas só). */
export function atlasInteriores() {
  if (atlasInt) return atlasInt;
  const { c, ctx } = tela(2048, 512);
  TIPOS_VITRINE.forEach((v, i) => pintarInterior(ctx, v, (i % 4) * 512, Math.floor(i / 4) * 256));
  const uv = (v: Vitrine): [number, number, number, number] => {
    const i = Math.max(0, TIPOS_VITRINE.indexOf(v));
    const x = (i % 4) * 512;
    const y = Math.floor(i / 4) * 256;
    return [x / 2048, 1 - (y + 256) / 512, (x + 512) / 2048, 1 - y / 512];
  };
  atlasInt = { textura: textura(c), uv };
  return atlasInt;
}

/** Fundo de uma loja só (cases), recortado do atlas. */
export function texturaInterior(v: Vitrine): Texture {
  const { c, ctx } = tela(512, 256);
  pintarInterior(ctx, v, 0, 0);
  return textura(c);
}

/** Pinos: 4 estados num atlas (apagada, acesa, lote livre, selecionada). Ícones de traço fino. */
let atlasPino: Texture | null = null;
export function atlasPinos(): Texture {
  if (atlasPino) return atlasPino;
  const S = 128;
  const { c, ctx } = tela(S * 4, S);
  const desenhar = (i: number, aro: string, fundo: string, icone: (cx: number, cy: number) => void, tracejado = false) => {
    const cx = i * S + S / 2;
    const cy = S * 0.42;
    const r = S * 0.3;
    ctx.save();
    // ponta
    ctx.fillStyle = fundo;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.38, cy + r * 0.82);
    ctx.lineTo(cx, cy + r * 1.55);
    ctx.lineTo(cx + r * 0.38, cy + r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = S * 0.035;
    ctx.strokeStyle = aro;
    if (tracejado) ctx.setLineDash([S * 0.06, S * 0.045]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = aro;
    ctx.lineWidth = S * 0.03;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    icone(cx, cy);
    ctx.restore();
  };
  const lampada = (cx: number, cy: number, risco: boolean) => {
    const s = S * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy - 2 * s, 6 * s, Math.PI * 0.8, Math.PI * 2.2);
    ctx.lineTo(cx + 3 * s, cy + 6 * s);
    ctx.lineTo(cx - 3 * s, cy + 6 * s);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 3 * s, cy + 9 * s);
    ctx.lineTo(cx + 3 * s, cy + 9 * s);
    ctx.stroke();
    if (risco) {
      ctx.beginPath();
      ctx.moveTo(cx - 9 * s, cy - 10 * s);
      ctx.lineTo(cx + 9 * s, cy + 11 * s);
      ctx.stroke();
    }
  };
  desenhar(0, 'rgba(242,239,232,0.42)', 'rgba(9,9,15,0.9)', (x, y) => lampada(x, y, true));
  desenhar(1, '#e2c48a', 'rgba(9,9,15,0.92)', (x, y) => lampada(x, y, false));
  desenhar(2, '#c9a96e', 'rgba(9,9,15,0.9)', (x, y) => {
    const s = S * 0.1;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }, true);
  desenhar(3, '#05060a', '#c9a96e', (x, y) => {
    const s = S * 0.1;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x - s * 0.25, y + s * 0.7);
    ctx.lineTo(x + s, y - s * 0.7);
    ctx.stroke();
  });
  atlasPino = textura(c);
  return atlasPino;
}

/** Calçada de placas de concreto, com a sombra de contato junto da fachada já assada. */
export function texturaCalcada(): Texture {
  const W = 256;
  const H = 256;
  const { c, ctx } = tela(W, H);
  const r = semente(31);
  ctx.fillStyle = '#5b5852';
  ctx.fillRect(0, 0, W, H);
  // placas 1 m (256 px = 1 m)
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 16;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(20,20,20,0.55)';
  ctx.fillRect(0, 0, W, 3);
  ctx.fillRect(0, 0, 3, H);
  const t = textura(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Asfalto: grão fino e a faixa central tracejada amarelada, repetindo a cada 6 m. */
export function texturaAsfalto(): { cor: Texture; rugosidade: Texture } {
  const W = 512;
  const H = 512;
  const a = tela(W, H);
  const b = tela(W, H);
  const r = semente(9);
  a.ctx.fillStyle = '#16181c';
  a.ctx.fillRect(0, 0, W, H);
  const img = a.ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  a.ctx.putImageData(img, 0, 0);
  // faixa central (a textura cobre 6 m × 9 m; a faixa fica no meio)
  a.ctx.fillStyle = 'rgba(160,132,62,0.55)';
  a.ctx.fillRect(0, H / 2 - 4, W * 0.5, 7);
  // rugosidade: poças lisas sobre asfalto áspero
  b.ctx.fillStyle = 'rgb(190,190,190)';
  b.ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const y = r() * H;
    const rr = 30 + r() * 80;
    for (const dx of [-W, 0, W]) {
      const g = b.ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rr);
      g.addColorStop(0, 'rgba(40,40,40,0.9)');
      g.addColorStop(1, 'rgba(190,190,190,0)');
      b.ctx.fillStyle = g;
      b.ctx.beginPath();
      b.ctx.ellipse(x + dx, y, rr * 1.8, rr, 0, 0, Math.PI * 2);
      b.ctx.fill();
    }
  }
  const cor = textura(a.c);
  const rug = textura(b.c, false);
  for (const t of [cor, rug]) t.wrapS = t.wrapT = RepeatWrapping;
  return { cor, rugosidade: rug };
}

/** Mancha radial genérica (poça de luz do poste, luz da vitrine na calçada, sombra de pedestre). */
export function texturaRadial(dura = 0.35): Texture {
  const S = 128;
  const { c, ctx } = tela(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(dura, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return textura(c);
}

/** Luz da vitrine derramando na calçada (mais forte junto da fachada). */
export function texturaMancha(): Texture {
  const S = 256;
  const { c, ctx } = tela(S, S);
  ctx.save();
  ctx.translate(S / 2, 0);
  ctx.scale(1.25, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.95);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-S, 0, S * 2, S);
  ctx.restore();
  return textura(c);
}

/** Reflexo esticado no asfalto molhado. */
export function texturaReflexo(): Texture {
  const W = 64;
  const H = 512;
  const { c, ctx } = tela(W, H);
  const r = semente(3);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const ao = Math.pow(1 - v, 1.6) * Math.min(1, v * 9);
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1)) * 2 - 1;
      const lat = Math.exp(-u * u * 5.5);
      const ruido = 0.75 + 0.25 * Math.sin(y * 0.21 + r() * 0.6) * Math.sin(y * 0.047);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, ao * lat * ruido) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return textura(c);
}

/** Véu de luz da vitrine: mais forte embaixo e no meio. */
export function texturaHalo(): Texture {
  const W = 128;
  const H = 128;
  const { c, ctx } = tela(W, H);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1)) * 2 - 1;
      const a = Math.pow(1 - u * u, 0.6) * (0.35 + 0.65 * Math.pow(v, 0.8));
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return textura(c);
}
