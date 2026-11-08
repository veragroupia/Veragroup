import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointsMaterial,
  TubeGeometry,
  Vector3,
  type Mesh,
} from 'three';
import { cidadesMapa, paraKm } from '../data/cidades';
import { useEstado } from '../estado';
import { semente } from './kit';
import { tela, textura } from './texturas';

/** O mapa fica longe da rua, no mesmo mundo: a câmera "voa" até ele com uma cortina curta. */
export const MAPA_ORIGEM = new Vector3(6000, 0, 0);

export function posicaoDaCidade(nome: string): Vector3 {
  const c = cidadesMapa.find((x) => x.nome === nome) ?? cidadesMapa[0];
  const [x, z] = paraKm(c);
  return new Vector3(MAPA_ORIGEM.x + x, 0, MAPA_ORIGEM.z + z);
}

export function centroDoMapa(): Vector3 {
  const v = new Vector3();
  for (const c of cidadesMapa) v.add(posicaoDaCidade(c.nome));
  return v.divideScalar(cidadesMapa.length);
}

const obj = new Object3D();

function texturaBase() {
  const S = 1024;
  const { c, ctx } = tela(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.7);
  g.addColorStop(0, '#11121c');
  g.addColorStop(1, '#07080d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(242,239,232,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= S; i += S / 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, S);
    ctx.moveTo(0, i);
    ctx.lineTo(S, i);
    ctx.stroke();
  }
  // curvas de nível discretas
  const r = semente(5);
  ctx.strokeStyle = 'rgba(201,169,110,0.05)';
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    const cx = r() * S;
    const cy = r() * S;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) {
      const rr = 60 + k * 18 + Math.sin(a * 3 + k) * 14;
      const x = cx + Math.cos(a) * rr * 2;
      const y = cy + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return textura(c);
}

function Cidade({ nome, foco }: { nome: string; foco: boolean }) {
  const p = useMemo(() => posicaoDaCidade(nome), [nome]);
  const grande = nome === 'Sorocaba';
  const N = grande ? 130 : 70;
  const raio = grande ? 4.2 : 2.4;
  const ref = useRef<InstancedMesh>(null);
  const anel = useRef<Mesh>(null);
  const { geoPts, matPts, matPredio, matAnel } = useMemo(() => {
    const r = semente(nome.length * 31);
    const pts = new Float32Array(N * 3 * 2);
    for (let i = 0; i < N * 2; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * raio;
      pts[i * 3] = Math.cos(a) * d;
      pts[i * 3 + 1] = 0.25 + r() * (grande ? 1.6 : 0.8);
      pts[i * 3 + 2] = Math.sin(a) * d;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pts, 3));
    return {
      geoPts: g,
      matPts: new PointsMaterial({ color: new Color('#e2c48a').multiplyScalar(2.2), size: 0.11, sizeAttenuation: true, transparent: true, depthWrite: false, blending: AdditiveBlending }),
      matPredio: new MeshStandardMaterial({ color: '#171923', roughness: 0.8 }),
      matAnel: new MeshBasicMaterial({ color: new Color('#c9a96e').multiplyScalar(1.6), transparent: true, opacity: 0.8 }),
    };
  }, [nome, N, raio, grande]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = semente(nome.length * 77);
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * raio;
      const h = 0.15 + r() * r() * (grande ? 2.2 : 1.1);
      obj.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      obj.scale.set(0.18 + r() * 0.25, h, 0.18 + r() * 0.25);
      obj.rotation.set(0, r() * Math.PI, 0);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [N, raio, grande, nome]);

  useFrame(({ clock }) => {
    if (!anel.current) return;
    const s = foco ? 1 + Math.sin(clock.elapsedTime * 2.4) * 0.06 : 1;
    anel.current.scale.setScalar(s);
    matAnel.opacity = foco ? 1 : 0.55;
  });

  return (
    <group position={p}>
      <instancedMesh ref={ref} args={[undefined, matPredio, N]} raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <points geometry={geoPts} material={matPts} raycast={() => null} />
      <mesh ref={anel} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={matAnel} raycast={() => null}>
        <ringGeometry args={[raio + 0.5, raio + 0.62, 96]} />
      </mesh>
      <Html position={[0, grande ? 3.4 : 2.2, 0]} center zIndexRange={[15, 10]} style={{ pointerEvents: 'none' }}>
        <div className={`rotulo-cidade${foco ? ' rotulo-cidade--foco' : ''}`}>{nome}</div>
      </Html>
    </group>
  );
}

export function Mapa({ visivel }: { visivel: boolean }) {
  const foco = useEstado((s) => s.cidadeFoco);
  const pulsos = useRef<InstancedMesh>(null);
  const { curva, tubo, matTubo, matBase, base, matPulso } = useMemo(() => {
    const ordem = ['Sorocaba', 'Itu', 'Salto', 'Indaiatuba'];
    const pts = ordem.map((n) => posicaoDaCidade(n).clone().setY(0.06));
    // pontos intermediários dão a curva da rodovia
    const meio = (a: Vector3, b: Vector3, d: number) => a.clone().lerp(b, 0.5).add(new Vector3(d, 0, d * 0.6));
    const caminho = [pts[0], meio(pts[0], pts[1], 2.4), pts[1], meio(pts[1], pts[2], -0.8), pts[2], meio(pts[2], pts[3], 1.4), pts[3]];
    const curva = new CatmullRomCurve3(caminho, false, 'centripetal');
    const c = centroDoMapa();
    return {
      curva,
      tubo: new TubeGeometry(curva, 220, 0.09, 6, false),
      matTubo: new MeshBasicMaterial({ color: new Color('#c9a96e').multiplyScalar(1.4) }),
      matBase: new MeshStandardMaterial({ map: texturaBase(), roughness: 0.95 }),
      base: c,
      matPulso: new MeshBasicMaterial({ color: new Color('#ffe2a8').multiplyScalar(5) }),
    };
  }, []);

  useFrame(({ clock }) => {
    const m = pulsos.current;
    if (!m || !visivel) return;
    for (let i = 0; i < 6; i++) {
      const t = ((clock.elapsedTime * 0.045 + i / 6) % 1 + 1) % 1;
      curva.getPointAt(i % 2 ? t : 1 - t, obj.position);
      obj.position.y += 0.12;
      obj.scale.setScalar(1);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group visible={visivel}>
      <mesh position={[base.x, -0.05, base.z]} rotation={[-Math.PI / 2, 0, 0]} material={matBase} raycast={() => null}>
        <planeGeometry args={[110, 110]} />
      </mesh>
      <mesh geometry={tubo} material={matTubo} raycast={() => null} />
      <instancedMesh ref={pulsos} args={[undefined, matPulso, 6]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[0.28, 12, 8]} />
      </instancedMesh>
      {visivel && cidadesMapa.map((c) => <Cidade key={c.nome} nome={c.nome} foco={foco === c.nome} />)}
    </group>
  );
}
