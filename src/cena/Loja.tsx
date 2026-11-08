import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { suspend } from 'suspend-react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  type Texture,
} from 'three';
import { easing } from 'maath';
import { RECUO_FACHADA, ALTURA_GUIA, LARGURA_CALCADA, type Lote } from '../data/rua';
import { relogio, useEstado } from '../estado';
import { construirLoja, construirTerreno } from './lojaGeo';
import { CORES, materiaisBase, materialAditivo, materialInterior, materialPoche, recortar } from './materiais';
import { texturaHalo, texturaInterior, texturaLetreiro, texturaMancha, texturaPersiana, texturaPino } from './texturas';
import { nivelDeLuz } from './luz';
import { ALTURA_CORTE, corte, raycastCortado, type Fileira } from './corte';
import type { Camada } from './kit';

const camadasSombra: Camada[] = ['pintura', 'concreto'];
const camadasMacicas: Camada[] = ['pintura', 'concreto', 'metal', 'tecido', 'escuro'];

export function posicaoNoMundo(l: Lote): { pos: [number, number, number]; rotY: number } {
  return l.lado === 'norte'
    ? { pos: [l.x, ALTURA_GUIA, RECUO_FACHADA], rotY: Math.PI }
    : { pos: [l.x, ALTURA_GUIA, -RECUO_FACHADA], rotY: 0 };
}

/** Uma malha por camada de material, recortada pela fileira; o miolo cortado aparece chapado (poché). */
export function Camadas({
  geos,
  fileira,
  sombra = true,
}: {
  geos: Partial<Record<Camada, BufferGeometry>>;
  fileira: Fileira;
  sombra?: boolean;
}) {
  const mats = materiaisBase(fileira);
  const poche = materialPoche(fileira);
  const raycast = useMemo(() => raycastCortado(fileira), [fileira]);
  const pocheRefs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const visivel = corte[fileira] > 0.002;
    for (const m of pocheRefs.current) if (m) m.visible = visivel;
  });
  const chaves = Object.keys(geos) as Camada[];
  return (
    <>
      {chaves.map((c) => (
        <mesh
          key={c}
          geometry={geos[c]}
          material={mats[c]}
          castShadow={sombra && camadasSombra.includes(c)}
          receiveShadow={c !== 'vidro' && c !== 'luzFixa'}
          renderOrder={c === 'vidro' ? 2 : 0}
          raycast={raycast}
        />
      ))}
      {chaves
        .filter((c) => camadasMacicas.includes(c))
        .map((c, i) => (
          <mesh
            key={'poche-' + c}
            ref={(m) => {
              pocheRefs.current[i] = m;
            }}
            geometry={geos[c]}
            material={poche}
            visible={false}
            raycast={() => null}
          />
        ))}
    </>
  );
}

let manchaTex: Texture | null = null;
let persianaTex: Texture | null = null;
let haloTex: Texture | null = null;

/** Marcador flutuante: pino de mapa com tamanho constante na tela, mais uma haste até o telhado. */
function Pino({
  lote,
  alturaBase,
  luzRef,
  fileira,
}: {
  lote: Lote;
  alturaBase: number;
  luzRef: { current: number };
  fileira: Fileira;
}) {
  const grupo = useRef<Group>(null);
  const sprite = useRef<Sprite>(null);
  const sobre = useEstado((s) => s.sobre === lote.id);
  const convite = useEstado((s) => s.convite);
  const conviteEm = useRef<number | null>(null);
  useEffect(() => {
    if (convite > 0) conviteEm.current = performance.now() / 1000;
  }, [convite]);
  const mat = useMemo(
    () =>
      new SpriteMaterial({
        map: texturaPino(lote.status === 'construcao' ? 'construcao' : 'perdendo'),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
      }),
    [lote.status],
  );
  const linhaObj = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));
    const m = new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false });
    return new Line(g, m);
  }, []);
  const estadoAtual = useRef<string>('');
  const camera = useThree((st) => st.camera);
  const alturaTela = useThree((st) => st.size.height);
  const tam = useRef(0);
  const baseCortada = ALTURA_CORTE - ALTURA_GUIA;

  useFrame((_, dt) => {
    if (!sprite.current || !grupo.current) return;
    const status = lote.status === 'construcao' ? 'construcao' : luzRef.current > 0.5 ? 'presente' : 'perdendo';
    if (status !== estadoAtual.current) {
      estadoAtual.current = status;
      mat.map = texturaPino(status);
      mat.needsUpdate = true;
    }
    // acompanha o corte: pino desce junto quando a loja vira planta
    const c = corte[fileira];
    const topo = Math.min(alturaBase, alturaBase + (baseCortada - alturaBase) * c);
    const y = topo + 2.2;
    sprite.current.position.y = y;
    linhaObj.position.y = topo + 0.15;
    linhaObj.scale.y = Math.max(0.01, y - topo - 0.2);
    // tamanho constante na tela (o círculo do pino fica com ~26 px; maior com o ponteiro em cima)
    let px = sobre ? 58 : 46;
    if (conviteEm.current !== null) {
      // onda que corre a rua de uma ponta à outra
      const tau = performance.now() / 1000 - conviteEm.current - (lote.x + 16) * 0.035;
      if (tau > 0 && tau < 0.7) px *= 1 + 0.45 * Math.sin((Math.PI * tau) / 0.7);
    }
    const alvo = ((px / alturaTela) * 2) / camera.projectionMatrix.elements[5];
    tam.current = tam.current ? tam.current + (alvo - tam.current) * Math.min(1, dt * 12) : alvo;
    sprite.current.scale.set(tam.current * 0.8, tam.current, 1);
  });

  return (
    <group ref={grupo} position={[0, 0, -1.2]}>
      <primitive object={linhaObj} />
      <sprite ref={sprite} material={mat} position={[0, alturaBase + 2.2, 0]} center={[0.5, 0.1]} scale={[0.01, 0.0125, 1]} renderOrder={10} />
      {sobre && (
        <Html position={[0, 0, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }} calculatePosition={(el, cam, size) => {
          const s = sprite.current;
          if (!s) return [0, 0];
          const v = s.getWorldPosition(el.position.clone()).project(cam);
          return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
        }}>
          <div className="rotulo-loja">{lote.nome}</div>
        </Html>
      )}
    </group>
  );
}

