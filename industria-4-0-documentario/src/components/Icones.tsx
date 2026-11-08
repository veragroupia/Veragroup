import React from 'react';
import { cor } from '../styles/tema.ts';

// Ícones de traço fino, desenhados para este filme (centro em 0,0; caixa ~ 64×64).
type Props = { s?: number; c?: string; w?: number };
const G: React.FC<Props & { children: React.ReactNode }> = ({ s = 1, c = cor.branco, w = 2.6, children }) => (
	<g transform={`scale(${s})`} fill="none" stroke={c} strokeWidth={w / s} strokeLinecap="round" strokeLinejoin="round">
		{children}
	</g>
);

export const IconeSensor: React.FC<Props> = (p) => (
	<G {...p}>
		<circle r="7" />
		<path d="M -16 -16 A 22 22 0 0 0 -16 16 M 16 -16 A 22 22 0 0 1 16 16 M -26 -26 A 36 36 0 0 0 -26 26 M 26 -26 A 36 36 0 0 1 26 26" />
	</G>
);
export const IconeEngrenagem: React.FC<Props> = (p) => (
	<G {...p}>
		<circle r="10" />
		<path d={Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; const b = a + 0.25; const c2 = a - 0.25; return `M ${Math.cos(c2) * 20} ${Math.sin(c2) * 20} L ${Math.cos(c2) * 28} ${Math.sin(c2) * 28} L ${Math.cos(b) * 28} ${Math.sin(b) * 28} L ${Math.cos(b) * 20} ${Math.sin(b) * 20}`; }).join(' ')} />
		<circle r="20" />
	</G>
);
export const IconeServidor: React.FC<Props> = (p) => (
	<G {...p}>
		<rect x="-24" y="-28" width="48" height="16" rx="3" />
		<rect x="-24" y="-8" width="48" height="16" rx="3" />
		<rect x="-24" y="12" width="48" height="16" rx="3" />
		<path d="M -16 -20 h 4 M -16 0 h 4 M -16 20 h 4" />
	</G>
);
export const IconePessoa: React.FC<Props> = (p) => (
	<G {...p}>
		<circle cy="-14" r="10" />
		<path d="M -22 28 C -22 8 -12 2 0 2 C 12 2 22 8 22 28" />
	</G>
);
export const IconeDados: React.FC<Props> = (p) => (
	<G {...p}>
		<ellipse cy="-18" rx="22" ry="8" />
		<path d="M -22 -18 v 36 c 0 4.4 9.8 8 22 8 s 22 -3.6 22 -8 v -36 M -22 0 c 0 4.4 9.8 8 22 8 s 22 -3.6 22 -8" />
	</G>
);
export const IconeMaquina: React.FC<Props> = (p) => (
	<G {...p}>
		<rect x="-28" y="-22" width="56" height="44" rx="4" />
		<rect x="-18" y="-12" width="22" height="16" rx="2" />
		<path d="M 12 -10 h 8 M 12 -2 h 8 M -28 22 v 6 M 28 22 v 6" />
	</G>
);
export const IconeCaminhao: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -30 12 V -16 H 8 V 12 M 8 -6 H 20 L 30 4 V 12" />
		<circle cx="-18" cy="16" r="5" />
		<circle cx="20" cy="16" r="5" />
	</G>
);
export const IconeLoja: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -28 -6 L -22 -24 H 22 L 28 -6 Z M -24 -6 V 24 H 24 V -6 M -8 24 V 8 H 8 V 24" />
	</G>
);
export const IconeServicos: React.FC<Props> = (p) => (
	<G {...p}>
		<rect x="-26" y="-14" width="52" height="36" rx="4" />
		<path d="M -10 -14 v -8 h 20 v 8 M -26 2 h 52" />
	</G>
);
export const IconeEscudo: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M 0 -30 L 24 -20 V 0 C 24 16 12 26 0 30 C -12 26 -24 16 -24 0 V -20 Z" />
		<path d="M -10 0 L -2 8 L 12 -8" />
	</G>
);
export const IconeCadeado: React.FC<Props> = (p) => (
	<G {...p}>
		<rect x="-20" y="-4" width="40" height="30" rx="4" />
		<path d="M -12 -4 V -14 a 12 12 0 0 1 24 0 V -4 M 0 8 v 6" />
	</G>
);
export const IconeChip: React.FC<Props> = (p) => (
	<G {...p}>
		<rect x="-18" y="-18" width="36" height="36" rx="4" />
		<rect x="-8" y="-8" width="16" height="16" />
		<path d="M -10 -18 v -8 M 0 -18 v -8 M 10 -18 v -8 M -10 18 v 8 M 0 18 v 8 M 10 18 v 8 M -18 -10 h -8 M -18 0 h -8 M -18 10 h -8 M 18 -10 h 8 M 18 0 h 8 M 18 10 h 8" />
	</G>
);
export const IconeRaio: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M 4 -30 L -16 4 H 0 L -4 30 L 16 -4 H 0 Z" />
	</G>
);
export const IconeSaude: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -8 -26 H 8 V -8 H 26 V 8 H 8 V 26 H -8 V 8 H -26 V -8 H -8 Z" />
	</G>
);
export const IconeNano: React.FC<Props> = (p) => (
	<G {...p}>
		<path d={Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return `${i ? 'L' : 'M'} ${Math.cos(a) * 26} ${Math.sin(a) * 26}`; }).join(' ') + ' Z'} />
		<circle r="5" />
		{Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return <circle key={i} cx={Math.cos(a) * 26} cy={Math.sin(a) * 26} r="3.5" fill={p.c ?? cor.branco} />; })}
	</G>
);
export const IconeMaterial: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M 0 -28 L 24 -14 V 14 L 0 28 L -24 14 V -14 Z M 0 -28 V 0 M 0 0 L 24 14 M 0 0 L -24 14 M -24 -14 L 0 0 L 24 -14" />
	</G>
);
export const IconeFolha: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -22 24 C -22 -10 0 -26 26 -26 C 26 4 10 24 -22 24 Z M -22 24 L 10 -8" />
	</G>
);
export const IconeFrasco: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -8 -28 H 8 M -6 -28 V -10 L -24 22 C -26 26 -24 28 -20 28 H 20 C 24 28 26 26 24 22 L 6 -10 V -28 M -15 8 H 15" />
	</G>
);
export const IconeEducacao: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -30 -8 L 0 -22 L 30 -8 L 0 6 Z M -18 -2 V 14 C -18 20 -9 24 0 24 C 9 24 18 20 18 14 V -2 M 30 -8 V 12" />
	</G>
);
export const IconeCodigo: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -12 -16 L -26 0 L -12 16 M 12 -16 L 26 0 L 12 16 M 5 -22 L -5 22" />
	</G>
);
export const IconeChave: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M 22 -22 a 10 10 0 1 0 -6 16 L -20 26 L -26 20 L 10 -16 a 10 10 0 0 0 12 -6 Z" />
	</G>
);
export const IconeGrafico: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -28 26 H 28 M -20 26 V 6 M -6 26 V -10 M 8 26 V -2 M 22 26 V -22" />
	</G>
);
export const IconeCiclo: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M 22 -10 A 24 24 0 0 0 -22 -6 M -22 10 A 24 24 0 0 0 22 6 M 22 -22 V -8 H 8 M -22 22 V 8 H -8" />
	</G>
);
export const IconeFabrica: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M -30 26 V -4 L -14 -14 V -4 L 2 -14 V -4 L 18 -14 V -28 H 28 V 26 Z M -20 12 h 6 M -4 12 h 6 M 12 12 h 6" />
	</G>
);
export const IconeAlerta: React.FC<Props> = (p) => (
	<G {...p}>
		<path d="M 0 -28 L 28 24 H -28 Z M 0 -8 V 8 M 0 15 v 1" />
	</G>
);
