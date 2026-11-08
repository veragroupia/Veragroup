import React from 'react';
import { useCurrentFrame } from 'remotion';
import { prog, suave } from '../animations/movimento.ts';
import { cor } from '../styles/tema.ts';

export type P = [number, number];

/** Curva cúbica entre dois pontos, com curvatura perpendicular controlada. */
export const curva = (a: P, b: P, curv = 0.25) => {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const n: P = [-dy * curv, dx * curv];
	const c1: P = [a[0] + dx * 0.33 + n[0], a[1] + dy * 0.33 + n[1]];
	const c2: P = [a[0] + dx * 0.66 + n[0], a[1] + dy * 0.66 + n[1]];
	return { a, c1, c2, b, d: `M ${a[0]} ${a[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}` };
};

export const pontoNaCurva = (c: ReturnType<typeof curva>, t: number): P => {
	const u = 1 - t;
	const k = (i: 0 | 1) => u * u * u * c.a[i] + 3 * u * u * t * c.c1[i] + 3 * u * t * t * c.c2[i] + t * t * t * c.b[i];
	return [k(0), k(1)];
};

/**
 * Conexão de dados: a linha se desenha a partir de `inicio`, depois pulsos de luz percorrem a curva.
 * Os pulsos representam troca de informações (não são decoração): só aparecem quando a conexão existe.
 */
export const Fluxo: React.FC<{
	de: P;
	para: P;
	inicio: number;
	curv?: number;
	pulsos?: number;
	velocidade?: number; // frames por travessia
	corLinha?: string;
	corPulso?: string;
	largura?: number;
	opacidade?: number;
	bidirecional?: boolean;
	tracejado?: boolean;
}> = ({ de, para, inicio, curv = 0.2, pulsos = 2, velocidade = 50, corLinha = cor.linhaForte, corPulso = cor.ciano, largura = 2, opacidade = 1, bidirecional, tracejado }) => {
	const f = useCurrentFrame();
	const c = curva(de, para, curv);
	const desenho = prog(f, inicio, 24, suave);
	const ativo = f - inicio - 18;
	return (
		<g opacity={opacidade}>
			<path d={c.d} fill="none" stroke={corLinha} strokeWidth={largura} pathLength={1} strokeDasharray={tracejado ? '0.012 0.012' : `${desenho} 1`} strokeLinecap="round" opacity={tracejado ? desenho : 1} />
			{ativo > 0
				? Array.from({ length: pulsos }).map((_, i) => {
						const bruto = (ativo / velocidade + i / pulsos) % 1;
						const ida = !bidirecional || i % 2 === 0;
						const t = ida ? bruto : 1 - bruto;
						const [x, y] = pontoNaCurva(c, t);
						const fade = Math.sin(Math.PI * bruto);
						return (
							<g key={i} opacity={fade * Math.min(1, ativo / 15)}>
								<circle cx={x} cy={y} r={largura * 4} fill={corPulso} opacity={0.18} />
								<circle cx={x} cy={y} r={largura * 1.6} fill={corPulso} />
							</g>
						);
					})
				: null}
		</g>
	);
};

/** Nó de diagrama: círculo com anel que se desenha e um leve brilho quando ativo. */
export const No: React.FC<{ x: number; y: number; r?: number; inicio: number; ativo?: number; corNo?: string; children?: React.ReactNode }> = ({
	x,
	y,
	r = 56,
	inicio,
	ativo = 0,
	corNo = cor.ciano,
	children,
}) => {
	const f = useCurrentFrame();
	const p = prog(f, inicio, 26);
	return (
		<g transform={`translate(${x} ${y}) scale(${0.85 + 0.15 * p})`} opacity={p}>
			<circle r={r * 1.7} fill={corNo} opacity={0.06 + ativo * 0.1} />
			<circle r={r} fill={cor.fundo2} stroke={corNo} strokeOpacity={0.35 + ativo * 0.5} strokeWidth={2} />
			<circle r={r} fill="none" stroke={corNo} strokeWidth={2.5} pathLength={1} strokeDasharray={`${p} 1`} transform="rotate(-90)" />
			{children}
		</g>
	);
};
