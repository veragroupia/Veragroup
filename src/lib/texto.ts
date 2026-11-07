/* Utilidades de texto usadas no servidor (build) e no navegador. */
import { empresa } from '../data/empresa';

const RE_PREENCHER = /\[\[PREENCHER:[^\]]*\]\]/g;

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function temPreencher(s: unknown): boolean {
  return typeof s === 'string' && s.includes('[[PREENCHER');
}

/** HTML seguro com os [[PREENCHER]] destacados. Use com set:html. */
export function marcar(s: unknown): string {
  return esc(s).replace(/\[\[PREENCHER:([^\]]*)\]\]/g, (_m, o) => `<mark class="preencher">[[PREENCHER:${o}]]</mark>`);
}

/** Para metadados e schema: devolve '' se o valor ainda não foi preenchido. */
export function limpo(s: unknown): string {
  if (typeof s !== 'string' || temPreencher(s)) return '';
  return s;
}

/** Tira os marcadores de um texto (para title, description e schema). */
export function semMarcadores(s: string): string {
  return s.replace(RE_PREENCHER, '').replace(/\s{2,}/g, ' ').trim();
}

export function numeroWhats(): string {
  const n = String(empresa.whatsapp || '');
  return /^\d{12,13}$/.test(n) ? n : '';
}

export function linkWhats(texto: string, numero = numeroWhats()): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function whatsFormatado(): string {
  const n = numeroWhats();
  if (!n) return empresa.whatsapp;
  const m = n.replace(/^55/, '').match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n;
}

export function brl(valor: number, casas = 0): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export const MSG = {
  padrao: 'Olá, Vera Group! Vim pelo site e quero conversar sobre o meu negócio.',
  orcamento: (servico: string) => `Olá, Vera Group! Vim pelo site e quero receber um orçamento de ${servico}.`,
  landing: 'Olá, Vera Group! Vim pelo site e quero a Landing Express (R$ 690 + R$ 97/mês).',
  nfc: 'Olá, Vera Group! Vim pelo site e quero a plaquinha NFC de avaliação do Google (R$ 100).',
  cidade: (c: string) => `Olá, Vera Group! Sou de ${c}, vim pelo site e quero conversar sobre o meu negócio.`,
};

/** *palavra* vira <em>palavra</em>, com [[PREENCHER]] destacado. */
export function emHtml(s: string): string {
  return marcar(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Título em camadas: cada trecho separado por | entra numa linha própria. */
export function linhasHtml(s: string): string {
  return s
    .split('|')
    .map((l, n) => `<span class="l" style="--n:${n}"><span>${emHtml(l.trim())}</span></span>`)
    .join('');
}

/** Para title/description: tira * e | dos títulos. */
export function textoPuro(s: string): string {
  return semMarcadores(s.replace(/[*|]/g, '').replace(/\s{2,}/g, ' '));
}
