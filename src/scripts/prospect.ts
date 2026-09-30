/**
 * Link personalizado de prospecção (usado pelo Maestro):
 *   /?empresa=Clínica%20Sorriso&nicho=dentista&cidade=Itu
 * Os dados ficam na sessão para valer nas outras páginas da visita.
 */
export interface Prospect {
  empresa?: string;
  nicho?: string;
  cidade?: string;
}

const CHAVE = 'vg-prospect';
const limpar = (v: string | null) => (v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || undefined;

export function lerProspect(): Prospect {
  const q = new URLSearchParams(location.search);
  const daUrl: Prospect = { empresa: limpar(q.get('empresa')), nicho: limpar(q.get('nicho')), cidade: limpar(q.get('cidade')) };
  if (daUrl.empresa || daUrl.nicho || daUrl.cidade) {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(daUrl));
    } catch {
      /* sem armazenamento: vale só nesta página */
    }
    return daUrl;
  }
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) || '{}') as Prospect;
  } catch {
    return {};
  }
}

/** Acrescenta a empresa e a cidade na mensagem de WhatsApp, se vierem no link. */
export function mensagemComProspect(base: string, p: Prospect) {
  if (p.empresa && p.cidade) return `${base} Sou da ${p.empresa}, em ${p.cidade}.`;
  if (p.empresa) return `${base} Sou da ${p.empresa}.`;
  if (p.cidade) return `${base} Sou de ${p.cidade}.`;
  return base;
}
