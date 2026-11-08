import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { entra, lerp, mapa, prog } from '../../animations/movimento.ts';
import { Camera } from '../../components/Camera.tsx';
import { SeloSensor } from '../../components/Equipamentos.tsx';
import { Fluxo, No } from '../../components/Fluxo.tsx';
import { Fundo } from '../../components/Fundo.tsx';
import { IconeCaminhao, IconeFabrica, IconeGrafico, IconeLoja, IconePessoa, IconeServicos } from '../../components/Icones.tsx';
import { BracoRobotico, Esteira } from '../../components/Maquinas.tsx';
import { Plate } from '../../components/Midia.tsx';
import { Nota, PalavraChave, TituloRevelado } from '../../components/Texto.tsx';
import mapaBrasil from '../../data/mapa-brasil.json';
import { cor, tipo } from '../../styles/tema.ts';
import type { CenaProps } from '../tipos.ts';

/* ───────────── Cena 08 — Eficiência: convencional × conectado ───────────── */
const deslocConv = (f: number) => Math.floor(f / 150) * 300 + Math.min(f % 150, 100) * 3;

const Linha: React.FC<{ y: number; conectada: boolean; f: number; ativo: number }> = ({ y, conectada, f, ativo }) => {
	const d = conectada ? f * 2.6 : deslocConv(f);
	const parada = !conectada && f % 150 > 100;
	const caixas = Array.from({ length: 10 }, (_, i) => i);
	const LARG = 1060;
	const descarte = conectada ? 0 : Math.min(7, Math.floor(f / 120));
	return (
		<g transform={`translate(110 ${y})`} opacity={ativo}>
			<Esteira x={0} y={0} largura={LARG} deslocamento={d} altura={22} />
			{caixas.map((i) => {
				const x = (d + i * 150) % (LARG + 150) - 120;
				if (x < -60 || x > LARG - 40) return null;
				const defeito = i % 4 === 1;
				// na linha conectada o defeito é retirado cedo, logo após o sensor
				if (conectada && defeito && x > 330) {
					const k = Math.min(1, (x - 330) / 90);
					return <rect key={i} x={330 + k * 20} y={-62 - k * 80} width={56} height={56} rx={6} fill="none" stroke={cor.ambar} strokeWidth={2} opacity={1 - k} />;
				}
				return <rect key={i} x={x} y={-62} width={56} height={56} rx={6} fill="#10283E" stroke={defeito ? cor.ambar : cor.ciano} strokeOpacity={defeito ? 0.9 : 0.6} strokeWidth={2} />;
			})}
			{conectada ? <SeloSensor x={330} y={-120} f={f} ativo={1} /> : null}
			{!conectada ? (
				<g transform={`translate(${LARG + 70} 10)`}>
					<path d="M -50 -20 L -40 70 H 40 L 50 -20" fill="none" stroke={cor.cinza} strokeWidth={2} />
					{Array.from({ length: descarte }).map((_, i) => (
						<rect key={i} x={-34 + (i % 3) * 24} y={50 - Math.floor(i / 3) * 22} width={20} height={20} rx={3} fill="none" stroke={cor.ambar} strokeOpacity={0.7} strokeWidth={1.5} />
					))}
					<text y={100} textAnchor="middle" fill={cor.cinza} fontSize={16} fontFamily="Inter" letterSpacing="2">DESCARTE</text>
				</g>
			) : null}
			{parada ? (
				<g transform={`translate(${LARG / 2} -110)`}>
					<rect x={-120} y={-24} width={240} height={40} rx={20} fill="rgba(246,188,98,0.14)" stroke={cor.ambar} />
					<text y={3} textAnchor="middle" fill={cor.ambar} fontSize={17} fontFamily="Inter" fontWeight={600} letterSpacing="2">PARADA INESPERADA</text>
				</g>
			) : null}
		</g>
	);
};

