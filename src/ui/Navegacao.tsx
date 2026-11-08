import { Building2, LayoutGrid, MessageCircle, Store } from 'lucide-react';
import { useEstado, type Momento } from '../estado';

const ITENS_DESKTOP: { m: Momento; rotulo: string }[] = [
  { m: 'cidade', rotulo: 'Cidade' },
  { m: 'trabalhos', rotulo: 'Trabalhos' },
  { m: 'sua-loja', rotulo: 'Sua loja' },
  { m: 'perto', rotulo: 'Perto de você' },
  { m: 'contato', rotulo: 'Contato' },
];

export function NavDesktop() {
  const momento = useEstado((s) => s.momento);
  const irPara = useEstado((s) => s.irPara);
  return (
    <nav className="nav-desktop" aria-label="Momentos do site">
      {ITENS_DESKTOP.map(({ m, rotulo }) => (
        <button key={m} type="button" aria-current={momento === m ? 'page' : undefined} onClick={() => irPara(m)}>
          {rotulo}
        </button>
      ))}
    </nav>
  );
}

/** Barra de app no celular: Rua · Trabalhos · Sua loja · Contato (o mapa das cidades fica dentro de Contato). */
export function BarraApp() {
  const momento = useEstado((s) => s.momento);
  const irPara = useEstado((s) => s.irPara);
  const itens: { m: Momento; rotulo: string; Icone: typeof Store; ativo: boolean }[] = [
    { m: 'cidade', rotulo: 'Rua', Icone: Store, ativo: momento === 'cidade' },
    { m: 'trabalhos', rotulo: 'Trabalhos', Icone: LayoutGrid, ativo: momento === 'trabalhos' },
    { m: 'sua-loja', rotulo: 'Sua loja', Icone: Building2, ativo: momento === 'sua-loja' },
    { m: 'perto', rotulo: 'Contato', Icone: MessageCircle, ativo: momento === 'perto' || momento === 'contato' },
  ];
  return (
    <nav className="barra-app" aria-label="Seções">
      {itens.map(({ m, rotulo, Icone, ativo }) => (
        <button key={rotulo} type="button" aria-current={ativo ? 'page' : undefined} onClick={() => irPara(m)}>
          <Icone aria-hidden="true" size={22} strokeWidth={1.75} />
          <span>{rotulo}</span>
        </button>
      ))}
    </nav>
  );
}
