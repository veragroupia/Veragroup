/* Motor da prévia do Construtor ao vivo.
   A mesma função monta o HTML no build (prévia inicial, sem JavaScript) e no
   navegador (quando o visitante digita). Nada sai do aparelho. */
import { segmentos, cores, padrao, type Segmento } from '../data/construtor';
import { esc } from './texto';

export type Estado = { nome: string; segmento: string; cor: string };

export const NOME_VAZIO = 'Seu negócio';

export function segmento(id: string): Segmento {
  return segmentos.find((s) => s.id === id) || segmentos[0];
}

export function limparNome(v: unknown): string {
  return String(v ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, 40);
}

export function limparCor(v: unknown): string {
  const s = String(v ?? '').trim().replace(/^#?/, '#');
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : padrao.cor;
}

export function nomeDaCor(hex: string): string {
  const c = cores.find((x) => x.hex.toLowerCase() === hex.toLowerCase());
  return c ? c.nome : hex.toUpperCase();
}

/** Lê o estado da URL: ?n=Nome&s=segmento&c=D4371C */
export function estadoDaUrl(busca: string): Estado {
  const p = new URLSearchParams(busca);
  const s = p.get('s') || '';
  return {
    nome: limparNome(p.get('n')).trim(),
    segmento: segmentos.some((x) => x.id === s) ? s : padrao.segmento,
    cor: limparCor(p.get('c') || padrao.cor),
  };
}

export function urlDaPrevia(base: string, e: Estado): string {
  const p = new URLSearchParams();
  if (e.nome.trim()) p.set('n', e.nome.trim());
  p.set('s', e.segmento);
  p.set('c', e.cor.replace('#', ''));
  return `${base}/previa?${p.toString()}`;
}

function luminancia(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto do botão: branco ou tinta, o que der mais contraste com a cor. */
export function corDoTexto(hex: string): string {
  const l = luminancia(hex);
  const comBranco = 1.05 / (l + 0.05);
  const comTinta = (l + 0.05) / (luminancia('#0E0E0C') + 0.05);
  return comBranco >= comTinta ? '#FFFFFF' : '#0E0E0C';
}

export function estiloCor(hex: string): string {
  return `--pv:${hex};--pv-t:${corDoTexto(hex)}`;
}

function sigla(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  const letras = (partes.length ? partes : [nome]).slice(0, 2).map((p) => p[0] || '').join('');
  return (letras || 'S').toUpperCase();
}

const WHATS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z"/></svg>';

/** HTML interno da prévia. O contêiner .pv recebe estiloCor(). */
export function renderPrevia(e: Estado): string {
  const seg = segmento(e.segmento);
  const nome = e.nome.trim() || NOME_VAZIO;
  const n = esc(nome);
  const titulo = esc(seg.titulo).replace('{nome}', `<span data-pv-nome>${n}</span>`);
  let i = 0;
  const b = (cls: string, html: string) => `<div class="pv-b ${cls}" style="--i:${i++}">${html}</div>`;

  return [
    b(
      'pv-barra',
      `<span class="pv-sigla" aria-hidden="true" data-pv-sigla>${esc(sigla(nome))}</span><strong class="pv-marca" data-pv-nome>${n}</strong><span class="pv-menu" aria-hidden="true"><i></i><i></i></span>`,
    ),
    b(
      'pv-capa',
      `<div class="pv-foto"><svg class="pv-glifo" viewBox="0 0 48 48" aria-hidden="true">${seg.glifo}</svg><span>${esc(seg.foto)}</span></div>` +
        `<p class="pv-seg">${esc(seg.rotulo)}</p><p class="pv-titulo">${titulo}</p><p class="pv-sub">${esc(seg.sub)}</p>` +
        `<span class="pv-botao">${WHATS}${esc(seg.botao)}</span><span class="pv-botao pv-botao--linha">${esc(seg.secundario)}</span>`,
    ),
    b(
      'pv-lista',
      `<p class="pv-h">${esc(seg.lista.titulo)}</p><ul>${seg.lista.itens.map((x) => `<li>${esc(x)}<span aria-hidden="true">›</span></li>`).join('')}</ul>`,
    ),
    b(
      'pv-passos',
      `<p class="pv-h">${esc(seg.passos.titulo)}</p><ol>${seg.passos.itens.map((x, k) => `<li><b>${k + 1}</b>${esc(x)}</li>`).join('')}</ol>`,
    ),
    seg.extra ? b('pv-extra', `<p class="pv-h">${esc(seg.extra.titulo)}</p><p class="pv-vazio">${esc(seg.extra.texto)}</p>`) : '',
    b(
      'pv-local',
      `<p class="pv-h">Onde estamos</p><div class="pv-mapa" aria-hidden="true"><i></i></div><p class="pv-vazio">Seu endereço</p><p class="pv-vazio">Seu horário de atendimento</p>`,
    ),
    b('pv-aval', `<p class="pv-h">Avaliações no Google</p><p class="pv-vazio">As avaliações reais do seu perfil aparecem aqui.</p>`),
    `<span class="pv-flutua" aria-hidden="true">${WHATS}</span>`,
  ].join('');
}

/** Atualiza só o nome, sem remontar os blocos (para digitar sem piscar). */
export function trocarNome(raiz: HTMLElement, nome: string) {
  const n = nome.trim() || NOME_VAZIO;
  raiz.querySelectorAll('[data-pv-nome]').forEach((el) => (el.textContent = n));
  const s = raiz.querySelector('[data-pv-sigla]');
  if (s) s.textContent = sigla(n);
}

export { segmentos, cores, padrao };
