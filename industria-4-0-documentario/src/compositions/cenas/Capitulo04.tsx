import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { entra, mapa, prog } from '../../animations/movimento.ts';
import { Camera } from '../../components/Camera.tsx';
import { Fluxo, No } from '../../components/Fluxo.tsx';
import { Fundo } from '../../components/Fundo.tsx';
import {
	IconeAlerta,
	IconeCadeado,
	IconeChave,
	IconeCiclo,
	IconeCodigo,
	IconeEducacao,
	IconeEscudo,
	IconeFabrica,
	IconeGrafico,
	IconeMaquina,
	IconePessoa,
	IconeServidor,
} from '../../components/Icones.tsx';
import { BracoRobotico } from '../../components/Maquinas.tsx';
import { Plate } from '../../components/Midia.tsx';
import { Nota, PalavraChave, TituloRevelado } from '../../components/Texto.tsx';
import { cor, tipo } from '../../styles/tema.ts';
import type { CenaProps } from '../tipos.ts';

const Bloco: React.FC<{ x: number; y: number; w: number; h: number; p: number; rotulo: string; corB?: string; Ic?: React.FC<{ s?: number; c?: string }> }> = ({ x, y, w, h, p, rotulo, corB = cor.linhaForte, Ic }) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: y,
			width: w,
			height: h,
			borderRadius: 10,
			border: `1.5px solid ${corB}`,
			background: 'rgba(16,40,62,0.75)',
			opacity: p,
			transform: `translateY(${(1 - p) * -60}px)`,
			display: 'flex',
			alignItems: 'center',
			gap: 18,
			padding: '0 24px',
			boxSizing: 'border-box',
		}}
	>
		{Ic ? (
			<svg width="50" height="50" viewBox="-32 -32 64 64">
				<Ic s={0.8} c={cor.branco} />
			</svg>
		) : null}
		<div style={{ ...tipo.rotulo, fontSize: 21, color: cor.branco }}>{rotulo}</div>
	</div>
);

/* ───────────── Cena 12 — Custos e investimentos ───────────── */
export const Cena12: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tCusta = t(1, 'custa');
	const tPequenas = t(2);
	const blocos = [
		{ r: 'Equipamentos', ti: t(1, 'adquirir equipamentos'), Ic: IconeMaquina },
		{ r: 'Infraestrutura e sistemas', ti: t(1, 'atualizar sistemas'), Ic: IconeServidor },
		{ r: 'Treinamento', ti: t(1, 'preparar as equipes'), Ic: IconeEducacao },
	];
	const comp = prog(f, tPequenas - 6, 30);
	const titulo = 1 - prog(f, tCusta - 10, 20, entra);
	return (
		<AbsoluteFill>
			<Fundo clima="serio" brilho={[50, 40]} />
			<AbsoluteFill style={{ opacity: titulo }}>
				<TituloRevelado texto="DESAFIOS" inicio={t(0, 'desafios') - 6} y={500} corTexto={cor.branco} />
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: prog(f, tCusta - 10, 20) }}>
				<Camera chaves={[{ f: tCusta, e: { s: 1.06, x: 0, y: 0 } }, { f: dur, e: { s: 1, x: 0, y: 0 } }]}>
					<Plate chave="brasil/pequena-industria" dur={dur} escurecer={0.65}>
						<svg width="1920" height="1080" style={{ position: 'absolute' }}>
							<line x1={0} x2={1920} y1={800} y2={800} stroke={cor.linha} strokeWidth={2} />
							{/* pequena empresa */}
							<g transform={`translate(${mapa(comp, [0, 1], [520, 420])} 800)`}>
								<path d="M -170 0 V -150 L -100 -195 V -150 L -30 -195 V -150 L 40 -195 V -260 H 80 V -150 L 170 -150 V 0 Z" fill="#0F2639" stroke={cor.cinza} strokeOpacity={0.7} strokeWidth={2} />
								{[-120, -50, 20, 100].map((x) => (
									<rect key={x} x={x} y={-100} width={36} height={30} fill={cor.ambar} opacity={0.25} />
								))}
							</g>
							{/* grande empresa (aparece na comparação) */}
							<g transform="translate(1480 800)" opacity={comp}>
								<path d="M -330 0 V -260 L -230 -320 V -260 L -130 -320 V -260 L -30 -320 V -260 L 70 -320 V -420 H 130 V -260 L 330 -260 V 0 Z" fill="#0F2639" stroke={cor.cinza} strokeOpacity={0.7} strokeWidth={2} />
								{[-280, -190, -100, -10, 80, 170, 250].map((x) => (
									<rect key={x} x={x} y={-180} width={40} height={34} fill={cor.ciano} opacity={0.18} />
								))}
							</g>
						</svg>
					</Plate>
				</Camera>
				{blocos.map((b, i) => {
					const p = prog(f, b.ti - 4, 24);
					// na comparação, a mesma pilha de investimento aparece ao lado das duas empresas
					const x = mapa(comp, [0, 1], [930, 600]);
					return <Bloco key={i} x={x} y={560 - i * 96} w={430} h={80} p={p} rotulo={b.r} Ic={b.Ic} corB={i === 2 ? cor.ambar : cor.linhaForte} />;
				})}
				<Nota texto="Investimento necessário" inicio={tCusta} x={mapa(comp, [0, 1], [930, 600])} y={240} corTexto={cor.cinza} />
				<Nota texto="Pequena empresa: peso maior no orçamento" inicio={tPequenas + 20} x={420} y={860} alinhar="center" corTexto={cor.ambar} tamanho={20} />
				<Nota texto="Grande empresa" inicio={tPequenas + 30} x={1480} y={860} alinhar="center" corTexto={cor.cinza} tamanho={20} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ───────────── Cena 13 — Mercado de trabalho ───────────── */
