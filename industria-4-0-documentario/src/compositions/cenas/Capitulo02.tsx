import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { entra, janela, lerp, mapa, prog } from '../../animations/movimento.ts';
import { Camera } from '../../components/Camera.tsx';
import { MaquinaCNC, Impressora3D, Prensa, SeloSensor } from '../../components/Equipamentos.tsx';
import { FabricaIlustrada } from '../../components/Fabrica.tsx';
import { Fluxo, No } from '../../components/Fluxo.tsx';
import { Fundo } from '../../components/Fundo.tsx';
import { IconeAlerta, IconeChip, IconePessoa, IconeSensor, IconeServidor } from '../../components/Icones.tsx';
import { BracoRobotico } from '../../components/Maquinas.tsx';
import { Plate } from '../../components/Midia.tsx';
import { Nota, PalavraChave, TituloRevelado } from '../../components/Texto.tsx';
import { cor, tipo } from '../../styles/tema.ts';
import type { CenaProps } from '../tipos.ts';

/** Painel técnico translúcido. */
export const Painel: React.FC<{ x: number; y: number; w: number; h: number; p?: number; children?: React.ReactNode; titulo?: string; corBorda?: string }> = ({
	x,
	y,
	w,
	h,
	p = 1,
	children,
	titulo,
	corBorda = cor.linha,
}) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: y,
			width: w,
			height: h,
			borderRadius: 14,
			border: `1px solid ${corBorda}`,
			background: 'linear-gradient(180deg, rgba(16,40,62,0.72), rgba(7,21,34,0.78))',
			opacity: p,
			transform: `translateY(${(1 - p) * 24}px)`,
			overflow: 'hidden',
		}}
	>
		{titulo ? <div style={{ ...tipo.nota, color: cor.cinza, position: 'absolute', left: 26, top: 20 }}>{titulo}</div> : null}
		{children}
	</div>
);