function useInteracao(lote: Lote) {
  const setSobre = useEstado((s) => s.setSobre);
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setSobre(lote.id);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setSobre(null);
      document.body.style.cursor = '';
    },
  };
}

export function Loja({ lote }: { lote: Lote }) {
  const geo = useMemo(() => construirLoja(lote), [lote]);
  const fileira: Fileira = lote.lado;
  const { pos, rotY } = posicaoNoMundo(lote);
  const elevar = useRef<Group>(null);
  const persiana = useRef<Mesh>(null);
  const luz = useRef(0);
  const sobre = useEstado((s) => s.sobre === lote.id);
  const acesaEm = useEstado((s) => s.acesasPeloVisitante[lote.id]);
  const interacao = useInteracao(lote);
  const raycast = useMemo(() => raycastCortado(fileira), [fileira]);

  const letreiroTex = suspend(async () => {
    if (!lote.letreiro || !geo.letreiro) return null;
    const t = await texturaLetreiro(lote.letreiro, geo.letreiro.w, geo.letreiro.h);
    if (geo.letreiro.disco) {
      // a tampa do cilindro gira o UV em 90°: desvira o logo
      for (const tex of [t.cor, t.brilho]) {
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI / 2;
      }
    }
    return t;
  }, ['letreiro', lote.id]);

  const mats = useMemo(() => {
    const r = <T,>(m: T): T => recortar(m, fileira);
    const interior = materialInterior(fileira);
    const fundoTex = lote.vitrine ? texturaInterior(lote.vitrine) : null;
    const fundo = r(
      new MeshStandardMaterial({
        map: fundoTex,
        emissiveMap: fundoTex,
        emissive: new Color('#ffffff'),
        emissiveIntensity: 0,
        roughness: 0.9,
        color: new Color('#555555'),
      }),
    );
    const letreiroFrente = r(
      new MeshStandardMaterial({
        map: letreiroTex?.cor ?? null,
        emissiveMap: letreiroTex?.brilho ?? null,
        emissive: new Color('#ffffff'),
        emissiveIntensity: 0,
        roughness: 0.5,
      }),
    );
    const letreiroLado = r(new MeshStandardMaterial({ color: new Color('#1d1f22'), roughness: 0.5, metalness: 0.5 }));
    const lampadas = r(new MeshBasicMaterial({ color: new Color('#000000') }));
    manchaTex ??= texturaMancha();
    const mancha = materialAditivo(CORES.vitrine, 0);
    mancha.map = manchaTex;
    persianaTex ??= texturaPersiana();
    persianaTex.repeat.set(1, 5);
    const persianaMat = r(new MeshStandardMaterial({ map: persianaTex, roughness: 0.55, metalness: 0.6 }));
    haloTex ??= texturaHalo();
    const halo = r(materialAditivo('#ffb05a', 0));
    halo.map = haloTex;
    return { interior, fundo, letreiroFrente, letreiroLado, lampadas, mancha, persiana: persianaMat, halo };
  }, [lote, letreiroTex, fileira]);

  const letreiroGeo = useMemo(() => {
    if (!geo.letreiro) return null;
    if (geo.letreiro.disco) {
      const g = new CylinderGeometry(geo.letreiro.w / 2, geo.letreiro.w / 2, 0.08, 48);
      g.rotateX(Math.PI / 2);
      return g;
    }
    return new BoxGeometry(geo.letreiro.w, geo.letreiro.h, 0.1);
  }, [geo]);

  const corLamp = useMemo(() => new Color('#ffd7a3'), []);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  useFrame((_, dt) => {
    const v = nivelDeLuz(lote, relogio.t, acesaEm);
    luz.current = v;
    const l = Math.max(0, v);
    mats.interior.emissiveIntensity = l * 3.0;
    mats.fundo.emissiveIntensity = l * 3.2;
    mats.halo.opacity = Math.min(1.1, l) * 0.42;
    mats.letreiroFrente.emissiveIntensity = l * (lote.letreiro?.estilo === 'logo' ? 1.3 : 2.6);
    mats.lampadas.color.copy(corLamp).multiplyScalar(0.06 + l * 5);
    mats.mancha.opacity = Math.min(1, l) * 0.55;
    if (persiana.current) {
      const aberta = Math.min(1, l);
      const h = geo.persiana!.h;
      const fator = 1 - aberta * 0.9;
      persiana.current.scale.y = fator;
      persiana.current.position.y = h - (h * fator) / 2;
    }
    if (elevar.current) {
      const alvo = sobre ? geo.altura * 0.025 * (1 - corte[fileira] * 0.6) : 0;
      easing.damp(elevar.current.position, 'y', alvo, 0.12, dt);
    }
  });

  // material do disco: frente com o logo, borda escura
  const materialLetreiro = geo.letreiro?.disco
    ? [mats.letreiroLado, mats.letreiroFrente, mats.letreiroLado]
    : [mats.letreiroLado, mats.letreiroLado, mats.letreiroLado, mats.letreiroLado, mats.letreiroFrente, mats.letreiroLado];

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <group ref={elevar} {...interacao}>
        <Camadas geos={geo.corpo} fileira={fileira} />
        <group name="frente">
          <Camadas geos={geo.frente} fileira={fileira} />
          {geo.persiana && (
            <mesh ref={persiana} position={geo.persiana.pos} material={mats.persiana} castShadow raycast={raycast}>
              <planeGeometry args={[geo.persiana.w, geo.persiana.h]} />
            </mesh>
          )}
        </group>
        <mesh geometry={geo.interior} material={mats.interior} raycast={raycast} />
        <mesh position={geo.halo.pos} material={mats.halo} renderOrder={3} raycast={() => null}>
          <planeGeometry args={[geo.halo.w, geo.halo.h]} />
        </mesh>
        <mesh position={geo.fundo.pos} material={mats.fundo} raycast={raycast}>
          <planeGeometry args={[geo.fundo.w, geo.fundo.h]} />
        </mesh>
        {geo.lampadas && <mesh geometry={geo.lampadas} material={mats.lampadas} raycast={raycast} />}
        {letreiroGeo && geo.letreiro && (
          <mesh geometry={letreiroGeo} material={materialLetreiro} position={geo.letreiro.pos} castShadow raycast={raycast} />
        )}
        <Pino lote={lote} alturaBase={geo.altura} luzRef={luz} fileira={fileira} />
      </group>
      {/* luz da vitrine derramando na calçada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, LARGURA_CALCADA / 2 + 0.2]} material={mats.mancha} renderOrder={3} raycast={() => null}>
        <planeGeometry args={[lote.largura * 1.15, LARGURA_CALCADA + 0.6]} />
      </mesh>
    </group>
  );
}

export function Terreno({ lote }: { lote: Lote }) {
  const geo = useMemo(() => construirTerreno(lote), [lote]);
  const fileira: Fileira = lote.lado;
  const { pos, rotY } = posicaoNoMundo(lote);
  const elevar = useRef<Group>(null);
  const luz = useRef(0);
  const sobre = useEstado((s) => s.sobre === lote.id);
  const interacao = useInteracao(lote);
  const lampMat = useMemo(() => recortar(new MeshBasicMaterial({ color: new Color('#ffcf8a').multiplyScalar(3.2) }), fileira), [fileira]);
  const mancha = useMemo(() => {
    manchaTex ??= texturaMancha();
    const m = materialAditivo('#ffb347', 0.22);
    m.map = manchaTex;
    return m;
  }, []);
  useFrame((_, dt) => {
    if (elevar.current) easing.damp(elevar.current.position, 'y', sobre ? 0.12 : 0, 0.12, dt);
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <group ref={elevar} {...interacao}>
        <Camadas geos={geo.corpo} fileira={fileira} />
        {geo.lampadas && <mesh geometry={geo.lampadas} material={lampMat} />}
        {/* área de toque do terreno inteiro */}
        <mesh position={[0, 1.2, -2.5]} visible={false}>
          <boxGeometry args={[lote.largura, 2.4, 5]} />
        </mesh>
        <Pino lote={lote} alturaBase={2.6} luzRef={luz} fileira={fileira} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.6, 0.012, 1.4]} material={mancha} renderOrder={3} raycast={() => null}>
        <planeGeometry args={[4.5, 3.4]} />
      </mesh>
      <pointLight position={geo.luzObra} color="#ffb867" intensity={6} distance={9} decay={2} />
    </group>
  );
}
