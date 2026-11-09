import React from 'react';
import { cor } from '../styles/tema.ts';

const traco = { fill: '#0F2639', stroke: cor.ciano, strokeOpacity: 0.55, strokeWidth: 1.8 } as const;

/** Centro de usinagem CNC (gabinete com janela e eixo). */
export const MaquinaCNC: React.FC<{ x: number; y: number; f: number; escala?: number }> = ({ x, y, f, escala = 1 }) => (
	<g transform={`translate(${x} ${y}) scale(${escala})`}>
		<rect x={-150} y={-230} width={300} height={230} rx={10} {...traco} />
		<rect x={-120} y={-200} width={170} height={130} rx={6} fill="#081826" stroke={cor.ciano} strokeOpacity={0.4} />
		<rect x={-50 + Math.sin(f / 20) * 40} y={-200} width={14} height={60 + Math.sin(f / 9) * 10} fill={cor.cinza} opacity={0.6} />
		<rect x={-100} y={-90} width={130} height={12} fill={cor.cinza} opacity={0.35} />
		<rect x={70} y={-200} width={60} height={80} rx={4} fill="#081826" stroke={cor.linha} />
		{[0, 1, 2].map((i) => (
			<circle key={i} cx={86 + i * 14} cy={-100} r={4} fill={i === 0 ? cor.ciano : cor.cinza} opacity={0.7} />
		))}
		<rect x={-150} y={-20} width={300} height={20} fill="#0A1C2C" stroke={cor.linha} />
	</g>
);

/** Prensa industrial: o martelo desce e sobe em ciclo. */
export const Prensa: React.FC<{ x: number; y: number; f: number; escala?: number }> = ({ x, y, f, escala = 1 }) => {
	const c = (f % 70) / 70;
	const desce = c < 0.25 ? c / 0.25 : c < 0.4 ? 1 : 1 - (c - 0.4) / 0.6;
	return (
		<g transform={`translate(${x} ${y}) scale(${escala})`}>
			<rect x={-110} y={-300} width={34} height={300} {...traco} />
			<rect x={76} y={-300} width={34} height={300} {...traco} />
			<rect x={-120} y={-330} width={240} height={50} rx={6} {...traco} />
			<rect x={-60} y={-280 + desce * 150} width={120} height={46} rx={4} fill="#173550" stroke={cor.ciano} strokeOpacity={0.7} strokeWidth={1.8} />
			<rect x={-12} y={-282} width={24} height={desce * 150} fill={cor.cinza} opacity={0.4} />
			<rect x={-80} y={-60} width={160} height={30} rx={3} fill="#0A1C2C" stroke={cor.linha} />
			<rect x={-40} y={-74} width={80} height={14} rx={2} fill={cor.cinza} opacity={0.5} />
			<rect x={-120} y={-30} width={240} height={30} fill="#0A1C2C" stroke={cor.linha} />
		</g>
	);
};

/** Selo de sensor com onda de emissão. */
export const SeloSensor: React.FC<{ x: number; y: number; f: number; ativo: number; corS?: string }> = ({ x, y, f, ativo, corS = cor.ciano }) => (
	<g transform={`translate(${x} ${y})`} opacity={ativo}>
		{[0, 1].map((i) => {
			const k = ((f + i * 25) % 50) / 50;
			return <circle key={i} r={10 + k * 34} fill="none" stroke={corS} strokeOpacity={(1 - k) * 0.6} strokeWidth={1.5} />;
		})}
		<circle r={11} fill={cor.fundo} stroke={corS} strokeWidth={2} />
		<circle r={4.5} fill={corS} />
	</g>
);

/** Impressora 3D (cartesiana): o bico percorre a camada e a peça cresce de baixo para cima. */
export const Impressora3D: React.FC<{ x: number; y: number; f: number; progresso: number; escala?: number }> = ({ x, y, f, progresso, escala = 1 }) => {
	const alturaPeca = 200;
	const h = alturaPeca * progresso;
	const bicoX = Math.sin(f / 6) * 110;
	const bicoY = -40 - h;
	return (
		<g transform={`translate(${x} ${y}) scale(${escala})`}>
			<defs>
				<clipPath id="camadas">
					<rect x={-200} y={-40 - h} width={400} height={h + 1} />
				</clipPath>
			</defs>
			<rect x={-230} y={-420} width={22} height={420} {...traco} />
			<rect x={208} y={-420} width={22} height={420} {...traco} />
			<rect x={-240} y={-440} width={480} height={26} rx={4} {...traco} />
			<rect x={-180} y={-40} width={360} height={16} rx={2} fill="#173550" stroke={cor.ciano} strokeOpacity={0.6} />
			<rect x={-240} y={-24} width={480} height={24} fill="#0A1C2C" stroke={cor.linha} />
			{/* peça: suporte em "L" com furo, impresso camada por camada */}
			<g clipPath="url(#camadas)">
				<path d="M -130 -40 V -240 H -50 V -110 H 130 V -40 Z" fill="rgba(67,198,236,0.18)" stroke={cor.ciano} strokeWidth={2} />
				{Array.from({ length: 40 }).map((_, i) => (
					<line key={i} x1={-130} x2={130} y1={-44 - i * 5} y2={-44 - i * 5} stroke={cor.ciano} strokeOpacity={0.18} />
				))}
				<circle cx={50} cy={-75} r={14} fill={cor.fundo} stroke={cor.ciano} strokeWidth={2} />
			</g>
			<line x1={-208} x2={208} y1={bicoY - 70} y2={bicoY - 70} stroke={cor.cinza} strokeWidth={6} opacity={0.6} />
			<g transform={`translate(${bicoX} ${bicoY})`}>
				<rect x={-34} y={-90} width={68} height={56} rx={6} fill="#173550" stroke={cor.ciano} strokeOpacity={0.8} strokeWidth={1.8} />
				<path d="M -10 -34 L 0 -6 L 10 -34 Z" fill={cor.ambar} />
				<circle cy={-4} r={12} fill={cor.ambar} opacity={0.3 * (0.6 + 0.4 * Math.sin(f))} />
			</g>
		</g>
	);
};
