import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { suspend } from 'suspend-react';
import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  Color,
  type Group,
  type InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  type Sprite,
  SpriteMaterial,
} from 'three';
import type { Lote, Vitrine } from '../data/rua';
import { segmentoPorId, type IdSegmento } from '../data/segmentos';
import { relogio, useEstado, type SuaLoja } from '../estado';
import { assarPostes } from './assar';
import { planos, raycastCortado, type Fileira } from './corte';
import { matrizDaLoja, postesLocais } from './geoQuarteirao';
import type { Camada } from './kit';
import { construirLoja, construirTerreno } from './lojaGeo';
import { materialAditivo, materialInterior, recortar } from './materiais';
import { registrar, remover, type LojaMundo } from './registro';
import { tela, texturaHalo, texturaInterior, texturaLetreiro } from './texturas';
import { Camadas } from './LojaCase';
import { Celular } from './Celular';

const VITRINE: Record<IdSegmento, Vitrine> = {
  confeitaria: 'doces',
  restaurante: 'doces',
  joalheria: 'joias',
  roupa: 'roupas',
  oficina: 'oficina',
  academia: 'academia',
  petshop: 'pet',
  odonto: 'clinica',
  salao: 'clinica',
  outro: 'roupas',
};

function escurecer(hex: string, f: number) {
  const c = new Color(hex);
  c.multiplyScalar(f);
  return '#' + c.getHexString();
}

function loteDoVisitante(base: Lote, loja: SuaLoja): Lote {
  const comida = loja.segmento === 'confeitaria' || loja.segmento === 'restaurante';
  return {
    ...base,
    id: 'visitante',
    nome: loja.nome,
    andares: 2,
    status: 'perdendo',
    fachada: { parede: loja.cor, detalhe: escurecer(loja.cor, 0.86), esquadria: '#1d2024' },
    toldo: comida ? { cor: '#6e2a26', sanefa: '#e9dccb' } : undefined,
    marquise: !comida,
    letreiro: { texto: loja.nome.trim() || segmentoPorId(loja.segmento).letreiro, estilo: 'letras', fundo: '#0f1015', tinta: '#f2efe8', fonte: 'syne' },
    vitrine: VITRINE[loja.segmento],
  };
}

/** Prévia do site da loja do visitante, desenhada em canvas (duas telas que se alternam no celular). */
function telasDaPrevia(loja: SuaLoja): CanvasTexture[] {
  const seg = segmentoPorId(loja.segmento);
  const desenhar = (segunda: boolean) => {
    const W = 400;
    const H = 866;
    const { c, ctx } = tela(W, H);
    ctx.fillStyle = '#0d0e16';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2efe8';
    ctx.font = '700 30px Syne';
    ctx.letterSpacing = '-0.5px';
    ctx.fillText(loja.nome.slice(0, 18), 24, 72);
    ctx.font = '400 17px "DM Sans"';
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(242,239,232,0.6)';
    ctx.fillText(`${seg.nome} · ${loja.cidade}`, 24, 102);
    if (!segunda) {
      ctx.fillStyle = loja.cor;
      ctx.fillRect(24, 130, W - 48, 300);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(24, 330, W - 48, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px Syne';
      ctx.fillText('Bem-vindo', 44, 390);
      const botoes = ['Como chegar', 'Horário de hoje'];
      botoes.forEach((b, i) => {
        ctx.fillStyle = '#16171f';
        ctx.fillRect(24, 460 + i * 76, W - 48, 60);
        ctx.fillStyle = '#f2efe8';
        ctx.font = '500 19px "DM Sans"';
        ctx.fillText(b, 44, 497 + i * 76);
      });
    } else {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#16171f';
        ctx.fillRect(24, 140 + i * 132, W - 48, 116);
        ctx.fillStyle = loja.cor;
        ctx.fillRect(36, 152 + i * 132, 92, 92);
        ctx.fillStyle = 'rgba(242,239,232,0.75)';
        ctx.fillRect(146, 172 + i * 132, 150, 14);
        ctx.fillStyle = 'rgba(242,239,232,0.35)';
        ctx.fillRect(146, 200 + i * 132, 100, 12);
      }
    }
    ctx.fillStyle = '#25d366';
    ctx.beginPath();
    ctx.roundRect(24, H - 110, W - 48, 64, 16);
    ctx.fill();
    ctx.fillStyle = '#05140b';
    ctx.font = '600 20px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText('Chamar no WhatsApp', W / 2, H - 70);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  };
  return [desenhar(false), desenhar(true)];
}

let texBalao: CanvasTexture | null = null;
function texturaBalao() {
  if (texBalao) return texBalao;
  const { c, ctx } = tela(256, 160);
  ctx.fillStyle = '#25d366';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 120, 34);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(40, 120);
  ctx.lineTo(28, 154);
  ctx.lineTo(78, 124);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(40, 44, 150, 14);
  ctx.fillRect(40, 74, 110, 14);
  texBalao = new CanvasTexture(c);
  texBalao.colorSpace = SRGBColorSpace;
  return texBalao;
}

