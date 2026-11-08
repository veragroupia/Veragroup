import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { suspend } from 'suspend-react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  type Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import { easing } from 'maath';
import { erk, voneis } from '../data/cases';
import { SEGMENTO_DO_LOTE, type Lote } from '../data/rua';
import { relogio, useEstado } from '../estado';
import { assarPostes } from './assar';
import { cortarLoja, planoDaLoja, planos, raycastCortadoLoja, type Fileira } from './corte';
import { matrizDaLoja, postesLocais } from './geoQuarteirao';
import { construirLoja } from './lojaGeo';
import type { Camada } from './kit';
import { nivelDeLuz } from './luz';
import { materiaisBase, materialAditivo, materialInterior, materialPoche, recortar } from './materiais';
import { registrar, remover, type LojaMundo } from './registro';
import { texturaHalo, texturaInterior, texturaLetreiro } from './texturas';
import { Corrente } from './Corrente';
import { Celular } from './Celular';

const macicas: Camada[] = ['pintura', 'concreto', 'metal', 'tecido', 'escuro'];

export function Camadas({
  geos,
  chave,
  planosCorte,
  raycast,
}: {
  geos: Partial<Record<Camada, BufferGeometry>>;
  chave: string;
  planosCorte: import('three').Plane[];
  raycast?: import('three').Mesh['raycast'];
}) {
  const mats = materiaisBase(chave, planosCorte);
  const poche = materialPoche(chave, planosCorte);
  const chaves = Object.keys(geos) as Camada[];
  return (
    <>
      {chaves.map((c) => (
        <mesh key={c} geometry={geos[c]} material={mats[c]} renderOrder={c === 'vidro' ? 2 : 0} raycast={raycast} />
      ))}
      {chaves
        .filter((c) => macicas.includes(c))
        .map((c) => (
          <mesh key={'p' + c} geometry={geos[c]} material={poche} raycast={() => null} />
        ))}
    </>
  );
}

const carregador = new TextureLoader();