export const Cena13: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tAuto = t(4, 'automatizadas');
	const tCrescem = t(5, 'crescem');
	const tCapac = t(6);
	const novas = [
		{ r: 'Programação', Ic: IconeCodigo, ti: t(5, 'programação') },
		{ r: 'Manutenção', Ic: IconeChave, ti: t(5, 'manutenção') },
		{ r: 'Análise de dados', Ic: IconeGrafico, ti: t(5, 'análise de dados') },
	];
	const robo = prog(f, tAuto - 10, 30);
	const pessoa = prog(f, tCrescem, 50);
	const ciclo = prog(f, tCapac - 6, 24);
	const k = Math.sin(f / 16);
	return (
		<AbsoluteFill>
			<Fundo clima="serio" brilho={[50, 45]} />
			<Plate chave="fabricas/trabalhadores" dur={dur} escurecer={0.7}>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					<line x1={960} x2={960} y1={260} y2={820} stroke={cor.linha} strokeWidth={1.5} strokeDasharray="4 8" />
					{/* tarefas repetitivas: caixas empilhadas, primeiro por uma pessoa, depois por um robô */}
					<g transform="translate(470 760)">
						<line x1={-300} x2={300} y1={0} y2={0} stroke={cor.linha} strokeWidth={2} />
						{Array.from({ length: 6 }).map((_, i) => (
							<rect key={i} x={60 + (i % 3) * 64} y={-60 - Math.floor(i / 3) * 60} width={56} height={56} rx={5} fill="#10283E" stroke={cor.cinza} strokeOpacity={0.7} strokeWidth={1.8} />
						))}
						<g opacity={robo}>
							<BracoRobotico id="trab" x={-120} y={0} escala={0.75} a1={30 + k * 25} a2={70 + k * 20} a3={30} garra={k > 0.5 ? 1 : 0.2} />
						</g>
					</g>
					{/* a pessoa não desaparece: muda de função */}
					<g transform={`translate(${mapa(pessoa, [0, 1], [300, 1180])} ${mapa(pessoa, [0, 1], [640, 470])})`} opacity={0.9}>
						<circle r={64} fill={cor.fundo2} stroke={pessoa > 0.95 ? cor.ambar : cor.cinza} strokeWidth={2} />
						<IconePessoa s={1.2} c={pessoa > 0.95 ? cor.ambar : cor.branco} />
					</g>
					{novas.map((n, i) => (
						<Fluxo key={i} de={[1250, 470]} para={[1440, 360 + i * 120]} inicio={n.ti - 6} curv={0.1} pulsos={1} velocidade={34} corPulso={cor.ambar} />
					))}
				</svg>
			</Plate>
			<Nota texto="Tarefas repetitivas" inicio={6} x={470} y={300} alinhar="center" corTexto={cor.cinza} />
			<Nota texto="podem ser automatizadas" inicio={tAuto} x={470} y={340} alinhar="center" corTexto={cor.branco} tamanho={18} />
			<Nota texto="Oportunidades que crescem" inicio={tCrescem} x={1450} y={270} corTexto={cor.ambar} />
			{novas.map((n, i) => {
				const p = prog(f, n.ti, 22);
				return (
					<div key={i} style={{ position: 'absolute', left: 1460, top: 330 + i * 120, opacity: p, transform: `translateX(${(1 - p) * 30}px)`, display: 'flex', alignItems: 'center', gap: 18 }}>
						<svg width="58" height="58" viewBox="-32 -32 64 64">
							<n.Ic s={0.8} c={cor.branco} />
						</svg>
						<div style={{ ...tipo.corpo, color: cor.branco, fontWeight: 600, fontSize: 36 }}>{n.r}</div>
					</div>
				);
			})}
			<AbsoluteFill style={{ opacity: ciclo }}>
				<AbsoluteFill style={{ background: 'rgba(7,21,34,0.93)' }} />
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					<g transform={`translate(960 470) rotate(${f * 1.2})`}>
						<circle r={150} fill="none" stroke={cor.ciano} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="4 10" />
					</g>
					<g transform="translate(960 470)">
						<IconeCiclo s={2.6} c={cor.ciano} w={3} />
					</g>
				</svg>
				{['Aprender', 'Praticar', 'Atualizar'].map((w, i) => {
					const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
					return <Nota key={w} texto={w} inicio={tCapac + i * 8} x={960 + Math.cos(a) * 260} y={470 + Math.sin(a) * 230} alinhar="center" corTexto={cor.branco} />;
				})}
				<PalavraChave texto="CAPACITAÇÃO CONSTANTE" inicio={tCapac + 6} x={960} y={800} tamanho={48} corTexto={cor.ambar} />
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: 1 - ciclo }}>
				<PalavraChave texto="NOVAS TECNOLOGIAS, NOVAS HABILIDADES" inicio={tCrescem + 20} x={960} y={150} tamanho={46} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ───────────── Cena 14 — Segurança digital ───────────── */
