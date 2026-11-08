import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  type Group,
  type InstancedMesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  Quaternion,
  TorusGeometry,
  Vector3,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { semente } from './kit';
import { tela, textura } from './texturas';

/**
 * Prata de verdade: MeshPhysicalMaterial com metalness 1, rugosidade baixa e um ambiente de estúdio
 * SÓ para ela (RoomEnvironment em PMREM), para refletir softboxes em vez de virar cinza-chumbo.
 * Elos: toro esticado 1,6× no eixo Y, cada um girado 90° em relação ao anterior e encaixado nele.
 */
let ambientePrata: Texture | null = null;
let riscos: Texture | null = null;

function texturaRiscos() {
  if (riscos) return riscos;
  const { c, ctx } = tela(256, 256);
  ctx.fillStyle = 'rgb(46,46,46)';
  ctx.fillRect(0, 0, 256, 256);
  const r = semente(12);
  ctx.strokeStyle = 'rgba(90,90,90,0.5)';
  for (let i = 0; i < 140; i++) {
    ctx.lineWidth = 0.5 + r();
    ctx.beginPath();
    const x = r() * 256;
    const y = r() * 256;
    const a = r() * Math.PI;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 30 * r(), y + Math.sin(a) * 30 * r());
    ctx.stroke();
  }
  riscos = textura(c, false);
  return riscos;
}

export interface Peca {
  peca: string;
  modelo: string;
  tamanho: number;
}

const obj = new Object3D();
const q = new Quaternion();
const qTorcao = new Quaternion();
const eixoY = new Vector3(0, 1, 0);

function caminho(peca: string, n: number) {
  if (peca === 'pulseira') {
    const pts: Vector3[] = [];
    const r = 0.06 + n * 0.0016;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(new Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.55 + r * 0.6, Math.sin(a) * r * 0.5));
    }
    return new CatmullRomCurve3(pts, true);
  }
  // corrente pendurada em V, como no montador da ERK
  const comprimento = n * 0.034;
  const meia = comprimento / 2;
  const fundo = -meia * 0.86;
  return new CatmullRomCurve3(
    [
      new Vector3(-0.012, 0, 0),
      new Vector3(-0.07, fundo * 0.45, 0.01),
      new Vector3(-0.1, fundo * 0.85, 0.02),
      new Vector3(0, fundo, 0.03),
      new Vector3(0.1, fundo * 0.85, 0.02),
      new Vector3(0.07, fundo * 0.45, 0.01),
      new Vector3(0.012, 0, 0),
    ],
    false,
    'centripetal',
  );
}

export function Corrente({ peca, posicao, visivel }: { peca: Peca; posicao: [number, number, number]; visivel: number }) {
  const gl = useThree((s) => s.gl);
  const grupo = useRef<Group>(null);
  const elos = useRef<InstancedMesh>(null);
  const MAX = 48;

  const material = useMemo(() => {
    if (!ambientePrata) {
      const pm = new PMREMGenerator(gl);
      ambientePrata = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
    }
    return new MeshPhysicalMaterial({
      color: new Color('#f2f2f4'),
      metalness: 1,
      roughness: 0.18,
      roughnessMap: texturaRiscos(),
      envMap: ambientePrata,
      envMapIntensity: 1.4,
    });
  }, [gl]);

  const geometria = useMemo(() => {
    if (peca.modelo === 'veneziana' && peca.peca !== 'anel') {
      const g = new TorusGeometry(0.011, 0.0034, 4, 4);
      g.rotateZ(Math.PI / 4);
      g.scale(1, 1.25, 1);
      return g;
    }
    const g = new TorusGeometry(0.0115, peca.modelo === 'grumet' ? 0.0032 : 0.0042, 10, 28);
    g.scale(1, 1.6, peca.modelo === 'cubana' ? 0.62 : 0.8);
    return g;
  }, [peca.modelo, peca.peca]);

  const anel = useMemo(() => new TorusGeometry(0.05 + (peca.tamanho - 16) * 0.0018, 0.011, 16, 64), [peca.tamanho]);

  useLayoutEffect(() => {
    const m = elos.current;
    if (!m) return;
    if (peca.peca === 'anel') {
      m.count = 0;
      return;
    }
    const n = Math.min(MAX, Math.round(peca.peca === 'pulseira' ? peca.tamanho * 1.6 : peca.tamanho * 0.62));
    const curva = caminho(peca.peca, n);
    const tangente = new Vector3();
    for (let i = 0; i < n; i++) {
      const t = i / (n - (curva.closed ? 0 : 1));
      curva.getPointAt(Math.min(1, t), obj.position);
      curva.getTangentAt(Math.min(1, t), tangente);
      q.setFromUnitVectors(eixoY, tangente.normalize());
      // cada elo gira 90° em torno do eixo da corrente (encaixe); grumet tem uma torção a mais
      const giro = (i % 2) * (Math.PI / 2) + (peca.modelo === 'grumet' ? 0.35 : 0);
      qTorcao.setFromAxisAngle(eixoY, giro);
      obj.quaternion.copy(q).multiply(qTorcao);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [peca, geometria]);

  useFrame((_, dt) => {
    if (!grupo.current) return;
    grupo.current.rotation.y += dt * 0.5;
    const s = Math.max(0.0001, visivel);
    grupo.current.scale.setScalar(s * 3.0);
  });

  const suporte = useMemo(() => new MeshStandardMaterial({ color: '#16171a', roughness: 0.5, metalness: 0.3 }), []);
  const haste = useMemo(() => new CylinderGeometry(0.005, 0.005, 0.58, 8), []);

  return (
    <group position={posicao}>
      {/* expositor */}
      <mesh material={suporte} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 32]} />
      </mesh>
      <group ref={grupo} position={[0, 0.04, 0]}>
        <mesh geometry={haste} material={suporte} position={[0, 0.29, 0]} />
        <group position={[0, peca.peca === 'pulseira' ? 0.12 : 0.58, 0]}>
          <instancedMesh ref={elos} args={[geometria, material, MAX]} frustumCulled={false} />
          {peca.peca === 'anel' && (
            <mesh geometry={anel} material={material} position={[0, -0.42, 0]} rotation={[0.25, 0, 0]} />
          )}
        </group>
      </group>
    </group>
  );
}
