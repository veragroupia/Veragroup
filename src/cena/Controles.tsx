import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { MathUtils } from 'three';
import { relogio, useEstado } from '../estado';
import { atualizarCorte } from './corte';

const { ACTION } = CameraControlsImpl;
const grau = MathUtils.degToRad;

/** Enquadramento inicial por formato de tela. Ajustado olhando os prints em 390×844 e 1440×900. */
export function enquadramento(aspecto: number): {
  fov: number;
  azimute: number;
  polar: number;
  distancia: number;
  alvo: readonly [number, number, number];
  desvio: readonly [number, number];
} {
  if (aspecto < 0.8) {
    return { fov: 36, azimute: 234, polar: 63, distancia: 60, alvo: [-1, 2.4, 5] as const, desvio: [0, -2.6] as const };
  }
  if (aspecto < 1.3) {
    return { fov: 30, azimute: 216, polar: 66, distancia: 62, alvo: [-1, 2.8, 5] as const, desvio: [-3, 0.6] as const };
  }
  // no desktop o texto fica à esquerda: a rua escorrega para a direita da tela
  return { fov: 26, azimute: 211, polar: 63, distancia: 57, alvo: [-0.5, 3.2, 6.5] as const, desvio: [-7.2, -0.6] as const };
}

export function Controles() {
  const ref = useRef<CameraControlsImpl>(null);
  const { camera, gl, size } = useThree();
  const entradaFeita = useEstado((s) => s.entradaFeita);
  const aspecto = size.width / size.height;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (import.meta.env.DEV) Object.assign((window as unknown as { __vera: object }).__vera ?? {}, { controles: c });
    const e = enquadramento(aspecto);
    if ('fov' in camera) {
      camera.fov = e.fov;
      camera.updateProjectionMatrix();
    }
    c.minAzimuthAngle = grau(197);
    c.maxAzimuthAngle = grau(322);
    c.minPolarAngle = grau(30);
    c.maxPolarAngle = grau(74);
    c.minDistance = e.distancia * 0.62;
    c.maxDistance = e.distancia * 1.25;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.DOLLY;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY;
    c.touches.three = ACTION.NONE;
    c.dollyToCursor = false;
    c.azimuthRotateSpeed = 0.55;
    c.polarRotateSpeed = 0.4;
    c.draggingSmoothTime = 0.12;

    const [tx, ty, tz] = e.alvo;
    // ?az=300 abre a câmera em outro ângulo (prints e pôster)
    const azParam = Number(new URLSearchParams(location.search).get('az'));
    if (azParam) e.azimute = azParam;
    const comDeriva = !relogio.semMovimento && relogio.congelado === null && !entradaFeita;
    // a entrada começa um pouco mais longe e chega devagar: sem tranco
    c.smoothTime = 0.25;
    c.setTarget(tx, ty, tz, false);
    c.setFocalOffset(e.desvio[0], e.desvio[1], 0, false);
    c.rotateTo(grau(e.azimute) + (comDeriva ? grau(-4) : 0), grau(e.polar), false);
    c.dollyTo(e.distancia * (comDeriva ? 1.08 : 1), false);
    if (comDeriva) {
      c.smoothTime = 1.4;
      c.rotateTo(grau(e.azimute), grau(e.polar), true);
      c.dollyTo(e.distancia, true);
      const fim = setTimeout(() => {
        if (ref.current) ref.current.smoothTime = 0.25;
      }, 3600);
      return () => clearTimeout(fim);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspecto, camera]);

  useEffect(() => {
    // no celular, arrastar na vertical rola a página; na horizontal gira a rua; pinça dá zoom
    gl.domElement.style.touchAction = 'pan-y';
  }, [gl]);

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    atualizarCorte(MathUtils.radToDeg(c.azimuthAngle), dt, relogio.congelado !== null || relogio.semMovimento);
  });

  return <CameraControls ref={ref} makeDefault />;
}
