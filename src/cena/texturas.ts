import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import Check from 'lucide/dist/esm/icons/check.mjs';
import SearchX from 'lucide/dist/esm/icons/search-x.mjs';
import Hammer from 'lucide/dist/esm/icons/hammer.mjs';
import type { Letreiro, Status, Vitrine } from '../data/rua';
import { semente } from './kit';

// Fontes dos letreiros (OFL). Ficam só no pacote da cena.
import '@fontsource/big-shoulders-display/500';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/cinzel/600';

const SINAL = '"Big Shoulders Display"';
const MARCA = 'Cinzel';

export async function carregarFontesDaCena() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`800 64px ${SINAL}`),
    document.fonts.load(`500 64px ${SINAL}`),
    document.fonts.load(`600 64px ${MARCA}`),
  ]);
}

function tela(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

function textura(c: HTMLCanvasElement, cor = true): CanvasTexture {
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

function textoAjustado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  fonte: string,
  peso: number,
  alturaMax: number,
  larguraMax: number,
  espacamento: number,
) {
  let tam = alturaMax;
  for (let i = 0; i < 30; i++) {
    ctx.font = `${peso} ${tam}px ${fonte}`;
    ctx.letterSpacing = `${tam * espacamento}px`;
    if (ctx.measureText(texto).width <= larguraMax) break;
    tam *= 0.94;
  }
  return tam;
}

const PX_M = 200;

/** Letreiro: textura de cor e máscara de brilho (o que acende). */
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
    return { cor: textura(a.c), brilho: textura(b.c) };
  }

  const fonte = l.fonte === 'marca' ? MARCA : SINAL;
  const peso = l.fonte === 'marca' ? 600 : 800;

  // fundo
  if (l.estilo === 'caixa') {
    const g = a.ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, l.fundo);
    g.addColorStop(0.5, l.fundo);
    g.addColorStop(1, l.fundo);
    a.ctx.fillStyle = g;
    a.ctx.fillRect(0, 0, W, H);
    // caixa luminosa: o acrílico todo acende, mais forte no meio
    const gb = b.ctx.createLinearGradient(0, 0, 0, H);
    gb.addColorStop(0, l.fundo);
    gb.addColorStop(0.5, l.fundo);
    gb.addColorStop(1, l.fundo);
    b.ctx.fillStyle = gb;
    b.ctx.fillRect(0, 0, W, H);
    b.ctx.globalAlpha = 0.35;
    b.ctx.fillStyle = '#000';
    b.ctx.fillRect(0, 0, W, H);
    b.ctx.globalAlpha = 1;
  } else {
    a.ctx.fillStyle = l.fundo;
    a.ctx.fillRect(0, 0, W, H);
    b.ctx.fillStyle = '#000';
    b.ctx.fillRect(0, 0, W, H);
  }

  const temSub = Boolean(l.sub);
  const alturaTexto = H * (temSub ? 0.5 : 0.66);
  const espac = l.fonte === 'marca' ? 0.14 : 0.05;
  const tam = textoAjustado(a.ctx, l.texto, fonte, peso, alturaTexto, W * 0.84, espac);
  const yTexto = temSub ? H * 0.47 : H * 0.54;

  for (const [ctx, cor] of [
    [a.ctx, l.tinta],
    [b.ctx, l.estilo === 'caixa' ? l.tinta : '#ffffff'],
  ] as const) {
    ctx.font = `${peso} ${tam}px ${fonte}`;
    ctx.letterSpacing = `${tam * espac}px`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cor;
    // letterSpacing adiciona espaço depois da última letra: compensa para centralizar
    ctx.fillText(l.texto, W / 2 + (tam * espac) / 2, yTexto);
    if (l.sub) {
      const tSub = H * 0.13;
      ctx.font = `500 ${tSub}px ${SINAL}`;
      ctx.letterSpacing = `${tSub * 0.32}px`;
      ctx.globalAlpha = 0.82;
      ctx.fillText(l.sub, W / 2 + (tSub * 0.32) / 2, H * 0.8);
      ctx.globalAlpha = 1;
    }
  }
  return { cor: textura(a.c), brilho: textura(b.c) };
}