let texNfc: CanvasTexture | null = null;
function texturaNfc() {
  if (texNfc) return texNfc;
  const { c, ctx } = tela(256, 340);
  ctx.fillStyle = '#0d0e16';
  ctx.fillRect(0, 0, 256, 340);
  ctx.strokeStyle = '#e2c48a';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(108, 150, 30 + i * 26, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = '#e2c48a';
  ctx.font = '700 40px Syne';
  ctx.textAlign = 'center';
  ctx.fillText('NFC', 128, 290);
  texNfc = new CanvasTexture(c);
  texNfc.colorSpace = SRGBColorSpace;
  return texNfc;
}

const obj = new Object3D();

/** Vitrine que se enche quando o cardápio liga: produtos aparecem um a um. */
function VitrineCheia({ ligado, cor, planosCorte }: { ligado: boolean; cor: string; planosCorte: import('three').Plane[] }) {
  const ref = useRef<InstancedMesh>(null);
  const N = 14;
  const nivel = useRef(0);
  const geo = useMemo(() => new BoxGeometry(0.22, 0.2, 0.22), []);
  const mat = useMemo(() => recortar(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: new Color('#3a2a1a'), emissiveIntensity: 1 }), planosCorte), [planosCorte]);
  const cores = useMemo(() => ['#f1d9c4', '#6b3b2a', cor, '#e8b4bd', '#c98a4a', '#fff1df'].map((c) => new Color(c)), [cor]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < N; i++) m.setColorAt(i, cores[i % cores.length]);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cores]);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    nivel.current += ((ligado ? 1 : 0) - nivel.current) * (1 - Math.exp(-dt * 3));
    for (let i = 0; i < N; i++) {
      const fila = i < 7 ? 0 : 1;
      const k = Math.min(1, Math.max(0, nivel.current * 1.6 - (i / N) * 0.6));
      obj.position.set(-2.6 + (i % 7) * 0.42, 0.62 + fila * 0.42, -0.62);
      obj.scale.setScalar(Math.max(0.0001, k));
      obj.rotation.y = i * 0.7;
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh position={[-1.35, 0.5, -0.62]} material={mat}>
        <boxGeometry args={[3.2, 0.04, 0.5]} />
      </mesh>
      <mesh position={[-1.35, 0.92, -0.62]} material={mat}>
        <boxGeometry args={[3.2, 0.04, 0.5]} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, mat, N]} frustumCulled={false} />
    </group>
  );
}

/** Balões de WhatsApp saindo da loja. */
function Baloes({ ligado }: { ligado: boolean }) {
  const refs = useRef<(Sprite | null)[]>([]);
  const mat = useMemo(() => new SpriteMaterial({ map: texturaBalao(), transparent: true, depthWrite: false }), []);
  const nivel = useRef(0);
  useFrame(({ clock }, dt) => {
    nivel.current += ((ligado ? 1 : 0) - nivel.current) * (1 - Math.exp(-dt * 3));
    refs.current.forEach((s, i) => {
      if (!s) return;
      const fase = (clock.elapsedTime * 0.32 + i / 3) % 1;
      s.position.set(1.4 + Math.sin(i * 2 + fase * 3) * 0.4, 3.6 + fase * 4.2, 1.4);
      const a = Math.sin(fase * Math.PI) * nivel.current;
      s.scale.set(1.3 * Math.max(0.0001, a), 0.81 * Math.max(0.0001, a), 1);
      s.visible = a > 0.02;
    });
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(s) => {
            refs.current[i] = s;
          }}
          material={mat}
          renderOrder={6}
        />
      ))}
    </>
  );
}

