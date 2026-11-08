import { describe, expect, it, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { problemas } from '../scripts/verificar-placeholders.mjs';
import { empresa, linkWhatsApp, temContato } from '../src/data/empresa';
import { useEstado } from '../src/estado';
import { Contato } from '../src/momentos/Contato';
import { Perto } from '../src/momentos/Perto';
import { SuaLoja } from '../src/momentos/SuaLoja';
import { Trabalhos } from '../src/momentos/Trabalhos';
import { Heroi, ListaLojas, LojaApagada } from '../src/momentos/Cidade';
import { servicos } from '../src/data/servicos';

const html = (el: Parameters<typeof renderToString>[0]) => renderToString(el);
const original = { ...empresa };

afterEach(() => {
  Object.assign(empresa, original);
  useEstado.getState().reiniciarSuaLoja();
});

describe('nenhum texto provisório nas seções', () => {
  const secoes = {
    heroi: () => h(Heroi, { visivel: true }),
    lojas: () => h(ListaLojas),
    lojaApagada: () => h(LojaApagada, { id: 'oficina' }),
    trabalhos: () => h(Trabalhos, { caso: null, todos: true }),
    erk: () => h(Trabalhos, { caso: 'erk' }),
    voneis: () => h(Trabalhos, { caso: 'voneis' }),
    suaLoja: () => h(SuaLoja),
    perto: () => h(Perto),
    contato: () => h(Contato),
  };
  for (const [nome, el] of Object.entries(secoes)) {
    it(nome, () => {
      expect(problemas(html(el()))).toEqual([]);
    });
  }

  it('sua loja construída, com todos os serviços', () => {
    const s = useEstado.getState();
    s.setSuaLoja({ nome: 'Doceria da Ana', construida: true });
    for (const k of Object.keys(s.suaLoja.servicos) as (keyof typeof s.suaLoja.servicos)[]) s.alternarServico(k);
    expect(problemas(html(h(SuaLoja)))).toEqual([]);
  });
});

describe('o detector pega texto provisório', () => {
  it.each(['PREENCHER aqui', 'Contato: [...]', 'Novidade em breve', 'Lorem ipsum dolor', 'R$ NaN', 'undefined'])('%s', (t) => {
    expect(problemas(`<p>${t}</p>`).length).toBeGreaterThan(0);
  });
  it('links vazios', () => {
    expect(problemas('<a href="">x</a>')).toContain('link vazio');
    expect(problemas('<a href="https://wa.me/?text=oi">x</a>')).toContain('link vazio');
  });
  it('não acusa texto normal', () => {
    expect(problemas('<p>Seu negócio existe.</p><script>var a = undefined</script>')).toEqual([]);
  });
});

describe('campos vazios da empresa não aparecem', () => {
  it('sem WhatsApp, nenhum link wa.me nem botão de WhatsApp', () => {
    expect(empresa.whatsapp).toBe('');
    expect(linkWhatsApp('oi')).toBeNull();
    const s = useEstado.getState();
    s.setSuaLoja({ nome: 'Doceria da Ana', construida: true });
    for (const el of [h(Contato), h(SuaLoja), h(Trabalhos, { caso: 'voneis' }), h(Heroi, { visivel: true })]) {
      const saida = html(el);
      expect(saida).not.toContain('wa.me');
      expect(saida).not.toMatch(/mailto:/);
    }
  });

  it('sem e-mail, CNPJ e responsável, nada disso é citado', () => {
    const saida = html(h(Contato));
    expect(saida).not.toMatch(/CNPJ/i);
    expect(saida).not.toMatch(/respons[aá]vel/i);
    expect(temContato()).toBe(false);
  });

  it('com WhatsApp preenchido, o botão aparece com mensagem pronta', () => {
    empresa.whatsapp = '55 (11) 99999-0000';
    expect(linkWhatsApp('oi')).toBe('https://wa.me/5511999990000?text=oi');
    expect(html(h(Contato))).toContain('https://wa.me/5511999990000');
  });

  it('com e-mail preenchido, o e-mail aparece', () => {
    empresa.email = 'contato@exemplo.com.br';
    expect(html(h(Contato))).toContain('mailto:contato@exemplo.com.br');
  });
});

describe('preços', () => {
  it('só Landing Express e Plaquinha NFC têm preço; o resto é orçamento', () => {
    const comPreco = servicos.filter((s) => 'preco' in s && s.preco).map((s) => s.id).sort();
    expect(comPreco).toEqual(['landing', 'nfc']);
  });
  it('o contato mostra os dois preços reais', () => {
    const saida = html(h(Contato));
    expect(saida).toContain('690');
    expect(saida).toContain('97');
    expect(saida).toContain('100');
  });
});
