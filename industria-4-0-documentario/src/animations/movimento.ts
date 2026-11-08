import { Easing, interpolate } from 'remotion';

// Curvas únicas para o filme inteiro: a consistência vem daqui.
export const suave = Easing.bezier(0.22, 1, 0.36, 1); // saída suave (entradas)
export const inOut = Easing.bezier(0.65, 0, 0.35, 1); // movimentos de câmera
export const entra = Easing.bezier(0.55, 0, 0.75, 0.2);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0→1 entre `inicio` e `inicio + dur` (frames), com easing. */
export const prog = (frame: number, inicio: number, dur: number, ease = suave) =>
	interpolate(frame, [inicio, inicio + Math.max(1, dur)], [0, 1], { ...clamp, easing: ease });

/** Mapeia com clamp. */
export const mapa = (v: number, de: [number, number], para: [number, number], ease?: (t: number) => number) =>
	interpolate(v, de, para, { ...clamp, easing: ease });

/** Entrada e saída (opacidade típica de um elemento dentro de uma janela de tempo). */
export const janela = (frame: number, inicio: number, fim: number, entrada = 14, saida = 14) =>
	Math.min(prog(frame, inicio, entrada), 1 - prog(frame, fim - saida, saida, entra));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
