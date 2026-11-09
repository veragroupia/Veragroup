import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { entra, mapa, prog } from '../../animations/movimento.ts';
import { Camera } from '../../components/Camera.tsx';
import { FabricaIlustrada } from '../../components/Fabrica.tsx';
import { Fluxo, No } from '../../components/Fluxo.tsx';
import { Fundo } from '../../components/Fundo.tsx';
import { IconeCaminhao, IconeDados, IconeFabrica, IconeMaquina, IconePessoa, IconeSensor, IconeServidor } from '../../components/Icones.tsx';
import { Plate, temMidia } from '../../components/Midia.tsx';
import { midias } from '../../data/dados.ts';
import { Nota, TituloRevelado } from '../../components/Texto.tsx';
import { cor, tipo } from '../../styles/tema.ts';
import type { CenaProps } from '../tipos.ts';

/* ───────────── Cena 01 — Abertura com impacto ───────────── */
export const Cena01: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tFiccao = t(1);
	const tTitulo = t(2, 'Indústria 4.0');
	const escurece = prog(f, tTitulo - 20, 30);
	return (
		<AbsoluteFill>
			<Fundo />
			<Camera
				chaves={[
					{ f: 0, e: { s: 1.0, x: 0, y: 0 } },
					{ f: tFiccao, e: { s: 1.1, x: 0, y: -10 } },
					{ f: tFiccao + 75, e: { s: 2.0, x: 110, y: 120 } },
					{ f: tTitulo, e: { s: 1.85, x: 100, y: 110 } },
					{ f: dur, e: { s: 1.5, x: 60, y: 80 } },
				]}
			>
				<Plate chave="fabricas/abertura" dur={dur}>
					<FabricaIlustrada />
				</Plate>
			</Camera>
			<AbsoluteFill style={{ background: cor.fundo, opacity: escurece * 0.68 }} />
			<TituloRevelado texto="INDÚSTRIA 4.0" sub="A nova revolução industrial" inicio={tTitulo} y={500} />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 02 — Linha do tempo das revoluções ───────────── */
const ERAS = [
	{ n: '1ª', quando: 'Fim do séc. XVIII', titulo: 'Máquina a vapor', chave: 'fabricas/historia-1-vapor' },
	{ n: '2ª', quando: 'Fim do séc. XIX', titulo: 'Eletricidade e produção em massa', chave: 'fabricas/historia-2-eletricidade' },
	{ n: '3ª', quando: 'Meados do séc. XX', titulo: 'Computadores e automação', chave: 'fabricas/historia-3-automacao' },
	{ n: '4ª', quando: 'Séc. XXI', titulo: 'Sistemas conectados e inteligentes', chave: 'tecnologias/historia-4-conectada' },
];
const ESPACO = 640;
const X0 = 520;

const ArteVapor: React.FC<{ f: number }> = ({ f }) => {
	const a = f * 3;
	const px = Math.cos((a * Math.PI) / 180) * 34;
	return (
		<g fill="none" stroke={cor.branco} strokeWidth={2.4} strokeLinecap="round">
			<circle cx={70} cy={0} r={58} />
			<g transform={`translate(70 0) rotate(${a})`}>
				{[0, 60, 120].map((r) => (
					<line key={r} x1={-58} x2={58} transform={`rotate(${r})`} stroke={cor.cinza} />
				))}
				<circle r={8} fill={cor.ambar} stroke="none" />
			</g>
			<rect x={-150} y={-22} width={90} height={44} rx={4} />
			<line x1={-60 + px * 0.4} y1={0} x2={70 + px} y2={Math.sin((a * Math.PI) / 180) * 34} stroke={cor.ambar} />
			<path d="M -130 -22 V -60 M -100 -22 V -48" stroke={cor.cinza} />
			{[0, 1, 2].map((i) => {
				const k = ((f + i * 20) % 60) / 60;
				return <circle key={i} cx={-130 + Math.sin(k * 6 + i) * 6} cy={-66 - k * 50} r={6 + k * 12} stroke={cor.cinza} strokeOpacity={1 - k} />;
			})}
		</g>
	);
};
const ArteEletricidade: React.FC<{ f: number }> = ({ f }) => (
	<g fill="none" stroke={cor.branco} strokeWidth={2.4} strokeLinecap="round">
		<path d="M -150 -10 C -150 -50 -90 -50 -90 -10 C -90 10 -104 18 -104 34 H -136 C -136 18 -150 10 -150 -10 Z M -132 44 H -108" />
		<circle cx={-120} cy={-14} r={40} stroke={cor.ambar} strokeOpacity={0.2 + 0.15 * Math.sin(f / 6)} strokeWidth={10} />
		<path d="M -40 40 H 170" stroke={cor.cinza} />
		{[0, 1, 2, 3].map((i) => {
			const x = ((f * 1.5 + i * 55) % 220) - 40;
			return <rect key={i} x={x} y={14} width={30} height={26} rx={3} stroke={cor.branco} />;
		})}
		<path d="M 60 -50 V -6 M 40 -6 H 80" stroke={cor.cinza} />
	</g>
);
const ArteComputador: React.FC<{ f: number }> = ({ f }) => (
	<g fill="none" stroke={cor.branco} strokeWidth={2.4} strokeLinecap="round">
		<rect x={-150} y={-56} width={150} height={100} rx={6} />
		<path d="M -100 44 V 60 M -120 60 H -30" />
		{[0, 1, 2].map((i) => (
			<line key={i} x1={-134} x2={-134 + 40 + ((i * 37) % 60)} y1={-34 + i * 20} y2={-34 + i * 20} stroke={cor.cinza} />
		))}
		<rect x={-134 + 40 + ((2 * 37) % 60) + 8} y={6} width={10} height={14} fill={Math.floor(f / 15) % 2 ? cor.ciano : 'none'} stroke="none" />
		<rect x={40} y={-50} width={110} height={100} rx={4} />
		{[0, 1, 2, 3].map((i) => (
			<circle key={i} cx={62 + i * 22} cy={-28} r={5} fill={(Math.floor(f / 10) + i) % 3 === 0 ? cor.ambar : 'none'} stroke={cor.cinza} />
		))}
		<path d="M 54 0 H 136 M 54 22 H 110" stroke={cor.cinza} />
	</g>
);
const ArteConectada: React.FC<{ f: number }> = ({ f }) => {
	const pts: [number, number][] = [[-130, -30], [-40, 40], [40, -40], [130, 30], [0, 0]];
	return (
		<g fill="none" stroke={cor.ciano} strokeWidth={2.2}>
			{pts.slice(0, 4).map((p, i) => (
				<line key={i} x1={p[0]} y1={p[1]} x2={0} y2={0} strokeOpacity={0.6} strokeDasharray="5 7" strokeDashoffset={-f} />
			))}
			{pts.map((p, i) => (
				<circle key={i} cx={p[0]} cy={p[1]} r={i === 4 ? 16 : 10} fill={i === 4 ? cor.ciano : cor.fundo2} />
			))}
		</g>
	);
};
const ARTES = [ArteVapor, ArteEletricidade, ArteComputador, ArteConectada];

export const Cena02: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tEra = [t(4), t(5), t(6), Math.max(t(6) + 60, dur - 55)];
	const xEra = (i: number) => X0 + i * ESPACO;
	// câmera: "volta no tempo" (rebobina da direita para a 1ª era) e depois acompanha cada era narrada
	const chaves = [
		{ f: 0, e: { s: 0.92, x: xEra(3) - 960, y: 0 } },
		{ f: Math.max(30, tEra[0] - 25), e: { s: 1, x: xEra(0) - 760, y: 0 } },
		{ f: tEra[1], e: { s: 1, x: xEra(1) - 960 + 120, y: 0 } },
		{ f: tEra[2], e: { s: 1, x: xEra(2) - 960 + 60, y: 0 } },
		{ f: tEra[3], e: { s: 1, x: xEra(3) - 960, y: 0 } },
		{ f: dur, e: { s: 1.5, x: xEra(3) - 960, y: 70 } },
	];
	const linhaP = prog(f, 0, Math.max(40, tEra[0] - 10));
	return (
		<AbsoluteFill>
			<Fundo brilho={[50, 55]} />
			<Camera chaves={chaves}>
				<svg width="1920" height="1080" style={{ position: 'absolute', overflow: 'visible' }}>
					<line x1={X0 - 400} x2={X0 - 400 + (ESPACO * 3 + 800) * linhaP} y1={610} y2={610} stroke={cor.linha} strokeWidth={2} />
					{ERAS.map((_, i) => {
						const p = prog(f, tEra[i] - 6, 22);
						return (
							<g key={i} transform={`translate(${xEra(i)} 610)`}>
								<circle r={9 + 5 * p} fill={i === 3 ? cor.ciano : cor.fundo} stroke={i === 3 ? cor.ciano : cor.ambar} strokeWidth={2.5} opacity={0.35 + 0.65 * p} />
								<circle r={26 * p} fill="none" stroke={i === 3 ? cor.ciano : cor.ambar} strokeOpacity={0.35 * (1 - prog(f, tEra[i] + 10, 30))} strokeWidth={2} />
								<line y1={-18} y2={-48} stroke={cor.linha} strokeWidth={2} opacity={p} />
							</g>
						);
					})}
				</svg>
				{ERAS.map((era, i) => {
					const p = prog(f, tEra[i], 30);
					const Arte = ARTES[i];
					const foto = temMidia(era.chave);
					return (
						<div key={i} style={{ position: 'absolute', left: xEra(i) - 260, top: 190, width: 520, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
							<div style={{ ...tipo.nota, color: i === 3 ? cor.ciano : cor.ambar, marginBottom: 14 }}>{era.quando}</div>
							<div style={{ height: 320, borderRadius: 10, border: `1px solid ${cor.linha}`, background: 'rgba(16,40,62,0.5)', overflow: 'hidden', position: 'relative' }}>
								{foto ? (
									<Img src={staticFile(midias[era.chave])} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: i < 3 ? 'grayscale(1) contrast(1.05)' : undefined }} />
								) : (
									<>
										<svg width="520" height="320" viewBox="-210 -130 420 260">
											<Arte f={f} />
										</svg>
										<div style={{ position: 'absolute', right: 12, bottom: 10, ...tipo.nota, fontSize: 12, color: cor.cinza, opacity: 0.8 }}>Ilustração</div>
									</>
								)}
							</div>
							<div style={{ position: 'absolute', top: 470, width: 520, textAlign: 'center' }}>
								<div style={{ ...tipo.rotulo, color: cor.cinza, fontSize: 18 }}>{era.n} revolução</div>
								<div style={{ ...tipo.corpo, color: cor.branco, fontWeight: 600, fontSize: 32, marginTop: 10 }}>{era.titulo}</div>
							</div>
						</div>
					);
				})}
			</Camera>
			<TituloRevelado texto="AS REVOLUÇÕES INDUSTRIAIS" tamanho="medio" inicio={8} fim={tEra[0] + 10} y={540} />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 03 — A conexão ───────────── */
const HUB: [number, number] = [780, 500];
const NOS = [
	{ id: 'maquinas', rotulo: 'Máquinas', p: [420, 290] as [number, number], Icone: IconeMaquina, trecho: 'máquinas' },
	{ id: 'sensores', rotulo: 'Sensores', p: [1140, 290] as [number, number], Icone: IconeSensor, trecho: 'sensores' },
	{ id: 'sistemas', rotulo: 'Sistemas', p: [420, 710] as [number, number], Icone: IconeServidor, trecho: 'sistemas' },
	{ id: 'pessoas', rotulo: 'Pessoas', p: [1140, 710] as [number, number], Icone: IconePessoa, trecho: 'trocam' },
];
const RESULTADOS = [
	{ txt: 'Acompanhar a produção', trecho: 'acompanhar' },
	{ txt: 'Corrigir falhas', trecho: 'corrigir' },
	{ txt: 'Decidir mais rápido', trecho: 'tomar decisões' },
];

export const Cena03: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const entrada = prog(f, 0, 40);
	const tempoReal = t(7, 'tempo real');
	const tPessoas = t(9);
	const tFinal = t(10, 'como os produtos');
	const foco = prog(f, tPessoas, 30);
	const fabrica = prog(f, Math.max(tFinal, dur - 80), 50);
	const vel = f > tempoReal ? 26 : 50;
	return (
		<AbsoluteFill>
			<Fundo brilho={[42, 46]} />
			<AbsoluteFill style={{ opacity: 0.18 + fabrica * 0.62 }}>
				<Camera chaves={[{ f: 0, e: { s: 1.15, x: 0, y: 0 } }, { f: dur, e: { s: 1.0, x: 0, y: 0 } }]}>
					<Plate chave="fabricas/fabrica-inteligente" dur={dur} tag="Ilustração">
						<FabricaIlustrada rede={fabrica} braçoCentral />
					</Plate>
				</Camera>
			</AbsoluteFill>
			<AbsoluteFill style={{ background: cor.fundo, opacity: 0.55 * (1 - fabrica) + 0.15 }} />
			<AbsoluteFill style={{ opacity: 1 - fabrica * 0.92, transform: `scale(${1 + fabrica * 0.08})` }}>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					{NOS.map((n, i) => (
						<Fluxo
							key={n.id}
							de={n.p}
							para={HUB}
							inicio={t(7, n.trecho)}
							curv={i % 2 ? 0.12 : -0.12}
							pulsos={3}
							velocidade={vel}
							bidirecional
							opacidade={n.id === 'pessoas' ? 1 : 1 - foco * 0.65}
							corLinha={n.id === 'pessoas' && foco > 0 ? cor.ambar : cor.linhaForte}
							corPulso={n.id === 'pessoas' && foco > 0 ? cor.ambar : cor.ciano}
						/>
					))}
					<g transform={`translate(${HUB[0]} ${HUB[1]}) scale(${mapa(entrada, [0, 1], [2.6, 1])})`}>
						<circle r={92} fill={cor.ciano} opacity={0.08} />
						<circle r={64} fill={cor.fundo2} stroke={cor.ciano} strokeWidth={3} />
						<IconeDados s={1.1} c={cor.ciano} />
					</g>
					{NOS.map((n) => (
						<No key={n.id} x={n.p[0]} y={n.p[1]} inicio={t(7, n.trecho) - 8} ativo={n.id === 'pessoas' ? foco : 0.3} corNo={n.id === 'pessoas' && foco > 0 ? cor.ambar : cor.ciano}>
							<n.Icone s={0.9} c={cor.branco} />
						</No>
					))}
				</svg>
				<Nota texto="Dados" inicio={10} x={HUB[0]} y={HUB[1] + 104} alinhar="center" corTexto={cor.ciano} />
				{NOS.map((n) => (
					<Nota key={n.id} texto={n.rotulo} inicio={t(7, n.trecho)} x={n.p[0]} y={n.p[1] + 96} alinhar="center" corTexto={n.id === 'pessoas' && foco > 0 ? cor.ambar : cor.branco} />
				))}
				<Nota texto="Em tempo real" inicio={tempoReal} fim={t(8) + 10} x={HUB[0]} y={HUB[1] - 112} alinhar="center" corTexto={cor.ciano} tamanho={18} />
				{RESULTADOS.map((r, i) => {
					const ti = t(8, r.trecho);
					const p = prog(f, ti, 24) * (1 - prog(f, tPessoas - 10, 20, entra));
					return (
						<div key={i} style={{ position: 'absolute', left: 1370, top: 372 + i * 110, opacity: p, transform: `translateX(${(1 - p) * 30}px)`, display: 'flex', alignItems: 'center', gap: 22 }}>
							<svg width="44" height="44">
								<circle cx="22" cy="22" r="20" fill="none" stroke={cor.ciano} strokeWidth="2" />
								<path d="M 13 23 L 20 30 L 32 16" fill="none" stroke={cor.ciano} strokeWidth="2.6" pathLength={1} strokeDasharray={`${prog(f, ti + 6, 16)} 1`} />
							</svg>
							<div style={{ ...tipo.corpo, color: cor.branco, fontSize: 34, fontWeight: 600 }}>{r.txt}</div>
						</div>
					);
				})}
				{/* produtos chegando até nós */}
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					{[IconeFabrica, IconeCaminhao, IconePessoa].map((Ic, i) => {
						const p = prog(f, tFinal + i * 12, 24) * (1 - fabrica);
						return (
							<g key={i} transform={`translate(${1420 + i * 170} 500)`} opacity={p}>
								<circle r={48} fill={cor.fundo2} stroke={i === 2 ? cor.ambar : cor.linhaForte} strokeWidth={2} />
								<Ic s={0.85} c={i === 2 ? cor.ambar : cor.branco} />
							</g>
						);
					})}
					<Fluxo de={[1470, 500]} para={[1540, 500]} inicio={tFinal + 14} curv={0} pulsos={1} velocidade={30} opacidade={1 - fabrica} />
					<Fluxo de={[1640, 500]} para={[1710, 500]} inicio={tFinal + 26} curv={0} pulsos={1} velocidade={30} opacidade={1 - fabrica} corPulso={cor.ambar} />
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