/** Fotos reais dos doces viram cartões em pé sobre a vitrine da Vó Neis. */
function Doces({ fotos, planosCorte }: { fotos: string[]; planosCorte: import('three').Plane[] }) {
  const mats = useMemo(
    () =>
      fotos.map((f) => {
        const t = carregador.load(f);
        t.colorSpace = SRGBColorSpace;
        return recortar(new MeshBasicMaterial({ map: t }), planosCorte);
      }),
    [fotos, planosCorte],
  );
  const moldura = useMemo(() => recortar(new MeshBasicMaterial({ color: '#f3ece2' }), planosCorte), [planosCorte]);
  return (
    <group position={[-0.4, 1.56, -2.0]}>
      {mats.map((m, i) => {
        const fila = i < 3 ? 0 : 1;
        const x = -0.98 + (i % 3) * 0.98;
        return (
          <group key={i} position={[x, fila * 0.02, fila * -0.34 + 0.12]} rotation={[-0.62, 0, 0]}>
            <mesh material={moldura} position={[0, 0.3, -0.004]} raycast={() => null}>
              <planeGeometry args={[0.6, 0.76]} />
            </mesh>
            <mesh material={m} position={[0, 0.3, 0]} raycast={() => null}>
              <planeGeometry args={[0.54, 0.7]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function LojaCase({ lote }: { lote: Lote }) {
  const fileira: Fileira = lote.lado;
  const id = lote.id;
  const caseId = lote.caseId!;
  const planosCorte = useMemo(() => [planos[fileira], planoDaLoja(id)], [fileira, id]);
  const chave = `loja:${id}`;
  const matriz = useMemo(() => matrizDaLoja(lote.x, lote.lado), [lote]);
  const geo = useMemo(() => {
    const g = construirLoja(lote);
    const postes = postesLocais();
    for (const conj of [g.corpo, g.frente, g.frenteD])
      for (const [c, geom] of Object.entries(conj) as [Camada, BufferGeometry][])
        if (c === 'pintura' || c === 'concreto' || c === 'metal' || c === 'tecido') assarPostes(geom, postes, matriz);
    return g;
  }, [lote, matriz]);

  const elevar = useRef<Group>(null);
  const frenteE = useRef<Group>(null);
  const frenteD = useRef<Group>(null);
  const luzInterna = useRef<import('three').PointLight>(null);
  const abertura = useRef(0);
  const nivel = useRef(0);
  const sobre = useEstado((s) => s.sobre === id);
  const aberta = useEstado((s) => s.caso === caseId);
  const montador = useEstado((s) => s.montador);
  const irPara = useEstado((s) => s.irPara);
  const setSobre = useEstado((s) => s.setSobre);
  const raycast = useMemo(() => raycastCortadoLoja(fileira, id), [fileira, id]);

  const letreiroTex = suspend(async () => {
    if (!lote.letreiro || !geo.letreiro) return null;
    const t = await texturaLetreiro(lote.letreiro, geo.letreiro.w, geo.letreiro.h);
    if (geo.letreiro.disco)
      for (const tex of [t.cor, t.brilho]) {
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI / 2;
      }
    return t;
  }, ['letreiro-case', id]);

  const mats = useMemo(() => {
    const r = <T,>(m: T): T => recortar(m, planosCorte);
    const interior = materialInterior(planosCorte);
    const fundoTex = lote.vitrine ? texturaInterior(lote.vitrine) : null;
    const fundo = r(new MeshStandardMaterial({ map: fundoTex, emissiveMap: fundoTex, emissive: new Color('#ffffff'), emissiveIntensity: 0, roughness: 0.9, color: new Color('#555555') }));
    const letreiroFrente = r(new MeshStandardMaterial({ map: letreiroTex?.cor ?? null, emissiveMap: letreiroTex?.brilho ?? null, emissive: new Color('#ffffff'), emissiveIntensity: 0, roughness: 0.5 }));
    const letreiroLado = r(new MeshStandardMaterial({ color: new Color('#1d1f22'), roughness: 0.5, metalness: 0.5 }));
    const lampadas = r(new MeshBasicMaterial({ color: new Color('#000000') }));
    const halo = r(materialAditivo('#ffbf7a', 0));
    halo.map = texturaHalo();
    return { interior, fundo, letreiroFrente, letreiroLado, lampadas, halo };
  }, [lote, letreiroTex, planosCorte]);

  const letreiroGeo = useMemo(() => {
    if (!geo.letreiro) return null;
    if (geo.letreiro.disco) {
      const g = new CylinderGeometry(geo.letreiro.w / 2, geo.letreiro.w / 2, 0.08, 48);
      g.rotateX(Math.PI / 2);
      return g;
    }
    return new BoxGeometry(geo.letreiro.w, geo.letreiro.h, 0.1);
  }, [geo]);

  const registro = useMemo<LojaMundo>(() => {
    const lado: 1 | -1 = lote.lado === 'norte' ? 1 : -1;
    const portaLocal = geo.vao.w / 2 - 0.25 - 0.525;
    return {
      id,
      nome: lote.nome,
      segmento: SEGMENTO_DO_LOTE[lote.segmento],
      tipo: 'case',
      lado,
      x: lote.x,
      largura: lote.largura,
      altura: geo.altura,
      xPorta: lote.x + (lado === 1 ? -portaLocal : portaLocal),
      acesaBase: true,
      caseId,
      luz: 0,
    };
  }, [lote, geo, id, caseId]);

  useEffect(() => {
    registrar([registro]);
    return () => remover([id]);
  }, [registro, id]);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const corLamp = useMemo(() => new Color('#ffd7a3'), []);

  useFrame((_, dt) => {
    const v = Math.max(0, nivelDeLuz(lote, relogio.t));
    nivel.current = v;
    registro.luz = v;
    const ab = abertura.current;
    // aberta, a loja fica mais contida: a luz de dentro passa a vir da luminária, não do brilho
    mats.interior.emissiveIntensity = v * (2.6 - 1.85 * ab);
    mats.fundo.emissiveIntensity = v * (2.8 - 1.9 * ab);
    mats.letreiroFrente.emissiveIntensity = v * (lote.letreiro?.estilo === 'logo' ? 1.3 : 2.6);
    mats.lampadas.color.copy(corLamp).multiplyScalar(0.06 + v * 5);
    mats.halo.opacity = Math.min(1.1, v) * 0.42 * (1 - ab);
    // abrir: a frente desliza para a frente e para os lados, e o corte desce até o térreo
    const alvo = aberta ? 1 : 0;
    abertura.current = relogio.semMovimento ? alvo : abertura.current + (alvo - abertura.current) * (1 - Math.exp(-dt * 3.2));
    const a = abertura.current;
    cortarLoja(id, a);
    if (frenteE.current) frenteE.current.position.set(-1.7 * a, 0, 1.5 * a);
    if (frenteD.current) frenteD.current.position.set(1.7 * a, 0, 1.5 * a);
    if (luzInterna.current) luzInterna.current.intensity = a * 3.2 * Math.max(0.3, v);
    if (elevar.current) easing.damp(elevar.current.position, 'y', sobre && !aberta ? geo.altura * 0.025 : 0, 0.12, dt);
  });

  const interacao = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setSobre(id);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setSobre(null);
      document.body.style.cursor = '';
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      irPara('trabalhos', caseId);
    },
  };

  const matLetreiro = geo.letreiro?.disco
    ? [mats.letreiroLado, mats.letreiroFrente, mats.letreiroLado]
    : [mats.letreiroLado, mats.letreiroLado, mats.letreiroLado, mats.letreiroLado, mats.letreiroFrente, mats.letreiroLado];
  const ladoTela = lote.lado === 'norte' ? 1 : -1;

  return (
    <group position={[lote.x, matriz.elements[13], lote.lado === 'norte' ? matriz.elements[14] : matriz.elements[14]]} rotation={[0, lote.lado === 'norte' ? Math.PI : 0, 0]}>
      <group ref={elevar} {...interacao}>
        <Camadas geos={geo.corpo} chave={chave} planosCorte={planosCorte} raycast={raycast} />
        <group ref={frenteE}>
          <Camadas geos={geo.frente} chave={chave} planosCorte={planosCorte} raycast={raycast} />
        </group>
        <group ref={frenteD}>
          <Camadas geos={geo.frenteD} chave={chave} planosCorte={planosCorte} raycast={raycast} />
        </group>
        <mesh geometry={geo.interior} material={mats.interior} />
        <mesh position={geo.fundo.pos} material={mats.fundo}>
          <planeGeometry args={[geo.fundo.w, geo.fundo.h]} />
        </mesh>
        <mesh position={geo.halo.pos} material={mats.halo} renderOrder={3} raycast={() => null}>
          <planeGeometry args={[geo.halo.w, geo.halo.h]} />
        </mesh>
        {geo.lampadas && <mesh geometry={geo.lampadas} material={mats.lampadas} />}
        {letreiroGeo && geo.letreiro && <mesh geometry={letreiroGeo} material={matLetreiro} position={geo.letreiro.pos} />}
        <pointLight ref={luzInterna} position={[0, 2.8, -2.2]} color="#ffd29a" intensity={0} distance={7} decay={2} />
        {caseId === 'erk' && <Corrente peca={montador} posicao={[-0.3, 1.03, -2.2]} visivel={1} />}
        {caseId === 'voneis' && <Doces fotos={voneis.vitrine} planosCorte={planosCorte} />}
      </group>
      <CelularDoCase caseId={caseId} largura={lote.largura} lado={ladoTela} aberturaRef={abertura} />
    </group>
  );
}

/** Celular flutuando ao lado da loja aberta, com as telas reais. */
function CelularDoCase({ caseId, largura, aberturaRef }: { caseId: 'erk' | 'voneis'; largura: number; lado: number; aberturaRef: { current: number } }) {
  const telas = (caseId === 'erk' ? erk.telas : voneis.telas).filter((t) => t.formato === 'celular').map((t) => t.src);
  // fica "visível" mesmo fechado (só com escala quase zero): assim o shader da tela compila junto com o
  // resto nos primeiros quadros, atrás do pôster, em vez de travar a animação de abrir a loja
  return (
    <group>
      <CelularAnimado telas={telas} posicao={[largura / 2 + 1.9, 2.5, 0.9]} aberturaRef={aberturaRef} />
    </group>
  );
}

function CelularAnimado({ telas, posicao, aberturaRef }: { telas: string[]; posicao: [number, number, number]; aberturaRef: { current: number } }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.scale.setScalar(Math.max(0.0001, aberturaRef.current));
  });
  return (
    <group ref={ref}>
      <Celular telas={telas} posicao={posicao} rotY={-0.35} visivel={1} />
    </group>
  );
}
