import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Color, type InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LARGURA_RUA } from '../data/rua';
import { relogio } from '../estado';
import { Montador, semente } from './kit';
import { centroDoQuarteirao, LARGURA_TRANSVERSAL, MEIA_QUADRA, quarteiraoDoX } from './quarteiroes';
import { texturaRadial } from './texturas';

/**
 * Carros de maquete, instanciados: carroceria clara tingida por instância, faróis e lanternas
 * emissivos, cone de luz no asfalto. Param no sinal vermelho antes de cada cruzamento.
 */
interface Carro {
  x: number;
  faixa: 1 | -1; // 1 = anda para +x (faixa sul), -1 = anda para -x (faixa norte)
  vel: number;
  velAtual: number;
}

const obj = new Object3D();
const CICLO = 12; // s: 8 verde, 1,2 amarelo, o resto vermelho para a rua principal
export function sinalDaRua(t: number, k: number): 'verde' | 'amarelo' | 'vermelho' {
  const f = (t + k * 3.7) % CICLO;
  if (f < 8) return 'verde';
  if (f < 9.2) return 'amarelo';
  return 'vermelho';
}

export function Carros({ quantidade, raio = 90 }: { quantidade: number; raio?: number }) {
  const corpos = useRef<InstancedMesh>(null);
  const farois = useRef<InstancedMesh>(null);
  const lanternas = useRef<InstancedMesh>(null);
  const cones = useRef<InstancedMesh>(null);
  const sinais = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);

  const g = useMemo(() => {
    const m = new Montador();
    m.bloco('pintura', 4.2, 0.62, 1.8, 0, 0.28, 0, '#ffffff', { chanfro: 0.12 });
    m.bloco('pintura', 2.2, 0.5, 1.6, -0.25, 0.86, 0, '#ffffff', { chanfro: 0.14 });
    m.bloco('escuro', 2.0, 0.42, 1.64, -0.25, 0.9, 0, '#0b0d12', { chanfro: 0.1 });
    for (const sx of [-1.35, 1.35]) for (const sz of [-0.82, 0.82]) m.cilindro('escuro', 0.33, 0.33, 0.24, [sx, 0.33, sz], '#0d0e10', { rot: [Math.PI / 2, 0, 0], lados: 14 });
    const geos = m.geometrias();
    const corpo = mergeGeometries([geos.pintura!, geos.escuro!])!;
    const farol = mergeGeometries([
      new PlaneGeometry(0.34, 0.14).rotateY(Math.PI / 2).translate(2.11, 0.56, 0.62),
      new PlaneGeometry(0.34, 0.14).rotateY(Math.PI / 2).translate(2.11, 0.56, -0.62),
    ])!;
    const lanterna = farol.clone().rotateY(Math.PI);
    const cone = new PlaneGeometry(9, 4.2);
    cone.rotateX(-Math.PI / 2);
    cone.translate(6.4, 0.015, 0);
    const sinal = new PlaneGeometry(0.2, 0.2);
    return {
      corpo,
      farol,
      lanterna,
      cone,
      sinal,
      matCorpo: new MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5, envMapIntensity: 1.2 }),
      matFarol: new MeshBasicMaterial({ color: new Color('#fff4dc').multiplyScalar(8) }),
      matLanterna: new MeshBasicMaterial({ color: new Color('#ff3b2f').multiplyScalar(4) }),
      matCone: new MeshBasicMaterial({ map: texturaRadial(0.15), color: new Color('#fff1d6').multiplyScalar(0.28), transparent: true, depthWrite: false, blending: AdditiveBlending }),
      matSinal: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    };
  }, []);

  const carros = useMemo<Carro[]>(() => {
    const r = semente(808);
    return Array.from({ length: quantidade }, (_, i) => ({
      x: (r() - 0.5) * raio * 2,
      faixa: (i % 2 === 0 ? 1 : -1) as 1 | -1,
      vel: 7 + r() * 3,
      velAtual: 0,
    }));
  }, [quantidade, raio]);

  useLayoutEffect(() => {
    const m = corpos.current;
    if (!m) return;
    const tons = ['#d9d6cf', '#2a2d33', '#6d1f1f', '#a7acb1', '#1f2f3f', '#c9a96e', '#e6e3dc', '#3a3f3a'];
    carros.forEach((_, i) => m.setColorAt(i, new Color(tons[i % tons.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [carros]);

  useFrame((_, dtBruto) => {
    const dt = relogio.semMovimento ? 0 : Math.min(dtBruto, 0.1);
    const t = relogio.t;
    const cx = camera.position.x;
    const [c, f, l, co, si] = [corpos.current, farois.current, lanternas.current, cones.current, sinais.current];
    if (!c || !f || !l || !co || !si) return;

    carros.forEach((car, i) => {
      if (Math.abs(car.x - cx) > raio) car.x = cx - Math.sign(car.x - cx) * (raio - 4);
      // para antes da faixa quando o sinal do próximo cruzamento fecha
      let limite = car.vel;
      const k = quarteiraoDoX(car.x);
      // cruzamento kk fica entre o quarteirão kk e o kk+1
      for (const kk of [k - 1, k, k + 1]) {
        const xParada = car.faixa === 1 ? centroDoQuarteirao(kk) + MEIA_QUADRA - 3.4 : centroDoQuarteirao(kk) + MEIA_QUADRA + LARGURA_TRANSVERSAL + 3.4;
        const dist = (xParada - car.x) * car.faixa;
        if (dist > 0 && dist < 18 && sinalDaRua(t, kk) !== 'verde') limite = Math.min(limite, Math.max(0, (dist - 0.6) * 0.9));
      }
      // não encosta no da frente
      for (const outro of carros) {
        if (outro === car || outro.faixa !== car.faixa) continue;
        const d = (outro.x - car.x) * car.faixa;
        if (d > 0 && d < 9) limite = Math.min(limite, Math.max(0, (d - 5.5) * 1.2));
      }
      car.velAtual += (limite - car.velAtual) * Math.min(1, dt * 2.2);
      car.x += car.faixa * car.velAtual * dt;

      obj.position.set(car.x, 0, car.faixa * (LARGURA_RUA / 4 + 0.05));
      obj.rotation.set(0, car.faixa === 1 ? 0 : Math.PI, 0);
      obj.updateMatrix();
      c.setMatrixAt(i, obj.matrix);
      f.setMatrixAt(i, obj.matrix);
      l.setMatrixAt(i, obj.matrix);
      co.setMatrixAt(i, obj.matrix);
    });
    c.instanceMatrix.needsUpdate = true;
    f.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    co.instanceMatrix.needsUpdate = true;

    // luzes dos semáforos dos cruzamentos perto da câmera
    const kc = quarteiraoDoX(cx);
    let n = 0;
    const cor = new Color();
    for (let k = kc - 2; k <= kc + 2; k++) {
      const estado = sinalDaRua(t, k);
      cor.set(estado === 'verde' ? '#3ddc84' : estado === 'amarelo' ? '#ffb347' : '#ff4b3e').multiplyScalar(3);
      for (const [dx, lado] of [
        [MEIA_QUADRA + 0.6, 1],
        [MEIA_QUADRA + LARGURA_TRANSVERSAL - 0.6, -1],
      ] as const) {
        const x = centroDoQuarteirao(k) + dx;
        const z = lado * (LARGURA_RUA / 2 + 0.5);
        obj.position.set(x + (lado === 1 ? -0.14 : 0.14), estado === 'verde' ? 3.25 : estado === 'amarelo' ? 3.5 : 3.75, z);
        obj.rotation.set(0, lado === 1 ? -Math.PI / 2 : Math.PI / 2, 0);
        obj.updateMatrix();
        si.setMatrixAt(n, obj.matrix);
        si.setColorAt(n, cor);
        n++;
      }
    }
    si.count = n;
    si.instanceMatrix.needsUpdate = true;
    if (si.instanceColor) si.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={corpos} args={[g.corpo, g.matCorpo, quantidade]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={farois} args={[g.farol, g.matFarol, quantidade]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={lanternas} args={[g.lanterna, g.matLanterna, quantidade]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={cones} args={[g.cone, g.matCone, quantidade]} frustumCulled={false} renderOrder={3} raycast={() => null} />
      <instancedMesh ref={sinais} args={[g.sinal, g.matSinal, 12]} frustumCulled={false} raycast={() => null} />
    </>
  );
}
