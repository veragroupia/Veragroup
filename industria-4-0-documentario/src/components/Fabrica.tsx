import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { cor } from '../styles/tema.ts';
import { Camada } from './Camera.tsx';
import { BracoRobotico, Carroceria, Esteira } from './Maquinas.tsx';

/** Movimento de solda/manipulação de um braço: ciclo suave e repetitivo, com fase própria. */
export const cicloBraco = (f: number, fase: number, periodo = 120) => {
	const t = ((f + fase) % periodo) / periodo;
	const s = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
	return {
		a1: 18 + s * 22,
		a2: 62 + s * 28,
		a3: 40 - s * 18,
		garra: s > 0.85 ? 1 : 0.3,
		solda: s > 0.82 ? 0.6 + 0.4 * Math.abs(Math.sin(f * 1.7)) : 0,
	};
};

/**
 * Linha de montagem automatizada (ilustração original). Três planos de profundidade para parallax:
 * parede ao fundo, linha principal e um braço em primeiro plano.
 */
export const FabricaIlustrada: React.FC<{ velocidade?: number; brilhoJanelas?: number; braçoCentral?: boolean; rede?: number }> = ({
	velocidade = 2.2,
	brilhoJanelas = 1,
	braçoCentral = true,
	rede = 0,
}) => {
	const f = useCurrentFrame();
	const desloc = f * velocidade;
	const carros = [0, 1, 2, 3, 4, 5];
	const centro = cicloBraco(f, 0, 110);
	return (
		<AbsoluteFill>
			<Camada profundidade={0.55}>
				<svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
					<defs>
						<linearGradient id="janela" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0" stopColor={cor.ciano} stopOpacity={0.22 * brilhoJanelas} />
							<stop offset="1" stopColor={cor.ciano} stopOpacity={0} />
						</linearGradient>
						<linearGradient id="piso" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0" stopColor="#0E2438" stopOpacity={0.9} />
							<stop offset="1" stopColor={cor.fundo} stopOpacity={0} />
						</linearGradient>
						<linearGradient id="feixe" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0" stopColor={cor.branco} stopOpacity={0.08 * brilhoJanelas} />
							<stop offset="1" stopColor={cor.branco} stopOpacity={0} />
						</linearGradient>
					</defs>
					{Array.from({ length: 14 }).map((_, i) => (
						<g key={i}>
							<rect x={-300 + i * 190} y={90} width={70} height={420} fill="url(#janela)" />
							<path d={`M ${-300 + i * 190} 510 L ${-380 + i * 190} 1000 L ${-200 + i * 190} 1000 L ${-230 + i * 190} 510 Z`} fill="url(#feixe)" />
						</g>
					))}
					<rect x={-400} y={560} width={2800} height={600} fill="url(#piso)" />
					{Array.from({ length: 25 }).map((_, i) => (
						<line key={i} x1={960 + (i - 12) * 60} y1={560} x2={960 + (i - 12) * 330} y2={1100} stroke={cor.linha} strokeOpacity={0.35} strokeWidth={1} />
					))}
					{[600, 660, 750, 880, 1060].map((y) => (
						<line key={y} x1={-400} x2={2400} y1={y} y2={y} stroke={cor.linha} strokeOpacity={0.3} strokeWidth={1} />
					))}
					<path d="M -400 560 H 2400" stroke={cor.linha} strokeWidth={2} />
					{Array.from({ length: 9 }).map((_, i) => (
						<g key={i}>
							<line x1={-120 + i * 280} x2={-120 + i * 280} y1={190} y2={250} stroke={cor.linha} strokeWidth={1.5} />
							<path d={`M ${-150 + i * 280} 250 H ${-90 + i * 280} L ${-100 + i * 280} 262 H ${-140 + i * 280} Z`} fill={cor.branco} opacity={0.5 * brilhoJanelas} />
							<ellipse cx={-120 + i * 280} cy={300} rx={90} ry={50} fill={cor.branco} opacity={0.035 * brilhoJanelas} />
						</g>
					))}
					<path d="M -400 150 H 2400 M -400 190 H 2400" stroke={cor.linha} strokeWidth={6} />
					{Array.from({ length: 12 }).map((_, i) => (
						<path key={i} d={`M ${-260 + i * 230} 150 L ${-140 + i * 230} 190 M ${-140 + i * 230} 150 L ${-260 + i * 230} 190`} stroke={cor.linha} strokeWidth={2} />
					))}
					{[-120, 260, 1640, 2020].map((x, i) => {
						const b = cicloBraco(f, i * 37, 130);
						return <BracoRobotico key={i} id={`fundo${i}`} x={x} y={600} escala={0.5} a1={b.a1} a2={b.a2} a3={b.a3} garra={b.garra} opacidade={0.35} espelhar={i % 2 === 1} />;
					})}
				</svg>
			</Camada>
			<Camada profundidade={1}>
				<svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
					<ellipse cx={960} cy={830} rx={1200} ry={60} fill="#000" opacity={0.25} />
					{carros.map((i) => {
						const x = ((desloc + i * 470) % 2820) - 450;
						return <Carroceria key={i} x={x} y={738} escala={0.95} />;
					})}
					<Esteira x={-400} y={770} largura={2720} deslocamento={desloc} />
					{[520, 1400].map((x, i) => {
						const b = cicloBraco(f, 40 + i * 55, 110);
						return <BracoRobotico key={i} id={`linha${i}`} x={x} y={700} escala={0.78} a1={b.a1} a2={b.a2} a3={b.a3} garra={b.garra} espelhar={i === 1} brilhoPonta={b.solda} opacidade={0.9} />;
					})}
					{braçoCentral ? (
						<BracoRobotico id="central" x={960} y={905} escala={1.12} a1={centro.a1 - 8} a2={centro.a2} a3={centro.a3} garra={centro.garra} brilhoPonta={centro.solda} />
					) : null}
					{rede > 0 ? (
						<g opacity={rede}>
							{[520, 960, 1400].map((x, i) => (
								<g key={i}>
									<circle cx={x} cy={i === 1 ? 640 : 560} r={10} fill={cor.ciano} />
									<circle cx={x} cy={i === 1 ? 640 : 560} r={26} fill="none" stroke={cor.ciano} strokeOpacity={0.5} />
								</g>
							))}
							<path d="M 520 560 Q 740 420 960 640 Q 1180 420 1400 560" fill="none" stroke={cor.ciano} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="6 10" strokeDashoffset={-f * 2} />
						</g>
					) : null}
				</svg>
			</Camada>
			<Camada profundidade={1.35}>
				<svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
					{(() => {
						const b = cicloBraco(f, 70, 150);
						return <BracoRobotico id="frente" x={-60} y={1180} escala={1.6} a1={b.a1 + 10} a2={b.a2} a3={b.a3} garra={b.garra} opacidade={0.55} />;
					})()}
					<rect x={-400} y={1010} width={2720} height={200} fill={cor.fundo} opacity={0.9} />
				</svg>
			</Camada>
		</AbsoluteFill>
	);
};
