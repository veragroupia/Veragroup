import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { entra, prog } from '../animations/movimento.ts';
import { cor, tipo } from '../styles/tema.ts';

/** Identificação de capítulo e narrador (canto superior esquerdo), no início de cada capítulo. */
export const Identificacao: React.FC<{ numero: string; tema: string; narrador: string; dur: number }> = ({ numero, tema, narrador, dur }) => {
	const f = useCurrentFrame();
	const p = prog(f, 0, 26);
	const s = prog(f, dur - 20, 20, entra);
	return (
		<AbsoluteFill style={{ pointerEvents: 'none' }}>
			<div style={{ position: 'absolute', left: 96, top: 76, opacity: 1 - s, display: 'flex', gap: 22, alignItems: 'stretch' }}>
				<div style={{ width: 2, background: cor.ciano, transform: `scaleY(${p})`, transformOrigin: 'top' }} />
				<div style={{ overflow: 'hidden' }}>
					<div style={{ transform: `translateX(${(1 - p) * -30}px)`, opacity: p }}>
						<div style={{ ...tipo.nota, color: cor.ciano }}>Capítulo {numero}</div>
						<div style={{ ...tipo.rotulo, fontSize: 24, letterSpacing: '0.06em', textTransform: 'none', color: cor.branco, marginTop: 8 }}>{tema}</div>
						<div style={{ ...tipo.nota, color: cor.cinza, marginTop: 10, textTransform: 'none', letterSpacing: '0.04em', fontSize: 19 }}>Narração: {narrador}</div>
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
