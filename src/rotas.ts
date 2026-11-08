import { useEffect } from 'react';
import { useEstado, type Momento } from './estado';
import type { IdCase } from './data/cases';

/**
 * Endereço ↔ estado. #trabalhos/erk abre direto o case; o botão voltar do navegador funciona.
 *   (vazio) cidade · #trabalhos · #trabalhos/erk · #trabalhos/voneis · #sua-loja · #perto · #contato · #loja/<id>
 */
const MOMENTOS: Momento[] = ['cidade', 'trabalhos', 'sua-loja', 'perto', 'contato'];

export function lerHash(hash: string): { momento: Momento; caso: IdCase | null; loja: string | null } {
  const [a, b] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'loja' && b) return { momento: 'cidade', caso: null, loja: b };
  const momento = (MOMENTOS as string[]).includes(a) ? (a as Momento) : 'cidade';
  const caso = momento === 'trabalhos' && (b === 'erk' || b === 'voneis') ? b : null;
  return { momento, caso, loja: null };
}

export function montarHash(momento: Momento, caso: IdCase | null, loja: string | null) {
  if (loja) return `#loja/${loja}`;
  if (momento === 'cidade') return '';
  return `#${momento}${caso ? `/${caso}` : ''}`;
}

export function useRotas() {
  useEffect(() => {
    const aplicar = () => {
      const { momento, caso, loja } = lerHash(location.hash);
      const s = useEstado.getState();
      if (loja) s.abrirLoja(loja);
      else s.irPara(momento, caso);
    };
    aplicar();
    window.addEventListener('hashchange', aplicar);
    const sair = useEstado.subscribe((s, antes) => {
      if (s.momento === antes.momento && s.caso === antes.caso && s.lojaFoco === antes.lojaFoco) return;
      const novo = montarHash(s.momento, s.caso, s.lojaFoco);
      const atual = location.hash === '#' ? '' : location.hash;
      if (novo !== atual) history.pushState(null, '', novo || location.pathname + location.search);
    });
    return () => {
      window.removeEventListener('hashchange', aplicar);
      sair();
    };
  }, []);
}