/** Parede do fundo da loja vista pela vitrine. Formas simples: de longe e atrás do vidro, lê como interior. */
export function texturaInterior(v: Vitrine): Texture {
  const W = 512;
  const H = 256;
  const { c, ctx } = tela(W, H);
  const r = semente(v.length * 97);
  const ret = (x: number, y: number, w: number, h: number, cor: string) => {
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, w, h);
  };
  switch (v) {
    case 'joias': {
      ret(0, 0, W, H, '#3a2a20');
      for (let i = 0; i < 3; i++) {
        const x = 60 + i * 150;
        ret(x, 50, 92, 120, '#1c1410');
        const g = ctx.createLinearGradient(0, 50, 0, 170);
        g.addColorStop(0, '#fff3dc');
        g.addColorStop(1, '#a8885e');
        ctx.fillStyle = g;
        ctx.fillRect(x + 6, 56, 80, 108);
        for (let k = 0; k < 7; k++) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + 16 + (k % 4) * 18, 80 + Math.floor(k / 4) * 44, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ret(0, 196, W, 60, '#20160f');
      break;
    }
    case 'doces': {
      ret(0, 0, W, H, '#f2e2cf');
      ret(30, 30, 150, 96, '#2f2a26'); // quadro de giz
      ctx.fillStyle = '#e9e2d6';
      for (let i = 0; i < 5; i++) ctx.fillRect(44, 46 + i * 15, 60 + r() * 60, 4);
      for (let p = 0; p < 2; p++) {
        const y = 70 + p * 70;
        ret(220, y + 34, 270, 6, '#b48a6a');
        for (let i = 0; i < 5; i++) {
          const x = 236 + i * 52;
          const cores = ['#6b3b2a', '#f4d9de', '#e8b4bd', '#c98a4a', '#fff6ea'];
          ctx.fillStyle = cores[(i + p) % cores.length];
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 22, 20, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ret(x - 4, y + 22, 40, 12, cores[(i + p + 2) % cores.length]);
        }
      }
      ret(0, 206, W, 50, '#d9bfa6');
      break;
    }
    case 'roupas': {
      ret(0, 0, W, H, '#ece9e3');
      ret(20, 60, W - 40, 5, '#8a8a8a');
      const cores = ['#2d3a4a', '#b9a58b', '#7d2f2f', '#d8d3c8', '#3e4b3a', '#c8b7a6', '#1f1f22'];
      for (let i = 0; i < 16; i++) {
        const x = 30 + i * 29;
        ctx.fillStyle = cores[i % cores.length];
        ctx.fillRect(x, 66, 22, 90 + r() * 40);
      }
      ret(0, 210, W, 46, '#d7d2c8');
      break;
    }
    case 'clinica': {
      ret(0, 0, W, H, '#eef2f2');
      ret(0, 120, W, 14, '#2f6f73');
      ret(150, 150, 220, 70, '#dfe6e6');
      ret(150, 150, 220, 8, '#c3cdcd');
      ret(60, 40, 90, 60, '#d6dede');
      break;
    }
    case 'academia': {
      ret(0, 0, W, H, '#2a2c30');
      ret(0, 30, W, 120, '#4a5058'); // espelho
      ret(0, 150, W, 10, '#e9c64a');
      for (let i = 0; i < 5; i++) ret(40 + i * 95, 120, 60, 80, '#16171a');
      ret(0, 200, W, 56, '#1d1e21');
      break;
    }
    case 'pet': {
      ret(0, 0, W, H, '#e9e4d8');
      for (let p = 0; p < 3; p++) {
        ret(20, 60 + p * 55, W - 40, 5, '#9a8f7e');
        for (let i = 0; i < 18; i++) {
          const cores = ['#d07a3a', '#2b5c61', '#e8c55a', '#7aa36d', '#c94f4f', '#5b7fb0'];
          ctx.fillStyle = cores[Math.floor(r() * cores.length)];
          ctx.fillRect(26 + i * 26, 30 + p * 55, 20, 30);
        }
      }
      ret(0, 222, W, 34, '#cfc7b6');
      break;
    }
    case 'oficina': {
      ret(0, 0, W, H, '#5d6266');
      ret(30, 30, 260, 120, '#7b7f80'); // painel de ferramentas
      ctx.strokeStyle = '#2b2e30';
      ctx.lineWidth = 5;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        const x = 45 + i * 20;
        ctx.moveTo(x, 45);
        ctx.lineTo(x, 70 + r() * 60);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#1b1c1d';
        ctx.beginPath();
        ctx.ellipse(380, 210 - i * 34, 60, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ret(0, 222, W, 34, '#3b3e40');
      break;
    }
  }
  return textura(c);
}

const COR_STATUS: Record<Status, string> = {
  presente: '#3DDC84',
  perdendo: '#FF5A4E',
  construcao: '#FFB347',
};

const ICONE_STATUS = { presente: Check, perdendo: SearchX, construcao: Hammer };

type NoIcone = [string, Record<string, string>];

function desenharIcone(ctx: CanvasRenderingContext2D, nos: NoIcone[], cx: number, cy: number, tam: number, cor: string) {
  ctx.save();
  ctx.translate(cx - tam / 2, cy - tam / 2);
  ctx.scale(tam / 24, tam / 24);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [tag, at] of nos) {
    if (tag === 'path') ctx.stroke(new Path2D(at.d));
    else if (tag === 'circle') {
      ctx.beginPath();
      ctx.arc(+at.cx, +at.cy, +at.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tag === 'line') {
      ctx.beginPath();
      ctx.moveTo(+at.x1, +at.y1);
      ctx.lineTo(+at.x2, +at.y2);
      ctx.stroke();
    } else if (tag === 'rect') {
      ctx.beginPath();
      ctx.roundRect(+at.x, +at.y, +at.width, +at.height, +(at.rx ?? 0));
      ctx.stroke();
    }
  }
  ctx.restore();
}

const cachePino = new Map<string, Texture>();

/** Pino de mapa: círculo escuro com aro na cor do status, ícone e uma ponta embaixo. */
export function texturaPino(status: Status, selecionado = false): Texture {
  const chave = status + (selecionado ? ':sel' : '');
  const pronto = cachePino.get(chave);
  if (pronto) return pronto;
  const S = 160;
  const { c, ctx } = tela(S, S * 1.25);
  const cx = S / 2;
  const cy = S / 2;
  const raio = S * 0.36;
  const cor = selecionado ? '#D4371C' : COR_STATUS[status];
  // ponta
  ctx.fillStyle = 'rgba(10,13,18,0.92)';
  ctx.beginPath();
  ctx.moveTo(cx - raio * 0.42, cy + raio * 0.8);
  ctx.lineTo(cx, cy + raio * 1.62);
  ctx.lineTo(cx + raio * 0.42, cy + raio * 0.8);
  ctx.closePath();
  ctx.fill();
  // corpo
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = S * 0.035;
  ctx.strokeStyle = cor;
  ctx.stroke();
  desenharIcone(ctx, ICONE_STATUS[status] as unknown as NoIcone[], cx, cy, raio * 1.02, cor);
  const t = textura(c);
  cachePino.set(chave, t);
  return t;
}

/** Mapa de rugosidade do asfalto: poças lisas sobre asfalto áspero. */
export function texturaPocas(): Texture {
  const S = 512;
  const { c, ctx } = tela(S, S);
  ctx.fillStyle = 'rgb(185,185,185)';
  ctx.fillRect(0, 0, S, S);
  const r = semente(7);
  for (let i = 0; i < 26; i++) {
    const x = r() * S;
    const y = r() * S;
    const rr = 30 + r() * 90;
    for (const dx of [-S, 0, S])
      for (const dy of [-S, 0, S]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr);
        g.addColorStop(0, 'rgba(30,30,30,0.9)');
        g.addColorStop(0.6, 'rgba(60,60,60,0.5)');
        g.addColorStop(1, 'rgba(185,185,185,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, rr * (1 + r()), rr, r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 34;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, img.data[i] + n));
  }
  ctx.putImageData(img, 0, 0);
  const t = textura(c, false);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Mancha de luz que a vitrine joga na calçada. */
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

/** Reflexo esticado no asfalto molhado (luz da vitrine ou do poste vista de longe). */
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
      const a = Math.max(0, ao * lat * ruido);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return textura(c);
}

/** Porta de enrolar (oficina fechada). */
export function texturaPersiana(): Texture {
  const W = 64;
  const H = 256;
  const { c, ctx } = tela(W, H);
  for (let y = 0; y < H; y += 8) {
    const g = ctx.createLinearGradient(0, y, 0, y + 8);
    g.addColorStop(0, '#8d9296');
    g.addColorStop(0.5, '#6d7276');
    g.addColorStop(1, '#4a4e52');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, 8);
  }
  const t = textura(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Véu de luz da vitrine: mais forte embaixo e no meio, some nas bordas. */
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
