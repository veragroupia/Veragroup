import { useEffect, useState } from 'react';
import { segmentoPorId, type IdSegmento } from '../data/segmentos';
import { arredondarEstimativa, clientesPerdidos, perdaMensal, type Premissas } from '../lib/calculadora';
import { numero, reais } from '../lib/formato';
import { Selo, useContagem } from './basicos';

/**
 * Calculadora de perda. Valores de partida por segmento são estimativas; tudo é editável
 * e a conta aparece escrita embaixo do número.
 */
export function Calculadora({
  segmento,
  cidade,
  onMudar,
}: {
  segmento: IdSegmento;
  cidade?: string;
  onMudar?: (p: Premissas, perda: number) => void;
}) {
  const base = segmentoPorId(segmento).calc;
  const [p, setP] = useState<Premissas>(base);
  useEffect(() => setP(segmentoPorId(segmento).calc), [segmento]);
  const perda = arredondarEstimativa(perdaMensal(p));
  const perdidos = clientesPerdidos(p);
  useEffect(() => onMudar?.(p, perda), [p, perda, onMudar]);
  const mostrado = useContagem(perda);
  const id = `calc-${segmento}`;

  return (
    <div className="calculadora">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p className="subtitulo">Quanto pode estar ficando na mesa</p>
        <Selo tipo="estimativa">estimativa</Selo>
      </div>
      <p className="numero-grande" aria-live="polite">
        ≈ {reais(Math.round(mostrado / 10) * 10)}
        <span style={{ fontSize: 16, color: 'var(--texto-3)' }}> por mês</span>
      </p>
      <p className="conta">
        {numero(p.procuras)} procuras × {p.desistem}% que desistem × {p.fechamento}% que fechariam × {reais(p.ticket)} ≈{' '}
        {numero(Math.round(perdidos))} clientes por mês.
      </p>
      <div className="deslizante">
        <div className="deslizante-topo">
          <label htmlFor={`${id}-procuras`}>Pessoas que procuram esse tipo de negócio{cidade ? ` em ${cidade}` : ''}, por mês</label>
          <output htmlFor={`${id}-procuras`}>{numero(p.procuras)}</output>
        </div>
        <input id={`${id}-procuras`} type="range" min={50} max={3000} step={50} value={p.procuras} onChange={(e) => setP({ ...p, procuras: +e.target.value })} />
      </div>
      <div className="deslizante">
        <div className="deslizante-topo">
          <label htmlFor={`${id}-ticket`}>Ticket médio</label>
          <output htmlFor={`${id}-ticket`}>{reais(p.ticket)}</output>
        </div>
        <input id={`${id}-ticket`} type="range" min={10} max={2000} step={10} value={p.ticket} onChange={(e) => setP({ ...p, ticket: +e.target.value })} />
      </div>
      <div className="deslizante">
        <div className="deslizante-topo">
          <label htmlFor={`${id}-desistem`}>Quantos desistem por não achar ou não ter resposta</label>
          <output htmlFor={`${id}-desistem`}>{p.desistem}%</output>
        </div>
        <input id={`${id}-desistem`} type="range" min={5} max={60} step={1} value={p.desistem} onChange={(e) => setP({ ...p, desistem: +e.target.value })} />
      </div>
      <p className="conta">
        Valores de partida são estimativas nossas para {segmentoPorId(segmento).nome.toLowerCase()}. A chance de fechar ({p.fechamento}%)
        existe porque nem todo mundo que procura compraria.
      </p>
    </div>
  );
}
