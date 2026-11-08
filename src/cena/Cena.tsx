import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { suspend } from 'suspend-react';
import { lotes } from '../data/rua';
import { relogio, useEstado, type Qualidade } from '../estado';
import { Ambiente } from './Ambiente';
import { Controles, enquadramento } from './Controles';
import { Loja, Terreno } from './Loja';
import { Pos } from './Pos';
import { Reflexos } from './Reflexos';
import { Rua } from './Rua';
import { ENTRADA } from './luz';
import { carregarFontesDaCena } from './texturas';

const celular = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const dprForcado = Number(new URLSearchParams(typeof location !== 'undefined' ? location.search : '').get('dpr')) || 0;
const DPR_MAX = dprForcado || (celular ? 1.75 : 2);
const DPR: Record<Qualidade, number> = dprForcado
  ? { alta: dprForcado, media: dprForcado, baixa: dprForcado }
  : { alta: DPR_MAX, media: Math.min(1.5, DPR_MAX), baixa: 1 };

/** Avança o relógio da cena e avisa o HTML quando o primeiro quadro saiu e quando a entrada acabou. */
function Relogio() {
  const quadros = useRef(0);
  const setCenaPronta = useEstado((s) => s.setCenaPronta);
  const setEntradaFeita = useEstado((s) => s.setEntradaFeita);
  useFrame((_, dt) => {
    if (relogio.congelado !== null) relogio.t = relogio.congelado;
    else if (relogio.semMovimento) relogio.t = 99;
    else relogio.t += Math.min(dt, 0.1);
    quadros.current++;
    if (quadros.current === 3) setCenaPronta();
    if (relogio.t >= ENTRADA.fim && !useEstado.getState().entradaFeita) setEntradaFeita();
  });
  return null;
}

function Qualidade() {
  const qualidade = useEstado((s) => s.qualidade);
  const setQualidade = useEstado((s) => s.setQualidade);
  const setDpr = useThree((s) => s.setDpr);
  const forcada = useRef(new URLSearchParams(location.search).get('q'));
  useEffect(() => {
    setDpr(DPR[qualidade]);
  }, [qualidade, setDpr]);
  if (forcada.current) return null;
  return (
    <PerformanceMonitor
      bounds={() => [42, 58]}
      flipflops={4}
      onDecline={() => {
        const q = useEstado.getState().qualidade;
        setQualidade(q === 'alta' ? 'media' : 'baixa');
      }}
      onFallback={() => setQualidade('baixa')}
    />
  );
}

function Rua3D() {
  suspend(carregarFontesDaCena, ['fontes-cena']);
  return (
    <>
      <Rua />
      {lotes.map((l) => (l.andares === 0 ? <Terreno key={l.id} lote={l} /> : <Loja key={l.id} lote={l} />))}
      <Reflexos />
    </>
  );
}

export default function Cena() {
  const aspecto = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1.6;
  const e = enquadramento(aspecto);
  const qualidade = useEstado((s) => s.qualidade);
  return (
    <Canvas
      className="cena-canvas"
      dpr={[1, DPR[qualidade]]}
      shadows="percentage"
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: e.fov, near: 2.5, far: 420, position: [-30, 30, -40] }}
      aria-hidden="true"
      onCreated={({ gl, scene }) => {
        gl.localClippingEnabled = true;
        if (import.meta.env.DEV) (window as unknown as { __vera: unknown }).__vera = { gl, scene };
      }}
    >
      <Qualidade />
      <Ambiente />
      <Suspense fallback={null}>
        <Rua3D />
        <Relogio />
        <Controles />
        <Pos />
      </Suspense>
    </Canvas>
  );
}
