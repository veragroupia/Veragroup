import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, type Mesh, PlaneGeometry } from 'three';
import { LARGURA_RUA, lotes, type Lote } from '../data/rua';
import { relogio, useEstado } from '../estado';
import { nivelDeLuz } from './luz';
import { CORES, materialAditivo } from './materiais';
import { texturaReflexo } from './texturas';
import { POSTES, cabecaDoPoste } from './Rua';

/**
 * Asfalto molhado: cada luz forte deixa um rastro comprido que aponta para quem olha.
 * Barato (um quad por luz) e é o que vende a "rua depois da chuva" mesmo sem reflexo real.
 */
const tex = { atual: null as ReturnType<typeof texturaReflexo> | null };

function geometriaRastro(largura: number, comprimento: number) {
  const g = new PlaneGeometry(largura, comprimento);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, comprimento / 2);
  return g;
}

function Rastro({
  pos,
  largura,
  comprimento,
  cor,
  opacidade,
  lote,
}: {
  pos: [number, number, number];
  largura: number;
  comprimento: number;
  cor: string;
  opacidade: number;
  lote?: Lote;
}) {
  const ref = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const qualidade = useEstado((s) => s.qualidade);
  const acesaEm = useEstado((s) => (lote ? s.acesasPeloVisitante[lote.id] : undefined));
  tex.atual ??= texturaReflexo();
  const geo = useMemo(() => geometriaRastro(largura, comprimento), [largura, comprimento]);
  const mat = useMemo(() => {
    const m = materialAditivo(cor, opacidade);
    m.map = tex.atual;
    m.color = new Color(cor);
    return m;
  }, [cor, opacidade]);
  useFrame(() => {
    const o = ref.current;
    if (!o) return;
    o.rotation.y = Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z);
    const fator = qualidade === 'alta' ? 0.55 : 1;
    const luz = lote ? Math.min(1, Math.max(0, nivelDeLuz(lote, relogio.t, acesaEm))) : 1;
    mat.opacity = opacidade * luz * fator;
    o.visible = mat.opacity > 0.004;
  });
  return <mesh ref={ref} geometry={geo} material={mat} position={pos} renderOrder={4} />;
}

export function Reflexos() {
  const lojas = lotes.filter((l) => l.andares > 0);
  return (
    <group>
      {lojas.map((l) => {
        const lado = l.lado === 'norte' ? 1 : -1;
        return (
          <Rastro
            key={l.id}
            lote={l}
            pos={[l.x, 0.006, lado * (LARGURA_RUA / 2 - 0.25)]}
            largura={Math.min(l.largura * 0.55, 2.8)}
            comprimento={10}
            cor={CORES.vitrine}
            opacidade={0.38}
          />
        );
      })}
      {POSTES.map((p, i) => {
        const [x, , z] = cabecaDoPoste(p);
        return <Rastro key={i} pos={[x, 0.007, z]} largura={1.3} comprimento={11} cor={CORES.sodio} opacidade={0.5} />;
      })}
    </group>
  );
}
