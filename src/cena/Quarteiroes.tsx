import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdditiveBlending, Color, type BufferGeometry, type Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { relogio, useEstado } from '../estado';
import { corte, planos, raycastCortado, type Fileira } from './corte';
import { montarQuarteirao, montarRua, type GeoQuarteirao, type GeoRua } from './geoQuarteirao';
import type { Camada } from './kit';
import { degrau, ENTRADA } from './luz';
import { CORES, MAX_LOJAS, materiaisBase, materialPoche, materialPorLoja, recortar, type MaterialPorLoja } from './materiais';
import {
  acesasDoQuarteirao,
  centroDoQuarteirao,
  idGenerico,
  lotesDaVariante,
  N_VARIANTES,
  PERIODO,
  quarteiraoDoX,
  varianteDo,
} from './quarteiroes';
import { registrar, remover, type LojaMundo } from './registro';
import { atlasInteriores, texturaCalcada, texturaHalo, texturaRadial } from './texturas';
import { Central } from './Central';

const camadasSombra: Camada[] = []; // sem sombras em tempo real: tudo assado
const camadasMacicas: Camada[] = ['pintura', 'concreto', 'metal', 'tecido', 'escuro'];

/* ——— variantes: montadas uma vez, no tempo ocioso, e recicladas ——— */
type GeoVariante = { norte: GeoQuarteirao; sul: GeoQuarteirao };
const variantes = new Map<number, GeoVariante>();
const esperando = new Map<number, Promise<GeoVariante>>();

function ocioso(): Promise<void> {
  return new Promise((ok) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => ok(), { timeout: 600 });
    else setTimeout(ok, 30);
  });
}

export function prepararVariante(v: number): Promise<GeoVariante> {
  const pronta = variantes.get(v);
  if (pronta) return Promise.resolve(pronta);
  const emCurso = esperando.get(v);
  if (emCurso) return emCurso;
  const p = (async () => {
    await ocioso();
    const lotes = lotesDaVariante(v);
    const norte = montarQuarteirao(lotes.filter((l) => l.lado === 'norte'));
    await ocioso();
    const sul = montarQuarteirao(lotes.filter((l) => l.lado === 'sul'));
    const g = { norte, sul };
    variantes.set(v, g);
    return g;
  })();
  esperando.set(v, p);
  return p;
}

function useVariante(v: number) {
  const [g, setG] = useState<GeoVariante | null>(() => variantes.get(v) ?? null);
  useEffect(() => {
    let vivo = true;
    void prepararVariante(v).then((x) => vivo && setG(x));
    return () => {
      vivo = false;
    };
  }, [v]);
  return g;
}

let ruaCache: GeoRua | null = null;
export const geometriaDaRua = () => (ruaCache ??= montarRua());

/* ——— materiais por quarteirão: cada loja acende pelo seu índice ——— */
export interface MateriaisBloco {
  interior: MaterialPorLoja;
  fundos: MaterialPorLoja;
  letreiros: MaterialPorLoja;
  halos: MaterialPorLoja;
  lampadas: MaterialPorLoja;
}

let haloTex: ReturnType<typeof texturaHalo> | null = null;

export function criarMateriaisBloco(fileira: Fileira, atlas: GeoQuarteirao['atlas'], uLuz: Float32Array): MateriaisBloco {
  const pl = [planos[fileira]];
  haloTex ??= texturaHalo();
  const m: MateriaisBloco = {
    interior: materialPorLoja({ base: 0.02, ganho: 2.4, corVertice: true, planos: pl, chave: 'interior' }),
    fundos: materialPorLoja({ base: 0.03, ganho: 2.6, mapa: atlasInteriores().textura, planos: pl, chave: 'fundos' }),
    letreiros: materialPorLoja({ base: 0.2, ganho: 2.5, mapa: atlas, planos: pl, chave: 'letreiros' }),
    halos: materialPorLoja({ base: 0, ganho: 0.42, mapa: haloTex, aditivo: true, cor: '#ffbf7a', planos: pl, chave: 'halos' }),
    lampadas: materialPorLoja({ base: 0.05, ganho: 5, corVertice: true, planos: pl, chave: 'lampadas' }),
  };
  for (const mat of Object.values(m)) mat.userData.uLuz.value = uLuz;
  return m;
}

