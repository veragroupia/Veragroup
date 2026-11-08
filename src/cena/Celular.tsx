import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { type Group, type Mesh, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type Texture, TextureLoader } from 'three';

const carregador = new TextureLoader();
const cache = new Map<string, Texture>();

function carregar(src: string) {
  let t = cache.get(src);
  if (!t) {
    t = carregador.load(src);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(src, t);
  }
  return t;
}

/**
 * Celular 3D flutuando ao lado da loja, com as telas reais trocando sozinhas.
 * Aceita endereços de imagem (cases) ou texturas prontas (prévia da loja do visitante).
 */
export function Celular({
  telas,
  texturas,
  posicao,
  rotY = 0,
  escala = 2.2,
  visivel,
}: {
  telas?: string[];
  texturas?: Texture[];
  posicao: [number, number, number];
  rotY?: number;
  escala?: number;
  visivel: number;
}) {
  const grupo = useRef<Group>(null);
  const tela = useRef<Mesh>(null);
  const lista = useMemo(() => texturas ?? (telas ?? []).map(carregar), [telas, texturas]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lista.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % lista.length), 2800);
    return () => clearInterval(id);
  }, [lista]);
  // nasce já com a primeira tela: assim a pré-compilação (atrás do pôster) gera o shader com textura,
  // e abrir o case não trava para compilar
  const matTela = useMemo(() => new MeshBasicMaterial({ toneMapped: false, map: lista[0] ?? null }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const matCorpo = useMemo(() => new MeshStandardMaterial({ color: '#111216', roughness: 0.35, metalness: 0.6 }), []);
  useEffect(() => {
    const nova = lista[i] ?? null;
    matTela.color.setScalar(0.92);
    // só recompila se passar de "sem textura" para "com textura" (ou o contrário)
    if (Boolean(nova) !== Boolean(matTela.map)) matTela.needsUpdate = true;
    matTela.map = nova;
  }, [i, lista, matTela]);

  useFrame(({ clock }) => {
    if (!grupo.current) return;
    const s = Math.max(0.0001, visivel) * escala;
    grupo.current.scale.setScalar(s);
    grupo.current.position.y = posicao[1] + Math.sin(clock.elapsedTime * 1.1) * 0.06;
    grupo.current.visible = visivel > 0;
  });

  return (
    <group ref={grupo} position={posicao} rotation={[0, rotY, 0]}>
      <RoundedBox args={[0.44, 0.92, 0.045]} radius={0.05} smoothness={4} material={matCorpo} />
      <mesh ref={tela} position={[0, 0, 0.0235]} material={matTela}>
        <planeGeometry args={[0.4, 0.865]} />
      </mesh>
    </group>
  );
}
