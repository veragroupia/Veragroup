import { useEffect, useRef, useState, type ReactNode } from 'react';
import { relogio } from '../estado';

export function Marca({ className = '', as: Tag = 'span' }: { className?: string; as?: 'span' | 'a' | 'p' }) {
  const props = Tag === 'a' ? { href: '/', 'aria-label': 'vera., início' } : {};
  return (
    <Tag className={`marca ${className}`} {...props}>
      vera<span className="marca-ponto">.</span>
    </Tag>
  );
}

export function Selo({ tipo, children }: { tipo: 'simulacao' | 'estimativa' | 'verificado' | 'demo' | 'neutro'; children: ReactNode }) {
  return <span className={`selo selo--${tipo}`}>{children}</span>;
}

/** Logo oficial do WhatsApp (glifo). */
export function IconeWhatsApp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.39 9.39 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.3l5.7-1.5a11.3 11.3 0 0 0 5.74 1.47h.01c6.26 0 11.35-5.09 11.35-11.36 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  );
}

/** "G" oficial do Google em quatro cores. */
export function IconeGoogle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Número que conta até o valor quando muda (sem animação com movimento reduzido). */
export function useContagem(alvo: number, duracao = 900) {
  const [valor, setValor] = useState(alvo);
  const de = useRef(alvo);
  useEffect(() => {
    if (relogio.semMovimento || typeof requestAnimationFrame === 'undefined') {
      setValor(alvo);
      de.current = alvo;
      return;
    }
    const inicio = performance.now();
    const v0 = de.current;
    let id = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      const v = v0 + (alvo - v0) * e;
      setValor(v);
      if (t < 1) id = requestAnimationFrame(passo);
      else de.current = alvo;
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, duracao]);
  return valor;
}

export function useCelular() {
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(max-width: 899px)');
    const f = () => setCelular(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return celular;
}
