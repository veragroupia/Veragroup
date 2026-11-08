import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { lotes, SEGMENTO_DO_LOTE } from '../data/rua';
import { relogio, useEstado } from '../estado';
import { montarQuarteirao } from './geoQuarteirao';
import { degrau, nivelDeLuz } from './luz';
import { MAX_LOJAS } from './materiais';
import { lotesComplementaresCentrais, type LoteGerado } from './quarteiroes';
import { registrar, remover, type LojaMundo } from './registro';
import { BlocoFileira, criarMateriaisBloco } from './Quarteiroes';
import { LojaCase } from './LojaCase';
import { TerrenoVisitante } from './TerrenoVisitante';

/**
 * O quarteirão 0: ERK e Vó Neis (lojas que abrem), o lote vazio (a loja do visitante)
 * e as lojas apagadas em volta, mescladas como num quarteirão genérico.
 */
export function Central() {
  const acesasPeloVisitante = useEstado((s) => s.acesasPeloVisitante);

  const dados = useMemo(() => {
    const curados = lotes.filter((l) => !l.caseId && l.status !== 'construcao');
    const comuns: LoteGerado[] = curados.map((l, i) => ({ ...l, indice: i, segmentoId: SEGMENTO_DO_LOTE[l.segmento] }));
    const extras = lotesComplementaresCentrais().map((l, i) => ({ ...l, indice: comuns.length + i, id: `c${i}` }));
    const todos = [...comuns, ...extras].slice(0, MAX_LOJAS);
    const norte = montarQuarteirao(todos.filter((l) => l.lado === 'norte'));
    const sul = montarQuarteirao(todos.filter((l) => l.lado === 'sul'));
    const porIndice = new Map(todos.map((l) => [l.indice, l]));
    const lojas: LojaMundo[] = [...norte.lojas, ...sul.lojas].map((l) => ({
      id: porIndice.get(l.indice)!.id,
      nome: l.nome,
      segmento: l.segmento,
      tipo: 'generica',
      lado: l.lado,
      x: l.xLocal,
      largura: l.largura,
      altura: l.altura,
      xPorta: l.xPortaLocal,
      acesaBase: porIndice.get(l.indice)!.status === 'presente',
      luz: 0,
    }));
    return { norte, sul, lojas, porIndice, indices: [...norte.lojas, ...sul.lojas].map((l) => l.indice) };
  }, []);

  const uLuz = useMemo(() => new Float32Array(MAX_LOJAS), []);
  const mats = useMemo(
    () => ({ norte: criarMateriaisBloco('norte', dados.norte.atlas, uLuz), sul: criarMateriaisBloco('sul', dados.sul.atlas, uLuz) }),
    [dados, uLuz],
  );

  useEffect(() => {
    registrar(dados.lojas);
    return () => remover(dados.lojas.map((l) => l.id));
  }, [dados]);

  useFrame(() => {
    const t = relogio.t;
    dados.lojas.forEach((l, i) => {
      const indice = dados.indices[i];
      const lote = dados.porIndice.get(indice)!;
      const visitante = acesasPeloVisitante[l.id];
      const nivel = visitante !== undefined ? degrau(t - visitante) : nivelDeLuz(lote, t);
      uLuz[indice] = nivel;
      l.luz = nivel;
    });
  });

  const idDoIndice = (i: number) => dados.porIndice.get(i)?.id ?? null;
  const cases = lotes.filter((l) => l.caseId);
  const terreno = lotes.find((l) => l.status === 'construcao');

  return (
    <group>
      <BlocoFileira geo={dados.norte} fileira="norte" mats={mats.norte} idDoIndice={idDoIndice} />
      <BlocoFileira geo={dados.sul} fileira="sul" mats={mats.sul} idDoIndice={idDoIndice} />
      {cases.map((l) => (
        <LojaCase key={l.id} lote={l} />
      ))}
      {terreno && <TerrenoVisitante lote={terreno} />}
    </group>
  );
}