export const Cena08: React.FC<CenaProps> = ({ t }) => {
	const f = useCurrentFrame();
	const chaves = [
		{ txt: 'MAIOR PRECISÃO', ti: t(1, 'detectam erros') },
		{ txt: 'MENOS DESPERDÍCIO', ti: t(1, 'reduzem desperdícios') },
		{ txt: 'MAIS EFICIÊNCIA', ti: t(1, 'evitam paradas') },
	];
	return (
		<AbsoluteFill>
			<Fundo brilho={[35, 45]} />
			<Plate chave="fabricas/linha-producao" dur={300} escurecer={0.75}>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					<Linha y={420} conectada={false} f={f} ativo={prog(f, 4, 24)} />
					<Linha y={790} conectada f={f} ativo={prog(f, t(1) - 10, 24)} />
				</svg>
			</Plate>
			<Nota texto="Processo convencional" inicio={10} x={110} y={250} corTexto={cor.cinza} />
			<Nota texto="Processo conectado" inicio={t(1) - 4} x={110} y={600} corTexto={cor.ciano} />
			<TituloRevelado texto={'Tempo e recursos'} tamanho="medio" inicio={t(0, 'usar melhor')} fim={t(1)} x={960} y={130} />
			{chaves.map((c, i) => (
				<PalavraChave key={i} texto={c.txt} inicio={c.ti} x={1840} y={420 + i * 120} alinhar="right" tamanho={44} corTexto={i === 2 ? cor.ambar : cor.branco} />
			))}
		</AbsoluteFill>
	);
};

