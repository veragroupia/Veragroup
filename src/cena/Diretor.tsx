import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { Box3, MathUtils, Vector3 } from 'three';
import { lotes } from '../data/rua';
import { relogio, useEstado } from '../estado';
import { abrirCortina, fecharCortina } from '../ui/cortina';
import { atualizarCorte } from './corte';
import { centroDoMapa, MAPA_ORIGEM, posicaoDaCidade } from './Mapa';
import { lojaDoRegistro } from './registro';

const { ACTION } = CameraControlsImpl;
const grau = MathUtils.degToRad;

type Modo = 'rua' | 'mapa';
interface Pose {
  modo: Modo;
  alvo: [number, number, number];
  azimute: number;
  polar: number;
  distancia: number;
  /** deslocamento lateral/vertical, como fração da distância (abre espaço para texto e painéis) */
  desvio: [number, number];
}

export function fovDoAspecto(aspecto: number) {
  return aspecto < 0.8 ? 38 : aspecto < 1.3 ? 32 : 27;
}

function calcularPose(aspecto: number, xRua: number): Pose {
  const s = useEstado.getState();
  const celular = aspecto < 0.8;
  // com painel: no desktop o assunto vai para a esquerda; no celular, para cima do bottom sheet
  const desvioPainel: [number, number] = celular ? [0, 0.19] : [0.17, 0];
  if (s.momento === 'perto' || s.momento === 'contato') {
    const foco = s.cidadeFoco ? posicaoDaCidade(s.cidadeFoco) : centroDoMapa();
    return {
      modo: 'mapa',
      alvo: [foco.x, 0, foco.z],
      // câmera ao sul olhando para o norte: Sorocaba embaixo à esquerda, Indaiatuba em cima à direita
      azimute: 348,
      polar: celular ? 40 : 46,
      distancia: (s.cidadeFoco ? 32 : 96) * (celular ? 1.3 : 1),
      desvio: desvioPainel,
    };
  }
  if (s.lojaFoco) {
    const curado = lotes.find((x) => x.id === s.lojaFoco);
    const l = lojaDoRegistro(s.lojaFoco) ?? (curado ? { x: curado.x, lado: curado.lado === 'norte' ? 1 : -1 } : undefined);
    if (l)
      return {
        modo: 'rua',
        alvo: [l.x, 2.4, l.lado * 5.6],
        azimute: l.lado === 1 ? 202 : 338,
        polar: 62,
        distancia: celular ? 30 : 26,
        desvio: desvioPainel,
      };
  }
  if (s.momento === 'trabalhos' && s.caso) {
    const l = lotes.find((x) => x.caseId === s.caso)!;
    return { modo: 'rua', alvo: [l.x, 1.9, 6.3], azimute: 200, polar: 57, distancia: celular ? 21 : 17, desvio: desvioPainel };
  }
  if (s.momento === 'trabalhos') return { modo: 'rua', alvo: [0.3, 2.6, 6.5], azimute: 206, polar: 63, distancia: celular ? 44 : 36, desvio: desvioPainel };
  if (s.momento === 'sua-loja') return { modo: 'rua', alvo: [0, 2.6, 6.4], azimute: 202, polar: 66, distancia: celular ? 32 : 27, desvio: desvioPainel };
  // cidade
  return {
    modo: 'rua',
    alvo: [xRua, 3.0, 5.5],
    azimute: celular ? 232 : 211,
    polar: 63,
    distancia: celular ? 62 : 60,
    desvio: celular ? [0, -0.04] : [-0.12, -0.01],
  };
}

const LIMITE_RUA = new Box3(new Vector3(-4000, 0.5, -9.5), new Vector3(4000, 6, 9.5));
const LIMITE_MAPA = new Box3(new Vector3(MAPA_ORIGEM.x - 70, -1, MAPA_ORIGEM.z - 70), new Vector3(MAPA_ORIGEM.x + 70, 3, MAPA_ORIGEM.z + 70));

function configurar(c: CameraControlsImpl, p: Pose) {
  if (p.modo === 'rua') {
    c.minAzimuthAngle = grau(195);
    c.maxAzimuthAngle = grau(345);
    c.minPolarAngle = grau(28);
    c.maxPolarAngle = grau(76);
    c.mouseButtons.left = ACTION.TRUCK;
    c.mouseButtons.right = ACTION.ROTATE;
    c.touches.one = ACTION.TOUCH_TRUCK;
    c.touches.two = ACTION.TOUCH_DOLLY_ROTATE;
    c.setBoundary(LIMITE_RUA);
  } else {
    c.minAzimuthAngle = -Infinity;
    c.maxAzimuthAngle = Infinity;
    c.minPolarAngle = grau(18);
    c.maxPolarAngle = grau(70);
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.right = ACTION.TRUCK;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
    c.setBoundary(LIMITE_MAPA);
  }
  c.mouseButtons.wheel = ACTION.DOLLY;
  c.mouseButtons.middle = ACTION.DOLLY;
  c.touches.three = ACTION.NONE;
  c.minDistance = p.distancia * 0.5;
  c.maxDistance = p.distancia * 1.5;
  c.dollyToCursor = false;
  c.azimuthRotateSpeed = 0.5;
  c.polarRotateSpeed = 0.4;
  c.truckSpeed = 1.6;
  c.draggingSmoothTime = 0.1;
}

