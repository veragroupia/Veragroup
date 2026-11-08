import { MapPin } from 'lucide-react';
import { cidadesMapa } from '../data/cidades';
import { empresa } from '../data/empresa';
import { useEstado } from '../estado';

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export function Perto() {
  const cidadeFoco = useEstado((s) => s.cidadeFoco);
  const setCidadeFoco = useEstado((s) => s.setCidadeFoco);
  return (
    <div>
      <p className="rotulo">A Vera perto de você</p>
      <h2 className="titulo">A gente vai até a sua loja.</h2>
      <p className="texto">
        A venda é presencial. Um dos sócios passa no seu balcão, olha como o cliente te procura hoje e mostra o que dá para acender.
      </p>
      <div className="bloco">
        <p className="subtitulo">Onde a gente atende</p>
        <div className="chips" style={{ marginTop: 12 }}>
          {cidadesMapa.map((c) => (
            <button
              key={c.nome}
              type="button"
              className="chip"
              aria-pressed={cidadeFoco === c.nome}
              onClick={() => setCidadeFoco(cidadeFoco === c.nome ? null : c.nome)}
            >
              <MapPin size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {c.nome}
            </button>
          ))}
        </div>
      </div>
      <div className="bloco">
        <p className="subtitulo">Quem vai até você</p>
        <div className="socios">
          {empresa.socios.map((s) => (
            <div key={s.nome} className="cartao socio">
              <span className="monograma" aria-hidden="true">
                {iniciais(s.nome)}
              </span>
              <span>
                <strong>{s.nome}</strong>
                <span>Sócio</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
