import React, { createContext, useContext } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { inOut, lerp, prog } from '../animations/movimento.ts';

export type Enquadre = { s: number; x: number; y: number };
type Chave = { f: number; e: Enquadre };

const Ctx = createContext<{ x: number; y: number }>({ x: 0, y: 0 });

/**
 * Câmera virtual: interpola enquadramentos (escala e deslocamento) entre chaves de tempo.
 * As chaves vêm das marcas de fala, então o movimento obedece à narração.
 */
export const Camera: React.FC<{ chaves: Chave[]; children: React.ReactNode }> = ({ chaves, children }) => {
	const frame = useCurrentFrame();
	let e = chaves[0].e;
	for (let i = 0; i < chaves.length - 1; i++) {
		const a = chaves[i];
		const b = chaves[i + 1];
		if (frame >= a.f) {
			const t = prog(frame, a.f, b.f - a.f, inOut);
			e = { s: lerp(a.e.s, b.e.s, t), x: lerp(a.e.x, b.e.x, t), y: lerp(a.e.y, b.e.y, t) };
		}
	}
	return (
		<Ctx.Provider value={{ x: e.x, y: e.y }}>
			<AbsoluteFill style={{ transform: `scale(${e.s}) translate(${-e.x}px, ${-e.y}px)`, transformOrigin: '50% 50%' }}>
				{children}
			</AbsoluteFill>
		</Ctx.Provider>
	);
};

/** Camada de parallax: profundidade < 1 move menos que a câmera (fundo), > 1 move mais (primeiro plano). */
export const Camada: React.FC<{ profundidade: number; children: React.ReactNode }> = ({ profundidade, children }) => {
	const { x, y } = useContext(Ctx);
	const k = profundidade - 1;
	return <AbsoluteFill style={{ transform: `translate(${-x * k}px, ${-y * k}px)` }}>{children}</AbsoluteFill>;
};
