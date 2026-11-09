import React from 'react';
import { Composition } from 'remotion';
import { Documentario, type DocumentarioProps } from './compositions/Documentario.tsx';
import { DURACAO_FRAMES } from './data/dados.ts';
import { FPS } from './data/linhaDoTempo.ts';
import { carregarFontes } from './styles/tema.ts';

carregarFontes();

const padrao: DocumentarioProps = { legendas: true, volumeTrilha: 0.5, efeitos: true };

export const Root: React.FC = () => (
	<>
		<Composition id="Documentario" component={Documentario} durationInFrames={DURACAO_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={padrao} />
		<Composition id="DocumentarioSemLegendas" component={Documentario} durationInFrames={DURACAO_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ ...padrao, legendas: false }} />
	</>
);
