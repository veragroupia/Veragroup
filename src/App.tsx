import { lazy, Suspense, useEffect, useState } from 'react';
import { useEstado } from './estado';
import { useRotas } from './rotas';
import { Abertura } from './ui/Abertura';
import { Marca, useCelular } from './ui/basicos';
import { BarraApp, NavDesktop } from './ui/Navegacao';
import { Painel } from './ui/Painel';
import { Heroi, Legenda, LojaApagada } from './momentos/Cidade';
import { Trabalhos } from './momentos/Trabalhos';
import { SuaLoja } from './momentos/SuaLoja';
import { Perto } from './momentos/Perto';
import { Contato } from './momentos/Contato';

const Cena = lazy(() => import('./cena/Cena'));

function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Celular muito fraco: pouca memória ou poucos núcleos. Vai direto para a versão leve. */
function aparelhoFraco() {
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.deviceMemory !== undefined && n.deviceMemory <= 2) || (navigator.hardwareConcurrency ?? 8) <= 2;
}

function lerParametros() {
  const p = new URLSearchParams(location.search);
  const q = p.get('q');
  const s = useEstado.getState();
  if (q === 'alta' || q === 'media' || q === 'baixa') s.setQualidade(q);
  else if (matchMedia('(pointer: coarse)').matches) s.setQualidade('media');
  // o index.html já decidiu antes da primeira pintura; a conta aqui é só para quando aquele script não rodou
  const decidido = document.documentElement.classList.contains('modo-2d');
  const forcar2d = p.get('modo') === '2d';
  if (decidido || forcar2d || !temWebGL() || (aparelhoFraco() && p.get('modo') !== '3d')) s.setModo2d(true);
}

export function App() {
  const [montado, setMontado] = useState(false);
  const [carregar3D, setCarregar3D] = useState(false);
  const momento = useEstado((s) => s.momento);
  const caso = useEstado((s) => s.caso);
  const lojaFoco = useEstado((s) => s.lojaFoco);
  const cenaPronta = useEstado((s) => s.cenaPronta);
  const modo2d = useEstado((s) => s.modo2d);
  const celular = useCelular();
  useRotas();

  useEffect(() => {
    lerParametros();
    setMontado(true);
    if (useEstado.getState().modo2d) return;
    const iniciar = () => setCarregar3D(true);
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(iniciar, { timeout: 800 });
    else setTimeout(iniciar, 150);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (montado) raiz.classList.toggle('modo-2d', modo2d);
    raiz.classList.toggle('modo-3d', !modo2d && montado);
  }, [modo2d, montado]);

  // Esc volta um nível: case → lista de trabalhos → rua
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if ((e.target as HTMLElement).closest?.('input, textarea, select')) return;
      const s = useEstado.getState();
      if (s.momento === 'trabalhos' && s.caso) s.irPara('trabalhos');
      else if (s.momento !== 'cidade' || s.lojaFoco) s.irPara('cidade');
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  // versão leve: o menu rola até a seção, já que tudo está numa página só
  useEffect(() => {
    if (!modo2d) return;
    const alvo = momento === 'cidade' ? null : document.getElementById(momento);
    const comportamento: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (alvo) alvo.scrollIntoView({ behavior: comportamento, block: 'start' });
    else window.scrollTo({ top: 0, behavior: comportamento });
  }, [modo2d, momento, caso]);

  const naCidade = momento === 'cidade' && !lojaFoco;
  const painelAberto = !naCidade;
  // no celular, "Contato" junta o mapa das cidades e o contato num painel só
  const contatoJunto = celular && (momento === 'perto' || momento === 'contato');

  const secoes = (
    <>
      <section className="secao-2d" id="loja" hidden={!lojaFoco || modo2d} aria-label="Loja apagada">
        {lojaFoco && <LojaApagada id={lojaFoco} />}
      </section>
      <section className="secao-2d" id="trabalhos" hidden={!modo2d && momento !== 'trabalhos'} aria-label="Trabalhos">
        <Trabalhos caso={caso} todos={modo2d} />
      </section>
      <section className="secao-2d" id="sua-loja" hidden={!modo2d && momento !== 'sua-loja'} aria-label="Sua loja">
        <SuaLoja />
      </section>
      <section className="secao-2d" id="perto" hidden={!modo2d && momento !== 'perto' && !contatoJunto} aria-label="A Vera perto de você">
        <Perto />
      </section>
      <section className="secao-2d" id="contato" hidden={!modo2d && momento !== 'contato' && !contatoJunto} aria-label="Contato">
        {contatoJunto && !modo2d && <div className="bloco" />}
        <Contato />
      </section>
    </>
  );

  return (
    <div className={painelAberto ? 'com-painel' : undefined}>
      <Abertura />
      <header className="topo">
        <Marca as="a" />
        <NavDesktop />
      </header>

      <div className="palco" aria-hidden={modo2d ? undefined : 'true'}>
        <div className={`palco-cena${cenaPronta ? ' palco-cena--pronta' : ''}`}>
          {carregar3D && !modo2d && (
            <Suspense fallback={null}>
              <Cena />
            </Suspense>
          )}
        </div>
        <picture>
          <source media="(max-width: 899px)" srcSet="/poster-celular.webp" />
          <img
            className="palco-poster"
            src="/poster-desktop.webp"
            alt=""
            fetchPriority="high"
            onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
          />
        </picture>
        {!modo2d && (
          <div className="palco-dica" style={{ opacity: naCidade && cenaPronta ? 1 : 0 }}>
            {celular ? 'Arraste para andar pela rua · toque numa loja' : 'Arraste para andar pela rua · clique numa loja'}
          </div>
        )}
      </div>

      <main>
        <Heroi visivel={naCidade || modo2d} />
        <Legenda visivel={naCidade && !modo2d} />
        <Painel estatico={modo2d} aberto={painelAberto || modo2d} rotulo="Conteúdo" chave={`${momento}/${caso ?? ''}/${lojaFoco ?? ''}`}>
          {secoes}
        </Painel>
      </main>

      <BarraApp />
    </div>
  );
}
