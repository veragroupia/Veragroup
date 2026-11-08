import React from 'react';
import { cor } from '../styles/tema.ts';

/**
 * Esquema SIMPLIFICADO de uma fonte de luz síncrotron (fora de escala), para fins didáticos:
 * 1) o acelerador linear produz e acelera elétrons; 2) o acelerador injetor (booster) aumenta a energia;
 * 3) no anel de armazenamento os elétrons circulam e, ao terem a trajetória curvada por ímãs,
 * emitem luz síncrotron; 4) a luz segue por uma linha de luz até a estação experimental, onde ilumina a amostra.
 */
export const SiriusEsquema: React.FC<{
	f: number;
	linac: number;
	booster: number;
	anel: number;
	luz: number;
	amostra: number;
	r?: number;
}> = ({ f, linac, booster, anel, luz, amostra, r = 300 }) => {
	const N = 20;
	const vert = Array.from({ length: N }, (_, i) => {
		const a = (i / N) * Math.PI * 2 - Math.PI / 2;
		return [Math.cos(a) * r, Math.sin(a) * r, a] as const;
	});
	const poligono = vert.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') + ' Z';
	const rb = r * 0.74;
	// elétron no anel
	const ang = (f * 0.06) % (Math.PI * 2);
	const ex = Math.cos(ang - Math.PI / 2) * r;
	const ey = Math.sin(ang - Math.PI / 2) * r;
	// linha de luz: tangente ao anel num vértice à direita, levando à estação experimental
	const iv = 0;
	const [vx, vy, va] = vert[iv];
	const tx = -Math.sin(va);
	const ty = Math.cos(va);
	const compr = 520;
	const fimX = vx + tx * compr;
	const fimY = vy + ty * compr;
	return (
		<g>
			{/* acelerador linear */}
			<g opacity={linac}>
				<rect x={-rb * 0.62} y={-12} width={rb * 0.9} height={24} rx={6} fill="#10283E" stroke={cor.ciano} strokeWidth={1.8} />
				{Array.from({ length: 6 }).map((_, i) => (
					<line key={i} x1={-rb * 0.62 + 20 + i * 36} x2={-rb * 0.62 + 20 + i * 36} y1={-12} y2={12} stroke={cor.ciano} strokeOpacity={0.5} />
				))}
				<circle cx={-rb * 0.62 + ((f * 6) % (rb * 0.9))} cy={0} r={5} fill={cor.branco} />
			</g>
			{/* acelerador injetor (booster) */}
			<circle r={rb} fill="none" stroke={cor.cinza} strokeWidth={2} strokeDasharray="8 8" opacity={booster} strokeDashoffset={-f * 2} />
			{/* anel de armazenamento: ímãs nos vértices */}
			<g opacity={anel}>
				<path d={poligono} fill="none" stroke={cor.ciano} strokeWidth={3} />
				{vert.map(([x, y, a], i) => (
					<rect key={i} x={-12} y={-7} width={24} height={14} rx={2} fill={cor.fundo2} stroke={cor.ciano} strokeWidth={1.5} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`} />
				))}
				<circle cx={ex} cy={ey} r={14} fill={cor.branco} opacity={0.2} />
				<circle cx={ex} cy={ey} r={6} fill={cor.branco} />
			</g>
			{/* luz síncrotron emitida tangencialmente nos ímãs */}
			<g opacity={luz}>
				{vert.map(([x, y, a], i) => {
					const d = Math.abs(((ang - (a + Math.PI / 2) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
					const brilho = Math.max(0, 1 - d * 4);
					const tx2 = -Math.sin(a);
					const ty2 = Math.cos(a);
					return <line key={i} x1={x} y1={y} x2={x + tx2 * 90} y2={y + ty2 * 90} stroke={cor.ambar} strokeWidth={3} opacity={brilho} strokeLinecap="round" />;
				})}
				<line x1={vx} y1={vy} x2={vx + tx * compr * luz} y2={vy + ty * compr * luz} stroke={cor.ambar} strokeWidth={4} strokeLinecap="round" />
				<line x1={vx} y1={vy} x2={vx + tx * compr * luz} y2={vy + ty * compr * luz} stroke={cor.ambar} strokeWidth={14} strokeOpacity={0.15} strokeLinecap="round" />
			</g>
			{/* estação experimental: amostra e detector */}
			<g opacity={amostra} transform={`translate(${fimX} ${fimY})`}>
				<rect x={-50} y={-60} width={170} height={120} rx={10} fill="#10283E" stroke={cor.linhaForte} strokeWidth={1.5} />
				<rect x={-6} y={-22} width={12} height={44} fill={cor.ambar} opacity={0.9} />
				<rect x={70} y={-40} width={16} height={80} rx={3} fill={cor.cinza} opacity={0.7} />
			</g>
		</g>
	);
};

export const posicaoEstacao = (r = 300) => {
	const N = 20;
	const a = -Math.PI / 2;
	const vx = Math.cos(a) * r;
	const vy = Math.sin(a) * r;
	return [vx - Math.sin(a) * 520, vy + Math.cos(a) * 520] as const;
};
