import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCelular } from './basicos';

/**
 * Painel de vidro: lateral no desktop; bottom sheet com alça no celular, que arrasta entre
 * três alturas (baixo, meio, alto). O arraste é feito à mão (sem biblioteca) e assenta com mola em CSS.
 */
type Altura = 'baixo' | 'meio' | 'alto';
const FRACAO: Record<Altura, number> = { baixo: 0.34, meio: 0.6, alto: 1 };

export function Painel({ aberto, rotulo, children, chave }: { aberto: boolean; rotulo: string; children: ReactNode; chave: string }) {
  const celular = useCelular();
  const ref = useRef<HTMLElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState<Altura>('meio');
  const [arrasto, setArrasto] = useState<number | null>(null);
  const inicio = useRef<{ y: number; base: number } | null>(null);

  // cada conteúdo novo abre na altura do meio e volta o rolamento para o topo
  useEffect(() => {
    setAltura('meio');
    corpo.current?.scrollTo({ top: 0 });
  }, [chave]);

  const alturaMax = () => (ref.current ? ref.current.getBoundingClientRect().height : 600);
  const deslocamento = (a: Altura) => alturaMax() * (1 - FRACAO[a]);

  const aoDescer = (e: React.PointerEvent) => {
    if (!celular) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    inicio.current = { y: e.clientY, base: deslocamento(altura) };
    setArrasto(inicio.current.base);
  };
  const aoMover = (e: React.PointerEvent) => {
    if (!inicio.current) return;
    const novo = Math.max(0, inicio.current.base + (e.clientY - inicio.current.y));
    setArrasto(novo);
  };
  const aoSoltar = () => {
    if (!inicio.current || arrasto === null) return;
    const max = alturaMax();
    const fracao = 1 - arrasto / max;
    // escolhe a altura mais próxima
    const opcoes: Altura[] = ['baixo', 'meio', 'alto'];
    let melhor: Altura = 'meio';
    let dist = Infinity;
    for (const o of opcoes) {
      const d = Math.abs(FRACAO[o] - fracao);
      if (d < dist) {
        dist = d;
        melhor = o;
      }
    }
    setAltura(melhor);
    setArrasto(null);
    inicio.current = null;
  };

  const ty = celular ? (arrasto ?? deslocamento(altura)) : 0;
  const estilo = celular
    ? {
        transform: `translateY(${aberto ? ty : alturaMax() + 40}px)`,
        transition: arrasto === null ? 'transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
      }
    : { transition: 'opacity 300ms ease', opacity: aberto ? 1 : 0 };

  return (
    <aside ref={ref} className="painel" aria-label={rotulo} hidden={!aberto && !celular} style={estilo} data-altura={altura}>
      <div
        className="painel-alca"
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        role="button"
        tabIndex={celular ? 0 : -1}
        aria-label={altura === 'alto' ? 'Recolher painel' : 'Expandir painel'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setAltura(altura === 'alto' ? 'meio' : 'alto');
        }}
      />
      <div className="painel-corpo" ref={corpo}>
        {children}
      </div>
    </aside>
  );
}