function aplicar(c: CameraControlsImpl, p: Pose, suave: boolean) {
  const [tx, ty, tz] = p.alvo;
  const az = grau(p.azimute);
  const po = grau(p.polar);
  const x = tx + Math.sin(az) * Math.sin(po) * p.distancia;
  const y = ty + Math.cos(po) * p.distancia;
  const z = tz + Math.cos(az) * Math.sin(po) * p.distancia;
  void c.setLookAt(x, y, z, tx, ty, tz, suave);
  void c.setFocalOffset(p.desvio[0] * p.distancia, p.desvio[1] * p.distancia, 0, suave);
}

export function Diretor() {
  const ref = useRef<CameraControlsImpl>(null);
  const { camera, size, gl } = useThree();
  const aspecto = size.width / size.height;
  const momento = useEstado((s) => s.momento);
  const caso = useEstado((s) => s.caso);
  const lojaFoco = useEstado((s) => s.lojaFoco);
  const cidadeFoco = useEstado((s) => s.cidadeFoco);
  const introFeita = useEstado((s) => s.introFeita);
  const modoAtual = useRef<Modo>('rua');
  const xRua = useRef(0);
  const primeira = useRef(true);
  const descida = useRef(false);
  const alvo = useRef(new Vector3());

  useEffect(() => {
    if ('fov' in camera) {
      camera.fov = fovDoAspecto(aspecto);
      camera.updateProjectionMatrix();
    }
  }, [aspecto, camera]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (modoAtual.current === 'rua') xRua.current = c.getTarget(alvo.current).x;
    const pose = calcularPose(aspecto, xRua.current);
    const mudouDeLugar = pose.modo !== modoAtual.current || Math.abs(c.getTarget(alvo.current).x - pose.alvo[0]) > 240;
    const instantaneo = relogio.semMovimento || relogio.congelado !== null;

    if (primeira.current) {
      primeira.current = false;
      configurar(c, pose);
      if (!instantaneo && !introFeita) {
        // abertura: começa alto e longe, e desce até a rua quando o logo sai
        aplicar(c, { ...pose, polar: 40, distancia: pose.distancia * 1.55, azimute: pose.azimute - 8 }, false);
      } else aplicar(c, pose, false);
      modoAtual.current = pose.modo;
      return;
    }

    if (mudouDeLugar && !instantaneo) {
      let vivo = true;
      void fecharCortina().then(() => {
        if (!vivo || !ref.current) return;
        configurar(ref.current, pose);
        aplicar(ref.current, pose, false);
        modoAtual.current = pose.modo;
        abrirCortina();
      });
      return () => {
        vivo = false;
      };
    }
    configurar(c, pose);
    // a descida da abertura é lenta e cinematográfica; o resto, um voo de ~1 s
    if (introFeita && !descida.current) {
      descida.current = true;
      c.smoothTime = 1.5;
    } else c.smoothTime = 0.55;
    aplicar(c, pose, !instantaneo);
    modoAtual.current = pose.modo;
  }, [momento, caso, lojaFoco, cidadeFoco, aspecto, introFeita]); // eslint-disable-line react-hooks/exhaustive-deps

  // teclado: setas andam pela rua, + e - aproximam
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const c = ref.current;
      const alvoEl = e.target as HTMLElement;
      if (!c || alvoEl.closest('input, textarea, select, [contenteditable]')) return;
      const t = c.getTarget(alvo.current);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (modoAtual.current !== 'rua') return;
        // a direita da tela é -x (a câmera olha para o norte)
        const passo = e.key === 'ArrowRight' ? -8 : 8;
        void c.moveTo(t.x + passo, t.y, t.z, true);
        e.preventDefault();
      } else if (e.key === '+' || e.key === '=') void c.dolly(6, true);
      else if (e.key === '-') void c.dolly(-6, true);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  useEffect(() => {
    gl.domElement.style.touchAction = 'none';
    if (import.meta.env.DEV) Object.assign((window as unknown as { __vera: object }).__vera ?? {}, { controles: ref.current });
  }, [gl]);

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c || modoAtual.current !== 'rua') return;
    atualizarCorte(MathUtils.radToDeg(c.azimuthAngle), dt, relogio.semMovimento || relogio.congelado !== null);
  });

  return <CameraControls ref={ref} makeDefault />;
}
