import React from 'react';
import { cor } from '../styles/tema.ts';

const rad = (g: number) => (g * Math.PI) / 180;
export const L1 = 230;
export const L2 = 200;
export const L3 = 64;

/** Posição da ponta da ferramenta do braço (coordenadas locais, base na origem). */
export const pontaDoBraco = (a1: number, a2: number, a3: number): [number, number] => {
	const ombro: [number, number] = [0, -92];
	const t1 = rad(a1);
	const t2 = rad(a1 + a2);
	const t3 = rad(a1 + a2 + a3);
	return [
		ombro[0] + Math.sin(t1) * L1 + Math.sin(t2) * L2 + Math.sin(t3) * L3,
		ombro[1] - Math.cos(t1) * L1 - Math.cos(t2) * L2 - Math.cos(t3) * L3,
	];
};

const Segmento: React.FC<{ comp: number; l0: number; l1: number; id: string }> = ({ comp, l0, l1, id }) => (
	<g>
		<path
			d={`M ${-l0 / 2} 0 L ${-l1 / 2} ${-comp} A ${l1 / 2} ${l1 / 2} 0 0 1 ${l1 / 2} ${-comp} L ${l0 / 2} 0 A ${l0 / 2} ${l0 / 2} 0 0 1 ${-l0 / 2} 0 Z`}
			fill={`url(#aco-${id})`}
			stroke={cor.ciano}
			strokeOpacity={0.55}
			strokeWidth={1.6}
		/>
		<path d={`M ${-l0 / 2 + 8} -6 L ${-l1 / 2 + 7} ${-comp + 6}`} stroke={cor.branco} strokeOpacity={0.18} strokeWidth={3} strokeLinecap="round" />
	</g>
);

const Junta: React.FC<{ r: number }> = ({ r }) => (
	<g>
		<circle r={r} fill="#0F2639" stroke={cor.ciano} strokeOpacity={0.6} strokeWidth={1.6} />
		<circle r={r * 0.62} fill="none" stroke={cor.ambar} strokeOpacity={0.75} strokeWidth={2} />
		<circle r={r * 0.22} fill={cor.ambar} opacity={0.8} />
	</g>
);

/** Braço robótico industrial de seis eixos (vista lateral simplificada). Ângulos em graus. */
export const BracoRobotico: React.FC<{
	x: number;
	y: number;
	escala?: number;
	a1: number;
	a2: number;
	a3: number;
	garra?: number; // 0 aberta, 1 fechada
	id: string;
	espelhar?: boolean;
	opacidade?: number;
	brilhoPonta?: number;
}> = ({ x, y, escala = 1, a1, a2, a3, garra = 0.5, id, espelhar, opacidade = 1, brilhoPonta = 0 }) => {
	const [px, py] = pontaDoBraco(a1, a2, a3);
	return (
		<g transform={`translate(${x} ${y}) scale(${espelhar ? -escala : escala} ${escala})`} opacity={opacidade}>
			<defs>
				<linearGradient id={`aco-${id}`} x1="0" x2="1" y1="0" y2="0">
					<stop offset="0" stopColor="#1C3B55" />
					<stop offset="0.45" stopColor="#14304A" />
					<stop offset="1" stopColor="#0A1B2B" />
				</linearGradient>
				<radialGradient id={`brilho-${id}`}>
					<stop offset="0" stopColor={cor.ambar} stopOpacity="0.9" />
					<stop offset="1" stopColor={cor.ambar} stopOpacity="0" />
				</radialGradient>
			</defs>
			<ellipse cx={0} cy={4} rx={110} ry={16} fill="#000" opacity={0.35} />
			<path d="M -78 0 L -62 -40 H 62 L 78 0 Z" fill="#0E2335" stroke={cor.ciano} strokeOpacity={0.45} strokeWidth={1.6} />
			<rect x={-46} y={-80} width={92} height={42} rx={10} fill={`url(#aco-${id})`} stroke={cor.ciano} strokeOpacity={0.5} strokeWidth={1.6} />
			<g transform="translate(0 -92)">
				<g transform={`rotate(${a1})`}>
					<Segmento comp={L1} l0={62} l1={46} id={id} />
					<Junta r={34} />
					<g transform={`translate(0 ${-L1}) rotate(${a2})`}>
						<Segmento comp={L2} l0={44} l1={32} id={id} />
						<Junta r={26} />
						<g transform={`translate(0 ${-L2}) rotate(${a3})`}>
							<rect x={-14} y={-36} width={28} height={36} rx={6} fill="#173550" stroke={cor.ciano} strokeOpacity={0.6} strokeWidth={1.4} />
							<Junta r={16} />
							<g transform="translate(0 -36)">
								<rect x={-22} y={-8} width={44} height={10} rx={3} fill="#0F2639" stroke={cor.ciano} strokeOpacity={0.7} strokeWidth={1.4} />
								<rect x={-20 + garra * 8} y={-L3 + 36} width={7} height={L3 - 44} rx={2} fill="#1C3B55" stroke={cor.ciano} strokeOpacity={0.7} strokeWidth={1.2} />
								<rect x={13 - garra * 8} y={-L3 + 36} width={7} height={L3 - 44} rx={2} fill="#1C3B55" stroke={cor.ciano} strokeOpacity={0.7} strokeWidth={1.2} />
							</g>
						</g>
					</g>
				</g>
			</g>
			{brilhoPonta > 0 ? <circle cx={px} cy={py} r={60} fill={`url(#brilho-${id})`} opacity={brilhoPonta} /> : null}
		</g>
	);
};

