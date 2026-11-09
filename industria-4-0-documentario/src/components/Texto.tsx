import React from 'react';
import { useCurrentFrame } from 'remotion';
import { entra, mapa, prog, suave } from '../animations/movimento.ts';
import { cor, tipo } from '../styles/tema.ts';

type Pos = { x?: number; y?: number; alinhar?: 'left' | 'center' | 'right' };

/** Título revelado por máscara: cada linha sobe de dentro de um recorte. */
export const TituloRevelado: React.FC<
	Pos & {
		texto: string;
		sub?: string;
		inicio: number;
		fim?: number;
		tamanho?: 'grande' | 'medio';
		corTexto?: string;
		rotulo?: string;
	}
> = ({ texto, sub, inicio, fim = 99999, tamanho = 'grande', x = 960, y = 540, alinhar = 'center', corTexto = cor.branco, rotulo }) => {
	const f = useCurrentFrame();
	const estilo = tamanho === 'grande' ? tipo.titulo : tipo.tituloMedio;
	const saida = prog(f, fim - 16, 16, entra);
	const linhaP = prog(f, inicio + 6, 26);
	const tx = alinhar === 'center' ? '-50%' : alinhar === 'right' ? '-100%' : '0%';
	return (
		<div style={{ position: 'absolute', left: x, top: y, transform: `translate(${tx}, -50%)`, textAlign: alinhar, opacity: 1 - saida, whiteSpace: 'nowrap' }}>
			{rotulo ? (
				<div style={{ ...tipo.rotulo, color: cor.ciano, marginBottom: 26, opacity: prog(f, inicio, 18), transform: `translateY(${mapa(prog(f, inicio, 22), [0, 1], [12, 0])}px)` }}>
					{rotulo}
				</div>
			) : null}
			{texto.split('\n').map((l, i) => {
				const p = prog(f, inicio + i * 5, 30);
				return (
					<div key={i} style={{ overflow: 'hidden', paddingBottom: '0.08em' }}>
						<div
							style={{
								...estilo,
								color: corTexto,
								transform: `translateY(${(1 - p) * 105}%)`,
								filter: `blur(${(1 - p) * 6}px)`,
							}}
						>
							{l}
						</div>
					</div>
				);
			})}
			<div
				style={{
					height: 2,
					marginTop: 22,
					background: `linear-gradient(90deg, ${alinhar === 'center' ? 'transparent, ' : ''}${cor.ciano}, transparent)`,
					transform: `scaleX(${linhaP})`,
					transformOrigin: alinhar === 'left' ? 'left' : alinhar === 'right' ? 'right' : 'center',
					opacity: 0.8,
				}}
			/>
			{sub ? (
				<div style={{ overflow: 'hidden', marginTop: 22 }}>
					<div style={{ ...tipo.subtitulo, whiteSpace: 'pre-line', color: cor.cinza, transform: `translateY(${(1 - prog(f, inicio + 14, 30)) * 100}%)`, opacity: prog(f, inicio + 14, 20) }}>
						{sub}
					</div>
				</div>
			) : null}
		</div>
	);
};

/** Palavra-chave do documentário (diferente das legendas): caixa alta, espaçamento que se fecha. */
export const PalavraChave: React.FC<Pos & { texto: string; inicio: number; fim?: number; corTexto?: string; tamanho?: number }> = ({
	texto,
	inicio,
	fim = 99999,
	x = 960,
	y = 540,
	alinhar = 'center',
	corTexto = cor.branco,
	tamanho,
}) => {
	const f = useCurrentFrame();
	const p = prog(f, inicio, 34);
	const s = prog(f, fim - 14, 14, entra);
	const tx = alinhar === 'center' ? '-50%' : alinhar === 'right' ? '-100%' : '0%';
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: `translate(${tx}, -50%)`,
				...tipo.palavraChave,
				fontSize: tamanho ?? tipo.palavraChave.fontSize,
				letterSpacing: `${0.04 + (1 - p) * 0.22}em`,
				color: corTexto,
				opacity: p * (1 - s),
				whiteSpace: 'nowrap',
				textAlign: alinhar,
				filter: `blur(${(1 - p) * 4}px)`,
			}}
		>
			{texto}
		</div>
	);
};

/** Pequeno texto técnico (rótulos de diagrama). */
export const Nota: React.FC<Pos & { texto: string; inicio: number; fim?: number; corTexto?: string; tamanho?: number; peso?: number }> = ({
	texto,
	inicio,
	fim = 99999,
	x = 0,
	y = 0,
	alinhar = 'left',
	corTexto = cor.cinza,
	tamanho = 22,
	peso = 600,
}) => {
	const f = useCurrentFrame();
	const p = prog(f, inicio, 18, suave) * (1 - prog(f, fim - 10, 10, entra));
	const tx = alinhar === 'center' ? '-50%' : alinhar === 'right' ? '-100%' : '0%';
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: `translate(${tx}, calc(-50% + ${(1 - p) * 8}px))`,
				...tipo.rotulo,
				fontSize: tamanho,
				fontWeight: peso,
				color: corTexto,
				opacity: p,
				whiteSpace: 'nowrap',
				textAlign: alinhar,
			}}
		>
			{texto}
		</div>
	);
};

/** Identifica explicitamente que a imagem é uma ilustração (não registro documental). */
export const TagIlustracao: React.FC<{ texto?: string; opacidade?: number }> = ({ texto = 'Ilustração', opacidade = 1 }) => (
	<div
		style={{
			position: 'absolute',
			right: 72,
			top: 60,
			...tipo.nota,
			fontSize: 15,
			color: cor.cinza,
			opacity: 0.75 * opacidade,
			display: 'flex',
			alignItems: 'center',
			gap: 10,
		}}
	>
		<span style={{ width: 18, height: 1, background: cor.cinza }} />
		{texto}
	</div>
);
