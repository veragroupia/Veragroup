import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { InstancedBufferAttribute, type InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
import { RECUO_FACHADA } from '../data/rua';
import { useEstado } from '../estado';
import { ALTURA_CORTE, corte } from './corte';
import { todasAsLojas } from './registro';
import { atlasPinos } from './texturas';

/**
 * Todos os pinos de status numa malha instanciada só: billboard com tamanho constante na tela.
 * Atlas: 0 apagada · 1 acesa · 2 lote livre · 3 selecionada.
 */
const MAX = 96;
const obj = new Object3D();

export function Pinos() {
  const ref = useRef<InstancedMesh>(null);
  const size = useThree((s) => s.size);
  const { geo, mat, tipo, escala } = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0);
    const tipo = new InstancedBufferAttribute(new Float32Array(MAX), 1);
    const escala = new InstancedBufferAttribute(new Float32Array(MAX).fill(1), 1);
    g.setAttribute('aTipo', tipo);
    g.setAttribute('aEscala', escala);
    const m = new ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: { uMapa: { value: atlasPinos() }, uTela: { value: new Vector2(1, 1) }, uPx: { value: 40 } },
      vertexShader: /* glsl */ `
        attribute float aTipo;
        attribute float aEscala;
        uniform vec2 uTela;
        uniform float uPx;
        varying vec2 vUv;
        varying float vTipo;
        void main() {
          vec4 centro = projectionMatrix * viewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec2 desloc = position.xy * uPx * aEscala / uTela * 2.0;
          centro.xy += desloc * centro.w;
          gl_Position = centro;
          vUv = uv;
          vTipo = aTipo;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMapa;
        varying vec2 vUv;
        varying float vTipo;
        void main() {
          vec4 c = texture2D(uMapa, vec2((vUv.x + vTipo) / 4.0, vUv.y));
          if (c.a < 0.02) discard;
          gl_FragColor = c;
          #include <colorspace_fragment>
        }`,
    });
    return { geo: g, mat: m, tipo, escala };
  }, []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    mat.uniforms.uTela.value.set(size.width, size.height);
    mat.uniforms.uPx.value = size.width < 600 ? 34 : 40;
    const sobre = useEstado.getState().sobre;
    const selecionada = useEstado.getState().caso;
    let i = 0;
    for (const l of todasAsLojas()) {
      if (i >= MAX) break;
      const fileira = l.lado === 1 ? 'norte' : 'sul';
      const c = corte[fileira];
      const topo = l.altura + (ALTURA_CORTE - 0.15 - l.altura) * c;
      obj.position.set(l.x, Math.max(topo, 1.2) + 1.4, l.lado * (RECUO_FACHADA + 1.2));
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
      let t = l.luz > 0.5 ? 1 : 0;
      if (l.tipo === 'terreno') t = 2;
      if (l.tipo === 'visitante') t = l.atrai ? 1 : 2;
      if (l.caseId && l.caseId === selecionada) t = 3;
      tipo.setX(i, t);
      const alvo = l.id === sobre ? 1.3 : 1;
      escala.setX(i, escala.getX(i) + (alvo - escala.getX(i)) * 0.25);
      i++;
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    tipo.needsUpdate = true;
    escala.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, MAX]} frustumCulled={false} renderOrder={20} raycast={() => null} />;
}
