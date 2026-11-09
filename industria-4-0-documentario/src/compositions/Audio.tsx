import React from 'react';
import { Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { linha } from '../data/dados.ts';
import { EFEITOS } from '../data/efeitos.ts';
import { FPS, INTERVALO, momento } from '../data/linhaDoTempo.ts';

/** Ganho geral do áudio: a voz mono vira estéreo (+3 LU) e o mix sem este ganho encosta em 0 dBFS (−13,5 LUFS). */
export const GANHO_GERAL = 0.8;

const fr = (s: number) => Math.max(0, Math.round(s * FPS));

/** Narração real dos integrantes: entra só quando o arquivo foi preparado e alinhado. */
export const Narracao: React.FC = () => (
	<>
		{linha.capitulos
			.filter((c) => c.temAudio)
			.map((c) => (
				<Sequence key={c.id} from={fr(c.inicio)} name={`Voz ${c.id} — ${c.narrador}`} layout="none">
					<Audio src={staticFile(c.audio)} volume={GANHO_GERAL} />
				</Sequence>
			))}
	</>
);

/**
 * Trilha original em blocos (um por capítulo + créditos), com crossfade.
 * A música abaixa automaticamente enquanto alguém fala (ducking).
 */
export const Trilha: React.FC<{ volume: number }> = ({ volume }) => {
	const caps = linha.capitulos;
	const comVoz = caps.some((c) => c.temAudio);
	const blocos = [
		...caps.map((c, i) => ({ arq: `audio/musica/trilha-${c.id}.mp3`, de: i === 0 ? 0 : c.inicio - INTERVALO, ate: (caps[i + 1]?.inicio ?? linha.fimFala) - INTERVALO + 2.2 })),
		{ arq: 'audio/musica/trilha-creditos.mp3', de: linha.fimFala - INTERVALO * 0.5, ate: linha.total },
	];
	const falando = (s: number) => caps.some((c) => c.temAudio && s > c.inicio - 0.4 && s < c.fim + 0.4);
	return (
		<>
			{blocos.map((b, i) => (
				<Sequence key={b.arq} from={fr(b.de)} durationInFrames={fr(b.ate - b.de)} name={`Trilha ${i + 1}`} layout="none">
					<Audio
						src={staticFile(b.arq)}
						loop
						volume={(f) => {
							const s = b.de + f / FPS;
							const ent = i === 0 ? Math.min(1, f / (FPS * 1.2)) : Math.min(1, f / (FPS * 2.2));
							const sai = Math.min(1, (b.ate - s) / 2.2);
							const base = comVoz ? (falando(s) ? 0.38 : 1) : 1;
							return GANHO_GERAL * volume * base * Math.max(0, Math.min(ent, sai));
						}}
					/>
				</Sequence>
			))}
		</>
	);
};

export const Efeitos: React.FC = () => (
	<>
		{EFEITOS.map((e, i) => {
			const cap = linha.capitulos.find((c) => c.id === e.capitulo)!;
			const s = momento(cap.frases[e.frase], e.trecho) + (e.desloc ?? 0);
			return (
				<Sequence key={i} from={fr(s)} durationInFrames={FPS * 4} name={`Efeito: ${e.arquivo}`} layout="none">
					<Audio src={staticFile(`audio/efeitos/${e.arquivo}.wav`)} volume={GANHO_GERAL * e.volume} />
				</Sequence>
			);
		})}
	</>
);