/* ───────────── Cena 04 — Internet das Coisas ───────────── */
export const Cena04: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tTitulo = t(1, 'Internet das Coisas');
	const tConecta = t(1, 'conecta');
	const tCompart = t(1, 'compartilhar');
	const maquinas = [
		{ x: 420, sensor: [420, 470] as [number, number], dado: 'Temperatura' },
		{ x: 960, sensor: [960, 400] as [number, number], dado: 'Vibração' },
		{ x: 1500, sensor: [1560, 360] as [number, number], dado: 'Rotação' },
	];
	const GW: [number, number] = [1480, 190];
	const s = (i: number) => prog(f, tConecta - 20 + i * 8, 20);
	return (
		<AbsoluteFill>
			<Fundo brilho={[60, 30]} />
			<Camera chaves={[{ f: 0, e: { s: 1.18, x: 0, y: 80 } }, { f: tTitulo, e: { s: 1.03, x: 0, y: 20 } }, { f: dur, e: { s: 1, x: 0, y: 0 } }]}>
				<Plate chave="tecnologias/maquinas-conectadas" dur={dur}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<line x1={0} x2={1920} y1={760} y2={760} stroke={cor.linha} strokeWidth={2} />
						<MaquinaCNC x={420} y={760} f={f} />
						<Prensa x={960} y={760} f={f} />
						<BracoRobotico id="iot" x={1500} y={760} escala={0.82} a1={20 + Math.sin(f / 30) * 18} a2={70 + Math.sin(f / 30) * 20} a3={30} />
						{/* máquina a máquina */}
						<Fluxo de={[maquinas[0].sensor[0] + 14, maquinas[0].sensor[1]]} para={[maquinas[1].sensor[0] - 14, maquinas[1].sensor[1]]} inicio={tCompart} curv={-0.15} pulsos={2} velocidade={40} bidirecional />
						<Fluxo de={[maquinas[1].sensor[0] + 14, maquinas[1].sensor[1]]} para={[maquinas[2].sensor[0] - 14, maquinas[2].sensor[1]]} inicio={tCompart + 6} curv={-0.15} pulsos={2} velocidade={40} bidirecional />
						{maquinas.map((m, i) => (
							<Fluxo key={i} de={m.sensor} para={GW} inicio={tConecta + i * 6} curv={-0.12} pulsos={3} velocidade={44} />
						))}
						{maquinas.map((m, i) => (
							<SeloSensor key={i} x={m.sensor[0]} y={m.sensor[1]} f={f + i * 13} ativo={s(i)} />
						))}
						<No x={GW[0]} y={GW[1]} r={50} inicio={tConecta - 10} ativo={prog(f, tCompart, 20)}>
							<IconeServidor s={0.75} c={cor.branco} />
						</No>
					</svg>
					{maquinas.map((m, i) => (
						<Nota key={i} texto={m.dado} inicio={tCompart + 10 + i * 6} x={m.sensor[0] + 26} y={m.sensor[1] - 42} corTexto={cor.ciano} tamanho={17} />
					))}
					<Nota texto="Sistema da fábrica" inicio={tConecta} x={GW[0] + 72} y={GW[1]} corTexto={cor.branco} tamanho={18} />
				</Plate>
			</Camera>
			<TituloRevelado texto={'INTERNET\nDAS COISAS'} inicio={tTitulo} tamanho="medio" x={120} y={220} alinhar="left" rotulo="Tecnologia 1" />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 05 — Inteligência artificial ───────────── */
const sinal = (x: number, anomalia: number) => {
	const base = Math.sin(x * 0.11) * 18 + Math.sin(x * 0.37 + 1) * 9 + Math.sin(x * 1.3) * 4;
	const crescimento = anomalia * Math.max(0, (x - 900) / 500) * (Math.sin(x * 0.6) * 70 + Math.sin(x * 1.9) * 22);
	return base + crescimento;
};

export const Cena05: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tAnalisa = t(2, 'analisa');
	const tPadroes = t(2, 'identifica padrões');
	const tFalhar = t(3, 'perto de falhar');
	const tEquipe = Math.min(dur - 70, tFalhar + 40);
	const tMensagem = Math.min(dur - 50, tEquipe + 25);
	// o traço avança no tempo; a anomalia cresce quando a narração fala em falha
	const W = 1500;
	const avanco = mapa(f, [0, tFalhar + 10], [500, W]);
	const anom = prog(f, t(3) - 10, 40);
	const pts: string[] = [];
	for (let x = 0; x <= avanco; x += 4) pts.push(`${x},${120 - sinal(x, anom)}`);
	const janelaX = mapa(f, [tAnalisa, tPadroes + 40], [200, 900]);
	const passos = [
		{ r: 'Sensor detecta vibração', Ic: IconeSensor, ti: 10 },
		{ r: 'Sistema analisa o sinal', Ic: IconeChip, ti: tAnalisa },
		{ r: 'Alerta de possível falha', Ic: IconeAlerta, ti: tFalhar },
		{ r: 'Equipe recebe a informação', Ic: IconePessoa, ti: tEquipe },
	];
	return (
		<AbsoluteFill>
			<Fundo brilho={[50, 30]} />
			<Nota texto="Inteligência artificial" inicio={4} x={160} y={110} corTexto={cor.ciano} />
			<Painel x={160} y={150} w={1600} h={330} p={prog(f, 0, 24)} titulo="Vibração de um equipamento">
				<svg width="1600" height="330" style={{ position: 'absolute' }}>
					<g transform="translate(50 60)">
						<rect x={0} y={60} width={W} height={120} fill={cor.ciano} opacity={0.05} />
						<line x1={0} x2={W} y1={60} y2={60} stroke={cor.cinza} strokeOpacity={0.4} strokeDasharray="6 8" />
						<line x1={0} x2={W} y1={180} y2={180} stroke={cor.cinza} strokeOpacity={0.4} strokeDasharray="6 8" />
						<text x={W} y={52} textAnchor="end" fill={cor.cinza} fontSize={15} fontFamily="Inter" letterSpacing="2">FAIXA NORMAL</text>
						<rect x={janelaX} y={20} width={260} height={200} fill="none" stroke={cor.ciano} strokeWidth={1.5} opacity={janela(f, tAnalisa, tFalhar, 14, 14)} rx={6} />
						<text x={janelaX + 10} y={40} fill={cor.ciano} fontSize={14} fontFamily="Inter" letterSpacing="2" opacity={janela(f, tAnalisa, tFalhar, 14, 14)}>
							{f > tPadroes ? 'PADRÃO RECONHECIDO' : 'ANALISANDO'}
						</text>
						<polyline points={pts.join(' ')} fill="none" stroke={cor.branco} strokeWidth={2.2} strokeLinejoin="round" />
						<rect x={1100} y={-10} width={400} height={260} fill={cor.ambar} opacity={0.1 * anom} rx={6} />
						<circle cx={avanco} cy={120 - sinal(avanco, anom)} r={6} fill={anom > 0.3 ? cor.ambar : cor.ciano} />
					</g>
				</svg>
			</Painel>
			<Nota texto="Simulação ilustrativa — não são dados reais" inicio={10} x={1760} y={510} alinhar="right" tamanho={14} />
			<svg width="1920" height="1080" style={{ position: 'absolute' }}>
				{passos.slice(0, 3).map((_, i) => (
					<Fluxo key={i} de={[310 + i * 430 + 60, 660]} para={[310 + (i + 1) * 430 - 60, 660]} inicio={passos[i + 1].ti - 18} curv={0} pulsos={2} velocidade={30} corPulso={i === 1 ? cor.ambar : cor.ciano} />
				))}
				{passos.map((p, i) => (
					<No key={i} x={310 + i * 430} y={660} r={50} inicio={p.ti - 6} ativo={1} corNo={i >= 2 ? cor.ambar : cor.ciano}>
						<p.Ic s={0.75} c={cor.branco} />
					</No>
				))}
			</svg>
			{passos.map((p, i) => (
				<Nota key={i} texto={p.r} inicio={p.ti} x={310 + i * 430} y={748} alinhar="center" corTexto={cor.branco} tamanho={17} />
			))}
			<PalavraChave texto="PREVER ANTES DE FALHAR" inicio={tMensagem} x={960} y={850} corTexto={cor.ambar} tamanho={52} />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 06 — Robótica, Big Data e impressão 3D ───────────── */
export const Cena06: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tBig = t(5);
	const t3d = t(6);
	const fA = 1 - prog(f, tBig - 8, 20, entra);
	const fB = prog(f, tBig - 8, 20) * (1 - prog(f, t3d - 8, 20, entra));
	const fC = prog(f, t3d - 8, 20);
	const chips = [
		{ r: 'Tarefas repetitivas', tr: 'repetitivas' },
		{ r: 'Tarefas perigosas', tr: 'perigosas' },
		{ r: 'Alta precisão', tr: 'precisão' },
	];
	// Big Data: muitos registros (pontos) que se organizam em um gráfico
	const org = prog(f, tBig + 25, 45);
	const pontos = Array.from({ length: 420 }, (_, i) => {
		const col = i % 30;
		const lin = Math.floor(i / 30);
		const h = Math.sin(i * 12.9898) * 43758.5453;
		const r = h - Math.floor(h);
		const barra = Math.floor(col / 3);
		const alturaBarra = [5, 8, 6, 10, 13, 9, 12, 7, 11, 14][barra];
		const x0 = 80 + col * 25 + (r - 0.5) * 18;
		const y0 = 60 + lin * 22 + (r - 0.5) * 18;
		const ativo = lin < alturaBarra;
		const x1 = 80 + barra * 75 + (col % 3) * 16;
		const y1 = 360 - lin * 22;
		return { x: lerp(x0, x1, org), y: lerp(y0, ativo ? y1 : y0 + 30, org), o: ativo ? 1 : 1 - org, r };
	});
	const progresso3d = mapa(f, [t3d + 10, dur], [0.05, 1]);
	return (
		<AbsoluteFill>
			<Fundo />
			{/* A — Robótica */}
			<AbsoluteFill style={{ opacity: fA }}>
				<Camera chaves={[{ f: 0, e: { s: 1.05, x: 0, y: 0 } }, { f: tBig, e: { s: 1.15, x: -60, y: 0 } }]}>
					<Plate chave="fabricas/bracos-roboticos" dur={tBig}>
						<svg width="1920" height="1080" style={{ position: 'absolute' }}>
							<line x1={0} x2={1920} y1={900} y2={900} stroke={cor.linha} strokeWidth={2} />
							{(() => {
								const k = Math.sin(f / 22);
								return <BracoRobotico id="rob" x={640} y={900} escala={1.45} a1={25 + k * 20} a2={60 + k * 22} a3={45 - k * 25} garra={k > 0.6 ? 1 : 0.2} brilhoPonta={0} />;
							})()}
						</svg>
					</Plate>
				</Camera>
				<Nota texto="Robótica" inicio={6} x={1180} y={300} corTexto={cor.ciano} />
				{chips.map((c, i) => {
					const p = prog(f, t(4, c.tr), 20);
					return (
						<div key={i} style={{ position: 'absolute', left: 1180, top: 360 + i * 110, opacity: p, transform: `translateX(${(1 - p) * 40}px)`, display: 'flex', alignItems: 'center', gap: 20 }}>
							<div style={{ width: 54, height: 2, background: i === 1 ? cor.ambar : cor.ciano }} />
							<div style={{ ...tipo.corpo, fontSize: 42, fontWeight: 600, color: cor.branco }}>{c.r}</div>
						</div>
					);
				})}
			</AbsoluteFill>
			{/* B — Big Data */}
			<AbsoluteFill style={{ opacity: fB, transform: `scale(${1.06 - 0.06 * fB})` }}>
				<Nota texto="Big Data" inicio={tBig} x={960} y={130} alinhar="center" corTexto={cor.ciano} />
				<div style={{ position: 'absolute', left: 560, top: 180, width: 800, height: 470, borderRadius: 14, border: `2px solid ${cor.linha}`, background: 'rgba(11,30,48,0.7)' }}>
					<svg width="800" height="470">
						{pontos.map((p, i) => (
							<circle key={i} cx={p.x} cy={p.y} r={4.2} fill={p.r > 0.85 ? cor.ambar : cor.ciano} opacity={p.o * (0.45 + 0.55 * p.r)} />
						))}
						<line x1={70} x2={760} y1={380} y2={380} stroke={cor.cinza} strokeOpacity={0.5 * org} />
					</svg>
				</div>
				<div style={{ position: 'absolute', left: 900, top: 650, width: 120, height: 60, borderLeft: `2px solid ${cor.linha}`, borderRight: `2px solid ${cor.linha}` }} />
				<div style={{ position: 'absolute', left: 820, top: 708, width: 280, height: 2, background: cor.linha }} />
				<Nota texto="Muitos registros" inicio={tBig + 6} fim={tBig + 40} x={960} y={780} alinhar="center" />
				<Nota texto="Padrões e decisões" inicio={tBig + 50} x={960} y={780} alinhar="center" corTexto={cor.branco} />
			</AbsoluteFill>
			{/* C — Impressão 3D */}
			<AbsoluteFill style={{ opacity: fC, transform: `scale(${1.06 - 0.06 * fC})` }}>
				<Plate chave="tecnologias/impressao-3d" dur={dur - t3d}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<Impressora3D x={780} y={860} f={f} progresso={progresso3d} escala={1.25} />
					</svg>
				</Plate>
				<Nota texto="Impressão 3D" inicio={t3d} x={1240} y={340} corTexto={cor.ciano} />
				<Nota texto="Protótipo" inicio={t(6, 'protótipos')} x={1240} y={420} corTexto={cor.branco} tamanho={36} peso={700} />
				<Nota texto="Peça" inicio={t(6, 'peças')} x={1240} y={490} corTexto={cor.branco} tamanho={36} peso={700} />
				<Nota texto="Construída camada por camada" inicio={t3d + 30} x={1240} y={560} tamanho={18} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ───────────── Cena 07 — Aplicação prática: linha de automóveis ───────────── */
export const Cena07: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tTemp = t(7, 'temperatura');
	const tVib = t(7, 'vibração');
	const tAvisa = t(8, 'avisa');
	const tCompara = t(9);
	const tFinal = t(10);
	const painel = prog(f, tTemp - 25, 25) * (1 - prog(f, tCompara - 12, 20, entra));
	const temp = mapa(f, [tTemp, tAvisa], [0.35, 0.86]);
	const vibAmp = mapa(f, [tVib, tAvisa], [6, 30]);
	const alerta = prog(f, tAvisa - 6, 12);
	const comp = prog(f, tCompara, 24) * (1 - prog(f, tFinal - 10, 20, entra));
	const final = prog(f, tFinal, 40);
	const ondas: string[] = [];
	for (let x = 0; x <= 420; x += 3) ondas.push(`${x},${50 + Math.sin(x * 0.12 + f * 0.5) * vibAmp * (0.6 + 0.4 * Math.sin(x * 0.03))}`);
	return (
		<AbsoluteFill>
			<Fundo />
			<Camera
				chaves={[
					{ f: 0, e: { s: 1.0, x: 0, y: 40 } },
					{ f: tTemp, e: { s: 1.45, x: 250, y: 120 } },
					{ f: tCompara, e: { s: 1.5, x: 260, y: 120 } },
					{ f: tFinal, e: { s: 1.15, x: 0, y: 60 } },
					{ f: dur, e: { s: 1.0, x: 0, y: 30 } },
				]}
			>
				<Plate chave="fabricas/linha-automoveis" dur={dur}>
					<FabricaIlustrada rede={final} />
				</Plate>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					<SeloSensor x={1000} y={720} f={f} ativo={prog(f, 4, 20)} corS={alerta > 0 && f < tCompara ? cor.ambar : cor.ciano} />
				</svg>
			</Camera>
			<Nota texto="Exemplo: linha de produção de carros" inicio={8} fim={tTemp} x={120} y={140} corTexto={cor.cinza} />
			<Painel x={1180} y={170} w={600} h={540} p={painel} titulo="Diagnóstico da máquina" corBorda={alerta > 0 ? cor.ambar : cor.linha}>
				<div style={{ position: 'absolute', left: 26, top: 70, ...tipo.rotulo, fontSize: 18, color: cor.branco }}>Temperatura</div>
				<div style={{ position: 'absolute', left: 26, top: 108, width: 548, height: 14, borderRadius: 7, background: 'rgba(138,153,171,0.2)' }}>
					<div style={{ width: `${temp * 100}%`, height: '100%', borderRadius: 7, background: temp > 0.7 ? cor.ambar : cor.ciano }} />
				</div>
				<div style={{ position: 'absolute', left: 26 + 548 * 0.7, top: 100, width: 2, height: 30, background: cor.cinza }} />
				<div style={{ position: 'absolute', left: 26, top: 180, ...tipo.rotulo, fontSize: 18, color: cor.branco, opacity: prog(f, tVib - 10, 16) }}>Vibração</div>
				<svg width="600" height="110" style={{ position: 'absolute', left: 26, top: 210, opacity: prog(f, tVib - 10, 16) }}>
					<polyline points={ondas.join(' ')} fill="none" stroke={vibAmp > 20 ? cor.ambar : cor.ciano} strokeWidth={2} />
				</svg>
				<div style={{ position: 'absolute', left: 26, right: 26, top: 360, padding: '20px 22px', borderRadius: 10, background: 'rgba(246,188,98,0.12)', border: `1px solid ${cor.ambar}`, opacity: alerta, display: 'flex', gap: 18, alignItems: 'center' }}>
					<svg width="48" height="48" viewBox="-32 -32 64 64">
						<IconeAlerta s={0.9} c={cor.ambar} />
					</svg>
					<div>
						<div style={{ ...tipo.rotulo, fontSize: 18, color: cor.ambar }}>Acima do padrão</div>
						<div style={{ ...tipo.corpo, fontSize: 26, color: cor.branco, marginTop: 6 }}>Equipe de manutenção avisada</div>
					</div>
				</div>
			</Painel>
			{/* esperar a falha × agir antes */}
			<AbsoluteFill style={{ opacity: comp }}>
				<AbsoluteFill style={{ background: 'rgba(7,21,34,0.78)' }} />
				{[
					{ r: 'Esperar o problema', cor: cor.cinza, quebra: true },
					{ r: 'Agir antes', cor: cor.ciano, quebra: false },
				].map((l, i) => {
					const p = mapa(f, [tCompara + 10 + i * 10, tFinal - 10], [0, 1]);
					const corte = 0.62;
					return (
						<div key={i} style={{ position: 'absolute', left: 260, top: 380 + i * 170 }}>
							<div style={{ ...tipo.rotulo, color: l.cor, fontSize: 22 }}>{l.r}</div>
							<svg width="1400" height="70" style={{ marginTop: 16 }}>
								<line x1={0} x2={1400 * Math.min(p, l.quebra ? corte : 1)} y1={30} y2={30} stroke={l.cor} strokeWidth={6} strokeLinecap="round" />
								{l.quebra && p > corte ? (
									<>
										<g transform={`translate(${1400 * corte + 30} 30)`}>
											<path d="M -14 -14 L 14 14 M 14 -14 L -14 14" stroke={cor.ambar} strokeWidth={4} />
										</g>
										<text x={1400 * corte + 64} y={38} fill={cor.ambar} fontSize={24} fontFamily="Inter" fontWeight={600}>máquina parada</text>
									</>
								) : null}
								{!l.quebra && p > 0.35 ? (
									<>
										<circle cx={1400 * 0.42} cy={30} r={12} fill={cor.fundo} stroke={cor.ciano} strokeWidth={3} />
										<text x={1400 * 0.42} y={68} textAnchor="middle" fill={cor.ciano} fontSize={20} fontFamily="Inter" fontWeight={600}>manutenção planejada</text>
									</>
								) : null}
							</svg>
						</div>
					);
				})}
			</AbsoluteFill>
			<PalavraChave texto="CONECTADA E INTELIGENTE" inicio={tFinal + 10} x={960} y={200} />
		</AbsoluteFill>
	);
};