export function TerrenoVisitante({ lote }: { lote: Lote }) {
  const loja = useEstado((s) => s.suaLoja);
  const irPara = useEstado((s) => s.irPara);
  const setSobre = useEstado((s) => s.setSobre);
  const fileira: Fileira = lote.lado;
  const matriz = useMemo(() => matrizDaLoja(lote.x, lote.lado), [lote]);
  const raycast = useMemo(() => raycastCortado(fileira), [fileira]);
  const planosCorte = useMemo(() => [planos[fileira]], [fileira]);

  const terreno = useMemo(() => {
    const t = construirTerreno(lote);
    for (const [c, g] of Object.entries(t.corpo) as [Camada, BufferGeometry][]) if (c === 'pintura' || c === 'concreto' || c === 'metal') assarPostes(g, postesLocais(), matriz);
    return t;
  }, [lote, matriz]);

  const loteV = useMemo(() => loteDoVisitante(lote, loja), [lote, loja.nome, loja.cor, loja.segmento]); // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => {
    if (!loja.construida) return null;
    const g = construirLoja(loteV);
    for (const conj of [g.corpo, g.frente, g.frenteD])
      for (const [c, geom] of Object.entries(conj) as [Camada, BufferGeometry][])
        if (c === 'pintura' || c === 'concreto' || c === 'metal' || c === 'tecido') assarPostes(geom, postesLocais(), matriz);
    return g;
  }, [loteV, loja.construida, matriz]);

  const letreiroTex = suspend(
    async () => (loja.construida && loteV.letreiro && geo?.letreiro ? texturaLetreiro(loteV.letreiro, geo.letreiro.w, geo.letreiro.h) : null),
    ['letreiro-visitante', loja.construida, loteV.letreiro?.texto ?? '', geo?.letreiro?.w ?? 0],
  );

  const mats = useMemo(() => {
    const r = <T,>(m: T): T => recortar(m, planosCorte);
    const interior = materialInterior(planosCorte);
    const fundoTex = texturaInterior(loteV.vitrine ?? 'roupas');
    const fundo = r(new MeshStandardMaterial({ map: fundoTex, emissiveMap: fundoTex, emissive: new Color('#ffffff'), emissiveIntensity: 0, roughness: 0.9, color: new Color('#555555') }));
    const letreiroFrente = r(new MeshStandardMaterial({ map: letreiroTex?.cor ?? null, emissiveMap: letreiroTex?.brilho ?? null, emissive: new Color('#ffffff'), emissiveIntensity: 0, roughness: 0.5 }));
    const letreiroLado = r(new MeshStandardMaterial({ color: new Color('#1d1f22'), roughness: 0.5, metalness: 0.5 }));
    const halo = r(materialAditivo('#ffbf7a', 0));
    halo.map = texturaHalo();
    const lampObra = new MeshBasicMaterial({ color: new Color('#ffcf8a').multiplyScalar(3.2) });
    const nfc = r(new MeshBasicMaterial({ map: texturaNfc(), toneMapped: false }));
    const balcao = r(new MeshStandardMaterial({ color: '#2a2b31', roughness: 0.6 }));
    return { interior, fundo, letreiroFrente, letreiroLado, halo, lampObra, nfc, balcao };
  }, [loteV.vitrine, letreiroTex, planosCorte]);

  const previa = useMemo(() => (loja.construida ? telasDaPrevia(loja) : []), [loja.construida, loja.nome, loja.cor, loja.segmento, loja.cidade]); // eslint-disable-line react-hooks/exhaustive-deps

  const registro = useMemo<LojaMundo>(
    () => ({
      id: loja.construida ? 'visitante' : lote.id,
      nome: loja.construida ? loja.nome : 'E a sua loja?',
      segmento: loja.segmento,
      tipo: loja.construida ? 'visitante' : 'terreno',
      lado: lote.lado === 'norte' ? 1 : -1,
      x: lote.x,
      largura: lote.largura,
      altura: geo?.altura ?? 2.6,
      xPorta: lote.x - (lote.lado === 'norte' ? 1.6 : -1.6),
      acesaBase: false,
      luz: 0,
    }),
    [loja.construida, loja.nome, loja.segmento, lote, geo],
  );
  useEffect(() => {
    registrar([registro]);
    return () => remover([registro.id]);
  }, [registro]);

  const subida = useRef<Group>(null);
  const nivel = useRef(0);
  const letreiroNivel = useRef(0);
  const site = useRef(0);
  const algum = Object.values(loja.servicos).some(Boolean);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3);
    nivel.current += ((algum ? 1 : 0.1) - nivel.current) * k;
    letreiroNivel.current += ((loja.servicos.site ? 1 : 0) - letreiroNivel.current) * k;
    site.current = letreiroNivel.current;
    registro.luz = algum ? nivel.current : 0;
    registro.atrai = loja.servicos.google;
    mats.interior.emissiveIntensity = nivel.current * 2.6;
    mats.fundo.emissiveIntensity = nivel.current * 2.8;
    mats.halo.opacity = nivel.current * 0.42;
    mats.letreiroFrente.emissiveIntensity = letreiroNivel.current * 2.6;
    if (subida.current && geo) {
      const t = relogio.semMovimento || relogio.congelado !== null ? 1 : Math.min(1, Math.max(0, (relogio.t - (loja.construidaEm ?? 0)) / 1.6));
      const e = 1 - Math.pow(1 - t, 3);
      subida.current.position.y = -geo.altura * (1 - e);
    }
  });

  const interacao = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setSobre(registro.id);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setSobre(null);
      document.body.style.cursor = '';
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      irPara('sua-loja');
    },
  };

  const pos: [number, number, number] = [matriz.elements[12], matriz.elements[13], matriz.elements[14]];
  const rot: [number, number, number] = [0, lote.lado === 'norte' ? Math.PI : 0, 0];

  if (!loja.construida || !geo) {
    return (
      <group position={pos} rotation={rot} {...interacao}>
        <Camadas geos={terreno.corpo} chave={`terreno-${fileira}`} planosCorte={planosCorte} raycast={raycast} />
        {terreno.lampadas && <mesh geometry={terreno.lampadas} material={mats.lampObra} />}
        <mesh position={[0, 1.2, -2.5]} visible={false} raycast={raycast}>
          <boxGeometry args={[lote.largura, 2.4, 5]} />
        </mesh>
      </group>
    );
  }

  const matLetreiro = [mats.letreiroLado, mats.letreiroLado, mats.letreiroLado, mats.letreiroLado, mats.letreiroFrente, mats.letreiroLado];
  return (
    <group position={pos} rotation={rot}>
      <group ref={subida} {...interacao}>
        <Camadas geos={geo.corpo} chave={`visitante-${fileira}`} planosCorte={planosCorte} raycast={raycast} />
        <Camadas geos={geo.frente} chave={`visitante-${fileira}`} planosCorte={planosCorte} raycast={raycast} />
        <Camadas geos={geo.frenteD} chave={`visitante-${fileira}`} planosCorte={planosCorte} raycast={raycast} />
        <mesh geometry={geo.interior} material={mats.interior} />
        <mesh position={geo.fundo.pos} material={mats.fundo}>
          <planeGeometry args={[geo.fundo.w, geo.fundo.h]} />
        </mesh>
        <mesh position={geo.halo.pos} material={mats.halo} renderOrder={3} raycast={() => null}>
          <planeGeometry args={[geo.halo.w, geo.halo.h]} />
        </mesh>
        {geo.letreiro && (
          <mesh material={matLetreiro} position={geo.letreiro.pos}>
            <boxGeometry args={[geo.letreiro.w, geo.letreiro.h, 0.1]} />
          </mesh>
        )}
        <VitrineCheia ligado={loja.servicos.cardapio} cor={loja.cor} planosCorte={planosCorte} />
        {/* balcão de atendimento perto da porta, com a plaquinha NFC */}
        <mesh position={[1.75, 0.5, -1.6]} material={mats.balcao}>
          <boxGeometry args={[1.1, 1.0, 0.6]} />
        </mesh>
        <PlaquinhaNfc ligado={loja.servicos.nfc} material={mats.nfc} />
        <Baloes ligado={loja.servicos.whatsapp} />
      </group>
      <CelularPrevia texturas={previa} ligadoRef={site} largura={lote.largura} />
    </group>
  );
}

function PlaquinhaNfc({ ligado, material }: { ligado: boolean; material: MeshBasicMaterial }) {
  const ref = useRef<Mesh>(null);
  const n = useRef(0);
  useFrame((_, dt) => {
    n.current += ((ligado ? 1 : 0) - n.current) * (1 - Math.exp(-dt * 4));
    if (ref.current) {
      ref.current.scale.setScalar(Math.max(0.0001, n.current) * 1.6);
      ref.current.visible = n.current > 0.02;
    }
  });
  return (
    <mesh ref={ref} position={[1.75, 1.28, -1.45]} rotation={[-0.25, 0, 0]} material={material}>
      <planeGeometry args={[0.22, 0.29]} />
    </mesh>
  );
}

function CelularPrevia({ texturas, ligadoRef, largura }: { texturas: CanvasTexture[]; ligadoRef: { current: number }; largura: number }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.scale.setScalar(Math.max(0.0001, ligadoRef.current));
    ref.current.visible = ligadoRef.current > 0.02;
  });
  return (
    <group ref={ref}>
      <Celular texturas={texturas} posicao={[largura / 2 + 1.2, 2.4, 2.2]} rotY={-0.35} visivel={1} />
    </group>
  );
}

