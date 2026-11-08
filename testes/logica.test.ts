import { describe, expect, it } from 'vitest';
import { arredondarEstimativa, clientesPerdidos, perdaMensal } from '../src/lib/calculadora';
import { lerHash, montarHash } from '../src/rotas';

describe('calculadora de perda', () => {
  const p = { procuras: 200, ticket: 50, desistem: 40, fechamento: 25 };
  it('procuras × desistem × fechamento × ticket', () => {
    expect(clientesPerdidos(p)).toBeCloseTo(20);
    expect(perdaMensal(p)).toBe(1000);
  });
  it('zero procuras = zero perda', () => {
    expect(perdaMensal({ ...p, procuras: 0 })).toBe(0);
  });
  it('arredonda sem fingir precisão', () => {
    expect(arredondarEstimativa(437)).toBe(440);
    expect(arredondarEstimativa(1234)).toBe(1200);
    expect(arredondarEstimativa(98760)).toBe(98800);
  });
});

describe('rotas por hash', () => {
  it.each([
    ['', { momento: 'cidade', caso: null, loja: null }],
    ['#trabalhos', { momento: 'trabalhos', caso: null, loja: null }],
    ['#trabalhos/erk', { momento: 'trabalhos', caso: 'erk', loja: null }],
    ['#/trabalhos/voneis', { momento: 'trabalhos', caso: 'voneis', loja: null }],
    ['#trabalhos/inexistente', { momento: 'trabalhos', caso: null, loja: null }],
    ['#sua-loja', { momento: 'sua-loja', caso: null, loja: null }],
    ['#perto', { momento: 'perto', caso: null, loja: null }],
    ['#contato', { momento: 'contato', caso: null, loja: null }],
    ['#loja/oficina', { momento: 'cidade', caso: null, loja: 'oficina' }],
    ['#qualquer-coisa', { momento: 'cidade', caso: null, loja: null }],
  ])('%s', (hash, esperado) => {
    expect(lerHash(hash)).toEqual(esperado);
  });
  it('ida e volta', () => {
    expect(montarHash('trabalhos', 'erk', null)).toBe('#trabalhos/erk');
    expect(montarHash('cidade', null, null)).toBe('');
    expect(montarHash('cidade', null, 'oficina')).toBe('#loja/oficina');
  });
});
