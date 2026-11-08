import { lazy, Suspense, useEffect, useState } from 'react';
import { Check, Hammer, SearchX, Store, LayoutGrid, Building2, MessageCircle } from 'lucide-react';
import { lotes, type Status } from './data/rua';
import { empresa } from './data/empresa';
import { relogio, useEstado } from './estado';

const Cena = lazy(() => import('./cena/Cena'));

function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function lerParametros() {
  const p = new URLSearchParams(location.search);
  const t = p.get('t');
  if (t !== null && !Number.isNaN(Number(t))) relogio.congelado = Number(t);
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches || p.get('mov') === '0';
  relogio.semMovimento = reduzido;
  const q = p.get('q');
  if (q === 'alta' || q === 'media' || q === 'baixa') useEstado.getState().setQualidade(q);
  else if (matchMedia('(pointer: coarse)').matches) useEstado.getState().setQualidade('media');
}

const ROTULO: Record<Status, string> = {
  presente: 'Aparece no Google',
  perdendo: 'Perdendo cliente',
  construcao: 'Em construção',
};
const ICONE: Record<Status, typeof Check> = { presente: Check, perdendo: SearchX, construcao: Hammer };

function Legenda() {
  const visivel = useEstado((s) => s.entradaFeita);
  const acesas = useEstado((s) => s.acesasPeloVisitante);
  const contagem: Record<Status, number> = { presente: 0, perdendo: 0, construcao: 0 };
  for (const l of lotes) contagem[acesas[l.id] !== undefined ? 'presente' : l.status]++;
  return (
    <ul className={`legenda${visivel ? ' legenda--visivel' : ''}`} aria-label="O que as luzes querem dizer">
      {(Object.keys(ROTULO) as Status[]).map((s) => {
        const Icone = ICONE[s];
        return (
          <li key={s} className={`legenda-item legenda-item--${s}`}>
            <Icone aria-hidden="true" size={16} strokeWidth={2} />
            <span>{ROTULO[s]}</span>
            <span className="legenda-num">{contagem[s]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function BarraApp() {
  const itens = [
    { rotulo: 'Rua', Icone: Store, href: '#rua', ativo: true },
    { rotulo: 'Trabalhos', Icone: LayoutGrid, href: '#trabalhos' },
    { rotulo: 'Sua loja', Icone: Building2, href: '#sua-loja' },
    { rotulo: 'Contato', Icone: MessageCircle, href: '#contato' },
  ];
  return (
    <nav className="barra-app" aria-label="Seções">
      {itens.map(({ rotulo, Icone, href, ativo }) => (
        <a key={rotulo} href={href} className={`barra-app-item${ativo ? ' barra-app-item--ativo' : ''}`} aria-current={ativo ? 'page' : undefined}>
          <Icone aria-hidden="true" size={22} strokeWidth={1.75} />
          <span>{rotulo}</span>
        </a>
      ))}
    </nav>
  );
}

export function App() {
  const [carregar3D, setCarregar3D] = useState(false);
  const [toque, setToque] = useState(true);
  const cenaPronta = useEstado((s) => s.cenaPronta);
  const convidar = useEstado((s) => s.convidar);

  useEffect(() => {
    lerParametros();
    setToque(matchMedia('(pointer: coarse)').matches);
    if (!temWebGL()) return;
    const iniciar = () => setCarregar3D(true);
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(iniciar, { timeout: 900 });
    else setTimeout(iniciar, 200);
  }, []);

  const cidades = empresa.cidades;
  const listaCidades = `${cidades.slice(0, -1).join(', ')} e ${cidades[cidades.length - 1]}`;

  return (
    <>
      <header className="topo">
        <a className="marca" href="/" aria-label="Vera Group, início">
          Vera<span className="marca-ponto">.</span>
        </a>
      </header>

      <main>
        <section id="rua" className="palco" aria-labelledby="titulo">
          <div className={`palco-cena${cenaPronta ? ' palco-cena--pronta' : ''}`}>
            {carregar3D && (
              <Suspense fallback={null}>
                <Cena />
              </Suspense>
            )}
          </div>

          <div className="abertura">
            <h1 id="titulo" className="abertura-titulo">
              <span>Na sua rua,</span> <span>quem aparece vende.</span>
            </h1>
            <p className="abertura-sub">Site, cardápio digital e Google para o comércio de {listaCidades}.</p>
            <button type="button" className="botao-principal abertura-botao" onClick={convidar}>
              {toque ? 'Toque numa loja' : 'Clique numa loja'}
            </button>
          </div>

          <Legenda />
        </section>
      </main>

      <BarraApp />
    </>
  );
}
