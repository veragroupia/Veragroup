import { useLayoutEffect, useMemo, useRef } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { Color, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, type SpotLight, type Texture } from 'three';
import { ALTURA_GUIA, LARGURA_CALCADA, LARGURA_RUA, lotes, PROFUNDIDADE_LOTE, RECUO_FACHADA } from '../data/rua';
import { useEstado } from '../estado';
import { Montador, semente } from './kit';
import { Camadas } from './Loja';
import { CORES, materiaisBase, recortar } from './materiais';
import { texturaPocas } from './texturas';

/** Trecho da rua que existe (o resto some na névoa). */
const X0 = -70;
const X1 = 70;
/** Rua transversal perto da câmera. */
const TRANSV = { x0: -27, x1: -18 };

export const POSTES: { x: number; lado: 1 | -1 }[] = [
  { x: -9.0, lado: 1 },
  { x: 10.0, lado: 1 },
  { x: -12.75, lado: -1 },
  { x: 0.75, lado: -1 },
];
const ALTURA_POSTE = 7.4;
const BRACO = 1.7;

export const cabecaDoPoste = (p: (typeof POSTES)[number]) =>
  [p.x, ALTURA_POSTE, p.lado * (LARGURA_RUA / 2 + 0.35 - BRACO)] as [number, number, number];