/** Uma fileira de um quarteirão: camadas estáticas + camadas que acendem por loja + alvos de toque. */
export function BlocoFileira({
  geo,
  fileira,
  mats,
  idDoIndice,
}: {
  geo: GeoQuarteirao;
  fileira: Fileira;
  mats: MateriaisBloco;
  idDoIndice: (i: number) => string | null;
}) {
  const base = materiaisBase(fileira, [planos[fileira]]);
  const poche = materialPoche(fileira, [planos[fileira]]);
  const raycast = useMemo(() => raycastCortado(fileira), [fileira]);
  const pocheRefs = useRef<(Mesh | null)[]>([]);
  const setSobre = useEstado((s) => s.setSobre);
  const abrirLoja = useEstado((s) => s.abrirLoja);
  const sobreAtual = useRef<string | null>(null);

  useFrame(() => {
    const v = corte[fileira] > 0.002;
    for (const m of pocheRefs.current) if (m) m.visible = v;
  });

  const idDoEvento = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const geom = (e.object as Mesh).geometry as BufferGeometry;
    const a = e.face?.a;
    if (a === undefined) return null;
    return idDoIndice(Math.round(geom.getAttribute('loja').getX(a)));
  };

  const chaves = Object.keys(geo.estaticas) as Camada[];
  return (
    <group>
      {chaves.map((c) => (
        <mesh key={c} geometry={geo.estaticas[c]} material={base[c]} raycast={() => null} renderOrder={c === 'vidro' ? 2 : 0} castShadow={camadasSombra.includes(c)} />
      ))}
      {chaves
        .filter((c) => camadasMacicas.includes(c))
        .map((c, i) => (
          <mesh
            key={'p' + c}
            ref={(m) => {
              pocheRefs.current[i] = m;
            }}
            geometry={geo.estaticas[c]}
            material={poche}
            visible={false}
            raycast={() => null}
          />
        ))}
      {geo.interior && <mesh geometry={geo.interior} material={mats.interior} raycast={() => null} />}
      {geo.fundos && <mesh geometry={geo.fundos} material={mats.fundos} raycast={() => null} />}
      {geo.letreiros && <mesh geometry={geo.letreiros} material={mats.letreiros} raycast={() => null} />}
      {geo.lampadas && <mesh geometry={geo.lampadas} material={mats.lampadas} raycast={() => null} />}
      {geo.halos && <mesh geometry={geo.halos} material={mats.halos} raycast={() => null} renderOrder={3} />}
      {geo.alvos && (
        <mesh
          geometry={geo.alvos}
          visible={false}
          raycast={raycast}
          onPointerMove={(e) => {
            e.stopPropagation();
            const id = idDoEvento(e);
            if (id !== sobreAtual.current) {
              sobreAtual.current = id;
              setSobre(id);
              document.body.style.cursor = id ? 'pointer' : '';
            }
          }}
          onPointerOut={() => {
            sobreAtual.current = null;
            setSobre(null);
            document.body.style.cursor = '';
          }}
          onClick={(e) => {
            e.stopPropagation();
            const id = idDoEvento(e);
            if (id) abrirLoja(id);
          }}
        />
      )}
    </group>
  );
}

/** Calçadas, postes, faixas, transversal e poças de luz de um quarteirão. */
function PecasDaRua({ x }: { x: number }) {
  const g = geometriaDaRua();
  const mats = useMemo(() => {
    const calc = texturaCalcada();
    const radial = texturaRadial(0.25);
    const base = materiaisBase('livre');
    const calcada = base.concreto.clone() as MeshStandardMaterial;
    calcada.map = calc;
    calcada.vertexColors = true;
    calcada.onBeforeCompile = (base.concreto as MeshStandardMaterial).onBeforeCompile;
    calcada.customProgramCacheKey = () => 'calcada-luz-assada';
    const lampadas = new MeshBasicMaterial({ color: new Color(CORES.sodio).multiplyScalar(7) });
    const pocas = new MeshBasicMaterial({ map: radial, color: new Color(CORES.sodio).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: AdditiveBlending });
    const transversal = new MeshStandardMaterial({ color: '#121418', roughness: 0.75, metalness: 0.15 });
    const faixas = recortar(new MeshStandardMaterial({ color: '#8d8b86', roughness: 0.9 }));
    return { calcada, concreto: base.concreto, metal: base.metal, lampadas, pocas, transversal, faixas };
  }, []);
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={g.calcadas} material={mats.calcada} raycast={() => null} />
      {g.concreto && <mesh geometry={g.concreto} material={mats.concreto} raycast={() => null} />}
      {g.metal && <mesh geometry={g.metal} material={mats.metal} raycast={() => null} />}
      {g.lampadas && <mesh geometry={g.lampadas} material={mats.lampadas} raycast={() => null} />}
      {g.faixas && <mesh geometry={g.faixas} material={mats.faixas} raycast={() => null} />}
      <mesh geometry={g.transversal} material={mats.transversal} raycast={() => null} />
      <mesh geometry={g.pocasDeLuz} material={mats.pocas} raycast={() => null} renderOrder={1} />
    </group>
  );
}

