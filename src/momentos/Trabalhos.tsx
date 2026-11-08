import { useMemo, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Minus, Plus } from 'lucide-react';
import { erk, voneis, type IdCase, type Tela } from '../data/cases';
import { empresa } from '../data/empresa';
import { useEstado } from '../estado';
import { reaisCentavos } from '../lib/formato';
import { IconeWhatsApp, Selo } from '../ui/basicos';

function Telas({ telas }: { telas: Tela[] }) {
  return (
    <div className="telas" role="list" aria-label="Telas reais do projeto">
      {telas.map((t) => (
        <img
          key={t.src}
          role="listitem"
          src={t.src}
          alt={t.alt}
          loading="lazy"
          decoding="async"
          className={t.formato === 'desktop' ? 'tela-desktop' : undefined}
        />
      ))}
    </div>
  );
}

function Voltar() {
  const irPara = useEstado((s) => s.irPara);
  return (
    <button type="button" className="painel-voltar" onClick={() => irPara('trabalhos')}>
      <ArrowLeft size={16} aria-hidden="true" /> Trabalhos
    </button>
  );
}

export function ListaTrabalhos() {
  const irPara = useEstado((s) => s.irPara);
  return (
    <div>
      <p className="rotulo">Trabalhos</p>
      <h2 className="titulo">Duas lojas de Salto que acenderam.</h2>
      <p className="texto">Toque numa delas, aqui ou na rua: a fachada abre e você mexe no que a gente entregou.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <button type="button" className="cartao cartao-case" onClick={() => irPara('trabalhos', 'erk')}>
          <img src="/trabalhos/erk-capa.webp" alt="" loading="lazy" />
          <span>
            <strong>{erk.nome}</strong>
            <span>
              {erk.segmento} · {erk.cidade}
            </span>
          </span>
        </button>
        <button type="button" className="cartao cartao-case" onClick={() => irPara('trabalhos', 'voneis')}>
          <img src="/trabalhos/voneis-bolo-abacaxi.webp" alt="" loading="lazy" />
          <span>
            <strong>{voneis.nome}</strong>
            <span>
              {voneis.segmento} · {voneis.cidade}
            </span>
          </span>
        </button>
      </div>
      <div className="bloco">
        <p className="subtitulo">E o que a gente faz para dentro de casa</p>
        <ul className="lista-check">
          {empresa.produtosProprios.map((p) => (
            <li key={p.nome}>
              <Check size={16} aria-hidden="true" />
              <span>
                <strong>{p.nome}</strong>: {p.descricao}.
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Demo do montador: as escolhas mudam a corrente 3D no balcão da loja. */
function MontadorErk() {
  const montador = useEstado((s) => s.montador);
  const setMontador = useEstado((s) => s.setMontador);
  const peca = erk.montador.pecas.find((p) => p.id === montador.peca) ?? erk.montador.pecas[0];
  return (
    <div className="bloco">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p className="subtitulo">Monte uma peça</p>
        <Selo tipo="demo">demonstração</Selo>
      </div>
      <p className="texto" style={{ marginTop: 6 }}>
        A corrente no balcão muda junto. {erk.montador.nota}
      </p>
      <div className="campo">
        <span className="campo-rotulo" id="m-peca">
          Que peça você quer montar?
        </span>
        <div className="chips" role="radiogroup" aria-labelledby="m-peca">
          {erk.montador.pecas.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              role="radio"
              aria-checked={montador.peca === p.id}
              onClick={() => setMontador({ peca: p.id, tamanho: p.padrao })}
            >
              {p.nome} <span style={{ color: 'var(--texto-3)' }}>· {p.faixa}</span>
            </button>
          ))}
        </div>
      </div>
      {peca.id !== 'anel' && (
        <div className="campo">
          <span className="campo-rotulo" id="m-modelo">
            Modelo do elo
          </span>
          <div className="chips" role="radiogroup" aria-labelledby="m-modelo">
            {erk.montador.modelos.map((m) => (
              <button key={m.id} type="button" className="chip" role="radio" aria-checked={montador.modelo === m.id} onClick={() => setMontador({ modelo: m.id })}>
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="deslizante">
        <div className="deslizante-topo">
          <label htmlFor="m-tamanho">{peca.id === 'anel' ? 'Aro' : 'Comprimento'}</label>
          <output htmlFor="m-tamanho">
            {montador.tamanho} {peca.unidade === 'cm' ? 'cm' : ''}
          </output>
        </div>
        <input id="m-tamanho" type="range" min={peca.min} max={peca.max} step={1} value={montador.tamanho} onChange={(e) => setMontador({ tamanho: +e.target.value })} />
      </div>
    </div>
  );
}

export function CasoErk() {
  return (
    <article aria-labelledby="t-erk">
      <div className="painel-topo">
        <Voltar />
        <Selo tipo="neutro">case autorizado</Selo>
      </div>
      <p className="rotulo">
        {erk.segmento} · {erk.cidade}
      </p>
      <h2 className="titulo" id="t-erk">
        {erk.nome}
      </h2>
      <p className="texto">
        <strong style={{ color: 'var(--texto)' }}>Antes:</strong> {erk.antes}
      </p>
      <div className="bloco">
        <p className="subtitulo">O que a gente fez</p>
        <ul className="lista-check">
          {erk.entregas.map((e) => (
            <li key={e}>
              <Check size={16} aria-hidden="true" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
        <div className="heroi-acoes" style={{ marginTop: 14 }}>
          <a className="botao" href={erk.link} target="_blank" rel="noopener noreferrer">
            Abrir a loja <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      <MontadorErk />
      <div className="bloco">
        <p className="subtitulo">A loja no ar</p>
        <Telas telas={erk.telas} />
      </div>
    </article>
  );
}

type Sacola = Record<string, { qtd: number; calda: string }>;

/** Demo da Vó Neis: monta o pedido com o cardápio real e mostra o que chega no WhatsApp, no caixa e no estoque. */
function CardapioVoneis() {
  const [sacola, setSacola] = useState<Sacola>({});
  const [enviado, setEnviado] = useState<{ total: number; itens: number } | null>(null);
  const [caixa, setCaixa] = useState({ pedidos: 0, total: 0 });
  // estoque de demonstração (fictício)
  const [estoque, setEstoque] = useState<Record<string, number>>(() =>
    Object.fromEntries(voneis.fatias.slice(0, 5).map((f, i) => [f.nome, 12 - i * 2])),
  );
  const itens = Object.entries(sacola).filter(([, v]) => v.qtd > 0);
  const total = itens.reduce((s, [nome, v]) => s + (voneis.fatias.find((f) => f.nome === nome)?.preco ?? 0) * v.qtd, 0);
  const mensagem = useMemo(() => {
    if (!itens.length) return '';
    const linhas = itens.map(([nome, v]) => {
      const preco = voneis.fatias.find((f) => f.nome === nome)?.preco ?? 0;
      return `${v.qtd}x ${nome}${v.calda !== 'Sem' ? ` (calda ${v.calda})` : ''} · ${reaisCentavos(preco * v.qtd)}`;
    });
    return `Olá! Quero fazer um pedido:\n${linhas.join('\n')}\nTotal: ${reaisCentavos(total)}`;
  }, [itens, total]);

  const mudar = (nome: string, delta: number) =>
    setSacola((s) => {
      const atual = s[nome] ?? { qtd: 0, calda: 'Sem' };
      return { ...s, [nome]: { ...atual, qtd: Math.max(0, atual.qtd + delta) } };
    });

  const enviar = () => {
    setEnviado({ total, itens: itens.reduce((s, [, v]) => s + v.qtd, 0) });
    setCaixa((c) => ({ pedidos: c.pedidos + 1, total: c.total + total }));
    setEstoque((e) => {
      const n = { ...e };
      for (const [nome, v] of itens) if (nome in n) n[nome] = Math.max(0, n[nome] - v.qtd);
      return n;
    });
  };

  return (
    <div className="bloco">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p className="subtitulo">Faça um pedido de teste</p>
        <Selo tipo="demo">demonstração</Selo>
      </div>
      <p className="texto" style={{ marginTop: 6 }}>
        Fatias de bolo do cardápio real. Nada é enviado: você vê a mensagem que chegaria no WhatsApp da loja.
      </p>
      <div className="cardapio">
        {voneis.fatias.map((f) => {
          const item = sacola[f.nome];
          return (
            <div className="item-cardapio" key={f.nome}>
              {f.foto ? <img src={f.foto} alt={f.nome} loading="lazy" /> : <span className="sem-foto" aria-hidden="true" />}
              <div>
                <strong>{f.nome}</strong>
                <span>{reaisCentavos(f.preco)}</span>
                {item && item.qtd > 0 && (
                  <div className="chips" style={{ marginTop: 6 }} role="radiogroup" aria-label={`Calda para ${f.nome}`}>
                    {voneis.caldas.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="chip"
                        style={{ minHeight: 32, padding: '0 10px' }}
                        role="radio"
                        aria-checked={item.calda === c}
                        onClick={() => setSacola((s) => ({ ...s, [f.nome]: { ...item, calda: c } }))}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="qtd">
                <button type="button" aria-label={`Tirar ${f.nome}`} onClick={() => mudar(f.nome, -1)}>
                  <Minus size={16} aria-hidden="true" />
                </button>
                <output aria-label="Quantidade">{item?.qtd ?? 0}</output>
                <button type="button" aria-label={`Pôr ${f.nome}`} onClick={() => mudar(f.nome, 1)}>
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {itens.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <span className="texto" style={{ margin: 0 }}>
              Total
            </span>
            <strong style={{ fontFamily: 'var(--f-mono)', fontSize: 20 }}>{reaisCentavos(total)}</strong>
          </div>
          <div className="mensagem-whats" aria-label="Mensagem que chegaria no WhatsApp da loja">
            {mensagem}
          </div>
          <button type="button" className="botao-whats" style={{ marginTop: 12, width: '100%' }} onClick={enviar}>
            <IconeWhatsApp /> Simular envio do pedido
          </button>
        </>
      )}
      {enviado && (
        <div className="bloco">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <p className="subtitulo">Caixa do dia e estoque</p>
            <Selo tipo="demo">dados fictícios</Selo>
          </div>
          <p className="texto" style={{ marginTop: 6 }}>
            Na demonstração, o pedido entra no caixa e baixa o estoque. A Vó Neis também ganhou caixa do dia e estoque, com os números dela.
          </p>
          <div className="painel-dono">
            <div className="kpi kpi--ativo">
              <span>Pedidos hoje</span>
              <strong>{caixa.pedidos}</strong>
            </div>
            <div className="kpi kpi--ativo">
              <span>Caixa do dia</span>
              <strong>{reaisCentavos(caixa.total)}</strong>
            </div>
            {Object.entries(estoque).map(([nome, qtd]) => (
              <div className="kpi" key={nome}>
                <span>{nome}</span>
                <strong>{qtd} fatias</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CasoVoneis() {
  return (
    <article aria-labelledby="t-voneis">
      <div className="painel-topo">
        <Voltar />
        <Selo tipo="neutro">case autorizado</Selo>
      </div>
      <p className="rotulo">
        {voneis.segmento} · {voneis.cidade}
      </p>
      <h2 className="titulo" id="t-voneis">
        {voneis.nome}
      </h2>
      <div className="bloco" style={{ marginTop: 14 }}>
        <p className="subtitulo">O que a gente fez</p>
        <ul className="lista-check">
          {voneis.entregas.map((e) => (
            <li key={e}>
              <Check size={16} aria-hidden="true" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
      <CardapioVoneis />
      <div className="bloco">
        <p className="subtitulo">O cardápio no ar</p>
        <Telas telas={voneis.telas} />
      </div>
    </article>
  );
}

export function Trabalhos({ caso, todos = false }: { caso: IdCase | null; todos?: boolean }) {
  if (todos)
    return (
      <>
        <ListaTrabalhos />
        <div className="bloco">
          <CasoErk />
        </div>
        <div className="bloco">
          <CasoVoneis />
        </div>
      </>
    );
  if (caso === 'erk') return <CasoErk />;
  if (caso === 'voneis') return <CasoVoneis />;
  return <ListaTrabalhos />;
}
