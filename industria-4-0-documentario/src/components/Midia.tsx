import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { midias } from '../data/dados.ts';
import { TagIlustracao } from './Texto.tsx';

export const temMidia = (chave: string) => Boolean(midias[chave]);

/**
 * Mídia real (vídeo ou foto) em tela cheia, com movimento lento de câmera e escurecimento para leitura.
 * Fotos recebem um "push-in" suave; nada é esticado: object-fit cover preserva a proporção.
 */
export const Midia: React.FC<{ chave: string; dur: number; zoom?: [number, number]; escurecer?: number; origem?: string }> = ({
	chave,
	dur,
	zoom = [1.04, 1.12],
	escurecer = 0.45,
	origem = '50% 50%',
}) => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();
	const arq = midias[chave];
	if (!arq) return null;
	const s = zoom[0] + (zoom[1] - zoom[0]) * Math.min(1, f / Math.max(1, dur));
	const ehVideo = /\.(mp4|webm|mov)$/i.test(arq);
	const estilo: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, transformOrigin: origem };
	return (
		<AbsoluteFill>
			{ehVideo ? <Video src={staticFile(arq)} muted style={estilo} loop trimBefore={Math.round(fps * 0.5)} /> : <Img src={staticFile(arq)} style={estilo} />}
			<AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(7,21,34,${escurecer * 0.6}) 0%, rgba(7,21,34,${escurecer * 0.4}) 45%, rgba(7,21,34,${Math.min(0.95, escurecer + 0.3)}) 100%)` }} />
		</AbsoluteFill>
	);
};

/** Usa a mídia real quando existe; caso contrário mostra a ilustração original, identificada como tal. */
export const Plate: React.FC<{ chave: string; dur: number; tag?: string; zoom?: [number, number]; escurecer?: number; children: React.ReactNode }> = ({
	chave,
	dur,
	tag,
	zoom,
	escurecer,
	children,
}) =>
	temMidia(chave) ? (
		<Midia chave={chave} dur={dur} zoom={zoom} escurecer={escurecer} />
	) : (
		<AbsoluteFill>
			{children}
			<TagIlustracao texto={tag} />
		</AbsoluteFill>
	);
