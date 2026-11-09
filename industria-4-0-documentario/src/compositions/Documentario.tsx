import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { prog, suave } from '../animations/movimento.ts';
import { Acabamento } from '../components/Fundo.tsx';
import { Identificacao } from '../components/Identificacao.tsx';
import { Legendas } from '../components/Legendas.tsx';
import { linha } from '../data/dados.ts';
import { FPS, momento } from '../data/linhaDoTempo.ts';
import { cor } from '../styles/tema.ts';
import { Efeitos, Narracao, Trilha } from './Audio.tsx';
import { COMPONENTES } from './cenas/index.ts';
import type { CenaProps } from './tipos.ts';

export const SOBREPOSICAO = 18; // frames de dissolução entre cenas (a mesma transição no filme inteiro)

export type DocumentarioProps = { legendas: boolean; volumeTrilha: number; efeitos: boolean };

const fr = (s: number) => Math.round(s * FPS);

/** Transição única do filme: a cena nova surge por cima com dissolução e leve aproximação de profundidade. */
const Quadro: React.FC<{ primeira: boolean; children: React.ReactNode }> = ({ primeira, children }) => {
	const f = useCurrentFrame();
	const p = primeira ? 1 : prog(f, 0, SOBREPOSICAO, suave);
	return <AbsoluteFill style={{ opacity: p, transform: `scale(${1.035 - 0.035 * p})` }}>{children}</AbsoluteFill>;
};

export const Documentario: React.FC<DocumentarioProps> = ({ legendas, volumeTrilha, efeitos }) => {
	return (
		<AbsoluteFill style={{ background: cor.fundo }}>
			{linha.cenas.map((c, i) => {
				const Comp = COMPONENTES[c.id];
				const cap = linha.capitulos.find((x) => x.id === c.capitulo)!;
				const inicio = fr(c.inicio);
				const dur = fr(c.fim) - inicio;
				const props: CenaProps = {
					dur,
					t: (frase, trecho) => fr(momento(cap.frases[frase], trecho)) - inicio,
					fim: (frase) => fr(cap.frases[frase].fim) - inicio,
				};
				return (
					<Sequence key={c.id} from={inicio} durationInFrames={dur + (i < linha.cenas.length - 1 ? SOBREPOSICAO : 0)} name={c.id} premountFor={FPS}>
						<Quadro primeira={i === 0}>
							<Comp {...props} />
						</Quadro>
					</Sequence>
				);
			})}
			{linha.capitulos.map((c, i) => {
				// no capítulo 1 a identificação espera o título principal sair de cena
				const de = i === 0 ? c.frases[3].inicio : c.inicio + 0.2;
				return (
					<Sequence key={c.id} from={fr(de)} durationInFrames={fr(5.5)} name={`Identificação ${c.id}`} layout="none">
						<Identificacao numero={c.id} tema={c.tema} narrador={c.narrador} dur={fr(5.5)} />
					</Sequence>
				);
			})}
			<Acabamento />
			{legendas ? <Legendas /> : null}
			<Narracao />
			<Trilha volume={volumeTrilha} />
			{efeitos ? <Efeitos /> : null}
		</AbsoluteFill>
	);
};
