import { Lightbulb, LightbulbOff, Plus, X } from 'lucide-react';
import { listaCidades } from '../data/empresa';
import { lotes, type Lote } from '../data/rua';
import type { IdSegmento } from '../data/segmentos';
import { relogio, useEstado } from '../estado';
import { Calculadora } from '../ui/Calculadora';

const SEGMENTO_DO_LOTE: Record<Lote['segmento'], IdSegmento> = {
  joalheria: 'joalheria',
  confeitaria: 'confeitaria',
  oficina: 'oficina',
  academia: 'academia',
  petshop: 'petshop',
  odonto: 'odonto',
  roupa: 'roupa',
  terreno: 'outro',
};

export function Heroi({ visivel }: { visivel: boolean }) {
  const irPara = useEstado((s) => s.irPara);
  return (
    <section className={`heroi${visivel ? '' : ' heroi--fora'}`} aria-labelledby="titulo" id="cidade">
      <h1 id="titulo">
        Seu negócio existe.
        <span className="linha-2">Mas será que estão encontrando ele?</span>
      </h1>
      <p>
        Na rua, quem aparece no Google, no site e no WhatsApp é quem recebe o cliente. A Vera acende o comércio de {listaCidades}.
      </p>
      <div className="heroi-acoes">
        <button type="button" className="botao" onClick={() => irPara('sua-loja')}>
          Ver a minha loja na rua
        </button>
        <button type="button" className="botao-sec" onClick={() => irPara('trabalhos')}>
          Ver trabalhos
        </button>
      </div>
      <ListaLojas />
    </section>
  );
}

/** Tudo que se faz tocando na cena também dá para fazer daqui (teclado e leitor de tela). */
export function ListaLojas() {
  const abrirLoja = useEstado((s) => s.abrirLoja);
  const irPara = useEstado((s) => s.irPara);
  const acesas = useEstado((s) => s.acesasPeloVisitante);
  return (
    <details className="lojas-rua" style={{ marginTop: 14, maxWidth: 420 }}>
      <summary className="botao-texto" style={{ cursor: 'pointer' }}>
        Lojas desta rua
      </summary>
      <ul className="lista-lojas">
        {lotes.map((l) => {
          const acesa = l.status === 'presente' || acesas[l.id] !== undefined;
          const status = l.status === 'construcao' ? 'lote livre' : acesa ? 'acesa' : 'apagada';
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  if (l.caseId) irPara('trabalhos', l.caseId);
                  else if (l.status === 'construcao') irPara('sua-loja');
                  else abrirLoja(l.id);
                }}
              >
                <span>{l.nome}</span>
                <small>{status}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function Legenda({ visivel }: { visivel: boolean }) {
  const acesas = useEstado((s) => s.acesasPeloVisitante);
  const nAcesas = lotes.filter((l) => l.status === 'presente' || acesas[l.id] !== undefined).length;
  const nApagadas = lotes.filter((l) => l.status === 'perdendo' && acesas[l.id] === undefined).length;
  return (
    <ul className="legenda" aria-label="O que as luzes querem dizer" style={{ opacity: visivel ? 1 : 0, pointerEvents: visivel ? 'auto' : 'none' }}>
      <li className="legenda-item">
        <Lightbulb aria-hidden="true" size={16} strokeWidth={1.75} />
        <span>Acesa: aparece no Google</span>
        <span className="legenda-num">{nAcesas}</span>
      </li>
      <li className="legenda-item legenda-item--apagada">
        <LightbulbOff aria-hidden="true" size={16} strokeWidth={1.75} />
        <span>Apagada: ninguém acha</span>
        <span className="legenda-num">{nApagadas}</span>
      </li>
      <li className="legenda-item">
        <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
        <span>Lote livre: a sua loja</span>
      </li>
    </ul>
  );
}

/** Painel de uma loja apagada: a perda potencial, e o botão que acende a loja na cena. */
export function LojaApagada({ id }: { id: string }) {
  const lote = lotes.find((l) => l.id === id);
  const acesa = useEstado((s) => s.acesasPeloVisitante[id] !== undefined);
  const acender = useEstado((s) => s.acender);
  const abrirLoja = useEstado((s) => s.abrirLoja);
  const irPara = useEstado((s) => s.irPara);
  if (!lote) return null;
  const seg = SEGMENTO_DO_LOTE[lote.segmento];
  return (
    <div>
      <div className="painel-topo">
        <p className="rotulo">{acesa ? 'Loja acesa' : 'Loja apagada'}</p>
        <button type="button" className="painel-fechar" aria-label="Fechar" onClick={() => abrirLoja(null)}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <h2 className="titulo">{acesa ? 'Agora ela aparece.' : 'Essa podia ser a sua.'}</h2>
      <p className="texto">
        {acesa
          ? `Com a luz acesa, quem procura ${lote.nome.toLowerCase()} na cidade acha essa loja, e o movimento na calçada muda.`
          : `Quem procura ${lote.nome.toLowerCase()} na cidade não acha essa loja no Google. Passa reto, como os pedestres lá fora.`}
      </p>
      <div className="bloco">
        <Calculadora segmento={seg} />
      </div>
      <div className="heroi-acoes" style={{ marginTop: 18 }}>
        {!acesa && (
          <button type="button" className="botao" onClick={() => acender(id, relogio.t)}>
            <Lightbulb size={18} aria-hidden="true" /> Acender esta loja
          </button>
        )}
        <button type="button" className={acesa ? 'botao' : 'botao-sec'} onClick={() => irPara('sua-loja')}>
          Montar a minha loja
        </button>
      </div>
    </div>
  );
}
