import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { cor } from '../styles/tema.ts';

type Props = { clima?: 'padrao' | 'serio' | 'claro'; grade?: boolean; brilho?: [number, number] };

/** Fundo escuro com grade técnica discreta, luz ambiente e vinheta. */
export const Fundo: React.FC<Props> = ({ clima = 'padrao', grade = true, brilho = [50, 40] }) => {
	const frame = useCurrentFrame();
	const deriva = Math.sin(frame / 140) * 3;
	const luz =
		clima === 'serio' ? 'rgba(138,153,171,0.10)' : clima === 'claro' ? 'rgba(67,198,236,0.20)' : 'rgba(67,198,236,0.13)';
	return (
		<AbsoluteFill style={{ background: cor.fundo }}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 70% 60% at ${brilho[0] + deriva}% ${brilho[1]}%, ${luz}, transparent 70%)`,
				}}
			/>
			{grade ? (
				<svg width="1920" height="1080" style={{ position: 'absolute', opacity: clima === 'serio' ? 0.35 : 0.5 }}>
					<defs>
						<pattern id="grade" width="96" height="96" patternUnits="userSpaceOnUse">
							<path d="M 96 0 L 0 0 0 96" fill="none" stroke="rgba(138,153,171,0.07)" strokeWidth="1" />
						</pattern>
						<radialGradient id="mascaraGrade" cx="50%" cy="45%" r="65%">
							<stop offset="0%" stopColor="white" stopOpacity="1" />
							<stop offset="100%" stopColor="white" stopOpacity="0" />
						</radialGradient>
						<mask id="mg">
							<rect width="1920" height="1080" fill="url(#mascaraGrade)" />
						</mask>
					</defs>
					<rect width="1920" height="1080" fill="url(#grade)" mask="url(#mg)" />
				</svg>
			) : null}
		</AbsoluteFill>
	);
};

/** Vinheta e granulação: aplicadas por cima de tudo, no filme inteiro. */
export const Acabamento: React.FC = () => (
	<AbsoluteFill style={{ pointerEvents: 'none' }}>
		<AbsoluteFill style={{ background: 'radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgba(3,9,15,0.75) 100%)' }} />
		<svg width="1920" height="1080" style={{ position: 'absolute', opacity: 0.06, mixBlendMode: 'overlay' }}>
			<filter id="grao">
				<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
			</filter>
			<rect width="1920" height="1080" filter="url(#grao)" />
		</svg>
	</AbsoluteFill>
);
