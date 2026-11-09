import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { linha, roteiro } from '../data/dados.ts';
import { blocosDeLegenda, duasLinhas } from '../data/legendas.ts';
import { cor, fonte } from '../styles/tema.ts';

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Destaque pontual (cor, sem animação por palavra) para termos importantes. */
const Linha: React.FC<{ texto: string; re: RegExp }> = ({ texto, re }) => {
	const partes = texto.split(re);
	return (
		<div>
			{partes.map((p, i) =>
				i % 2 === 1 ? (
					<span key={i} style={{ color: cor.ciano, fontWeight: 600 }}>
						{p}
					</span>
				) : (
					<span key={i}>{p}</span>
				),
			)}
		</div>
	);
};

/** Legendas da narração: discretas, inferiores, até duas linhas, com margem de segurança. */
export const Legendas: React.FC = () => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();
	const blocos = useMemo(() => blocosDeLegenda(linha.frases), []);
	const re = useMemo(() => new RegExp(`(${[...roteiro.destaques].sort((a, b) => b.length - a.length).map(escapar).join('|')})`, 'gi'), []);
	const t = f / fps;
	const b = blocos.find((x) => t >= x.inicio && t < x.fim);
	if (!b) return null;
	const entrada = Math.min(1, (t - b.inicio) / 0.18);
	const saida = Math.min(1, (b.fim - t) / 0.12);
	return (
		<AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 72, pointerEvents: 'none' }}>
			<div
				style={{
					opacity: Math.min(entrada, saida),
					fontFamily: fonte,
					fontWeight: 500,
					fontSize: 40,
					lineHeight: 1.32,
					color: cor.branco,
					textAlign: 'center',
					padding: '12px 30px 14px',
					borderRadius: 10,
					background: 'rgba(4, 12, 20, 0.62)',
					textShadow: '0 2px 8px rgba(0,0,0,0.6)',
					maxWidth: 1400,
				}}
			>
				{duasLinhas(b.texto).map((l, i) => (
					<Linha key={i} texto={l} re={re} />
				))}
			</div>
		</AbsoluteFill>
	);
};
