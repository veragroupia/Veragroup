import { useMemo } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import { BackSide, Color, ShaderMaterial } from 'three';
import { useEstado } from '../estado';
import { CORES } from './materiais';

/** Céu azul-petróleo muito escuro, com pontilhado para não fazer degraus no gradiente. */
function Ceu() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topo: { value: new Color(CORES.ceuTopo) },
          horizonte: { value: new Color(CORES.ceuHorizonte) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 topo;
          uniform vec3 horizonte;
          varying vec3 vDir;
          float ruido(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 c = mix(horizonte, topo, pow(h, 0.55));
            c += (ruido(gl_FragCoord.xy) - 0.5) / 255.0;
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-10}>
      <sphereGeometry args={[320, 32, 16]} />
    </mesh>
  );
}

export function Ambiente() {
  const qualidade = useEstado((s) => s.qualidade);
  const sombra = qualidade !== 'baixa';
  return (
    <>
      <color attach="background" args={[CORES.nevoa]} />
      <fogExp2 attach="fog" args={[CORES.nevoa, 0.0105]} />
      <Ceu />

      {/* luz da lua: fria, baixa, de lado, para raspar as fachadas */}
      <directionalLight
        position={[20, 42, -15]}
        color={CORES.lua}
        intensity={1.7}
        castShadow={sombra}
        shadow-mapSize={qualidade === 'alta' ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={5}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <hemisphereLight args={['#4b7891', '#1a1c20', 1.8]} />
      {/* contraluz fria do outro lado, para separar silhuetas do fundo */}
      <directionalLight position={[-30, 18, 34]} color="#4f7896" intensity={0.45} />

      {/* reflexos de noite para vidro, metal e asfalto: céu escuro, faixas quentes de rua, um brilho frio em cima */}
      <Environment frames={1} resolution={256} environmentIntensity={0.85}>
        <color attach="background" args={['#0a1216']} />
        <Lightformer form="rect" intensity={2.4} color="#ff9a4a" position={[0, 2, -14]} scale={[30, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffb067" position={[14, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[30, 1, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ff9a4a" position={[0, 2.5, 14]} rotation={[0, Math.PI, 0]} scale={[30, 1, 1]} />
        <Lightformer form="circle" intensity={0.8} color="#7fa6c9" position={[0, 14, 0]} rotation={[Math.PI / 2, 0, 0]} scale={18} />
      </Environment>
    </>
  );
}
