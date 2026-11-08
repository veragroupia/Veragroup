import { useCallback, useState } from 'react';
import { Check, Copy, Minus, RotateCcw, Search } from 'lucide-react';
import { empresa, linkWhatsApp, type Cidade } from '../data/empresa';
import { segmentoDoGoogle, segmentoPorId, segmentos, type IdSegmento } from '../data/segmentos';
import { relogio, useEstado, type IdServicoLoja, type SuaLoja as TSuaLoja } from '../estado';
import { clientesPerdidos, type Premissas } from '../lib/calculadora';
import { numero, reais } from '../lib/formato';
import { buscarNoGoogle, googleConfigurado, type Lugar } from '../lib/places';
import { IconeGoogle, IconeWhatsApp, Selo } from '../ui/basicos';
import { Calculadora } from '../ui/Calculadora';

const CORES_FACHADA = ['#d9a99a', '#cfa66a', '#3d7479', '#4f5d6b', '#e6e1d6', '#3a3d43'];

export const SERVICOS_LOJA: { id: IdServicoLoja; nome: string; efeito: string; preco?: string; parte: number }[] = [
  { id: 'site', nome: 'Site', efeito: 'O letreiro acende e aparece um celular com a prévia.', preco: 'Landing Express: R$ 690 + R$ 97/mês', parte: 25 },
  { id: 'google', nome: 'Google Meu Negócio', efeito: 'O pino aparece e os pedestres começam a vir.', parte: 40 },
  { id: 'cardapio', nome: 'Cardápio digital', efeito: 'A vitrine se enche.', parte: 10 },
  { id: 'nfc', nome: 'Plaquinha NFC', efeito: 'A plaquinha aparece no balcão.', preco: 'R$ 100, configurada e instalada', parte: 5 },
  { id: 'whatsapp', nome: 'WhatsApp com IA', efeito: 'Saem balões de mensagem. A IA prepara, a equipe revisa e envia.', parte: 20 },
];