/* ───────────── Cena 09 — Qualidade e segurança ───────────── */
export const Cena09: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tSeg = t(2, 'segurança');
	const a = 1 - prog(f, tSeg - 10, 20, entra);
	const b = prog(f, tSeg - 10, 20);
	const d = f * 2.2;
	// pessoa se aproxima da célula robotizada; o robô desacelera dentro da zona de segurança
	const px = mapa(f, [tSeg, dur - 10], [1700, 1260]);
	const dentro = px < 1420;
	const vel = dentro ? 0.25 : 1;
	const tDentro = tSeg + ((1700 - 1420) / 440) * (dur - 10 - tSeg);
	const fase = f < tDentro ? f : tDentro + (f - tDentro) * vel;
	const k = Math.sin(fase / 18);
	return (
		<AbsoluteFill>
			<Fundo />
			<AbsoluteFill style={{ opacity: a }}>
				<Plate chave="tecnologias/inspecao-automatizada" dur={tSeg}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<Esteira x={-50} y={720} largura={2020} deslocamento={d} />
						{Array.from({ length: 9 }).map((_, i) => {
							const x = ((d + i * 240) % 2160) - 120;
							const defeito = i === 3;
							const sob = Math.abs(x + 45 - 960) < 120;
							return (
								<g key={i} transform={`translate(${x} 600)`}>
									<rect width={90} height={120} rx={10} fill="#10283E" stroke={defeito && x > 900 ? cor.ambar : cor.ciano} strokeOpacity={0.7} strokeWidth={2} />
									<rect x={20} y={20} width={50} height={8} rx={4} fill={cor.cinza} opacity={0.5} />
									{defeito ? <path d="M 60 70 L 72 92 L 64 104" stroke={cor.ambar} strokeWidth={2.5} fill="none" opacity={x > 880 ? 1 : 0.35} /> : null}
									{defeito && x > 900 ? (
										<g>
											<rect x={-16} y={-16} width={122} height={152} rx={12} fill="none" stroke={cor.ambar} strokeWidth={2.5} strokeDasharray="10 8" />
											<text x={45} y={-30} textAnchor="middle" fill={cor.ambar} fontSize={18} fontFamily="Inter" fontWeight={600} letterSpacing="2">DEFEITO IDENTIFICADO</text>
										</g>
									) : null}
									{sob ? <rect width={90} height={120} rx={10} fill={cor.ciano} opacity={0.12} /> : null}
								</g>
							);
						})}
						<path d="M 820 720 V 420 H 1100 V 720" fill="none" stroke={cor.ciano} strokeOpacity={0.6} strokeWidth={10} strokeLinejoin="round" />
						<rect x={840} y={432} width={240} height={14} fill={cor.ciano} opacity={0.4} />
						<path d={`M 860 446 L 1060 446 L 1060 720 L 860 720 Z`} fill={cor.ciano} opacity={0.05 + 0.04 * Math.sin(f / 3)} />
						<line x1={850} x2={1070} y1={460 + ((f * 6) % 250)} y2={460 + ((f * 6) % 250)} stroke={cor.ciano} strokeWidth={2} opacity={0.7} />
					</svg>
				</Plate>
				<Nota texto="Inspeção automatizada" inicio={6} x={960} y={330} alinhar="center" corTexto={cor.ciano} />
				<PalavraChave texto="QUALIDADE" inicio={t(2, 'qualidade')} x={960} y={190} />
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: b }}>
				<Plate chave="fabricas/seguranca-trabalho" dur={dur - tSeg}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<line x1={0} x2={1920} y1={820} y2={820} stroke={cor.linha} strokeWidth={2} />
						<ellipse cx={900} cy={820} rx={520} ry={90} fill={dentro ? cor.ambar : cor.ciano} opacity={0.06} />
						<ellipse cx={900} cy={820} rx={520} ry={90} fill="none" stroke={dentro ? cor.ambar : cor.ciano} strokeWidth={2.5} strokeDasharray="14 10" strokeDashoffset={-f} />
						<ellipse cx={900} cy={820} rx={300} ry={52} fill="none" stroke={cor.cinza} strokeOpacity={0.5} strokeWidth={1.5} />
						<BracoRobotico id="seg" x={900} y={820} escala={1.1} a1={10 + k * 30} a2={70 + k * 25} a3={30} garra={0.4} />
						<g transform={`translate(${px} 690)`}>
							<circle cy={-44} r={26} fill="none" stroke={cor.branco} strokeWidth={3} />
							<path d="M -40 120 V 20 C -40 -6 40 -6 40 20 V 120" fill="none" stroke={cor.branco} strokeWidth={3} />
							<path d="M -28 6 H 28" stroke={cor.ambar} strokeWidth={6} />
						</g>
					</svg>
				</Plate>
				<Nota texto="Zona de segurança" inicio={tSeg + 6} x={900} y={950} alinhar="center" corTexto={dentro ? cor.ambar : cor.ciano} />
				<Nota texto={dentro ? 'Pessoa detectada · robô desacelera' : 'Sensores monitoram a área'} inicio={tSeg + 12} x={120} y={200} corTexto={dentro ? cor.ambar : cor.branco} tamanho={20} />
				<PalavraChave texto="SEGURANÇA" inicio={tSeg} x={960} y={130} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ───────────── Cena 10 — Personalização ───────────── */
const Garrafa: React.FC<{ h: number; corCorpo: string; tampa: number; padrao: number; letra?: string }> = ({ h, corCorpo, tampa, padrao, letra }) => (
	<g>
		<path d={`M -60 0 V ${-h + 40} Q -60 ${-h + 10} -30 ${-h} H 30 Q 60 ${-h + 10} 60 ${-h + 40} V 0 Q 60 14 46 14 H -46 Q -60 14 -60 0 Z`} fill="#10283E" stroke={corCorpo} strokeWidth={2.5} />
		<rect x={-34} y={-h - 30 - tampa * 20} width={68} height={30 + tampa * 20} rx={tampa > 0.5 ? 14 : 4} fill={corCorpo} opacity={0.85} />
		{padrao === 1 ? [0, 1, 2].map((i) => <line key={i} x1={-60} x2={60} y1={-40 - i * 30} y2={-40 - i * 30} stroke={corCorpo} strokeOpacity={0.6} strokeWidth={6} />) : null}
		{padrao === 2 ? Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={-36 + (i % 4) * 24} cy={-50 - Math.floor(i / 4) * 30} r={5} fill={corCorpo} opacity={0.7} />) : null}
		{letra ? (
			<text y={-h / 2} textAnchor="middle" dominantBaseline="middle" fill={corCorpo} fontSize={48} fontFamily="Inter" fontWeight={800}>
				{letra}
			</text>
		) : null}
	</g>
);

