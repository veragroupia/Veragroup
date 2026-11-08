import { Check, Mail } from 'lucide-react';
import { empresa, linkWhatsApp, listaCidades, temContato } from '../data/empresa';
import { servicosComPreco, servicosSobOrcamento } from '../data/servicos';
import { useEstado } from '../estado';
import { reais } from '../lib/formato';
import { IconeWhatsApp } from '../ui/basicos';

export function Contato() {
  const irPara = useEstado((s) => s.irPara);
  const whats = linkWhatsApp('Olá! Vim pelo site da Vera e quero acender a minha loja.');
  const email = empresa.email.trim();
  return (
    <div>
      <p className="rotulo">Contato</p>
      <h2 className="titulo">Vamos acender a sua loja?</h2>
      <p className="texto">Dois serviços têm preço fechado. O resto a gente orça olhando o seu negócio.</p>

      <div className="precos">
        {servicosComPreco.map((s) => (
          <div key={s.id} className="cartao preco">
            <p className="subtitulo">{s.nome}</p>
            <p className="texto" style={{ marginTop: 4 }}>
              {s.linha}
            </p>
            <p className="preco-valor">
              {reais(s.preco!.implantacao)}
              {s.preco!.mensal ? <small> + {reais(s.preco!.mensal)}/mês</small> : null}
              {s.preco!.nota ? <small> · {s.preco!.nota}</small> : null}
            </p>
          </div>
        ))}
      </div>

      <div className="bloco">
        <p className="subtitulo">Sob orçamento</p>
        <ul className="lista-check">
          {servicosSobOrcamento.map((s) => (
            <li key={s.id}>
              <Check size={16} aria-hidden="true" />
              <span>
                <strong>{s.nome}</strong>: {s.linha}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bloco">
        {temContato() ? (
          <div className="heroi-acoes">
            {whats && (
              <a className="botao-whats" href={whats} target="_blank" rel="noopener noreferrer">
                <IconeWhatsApp /> Chamar no WhatsApp
              </a>
            )}
            {email && (
              <a className="botao-sec" href={`mailto:${email}`}>
                <Mail size={16} aria-hidden="true" /> {email}
              </a>
            )}
          </div>
        ) : (
          <>
            <p className="texto" style={{ marginTop: 0 }}>
              Os sócios atendem pessoalmente em {listaCidades}.
            </p>
            <div className="heroi-acoes" style={{ marginTop: 12 }}>
              <button type="button" className="botao" onClick={() => irPara('perto')}>
                Ver onde a gente atende
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="rodape">
        <span>
          <span className="marca" style={{ fontSize: 18 }}>
            vera<span className="marca-ponto">.</span>
          </span>{' '}
          · {empresa.assinatura}
        </span>
        <span>{listaCidades}, SP</span>
        {empresa.cnpj.trim() && <span>CNPJ {empresa.cnpj}</span>}
        <span>
          <a href="/privacidade.html">Privacidade</a> · <a href="?modo=2d">Versão leve, sem 3D</a>
        </span>
      </footer>
    </div>
  );
}
