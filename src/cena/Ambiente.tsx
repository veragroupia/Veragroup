import { useMemo } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import { BackSide, Color, ShaderMaterial } from 'three';
import { CORES } from './materiais';

/** Céu quase preto com um horizonte azulado muito escuro, pontilhado para não fazer degraus. */
function Ceu() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { topo: { value: new Color(CORES.ceuTopo) }, horizonte: { value: new Color(CORES.ceuHorizonte) } },
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
            vec3 c = mix(horizonte, topo, pow(h, 0.5));
            c += (ruido(gl_FragCoord.xy) - 0.5) / 255.0;
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[480, 32, 16]} />
    </mesh>
  );
}

/**
 * Luzes de tempo real: só duas, sem sombra (hemisfério e lua). A luz quente dos postes é assada
 * nos vértices; as vitrines são emissivas. O ambiente é renderizado uma vez (frames=1).
 */
export function Ambiente() {
  return (
    <>
      <color attach="background" args={[CORES.nevoa]} />
      <fogExp2 attach="fog" args={[CORES.nevoa, 0.0095]} />
      <Ceu />
      <hemisphereLight args={['#4b6478', '#16140f', 1.55]} />
      <directionalLight position={[20, 42, -15]} color={CORES.lua} intensity={1.3} />
      <directionalLight position={[-30, 14, 34]} color="#ffb070" intensity={0.25} />
      <Environment frames={1} resolution={128} environmentIntensity={0.8}>
        <color attach="background" args={['#07090d']} />
        <Lightformer form="rect" intensity={2.2} color="#ffaa5c" position={[0, 2, -14]} scale={[30, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffc27a" position={[14, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[30, 1, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffaa5c" position={[0, 2.5, 14]} rotation={[0, Math.PI, 0]} scale={[30, 1, 1]} />
        <Lightformer form="circle" intensity={0.7} color="#8fa7c4" position={[0, 14, 0]} rotation={[Math.PI / 2, 0, 0]} scale={18} />
      </Environment>
    </>
  );
}