export const Cena10: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tPers = t(3, 'personalizados');
	const tCons = t(3, 'consumidor');
	const sep = prog(f, tPers - 6, 40);
	const variantes = [
		{ dx: -480, h: 300, c: cor.ciano, tampa: 0, padrao: 1, letra: undefined, rot: 'Cor e acabamento' },
		{ dx: 0, h: 360, c: cor.ambar, tampa: 1, padrao: 0, letra: 'JM', rot: 'Nome gravado' },
		{ dx: 480, h: 250, c: cor.branco, tampa: 0.6, padrao: 2, letra: undefined, rot: 'Tamanho e formato' },
	];
	return (
		<AbsoluteFill>
			<Fundo brilho={[50, 55]} />
			<Camera chaves={[{ f: 0, e: { s: 1.25, x: 0, y: 40 } }, { f: tPers + 30, e: { s: 1.0, x: 0, y: 0 } }, { f: dur, e: { s: 0.97, x: 0, y: 0 } }]}>
				<Plate chave="tecnologias/personalizacao" dur={dur}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<line x1={300} x2={1620} y1={760} y2={760} stroke={cor.linha} strokeWidth={2} />
						{variantes.map((v, i) => {
							const h = lerp(300, v.h, sep);
							return (
								<g key={i} transform={`translate(${960 + v.dx * sep} 760)`} opacity={i === 1 ? 1 : sep}>
									<ellipse cy={18} rx={80} ry={10} fill="#000" opacity={0.3} />
									<Garrafa h={h} corCorpo={sep > 0.5 ? v.c : cor.cinza} tampa={v.tampa * sep} padrao={sep > 0.6 ? v.padrao : 0} letra={sep > 0.7 ? v.letra : undefined} />
								</g>
							);
						})}
					</svg>
				</Plate>
			</Camera>
			{variantes.map((v, i) => (
				<Nota key={i} texto={v.rot} inicio={tPers + 30 + i * 8} x={960 + v.dx} y={830} alinhar="center" corTexto={cor.branco} tamanho={20} />
			))}
			<Nota texto="Um mesmo produto, várias configurações" inicio={10} fim={tPers + 20} x={960} y={200} alinhar="center" />
			<PalavraChave texto="PRODUÇÃO SOB MEDIDA" inicio={tCons} x={960} y={200} />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 11 — Impactos além da indústria e no Brasil ───────────── */
export const Cena11: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tBrasil = t(6);
	const tPilares = t(7);
	const a = 1 - prog(f, tBrasil - 10, 20, entra);
	const b = prog(f, tBrasil - 10, 20) * (1 - prog(f, tPilares - 10, 20, entra));
	const c = prog(f, tPilares - 10, 20);
	const setores = [
		{ r: 'Indústria', Ic: IconeFabrica, ti: t(4, 'indústria') },
		{ r: 'Logística', Ic: IconeCaminhao, ti: t(5, 'Logística') },
		{ r: 'Comércio', Ic: IconeLoja, ti: t(5, 'comércio') },
		{ r: 'Serviços', Ic: IconeServicos, ti: t(5, 'serviços') },
	];
	const pilares = [
		{ r: 'Planejamento', Ic: IconeGrafico, ti: t(8, 'planejamento') },
		{ r: 'Investimento', Ic: IconeFabrica, ti: t(8, 'investimento') },
		{ r: 'Profissionais preparados', Ic: IconePessoa, ti: t(8, 'profissionais') },
	];
	const tracado = prog(f, tBrasil, 70);
	const pessoas = prog(f, t(8, 'profissionais') + 10, 30);
	return (
		<AbsoluteFill>
			<Fundo brilho={[50, 45]} />
			{/* setores conectados */}
			<AbsoluteFill style={{ opacity: a }}>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					{setores.slice(0, 3).map((_, i) => (
						<Fluxo key={i} de={[360 + i * 400 + 70, 500]} para={[360 + (i + 1) * 400 - 70, 500]} inicio={setores[i + 1].ti - 10} curv={0} pulsos={2} velocidade={f > t(5, 'dados') ? 26 : 46} bidirecional />
					))}
					{setores.map((s, i) => (
						<No key={i} x={360 + i * 400} y={500} r={64} inicio={s.ti - 8} ativo={i === 0 ? 1 : prog(f, t(5, 'dados'), 20)}>
							<s.Ic s={1.05} c={cor.branco} />
						</No>
					))}
				</svg>
				{setores.map((s, i) => (
					<Nota key={i} texto={s.r} inicio={s.ti} x={360 + i * 400} y={615} alinhar="center" corTexto={cor.branco} />
				))}
				<Nota texto="Dados e automação" inicio={t(5, 'dados')} x={960} y={330} alinhar="center" corTexto={cor.ciano} />
			</AbsoluteFill>
			{/* Brasil */}
			<AbsoluteFill style={{ opacity: b }}>
				<Plate chave="brasil/industria-brasileira" dur={tPilares - tBrasil} escurecer={0.6}>
					<svg width={mapaBrasil.largura} height={mapaBrasil.altura} style={{ position: 'absolute', left: 140, top: 160, transform: 'scale(1.05)' }}>
						{mapaBrasil.vizinhos.map((d, i) => (
							<path key={i} d={d} fill="none" stroke={cor.cinza} strokeOpacity={0.14 * tracado} strokeWidth={1} />
						))}
						<path d={mapaBrasil.brasil} fill={cor.ciano} fillOpacity={0.06 * tracado} stroke={cor.ciano} strokeWidth={2} pathLength={1} strokeDasharray={`${tracado} 1`} />
					</svg>
				</Plate>
				<TituloRevelado texto={'INOVAÇÃO E\nCOMPETITIVIDADE'} tamanho="medio" inicio={t(6, 'competitividade') - 10} x={1000} y={470} alinhar="left" rotulo="No Brasil" />
				<Nota texto="Oportunidades para novas profissões" inicio={t(6, 'novas profissões')} x={1000} y={660} corTexto={cor.ambar} tamanho={24} />
			</AbsoluteFill>
			{/* pilares: tudo depende de pessoas */}
			<AbsoluteFill style={{ opacity: c }}>
				<Nota texto="Os benefícios não são automáticos" inicio={tPilares} x={960} y={190} alinhar="center" corTexto={cor.cinza} />
				{pilares.map((p, i) => {
					const s = prog(f, p.ti - 4, 30);
					const destaque = i === 2 ? pessoas : 0;
					const h = 260 * s + destaque * 60;
					return (
						<div key={i} style={{ position: 'absolute', left: 560 + i * 400, bottom: 300, width: 280, height: h, transform: 'translateX(-50%)', borderRadius: '14px 14px 0 0', border: `1.5px solid ${destaque > 0 ? cor.ambar : cor.linhaForte}`, borderBottom: 'none', background: `linear-gradient(180deg, ${destaque > 0 ? 'rgba(246,188,98,0.16)' : 'rgba(67,198,236,0.10)'}, transparent)`, opacity: s }}>
							<svg width="280" height="110" viewBox="-140 -55 280 110" style={{ marginTop: 26 }}>
								{i === 2 ? (
									[-60, 0, 60].map((dx, k) => (
										<g key={k} transform={`translate(${dx} 0)`} opacity={k === 1 ? 1 : destaque}>
											<IconePessoa s={k === 1 ? 1.1 : 0.85} c={destaque > 0 ? cor.ambar : cor.branco} />
										</g>
									))
								) : (
									<p.Ic s={1.1} c={cor.branco} />
								)}
							</svg>
							<div style={{ ...tipo.rotulo, fontSize: 20, color: destaque > 0 ? cor.ambar : cor.branco, textAlign: 'center', padding: '0 12px' }}>{p.r}</div>
						</div>
					);
				})}
				<div style={{ position: 'absolute', left: 200, right: 200, bottom: 298, height: 2, background: cor.linha }} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