function Formulario() {
  const loja = useEstado((s) => s.suaLoja);
  const setSuaLoja = useEstado((s) => s.setSuaLoja);
  const [resultados, setResultados] = useState<Lugar[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');

  const construir = (extra: Partial<TSuaLoja> = {}) =>
    setSuaLoja({ construida: true, construidaEm: relogio.t, ...extra });

  const buscar = async () => {
    if (!loja.nome.trim()) return;
    setBuscando(true);
    setErro('');
    try {
      const r = await buscarNoGoogle(`${loja.nome} ${loja.cidade} SP`);
      setResultados(r);
      if (!r.length) setErro('O Google não achou esse nome por aqui. Pode construir mesmo assim.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para buscar agora.');
    } finally {
      setBuscando(false);
    }
  };

  const escolher = (l: Lugar) => {
    const seg = segmentoDoGoogle(l.tipo);
    construir({ nome: l.nome, segmento: seg, cor: segmentoPorId(seg).cor, fonte: 'google', lugar: l });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loja.nome.trim()) return;
        if (googleConfigurado) void buscar();
        else construir({ fonte: 'simulacao' });
      }}
    >
      <div className="campo">
        <label htmlFor="sl-nome">Nome do seu negócio</label>
        <input
          id="sl-nome"
          className="entrada"
          autoComplete="organization"
          maxLength={28}
          value={loja.nome}
          onChange={(e) => setSuaLoja({ nome: e.target.value })}
          required
        />
      </div>
      <div className="campo">
        <span className="campo-rotulo" id="sl-cidade">
          Cidade
        </span>
        <div className="chips" role="radiogroup" aria-labelledby="sl-cidade">
          {empresa.cidades.map((c) => (
            <button key={c} type="button" className="chip" role="radio" aria-checked={loja.cidade === c} onClick={() => setSuaLoja({ cidade: c as Cidade })}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <label htmlFor="sl-seg">O que você vende</label>
        <select
          id="sl-seg"
          className="seletor"
          value={loja.segmento}
          onChange={(e) => {
            const seg = e.target.value as IdSegmento;
            setSuaLoja({ segmento: seg, cor: segmentoPorId(seg).cor });
          }}
        >
          {segmentos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <span className="campo-rotulo" id="sl-cor">
          Cor da fachada
        </span>
        <div className="cores" role="radiogroup" aria-labelledby="sl-cor">
          {CORES_FACHADA.map((c) => (
            <button key={c} type="button" className="cor" role="radio" aria-checked={loja.cor === c} aria-label={`Cor ${c}`} style={{ background: c }} onClick={() => setSuaLoja({ cor: c })} />
          ))}
        </div>
      </div>

      {googleConfigurado ? (
        <>
          <div className="heroi-acoes" style={{ marginTop: 18 }}>
            <button type="submit" className="botao" disabled={!loja.nome.trim() || buscando}>
              <IconeGoogle /> {buscando ? 'Buscando…' : 'Buscar no Google'}
            </button>
            <button type="button" className="botao-sec" disabled={!loja.nome.trim()} onClick={() => construir({ fonte: 'simulacao' })}>
              Construir sem buscar
            </button>
          </div>
          <p className="conta">A busca manda só o nome e a cidade para o Google Maps, e só quando você clica.</p>
          {erro && <p className="texto">{erro}</p>}
          {resultados && resultados.length > 0 && (
            <div className="bloco">
              <p className="subtitulo">É algum destes?</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {resultados.map((r) => (
                  <button key={r.id} type="button" className="cartao" style={{ padding: 12, textAlign: 'left', cursor: 'pointer' }} onClick={() => escolher(r)}>
                    <strong style={{ display: 'block' }}>{r.nome}</strong>
                    {r.endereco && <span style={{ fontSize: 14, color: 'var(--texto-3)' }}>{r.endereco}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="heroi-acoes" style={{ marginTop: 18 }}>
            <button type="submit" className="botao" disabled={!loja.nome.trim()}>
              <Search size={16} aria-hidden="true" /> Construir minha loja
            </button>
          </div>
          <p className="conta" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Selo tipo="simulacao">Simulação</Selo> Esta versão ainda não está ligada ao Google. O diagnóstico usa o que você responder.
          </p>
        </>
      )}
    </form>
  );
}

type ItemDiag = { id: keyof TSuaLoja['respostas']; rotulo: string };
const ITENS_DIAG: ItemDiag[] = [
  { id: 'google', rotulo: 'Aparece no Google' },
  { id: 'site', rotulo: 'Tem site' },
  { id: 'horario', rotulo: 'Tem horário no Google' },
  { id: 'whatsapp', rotulo: 'Responde o WhatsApp na hora' },
];

function Diagnostico() {
  const loja = useEstado((s) => s.suaLoja);
  const setSuaLoja = useEstado((s) => s.setSuaLoja);
  const l = loja.lugar;
  const verificado = (id: ItemDiag['id']): boolean | undefined => {
    if (!l) return undefined;
    if (id === 'google') return true;
    if (id === 'site') return Boolean(l.site);
    if (id === 'horario') return l.temHorario;
    return undefined;
  };
  return (
    <div className="bloco">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p className="subtitulo">Diagnóstico</p>
        {l ? <Selo tipo="verificado">dados do Google</Selo> : <Selo tipo="simulacao">Simulação</Selo>}
      </div>
      <ul className="diagnostico">
        {l?.nota !== undefined && (
          <li>
            <Check size={18} className="diag-sim" aria-hidden="true" />
            <span>
              Nota {l.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              {l.avaliacoes !== undefined ? ` com ${numero(l.avaliacoes)} avaliações` : ''}
            </span>
            <Selo tipo="verificado">verificado</Selo>
          </li>
        )}
        {ITENS_DIAG.map((item) => {
          const v = verificado(item.id);
          const resposta = loja.respostas[item.id];
          const valor = v ?? resposta;
          return (
            <li key={item.id}>
              {valor ? <Check size={18} className="diag-sim" aria-hidden="true" /> : <Minus size={18} className="diag-nao" aria-hidden="true" />}
              <span>{item.rotulo}</span>
              {v !== undefined ? (
                <Selo tipo="verificado">{v ? 'sim, verificado' : 'não, verificado'}</Selo>
              ) : (
                <span className="chips" role="radiogroup" aria-label={item.rotulo}>
                  {[true, false].map((op) => (
                    <button
                      key={String(op)}
                      type="button"
                      className="chip"
                      style={{ minHeight: 32, padding: '0 10px' }}
                      role="radio"
                      aria-checked={resposta === op}
                      onClick={() => setSuaLoja({ respostas: { ...loja.respostas, [item.id]: op } })}
                    >
                      {op ? 'Sim' : 'Não'}
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="conta">{l ? 'WhatsApp não dá para verificar daqui: vale o que você responder.' : 'Sem o Google ligado, vale o que você responder.'}</p>
    </div>
  );
}

function PainelDono({ premissas }: { premissas: Premissas | null }) {
  const loja = useEstado((s) => s.suaLoja);
  const ligados = SERVICOS_LOJA.filter((s) => loja.servicos[s.id]);
  if (!ligados.length || !premissas) return null;
  const parte = Math.min(100, ligados.reduce((s, x) => s + x.parte, 0));
  const recuperados = clientesPerdidos(premissas) * (parte / 100);
  const valor = Math.round((recuperados * premissas.ticket) / 10) * 10;
  return (
    <div className="bloco">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p className="subtitulo">Painel do dono</p>
        <Selo tipo="simulacao">Simulação</Selo>
      </div>
      <div className="painel-dono">
        <div className="kpi kpi--ativo">
          <span>Clientes que voltam a te achar</span>
          <strong>≈ {numero(Math.round(recuperados))}/mês</strong>
        </div>
        <div className="kpi kpi--ativo">
          <span>Venda recuperada</span>
          <strong>≈ {reais(valor)}/mês</strong>
        </div>
        {loja.servicos.google && (
          <div className="kpi">
            <span>Google</span>
            <strong style={{ fontSize: 16 }}>Pino no mapa</strong>
          </div>
        )}
        {loja.servicos.whatsapp && (
          <div className="kpi">
            <span>WhatsApp</span>
            <strong style={{ fontSize: 16 }}>Resposta pronta</strong>
          </div>
        )}
        {loja.servicos.nfc && (
          <div className="kpi">
            <span>Avaliações</span>
            <strong style={{ fontSize: 16 }}>Plaquinha no balcão</strong>
          </div>
        )}
        {loja.servicos.cardapio && (
          <div className="kpi">
            <span>Pedidos</span>
            <strong style={{ fontSize: 16 }}>Cardápio no celular</strong>
          </div>
        )}
      </div>
      <p className="conta">
        Simulação: cada serviço recupera uma parte da perda estimada acima ({SERVICOS_LOJA.map((s) => `${s.nome.split(' ')[0]} ${s.parte}%`).join(', ')}).
        Não é promessa de resultado.
      </p>
    </div>
  );
}

function LojaConstruida() {
  const loja = useEstado((s) => s.suaLoja);
  const alternar = useEstado((s) => s.alternarServico);
  const reiniciar = useEstado((s) => s.reiniciarSuaLoja);
  const [premissas, setPremissas] = useState<Premissas | null>(null);
  const [copiado, setCopiado] = useState(false);
  const aoMudar = useCallback((p: Premissas) => setPremissas(p), []);
  const seg = segmentoPorId(loja.segmento);
  const ligados = SERVICOS_LOJA.filter((s) => loja.servicos[s.id]).map((s) => s.nome);
  const resumo = `Olá! Montei a minha loja no site da Vera.\nNegócio: ${loja.nome} (${seg.nome}, ${loja.cidade}).\nQuero acender: ${ligados.length ? ligados.join(', ') : 'ainda escolhendo'}.`;
  const whats = linkWhatsApp(resumo);

  return (
    <div>
      <p className="rotulo">
        {seg.nome} · {loja.cidade}
      </p>
      <h2 className="titulo">{loja.nome}</h2>
      <p className="texto">Sua loja está de pé na rua. Agora veja o que acende quando ela aparece.</p>
      <Diagnostico />
      <div className="bloco">
        <Calculadora segmento={loja.segmento} cidade={loja.cidade} onMudar={aoMudar} />
      </div>
      <div className="bloco">
        <p className="subtitulo">Acenda a sua loja</p>
        <p className="texto" style={{ marginTop: 6 }}>
          Ligue cada serviço e olhe a fachada.
        </p>
        <div className="chaves">
          {SERVICOS_LOJA.map((s) => (
            <button key={s.id} type="button" className="chave" role="switch" aria-checked={loja.servicos[s.id]} onClick={() => alternar(s.id)}>
              <span>
                <strong>{s.nome}</strong>
                <span>{s.efeito}</span>
                {s.preco && <span style={{ color: 'var(--ouro-claro)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>{s.preco}</span>}
              </span>
              <span className="chave-trilho" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <PainelDono premissas={premissas} />
      <div className="bloco">
        <div className="heroi-acoes">
          {whats ? (
            <a className="botao-whats" href={whats} target="_blank" rel="noopener noreferrer">
              <IconeWhatsApp /> Quero isso no ar
            </a>
          ) : (
            <button
              type="button"
              className="botao"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(resumo);
                  setCopiado(true);
                } catch {
                  setCopiado(false);
                }
              }}
            >
              <Copy size={16} aria-hidden="true" /> {copiado ? 'Resumo copiado' : 'Copiar o resumo da minha loja'}
            </button>
          )}
          <button type="button" className="botao-sec" onClick={reiniciar}>
            <RotateCcw size={16} aria-hidden="true" /> Recomeçar
          </button>
        </div>
      </div>
    </div>
  );
}

export function SuaLoja() {
  const construida = useEstado((s) => s.suaLoja.construida);
  if (construida) return <LojaConstruida />;
  return (
    <div>
      <p className="rotulo">Sua loja</p>
      <h2 className="titulo">Coloque o seu negócio nesta rua.</h2>
      <p className="texto">Digite o nome. A gente levanta a fachada no lote vazio e mostra o que acende quando ela aparece.</p>
      <Formulario />
    </div>
  );
}
