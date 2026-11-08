import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Color, type InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import { LARGURA_CALCADA, LARGURA_RUA, RECUO_FACHADA } from '../data/rua';
import { CORES } from './materiais';
import { cabecaDoPoste, centroDoQuarteirao, POSTES_QUADRA, quarteiraoDoX } from './quarteiroes';
import { todasAsLojas } from './registro';
import { texturaMancha, texturaReflexo } from './texturas';

/**
 * Rua molhada sem redesenhar a cidade: cada luz forte deixa um rastro comprido no asfalto,
 * apontando para quem olha, e cada vitrine acesa derrama luz na calçada. Tudo instanciado.
 */
const MAX = 72;
const obj = new Object3D();
const cor = new Color();
const corVitrine = new Color(CORES.vitrine);
const corSodio = new Color(CORES.sodio);

export function Reflexos() {
  const rastros = useRef<InstancedMesh>(null);
  const manchas = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);

  const { geoRastro, matRastro, geoMancha, matMancha } = useMemo(() => {
    const gr = new PlaneGeometry(1, 1);
    gr.rotateX(-Math.PI / 2);
    gr.translate(0, 0, 0.5);
    const mr = new MeshBasicMaterial({ map: texturaReflexo(), transparent: true, depthWrite: false, blending: AdditiveBlending });
    const gm = new PlaneGeometry(1, 1);
    gm.rotateX(-Math.PI / 2);
    const mm = new MeshBasicMaterial({ map: texturaMancha(), transparent: true, depthWrite: false, blending: AdditiveBlending });
    return { geoRastro: gr, matRastro: mr, geoMancha: gm, matMancha: mm };
  }, []);

  useFrame(() => {
    const r = rastros.current;
    const m = manchas.current;
    if (!r || !m) return;
    let ir = 0;
    let im = 0;
    const apontar = (x: number, z: number) => Math.atan2(camera.position.x - x, camera.position.z - z);
    for (const l of todasAsLojas()) {
      if (l.luz < 0.02) continue;
      const a = Math.min(1, l.luz);
      if (ir < MAX) {
        const z = l.lado * (LARGURA_RUA / 2 - 0.25);
        obj.position.set(l.x, 0.012, z);
        obj.rotation.set(0, apontar(l.x, z), 0);
        obj.scale.set(Math.min(l.largura * 0.55, 2.8), 1, 10);
        obj.updateMatrix();
        r.setMatrixAt(ir, obj.matrix);
        r.setColorAt(ir, cor.copy(corVitrine).multiplyScalar(0.36 * a));
        ir++;
      }
      if (im < MAX) {
        const z = l.lado * (RECUO_FACHADA - LARGURA_CALCADA / 2 + 0.1);
        obj.position.set(l.x, 0.17, z);
        obj.rotation.set(0, l.lado === 1 ? Math.PI : 0, 0);
        obj.scale.set(l.largura * 1.15, 1, LARGURA_CALCADA + 0.6);
        obj.updateMatrix();
        m.setMatrixAt(im, obj.matrix);
        m.setColorAt(im, cor.copy(corVitrine).multiplyScalar(0.5 * a));
        im++;
      }
    }
    // postes dos quarteirões em volta da câmera
    const kc = quarteiraoDoX(camera.position.x);
    for (let k = kc - 2; k <= kc + 2 && ir < MAX; k++) {
      for (const p of POSTES_QUADRA) {
        if (ir >= MAX) break;
        const h = cabecaDoPoste(p);
        const x = centroDoQuarteirao(k) + h.x;
        obj.position.set(x, 0.013, h.z);
        obj.rotation.set(0, apontar(x, h.z), 0);
        obj.scale.set(1.3, 1, 11);
        obj.updateMatrix();
        r.setMatrixAt(ir, obj.matrix);
        r.setColorAt(ir, cor.copy(corSodio).multiplyScalar(0.45));
        ir++;
      }
    }
    r.count = ir;
    m.count = im;
    r.instanceMatrix.needsUpdate = true;
    m.instanceMatrix.needsUpdate = true;
    if (r.instanceColor) r.instanceColor.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={rastros} args={[geoRastro, matRastro, MAX]} frustumCulled={false} renderOrder={4} raycast={() => null} />
      <instancedMesh ref={manchas} args={[geoMancha, matMancha, MAX]} frustumCulled={false} renderOrder={3} raycast={() => null} />
    </>
  );
}
