import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  CapsuleGeometry,
  Color,
  InstancedBufferAttribute,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ALTURA_GUIA, LARGURA_RUA, RECUO_FACHADA } from '../data/rua';
import { relogio } from '../estado';
import { semente } from './kit';
import { cabecaDoPoste, centroDoQuarteirao, POSTES_QUADRA, quarteiraoDoX } from './quarteiroes';
import { todasAsLojas, type LojaMundo } from './registro';
import { texturaRadial } from './texturas';

/**
 * Pedestres de maquete (corpo em cápsula, cabeça em esfera), instanciados.
 * Andam pela calçada; ao passar por uma loja ACESA, alguns viram, vão até a porta e entram;
 * pelas apagadas, passam reto. É a frase do site acontecendo na rua.
 */
type Estado = 'andando' | 'indo' | 'dentro' | 'saindo';

interface Pessoa {
  x: number;
  z: number;
  lado: 1 | -1;
  dir: 1 | -1;
  vel: number;
  faixa: number;
  estado: Estado;
  alvo: { x: number; z: number } | null;
  ate: number;
  fase: number;
  ignorar: string | null;
  visivel: number;
}

const obj = new Object3D();
const dummy = new Vector3();

export function Pedestres({ quantidade, raio = 70 }: { quantidade: number; raio?: number }) {
  const corpos = useRef<InstancedMesh>(null);
  const sombras = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);

  const { geo, mat, luzAttr, geoSombra, matSombra } = useMemo(() => {
    const corpo = new CapsuleGeometry(0.2, 0.92, 4, 10);
    corpo.translate(0, 0.66, 0);
    const cabeca = new SphereGeometry(0.13, 12, 8);
    cabeca.translate(0, 1.5, 0);
    const g = mergeGeometries([corpo.toNonIndexed(), cabeca.toNonIndexed()])!;
    const luz = new InstancedBufferAttribute(new Float32Array(quantidade), 1);
    g.setAttribute('aLuz', luz);
    const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aLuz;\nvarying float vLuzP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLuzP = aLuz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vLuzP;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.72, 0.45) * vLuzP;');
    };
    m.customProgramCacheKey = () => 'pedestre-luz';
    const gs = new PlaneGeometry(0.9, 0.9);
    gs.rotateX(-Math.PI / 2);
    const ms = new MeshBasicMaterial({ map: texturaRadial(0.2), color: '#000000', transparent: true, opacity: 0.55, depthWrite: false });
    void AdditiveBlending;
    return { geo: g, mat: m, luzAttr: luz, geoSombra: gs, matSombra: ms };
  }, [quantidade]);

  const pessoas = useMemo<Pessoa[]>(() => {
    const r = semente(321);
    return Array.from({ length: quantidade }, () => {
      const lado = (r() < 0.5 ? 1 : -1) as 1 | -1;
      const faixa = LARGURA_RUA / 2 + 0.9 + r() * 1.6;
      return {
        x: (r() - 0.5) * raio * 2,
        z: lado * faixa,
        lado,
        dir: (r() < 0.5 ? 1 : -1) as 1 | -1,
        vel: 1.05 + r() * 0.5,
        faixa,
        estado: 'andando',
        alvo: null,
        ate: 0,
        fase: r() * 10,
        ignorar: null,
        visivel: 1,
      };
    });
  }, [quantidade, raio]);

  useLayoutEffect(() => {
    const m = corpos.current;
    if (!m) return;
    const r = semente(99);
    const tons = ['#a9a397', '#9b968c', '#8d8a84', '#b3ada2', '#7a8287', '#857a6c', '#646d75'];
    for (let i = 0; i < quantidade; i++) m.setColorAt(i, new Color(tons[Math.floor(r() * tons.length)]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [quantidade]);

  useFrame((_, dtBruto) => {
    const m = corpos.current;
    const s = sombras.current;
    if (!m || !s) return;
    const dt = relogio.semMovimento ? 0 : Math.min(dtBruto, 0.1);
    const t = relogio.t;
    const cx = camera.position.x;
    const lojas: LojaMundo[] = [];
    for (const l of todasAsLojas()) lojas.push(l);
    const kc = quarteiraoDoX(cx);

    pessoas.forEach((p, i) => {
      // recicla quem ficou longe da câmera
      if (Math.abs(p.x - cx) > raio) {
        p.x = cx - Math.sign(p.x - cx) * (raio - 2);
        p.estado = 'andando';
        p.z = p.lado * p.faixa;
        p.visivel = 1;
      }
      switch (p.estado) {
        case 'andando': {
          p.x += p.dir * p.vel * dt;
          p.z += (p.lado * p.faixa - p.z) * Math.min(1, dt * 2);
          // passou na frente de uma loja acesa do seu lado? às vezes entra
          for (const l of lojas) {
            if (l.lado !== p.lado || l.id === p.ignorar) continue;
            const atrai = l.atrai ?? l.luz > 0.5;
            if (!atrai) continue;
            if (Math.abs(p.x - l.xPorta) < 0.25 && (i * 7 + Math.floor(t)) % 3 !== 0) {
              p.estado = 'indo';
              p.alvo = { x: l.xPorta, z: l.lado * (RECUO_FACHADA - 0.25) };
              p.ignorar = l.id;
              break;
            } else if (Math.abs(p.x - l.xPorta) < 0.25) {
              p.ignorar = l.id;
            }
          }
          break;
        }
        case 'indo': {
          const a = p.alvo!;
          dummy.set(a.x - p.x, 0, a.z - p.z);
          const d = dummy.length();
          if (d < 0.12) {
            p.estado = 'dentro';
            p.ate = t + 4 + ((i * 13) % 5);
          } else {
            dummy.normalize();
            p.x += dummy.x * p.vel * dt;
            p.z += dummy.z * p.vel * dt;
          }
          p.visivel += ((d < 0.6 ? 0 : 1) - p.visivel) * Math.min(1, dt * 6);
          break;
        }
        case 'dentro':
          p.visivel = 0;
          if (t > p.ate) {
            p.estado = 'saindo';
            p.dir = (((i + Math.floor(t)) % 2) * 2 - 1) as 1 | -1;
          }
          break;
        case 'saindo':
          p.visivel += (1 - p.visivel) * Math.min(1, dt * 5);
          p.z += (p.lado * p.faixa - p.z) * Math.min(1, dt * 1.6);
          p.x += p.dir * p.vel * 0.6 * dt;
          if (Math.abs(p.z - p.lado * p.faixa) < 0.1) {
            p.estado = 'andando';
          }
          break;
      }
      if (p.ignorar && !lojas.some((l) => l.id === p.ignorar && Math.abs(p.x - l.xPorta) < 2.5)) p.ignorar = null;

      // luz que bate no pedestre: vitrines acesas e postes por perto (assada por quadro, sem luz real)
      let luz = 0.05;
      for (const l of lojas) {
        if (l.luz < 0.05 || l.lado !== p.lado) continue;
        const dx = Math.abs(p.x - l.x);
        if (dx < l.largura) luz += l.luz * 0.9 * (1 - dx / l.largura) * Math.max(0, 1 - Math.abs(Math.abs(p.z) - RECUO_FACHADA) / 3.2);
      }
      for (let k = kc - 1; k <= kc + 1; k++)
        for (const poste of POSTES_QUADRA) {
          const h = cabecaDoPoste(poste);
          const dx = p.x - (centroDoQuarteirao(k) + h.x);
          const dz = p.z - h.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < 40) luz += 0.55 * (1 - d2 / 40);
        }
      luzAttr.setX(i, Math.min(1.4, luz));

      const andando = p.estado === 'andando' || p.estado === 'indo' || p.estado === 'saindo';
      const balanco = andando && !relogio.semMovimento ? Math.abs(Math.sin((t + p.fase) * 7.5 * p.vel)) * 0.045 : 0;
      obj.position.set(p.x, ALTURA_GUIA + balanco, p.z);
      const direcao = p.estado === 'indo' && p.alvo ? Math.atan2(p.alvo.x - p.x, p.alvo.z - p.z) : p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      obj.rotation.set(0, direcao, andando ? Math.sin((t + p.fase) * 7.5) * 0.03 : 0);
      const esc = Math.max(0.0001, p.visivel);
      obj.scale.set(esc, esc, esc);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
      obj.position.set(p.x, ALTURA_GUIA + 0.01, p.z);
      obj.rotation.set(0, 0, 0);
      obj.updateMatrix();
      s.setMatrixAt(i, obj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
    luzAttr.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={corpos} args={[geo, mat, quantidade]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={sombras} args={[geoSombra, matSombra, quantidade]} frustumCulled={false} renderOrder={2} raycast={() => null} />
    </>
  );
}
