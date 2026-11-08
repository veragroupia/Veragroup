import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { suspend } from 'suspend-react';
import { MeshStandardMaterial } from 'three';
import { LARGURA_RUA, RECUO_FACHADA } from '../data/rua';
import { useEstado, type Qualidade } from '../estado';
import { Ambiente } from './Ambiente';
import { Carros } from './Carros';
import { Diretor, fovDoAspecto } from './Diretor';
import { Mapa } from './Mapa';
import { Pedestres } from './Pedestres';
import { Pinos } from './Pinos';
import { Pos } from './Pos';
import { Quarteiroes } from './Quarteiroes';
import { Reflexos } from './Reflexos';
import { lojaDoRegistro } from './registro';
import { Ritmo } from './Ritmo';
import { carregarFontesDaCena, texturaAsfalto } from './texturas';

const parametros = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const celular = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const dprForcado = Number(parametros.get('dpr')) || 0;
/** Resolução limitada: 1,5 no desktop e 1,25 no celular (lição da tentativa anterior). */
const DPR: Record<Qualidade, number> = dprForcado
  ? { alta: dprForcado, media: dprForcado, baixa: dprForcado }
  : { alta: celular ? 1.25 : 1.5, media: celular ? 1.25 : 1.25, baixa: 1 };

/** A rua principal é uma faixa só, contínua, com o asfalto molhado (reflexo do ambiente, sem redesenhar a cidade). */
function Asfalto() {
  const mats = useMemo(() => {
    const { cor, rugosidade } = texturaAsfalto();
    cor.repeat.set(8000 / 6, 1);
    rugosidade.repeat.set(8000 / 14, 1.4);
    return {
      asfalto: new MeshStandardMaterial({ map: cor, roughnessMap: rugosidade, roughness: 0.62, metalness: 0.32, envMapIntensity: 1.25 }),
      chao: new MeshStandardMaterial({ color: '#0d0e12', roughness: 1 }),
    };
  }, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} material={mats.asfalto} raycast={() => null}>
        <planeGeometry args={[8000, LARGURA_RUA + 0.4]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} material={mats.chao} raycast={() => null}>
        <planeGeometry args={[8000, 400]} />
      </mesh>
    </>
  );
}

/** Nome da loja sob o ponteiro, flutuando acima do pino. */
function RotuloHover() {
  const sobre = useEstado((s) => s.sobre);
  const l = sobre ? lojaDoRegistro(sobre) : undefined;
  if (!l) return null;
  return (
    <Html position={[l.x, l.altura + 3.6, l.lado * (RECUO_FACHADA + 1.2)]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
      <div className="rotulo-loja">{l.nome}</div>
    </Html>
  );
}

function Mundo() {
  suspend(carregarFontesDaCena, ['fontes-cena']);
  const momento = useEstado((s) => s.momento);
  const naMapa = momento === 'perto' || momento === 'contato';
  const qualidade = useEstado((s) => s.qualidade);
  const fraco = qualidade === 'baixa';
  return (
    <>
      <group visible={!naMapa}>
        <Asfalto />
        <Quarteiroes raio={celular || fraco ? 1 : 2} />
        <Reflexos />
        <Pinos />
        <Pedestres quantidade={fraco ? 14 : celular ? 22 : 34} />
        <Carros quantidade={fraco ? 4 : celular ? 6 : 10} />
        <RotuloHover />
      </group>
      <Mapa visivel={naMapa} />
    </>
  );
}

export default function Cena() {
  const aspecto = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1.6;
  const qualidade = useEstado((s) => s.qualidade);
  return (
    <Canvas
      className="cena-canvas"
      frameloop="demand"
      dpr={[1, DPR[qualidade]]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: fovDoAspecto(aspecto), near: 2.5, far: 520, position: [-30, 30, -40] }}
      onCreated={({ gl, scene }) => {
        gl.localClippingEnabled = true;
        if (import.meta.env.DEV) (window as unknown as { __vera: unknown }).__vera = { gl, scene };
      }}
      aria-hidden="true"
    >
      <Ambiente />
      <Suspense fallback={null}>
        <Mundo />
        <Diretor />
        <Ritmo />
        <Pos />
      </Suspense>
    </Canvas>
  );
}