/** Um quarteirão genérico (não o central): lojas recicladas de uma variante, luzes por índice. */
function QuarteiraoGenerico({ k }: { k: number }) {
  const v = varianteDo(k);
  const geo = useVariante(v);
  const x0 = centroDoQuarteirao(k);
  const uLuz = useMemo(() => new Float32Array(MAX_LOJAS), []);
  const acesasPeloVisitante = useEstado((s) => s.acesasPeloVisitante);

  const dados = useMemo(() => {
    if (!geo) return null;
    const todas = [...geo.norte.lojas, ...geo.sul.lojas];
    const acesas = acesasDoQuarteirao(k, todas.length);
    const lojas: LojaMundo[] = todas.map((l) => ({
      id: idGenerico(k, l.indice),
      nome: l.nome,
      segmento: l.segmento,
      tipo: 'generica',
      lado: l.lado,
      x: x0 + l.xLocal,
      largura: l.largura,
      altura: l.altura,
      xPorta: x0 + l.xPortaLocal,
      acesaBase: acesas.has(l.indice),
      luz: 0,
    }));
    // na entrada, as lojas acesas do bairro acendem em cascata
    const atraso = lojas.map((_, i) => ENTRADA.primeiraLoja + 1.1 + ((i * 0.37 + Math.abs(k) * 0.21) % 1.4));
    return { lojas, atraso, indices: todas.map((l) => l.indice) };
  }, [geo, k, x0]);

  const mats = useMemo(() => {
    if (!geo) return null;
    return { norte: criarMateriaisBloco('norte', geo.norte.atlas, uLuz), sul: criarMateriaisBloco('sul', geo.sul.atlas, uLuz) };
  }, [geo, uLuz]);

  useEffect(() => {
    if (!dados) return;
    registrar(dados.lojas);
    return () => remover(dados.lojas.map((l) => l.id));
  }, [dados]);

  useEffect(
    () => () => {
      if (mats) for (const f of [mats.norte, mats.sul]) for (const m of Object.values(f)) m.dispose();
    },
    [mats],
  );

  useFrame(() => {
    if (!dados || !geo) return;
    const t = relogio.t;
    dados.lojas.forEach((l, i) => {
      const indice = dados.indices[i];
      const visitante = acesasPeloVisitante[l.id];
      let nivel = 0;
      if (visitante !== undefined) nivel = degrau(t - visitante);
      else if (l.acesaBase) nivel = degrau(t - dados.atraso[i]);
      uLuz[indice] = nivel;
      l.luz = nivel;
    });
  });

  if (!geo || !mats || !dados) return null;
  const idDoIndice = (i: number) => idGenerico(k, i);
  return (
    <group position={[x0, 0, 0]}>
      <BlocoFileira geo={geo.norte} fileira="norte" mats={mats.norte} idDoIndice={idDoIndice} />
      <BlocoFileira geo={geo.sul} fileira="sul" mats={mats.sul} idDoIndice={idDoIndice} />
    </group>
  );
}

/** Gerente da rua infinita: mantém os quarteirões em volta da câmera e recicla o resto. */
export function Quarteiroes({ raio }: { raio: number }) {
  const camera = useThree((s) => s.camera);
  const controles = useThree((s) => s.controls) as unknown as { getTarget?: (v: import('three').Vector3) => import('three').Vector3 } | null;
  const [kc, setKc] = useState(0);
  const alvo = useMemo(() => new (camera.position.constructor as typeof import('three').Vector3)(), [camera]);

  useEffect(() => {
    // monta as variantes cedo, uma por vez, no tempo ocioso
    for (let v = 0; v < N_VARIANTES; v++) void prepararVariante(v);
  }, []);

  useFrame(() => {
    // no mapa (longe da rua) a rua fica como estava: não desmonta o quarteirão central
    const m = useEstado.getState().momento;
    if (m === 'perto' || m === 'contato') return;
    const x = controles?.getTarget ? controles.getTarget(alvo).x : camera.position.x;
    const k = quarteiraoDoX(x);
    if (k !== kc) setKc(k);
  });

  const indices: number[] = [];
  for (let k = kc - raio; k <= kc + raio; k++) indices.push(k);
  return (
    <group>
      {indices.map((k) => (
        <group key={k}>
          <PecasDaRua x={centroDoQuarteirao(k)} />
          {k === 0 ? <Central /> : <QuarteiraoGenerico k={k} />}
        </group>
      ))}
    </group>
  );
}

export { PERIODO };