/** Carroceria de automóvel (perfil), como na linha de montagem. */
export const Carroceria: React.FC<{ x: number; y: number; escala?: number; contorno?: string; preenchimento?: string; rodas?: boolean }> = ({
	x,
	y,
	escala = 1,
	contorno = cor.ciano,
	preenchimento = '#0F2639',
	rodas = false,
}) => (
	<g transform={`translate(${x} ${y}) scale(${escala})`}>
		<path
			d="M -180 30 L -176 4 Q -170 -14 -130 -18 L -84 -22 Q -50 -62 6 -66 L 58 -66 Q 100 -62 130 -24 L 160 -18 Q 182 -12 182 10 L 180 30 Z"
			fill={preenchimento}
			stroke={contorno}
			strokeOpacity={0.75}
			strokeWidth={2}
		/>
		<path d="M -72 -22 Q -44 -56 4 -58 L 30 -58 L 30 -22 Z M 42 -58 L 58 -58 Q 92 -54 116 -22 L 42 -22 Z" fill="#071522" stroke={contorno} strokeOpacity={0.45} strokeWidth={1.5} />
		<path d="M -176 6 H 182" stroke={contorno} strokeOpacity={0.25} strokeWidth={1.5} />
		{rodas ? (
			<>
				<circle cx={-108} cy={30} r={28} fill="#06101A" stroke={contorno} strokeOpacity={0.6} strokeWidth={2} />
				<circle cx={112} cy={30} r={28} fill="#06101A" stroke={contorno} strokeOpacity={0.6} strokeWidth={2} />
			</>
		) : (
			<>
				<path d="M -140 30 A 32 32 0 0 1 -76 30" fill="#071522" stroke={contorno} strokeOpacity={0.5} strokeWidth={1.5} />
				<path d="M 80 30 A 32 32 0 0 1 144 30" fill="#071522" stroke={contorno} strokeOpacity={0.5} strokeWidth={1.5} />
			</>
		)}
	</g>
);

/** Esteira transportadora com roletes; `deslocamento` em px move a correia. */
export const Esteira: React.FC<{ x: number; y: number; largura: number; deslocamento: number; altura?: number }> = ({ x, y, largura, deslocamento, altura = 26 }) => {
	const roletes = Math.floor(largura / 70);
	return (
		<g transform={`translate(${x} ${y})`}>
			<rect x={0} y={0} width={largura} height={altura} rx={altura / 2} fill="#0C1F31" stroke={cor.ciano} strokeOpacity={0.35} strokeWidth={1.5} />
			<line x1={altura / 2} x2={largura - altura / 2} y1={2} y2={2} stroke={cor.cinza} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="18 22" strokeDashoffset={-deslocamento} />
			{Array.from({ length: roletes }).map((_, i) => (
				<circle key={i} cx={altura / 2 + (i * (largura - altura)) / Math.max(1, roletes - 1)} cy={altura / 2} r={altura / 2 - 6} fill="none" stroke={cor.cinza} strokeOpacity={0.3} strokeWidth={1.2} />
			))}
			{Array.from({ length: Math.floor(largura / 240) }).map((_, i) => (
				<rect key={i} x={120 + i * 240} y={altura} width={10} height={70} fill="#0B1B2A" stroke={cor.linha} />
			))}
		</g>
	);
};