export const Cena14: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tAtaque = t(7, 'ataques');
	const tProteger = t(8, 'proteger');
	const BARREIRA = 1240;
	// a tentativa de acesso avança até a camada de proteção e é barrada
	const avanco = mapa(f, [tAtaque, tProteger], [1800, BARREIRA + 30]);
	const bloqueado = f >= tProteger;
	const recuo = prog(f, tProteger, 30);
	const rede: [number, number][] = [
		[420, 330], [420, 610], [700, 470], [960, 330], [960, 610],
	];
	return (
		<AbsoluteFill>
			<Fundo clima="serio" brilho={[40, 45]} />
			<Camera chaves={[{ f: 0, e: { s: 1.08, x: -40, y: 0 } }, { f: dur, e: { s: 1, x: 0, y: 0 } }]}>
				<Plate chave="tecnologias/servidores-rede" dur={dur} escurecer={0.7}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<rect x={260} y={200} width={880} height={540} rx={20} fill={cor.ciano} fillOpacity={0.03} stroke={cor.linha} strokeWidth={1.5} />
						{rede.slice(0, 2).map((p, i) => (
							<Fluxo key={i} de={p} para={rede[2]} inicio={6 + i * 4} curv={0} pulsos={2} velocidade={40} />
						))}
						{rede.slice(3).map((p, i) => (
							<Fluxo key={i} de={rede[2]} para={p} inicio={14 + i * 4} curv={0} pulsos={2} velocidade={40} />
						))}
						{rede.map((p, i) => (
							<No key={i} x={p[0]} y={p[1]} r={i === 2 ? 62 : 50} inicio={i * 4} ativo={0.4}>
								{i === 2 ? <IconeServidor s={0.95} c={cor.branco} /> : <IconeMaquina s={0.75} c={cor.branco} />}
							</No>
						))}
						{/* cadeados: dados protegidos */}
						{[[560, 400], [560, 540], [830, 400], [830, 540]].map(([x, y], i) => (
							<g key={i} transform={`translate(${x} ${y})`} opacity={prog(f, tProteger + 10 + i * 5, 16)}>
								<circle r={20} fill={cor.fundo} stroke={cor.ciano} strokeWidth={1.5} />
								<IconeCadeado s={0.5} c={cor.ciano} />
							</g>
						))}
						{/* camada de proteção */}
						<g opacity={prog(f, 10, 30)}>
							<rect x={BARREIRA - 8} y={180} width={16} height={580} rx={8} fill={bloqueado ? cor.ciano : cor.cinza} opacity={bloqueado ? 0.65 : 0.35} />
							<rect x={BARREIRA - 30} y={180} width={60} height={580} rx={30} fill={cor.ciano} opacity={bloqueado ? 0.08 + 0.06 * Math.sin(f / 4) : 0.02} />
							<g transform={`translate(${BARREIRA} 470)`}>
								<circle r={56} fill={cor.fundo2} stroke={bloqueado ? cor.ciano : cor.cinza} strokeWidth={2.5} />
								<IconeEscudo s={1.15} c={bloqueado ? cor.ciano : cor.branco} />
							</g>
						</g>
						{/* tentativa de acesso externo */}
						<g opacity={prog(f, tAtaque - 6, 16)}>
							<line x1={1820} x2={avanco + recuo * 60} y1={470} y2={470} stroke={cor.ambar} strokeWidth={3} strokeDasharray="10 10" strokeDashoffset={f * 3} opacity={1 - recuo * 0.6} />
							<g transform={`translate(${avanco + recuo * 60} 470)`}>
								<circle r={16} fill={cor.ambar} opacity={bloqueado ? 0.4 : 0.9} />
								{bloqueado ? <path d="M -12 -12 L 12 12 M 12 -12 L -12 12" stroke={cor.fundo} strokeWidth={4} /> : null}
							</g>
							<g transform="translate(1740 470)">
								<circle r={48} fill={cor.fundo2} stroke={cor.ambar} strokeWidth={2} />
								<IconeAlerta s={0.8} c={cor.ambar} />
							</g>
						</g>
					</svg>
				</Plate>
			</Camera>
			<Nota texto="Rede da fábrica" inicio={8} x={700} y={790} alinhar="center" corTexto={cor.ciano} />
			<Nota texto="Camada de proteção" inicio={16} x={BARREIRA} y={800} alinhar="center" corTexto={cor.branco} />
			<Nota texto="Acesso não autorizado" inicio={tAtaque} x={1740} y={570} alinhar="center" corTexto={cor.ambar} tamanho={18} />
			<Nota texto="Acesso bloqueado" inicio={tProteger + 4} x={BARREIRA + 200} y={410} alinhar="center" corTexto={cor.ciano} tamanho={24} peso={700} />
			<PalavraChave texto="SEGURANÇA DIGITAL" inicio={t(7, 'risco') - 4} x={960} y={110} tamanho={46} />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 15 — Inclusão tecnológica ───────────── */
export const Cena15: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tEq = t(10);
	const amb = 1 - prog(f, tEq - 14, 20, entra);
	const termos = [
		{ r: 'TECNOLOGIA', ti: t(10, 'Indústria') },
		{ r: 'EDUCAÇÃO', ti: t(11, 'educação') },
		{ r: 'OPORTUNIDADE', ti: t(11, 'oportunidades') },
	];
	const clareia = prog(f, dur - 60, 50);
	const ambientes = [
		{ r: 'Oficina de pequeno porte', nivel: 1, Ic: IconeChave },
		{ r: 'Indústria de médio porte', nivel: 2, Ic: IconeFabrica },
		{ r: 'Fábrica automatizada', nivel: 3, Ic: IconeServidor },
	];
	return (
		<AbsoluteFill>
			<Fundo clima="serio" />
			<AbsoluteFill style={{ opacity: clareia }}>
				<Fundo clima="claro" brilho={[50, 50]} />
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: amb }}>
				<Plate chave="brasil/ambientes-industriais" dur={tEq} escurecer={0.65}>
					{ambientes.map((a, i) => {
						const p = prog(f, t(9, i === 0 ? 'regiões' : i === 1 ? 'empresas' : 'mesmo acesso') - 6, 26);
						return (
							<div key={i} style={{ position: 'absolute', left: 250 + i * 500, top: 300, width: 420, height: 380, borderRadius: 14, border: `1px solid ${cor.linha}`, background: 'rgba(16,40,62,0.55)', opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
								<svg width="420" height="200" viewBox="-210 -100 420 200">
									<a.Ic s={2} c={cor.branco} />
								</svg>
								<div style={{ ...tipo.rotulo, fontSize: 19, color: cor.branco, textAlign: 'center' }}>{a.r}</div>
								<div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 34, alignItems: 'flex-end' }}>
									{[1, 2, 3].map((n) => (
										<div key={n} style={{ width: 16, height: 14 + n * 12, borderRadius: 3, background: n <= a.nivel ? cor.ciano : 'rgba(138,153,171,0.25)' }} />
									))}
								</div>
								<div style={{ ...tipo.nota, fontSize: 13, color: cor.cinza, textAlign: 'center', marginTop: 14 }}>Acesso à tecnologia</div>
							</div>
						);
					})}
				</Plate>
				<Nota texto="Realidades diferentes no Brasil" inicio={6} x={960} y={200} alinhar="center" corTexto={cor.cinza} />
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: 1 - amb }}>
				<div style={{ position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36 }}>
					{termos.map((w, i) => {
						const p = prog(f, w.ti, 28);
						return (
							<React.Fragment key={w.r}>
								{i > 0 ? <span style={{ ...tipo.tituloMedio, fontWeight: 300, color: cor.ciano, opacity: p }}>+</span> : null}
								<span style={{ ...tipo.tituloMedio, fontSize: 70, color: i === 2 ? cor.ambar : cor.branco, opacity: p, filter: `blur(${(1 - p) * 6}px)`, letterSpacing: `${0.02 + (1 - p) * 0.12}em` }}>{w.r}</span>
							</React.Fragment>
						);
					})}
				</div>
				<div style={{ position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', justifyContent: 'center', gap: 60, opacity: prog(f, termos[2].ti + 15, 20) }}>
					{[IconeEducacao, IconeEscudo, IconePessoa].map((Ic, i) => (
						<svg key={i} width="70" height="70" viewBox="-35 -35 70 70">
							<Ic s={0.8} c={cor.cinza} />
						</svg>
					))}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