function Asfalto({ qualidade }: { qualidade: string }) {
  const pocas = useMemo<Texture>(() => {
    const t = texturaPocas();
    t.repeat.set(10, 0.08);
    return t;
  }, []);
  const largura = X1 - X0;
  return (
    <>
    {/* rua transversal: asfalto fosco, sem reflexo (um reflexo por cena já basta) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(TRANSV.x0 + TRANSV.x1) / 2, 0.002, 0]} receiveShadow>
      <planeGeometry args={[TRANSV.x1 - TRANSV.x0, 200]} />
      <meshStandardMaterial color="#101317" roughness={0.9} metalness={0.2} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
      <planeGeometry args={[largura, LARGURA_RUA + 0.4]} />
      {qualidade === 'alta' ? (
        <MeshReflectorMaterial
          blur={[420, 140]}
          resolution={512}
          mixBlur={1}
          mixStrength={3.2}
          mixContrast={1.1}
          roughness={1}
          roughnessMap={pocas}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#0e1114"
          metalness={0.35}
          mirror={0.85}
          distortion={0.06}
          distortionMap={pocas}
        />
      ) : (
        <meshStandardMaterial color="#101317" roughness={1} roughnessMap={pocas} metalness={0.3} envMapIntensity={0.9} />
      )}
    </mesh>
    </>
  );
}

/** Calçadas em placas de concreto (instanciadas), guias e sarjetas. */
function Calcadas() {
  const ref = useRef<InstancedMesh>(null);
  const { placas, guias } = useMemo(() => {
    const placas: { x: number; z: number; v: number }[] = [];
    const r = semente(21);
    for (const lado of [1, -1]) {
      for (let x = X0 + 0.5; x < X1; x += 1) {
        if (x > TRANSV.x0 && x < TRANSV.x1) continue;
        for (let k = 0; k < LARGURA_CALCADA; k++) {
          const z = lado * (LARGURA_RUA / 2 + 0.2 + k * ((LARGURA_CALCADA - 0.2) / LARGURA_CALCADA) + 0.45);
          placas.push({ x, z, v: r() });
        }
      }
    }
    // guias (meio-fio) com chanfro + sarjeta
    const m = new Montador();
    for (const lado of [1, -1]) {
      for (const [a, b] of [
        [X0, TRANSV.x0],
        [TRANSV.x1, X1],
      ]) {
        const cx = (a + b) / 2;
        m.bloco('concreto', b - a, ALTURA_GUIA + 0.02, 0.18, cx, -0.02, lado * (LARGURA_RUA / 2 + 0.09), '#8e8a82', { chanfro: 0.03 });
        m.bloco('concreto', b - a, 0.012, 0.4, cx, 0, lado * (LARGURA_RUA / 2 - 0.2), '#1b1d1f');
        m.bloco('concreto', b - a, ALTURA_GUIA - 0.01, LARGURA_CALCADA - 0.18, cx, 0, lado * (LARGURA_RUA / 2 + 0.18 + (LARGURA_CALCADA - 0.18) / 2), '#3a3936');
      }
      // rua transversal: guias nas esquinas
      for (const xg of [TRANSV.x0, TRANSV.x1]) {
        m.bloco('concreto', 0.18, ALTURA_GUIA + 0.02, LARGURA_CALCADA + 12, xg, -0.02, lado * (LARGURA_RUA / 2 + (LARGURA_CALCADA + 12) / 2), '#8e8a82', { chanfro: 0.03 });
      }
    }
    // faixa central amarela tracejada e faixa de pedestres perto da esquina
    for (let x = X0; x < X1; x += 6) {
      if (x > TRANSV.x0 - 3 && x < TRANSV.x1 + 1) continue;
      m.bloco('concreto', 3, 0.008, 0.12, x, 0.001, 0, '#5e5233');
    }
    for (let i = 0; i < 7; i++) {
      const z = -LARGURA_RUA / 2 + 0.75 + i * 1.25;
      m.bloco('concreto', 3.2, 0.008, 0.6, TRANSV.x1 + 2.4, 0.001, z, '#8d8b86');
    }
    return { placas, guias: m.geometrias() };
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    placas.forEach((p, i) => {
      o.position.set(p.x, ALTURA_GUIA - 0.005, p.z);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      c.set('#5d5a54').multiplyScalar(0.82 + p.v * 0.3);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [placas]);

  const mats = materiaisBase();
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, placas.length]} receiveShadow>
        <boxGeometry args={[0.97, 0.03, (LARGURA_CALCADA - 0.2) / LARGURA_CALCADA - 0.03]} />
        <meshStandardMaterial roughness={0.75} metalness={0} envMapIntensity={0.6} />
      </instancedMesh>
      {guias.concreto && <mesh geometry={guias.concreto} material={mats.concreto} receiveShadow castShadow />}
    </>
  );
}

/** Postes de concreto com luminária de vapor de sódio. */
function Postes({ qualidade }: { qualidade: string }) {
  const geo = useMemo(() => {
    const m = new Montador();
    const lamp = new Montador();
    for (const p of POSTES) {
      const zBase = p.lado * (LARGURA_RUA / 2 + 0.35);
      m.cilindro('concreto', 0.09, 0.15, ALTURA_POSTE, [p.x, ALTURA_POSTE / 2, zBase], '#77736b', { lados: 12 });
      // braço
      m.caixa('metal', 0.07, 0.07, BRACO + 0.2, [p.x, ALTURA_POSTE - 0.1, zBase - p.lado * (BRACO / 2)], '#4b4d50');
      // luminária
      const [hx, hy, hz] = cabecaDoPoste(p);
      m.caixa('metal', 0.36, 0.14, 0.7, [hx, hy - 0.12, hz], '#3c3e41', { chanfro: 0.04 });
      lamp.caixa('luzFixa', 0.26, 0.03, 0.5, [hx, hy - 0.2, hz], '#ffffff');
    }
    return { corpo: m.geometrias(), lamp: lamp.geometrias().luzFixa! };
  }, []);
  const mats = materiaisBase();
  const sombra = qualidade === 'alta';
  return (
    <>
      {geo.corpo.concreto && <mesh geometry={geo.corpo.concreto} material={mats.concreto} castShadow receiveShadow />}
      {geo.corpo.metal && <mesh geometry={geo.corpo.metal} material={mats.metal} castShadow />}
      <mesh geometry={geo.lamp}>
        <meshBasicMaterial color={new Color(CORES.sodio).multiplyScalar(9)} />
      </mesh>
      {POSTES.map((p, i) => (
        <LuzDePoste key={i} p={p} sombra={sombra} />
      ))}
    </>
  );
}

function LuzDePoste({ p, sombra }: { p: (typeof POSTES)[number]; sombra: boolean }) {
  const ref = useRef<SpotLight>(null);
  const [hx, hy, hz] = cabecaDoPoste(p);
  useLayoutEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.target.position.set(hx, 0, hz - p.lado * 1.2);
    l.target.updateMatrixWorld();
  }, [hx, hz, p.lado]);
  return (
    <spotLight
      ref={ref}
      position={[hx, hy - 0.25, hz]}
      color={CORES.sodio}
      intensity={220}
      distance={32}
      angle={1.05}
      penumbra={0.85}
      decay={2}
      castShadow={sombra}
      shadow-mapSize={[512, 512]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
  );
}

/** Árvores de maquete: copa abstrata fosca, tronco fino, canteiro. */
function Arvores() {
  const geo = useMemo(() => {
    const m = new Montador();
    const pts: [number, number][] = [
      [17.4, 1],
      [-16.4, 1],
    ];
    pts.forEach(([x, lado], i) => {
      const z = lado * (LARGURA_RUA / 2 + 0.95);
      const r = semente(40 + i);
      m.bloco('concreto', 1.1, 0.04, 1.1, x, ALTURA_GUIA - 0.02, z, '#2a2520');
      m.cilindro('concreto', 0.07, 0.11, 2.6, [x, ALTURA_GUIA + 1.3, z], '#3b322b', { lados: 10 });
      const h = 3.4 + r() * 0.8;
      m.esfera('pintura', 1.25, [x, ALTURA_GUIA + h, z], '#1d2a22', [1, 1.15, 1]);
      m.esfera('pintura', 0.95, [x + 0.7, ALTURA_GUIA + h - 0.5, z + 0.3], '#1b271f', [1, 1, 1]);
      m.esfera('pintura', 0.9, [x - 0.6, ALTURA_GUIA + h - 0.3, z - 0.4], '#202e25', [1, 1.05, 1]);
    });
    return m.geometrias();
  }, []);
  const mats = materiaisBase();
  return (
    <>
      {geo.concreto && <mesh geometry={geo.concreto} material={mats.concreto} castShadow receiveShadow />}
      {geo.pintura && <mesh geometry={geo.pintura} material={mats.pintura} castShadow receiveShadow />}
    </>
  );
}

/** A cidade em volta: quarteirões escuros, poucas janelas acesas, sumindo na névoa. */
function Cidade() {
  const geo = useMemo(() => {
    const norte = new Montador();
    const sul = new Montador();
    const longeN = new Montador();
    const longeS = new Montador();
    let m = norte;
    const r = semente(99);
    const cores = ['#3a3d42', '#423e38', '#373e43', '#45413b', '#3b3b40'];
    const janela = (x: number, y: number, z: number, rotY: number) => {
      const acesa = r() < 0.12;
      const cor = acesa ? (r() < 0.7 ? '#4a3320' : '#26323d') : '#14171b';
      m.plano(acesa ? 'luzFixa' : 'escuro', 0.8, 1.0, [x, y, z], cor, [0, rotY, 0]);
    };
    const predio = (x: number, z: number, w: number, d: number, h: number, frente: 1 | -1) => {
      m = z >= 0 ? norte : sul;
      m.bloco('pintura', w, h, d, x, 0, z, cores[Math.floor(r() * cores.length)], { chanfro: 0.04 });
      const zf = z + frente * (d / 2 + 0.02);
      for (let y = 4.6; y < h - 1; y += 3) {
        for (let k = 0; k < Math.floor(w / 2.2); k++) janela(x - w / 2 + 1.1 + k * 2.2, y, zf, frente === 1 ? 0 : Math.PI);
      }
    };
    // continuação das fileiras da rua
    for (const lado of [1, -1] as const) {
      const ocupado = lotes.filter((l) => (lado === 1 ? l.lado === 'norte' : l.lado === 'sul'));
      const minX = Math.min(...ocupado.map((l) => l.x - l.largura / 2));
      const maxX = Math.max(...ocupado.map((l) => l.x + l.largura / 2));
      const zc = lado * (RECUO_FACHADA + PROFUNDIDADE_LOTE / 2);
      for (let x = maxX; x < X1; ) {
        const w = 5 + r() * 4;
        predio(x + w / 2, zc, w, PROFUNDIDADE_LOTE, 4.5 + Math.floor(r() * 3) * 3, (-lado) as 1 | -1);
        x += w;
      }
      for (let x = minX; x > TRANSV.x1; ) {
        const w = Math.min(5 + r() * 4, x - TRANSV.x1);
        if (w < 2) break;
        predio(x - w / 2, zc, w, PROFUNDIDADE_LOTE, 4.5 + Math.floor(r() * 2) * 3, (-lado) as 1 | -1);
        x -= w;
      }
      for (let x = TRANSV.x0; x > X0; ) {
        const w = 5 + r() * 4;
        predio(x - w / 2, zc, w, PROFUNDIDADE_LOTE, 4.5 + Math.floor(r() * 3) * 3, (-lado) as 1 | -1);
        x -= w;
      }
      // quarteirões de trás: baixos, para não tampar a câmera nem fazer sombra de lua na rua
      for (let fila = 0; fila < 3; fila++) {
        const z = lado * (RECUO_FACHADA + PROFUNDIDADE_LOTE + 6 + fila * 16);
        for (let x = X0; x < X1; ) {
          const w = 6 + r() * 8;
          predio(x + w / 2, z + lado * 6, w, 12, 4 + r() * 5, (-lado) as 1 | -1);
          x += w + (r() < 0.2 ? 3 : 0);
        }
      }
    }
    // longe, depois do fim da rua: alguns prédios altos (Sorocaba) sumindo na névoa
    for (let i = 0; i < 9; i++) {
      const x = 48 + r() * 60;
      const z = -40 + r() * 80;
      predio(x, z, 8 + r() * 6, 8 + r() * 6, 16 + r() * 26, r() > 0.5 ? 1 : -1);
    }
    // janelas acesas espalhadas no fundo: viram pontos de luz na névoa (o "bokeh" da cidade)
    for (let i = 0; i < 260; i++) {
      const lado = r() > 0.5 ? 1 : -1;
      const x = X0 + r() * (X1 - X0 + 50);
      const z = lado * (RECUO_FACHADA + PROFUNDIDADE_LOTE + 18 + r() * 60);
      const y = 2.5 + r() * 9;
      const quente = r() < 0.72;
      (lado === 1 ? longeN : longeS).plano('luzFixa', 0.7, 0.9, [x, y, z], quente ? '#ffb46a' : '#8fb4d9', [0, lado === 1 ? Math.PI : 0, 0]);
    }
    return {
      norte: norte.geometrias(),
      sul: sul.geometrias(),
      longeN: longeN.geometrias().luzFixa,
      longeS: longeS.geometrias().luzFixa,
    };
  }, []);
  const chao = useMemo(() => new MeshStandardMaterial({ color: '#121417', roughness: 1 }), []);
  // luzes da cidade ao longe: fortes o bastante para o brilho pegar mesmo através da névoa
  const luzLonge = useMemo(() => {
    const m = () => new MeshBasicMaterial({ vertexColors: true, color: new Color(2.4, 2.4, 2.4) });
    return { norte: recortar(m(), 'norte'), sul: recortar(m(), 'sul') };
  }, []);
  return (
    <>
      {geo.longeN && <mesh geometry={geo.longeN} material={luzLonge.norte} raycast={() => null} />}
      {geo.longeS && <mesh geometry={geo.longeS} material={luzLonge.sul} raycast={() => null} />}
      <Camadas geos={geo.norte} fileira="norte" sombra={false} />
      <Camadas geos={geo.sul} fileira="sul" sombra={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} material={chao}>
        <planeGeometry args={[600, 600]} />
      </mesh>
    </>
  );
}

export function Rua() {
  const qualidade = useEstado((s) => s.qualidade);
  return (
    <group>
      <Asfalto qualidade={qualidade} />
      <Calcadas />
      <Postes qualidade={qualidade} />
      <Arvores />
      <Cidade />
    </group>
  );
}
