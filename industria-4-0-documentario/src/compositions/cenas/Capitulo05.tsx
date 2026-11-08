import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { entra, janela, mapa, prog } from '../../animations/movimento.ts';
import { Camera } from '../../components/Camera.tsx';
import { SeloSensor } from '../../components/Equipamentos.tsx';
import { FabricaIlustrada } from '../../components/Fabrica.tsx';
import { Fluxo, No } from '../../components/Fluxo.tsx';
import { Fundo } from '../../components/Fundo.tsx';
import { IconeEducacao, IconeFabrica, IconeFolha, IconeFrasco, IconeMaterial, IconeNano, IconePessoa, IconeRaio, IconeSaude } from '../../components/Icones.tsx';
import { Midia, Plate, temMidia } from '../../components/Midia.tsx';
import { posicaoEstacao, SiriusEsquema } from '../../components/Sirius.tsx';
import { Nota, PalavraChave, TagIlustracao, TituloRevelado } from '../../components/Texto.tsx';
import mapaBrasil from '../../data/mapa-brasil.json';
import { roteiro } from '../../data/dados.ts';
import { FPS } from '../../data/linhaDoTempo.ts';
import { cor, fonte, tipo } from '../../styles/tema.ts';
import type { CenaProps } from '../tipos.ts';

const Cartao: React.FC<{ x: number; y: number; w?: number; p: number; titulo: string; Ic: React.FC<{ s?: number; c?: string }>; destaque?: boolean }> = ({ x, y, w = 340, p, titulo, Ic, destaque }) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: y,
			width: w,
			height: 300,
			borderRadius: 16,
			border: `1px solid ${destaque ? cor.ambar : cor.linha}`,
			background: 'linear-gradient(180deg, rgba(16,40,62,0.78), rgba(7,21,34,0.7))',
			opacity: p,
			transform: `translateY(${(1 - p) * 40}px) scale(${0.96 + 0.04 * p})`,
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 26,
		}}
	>
		<svg width="120" height="120" viewBox="-40 -40 80 80">
			<circle r={38} fill={destaque ? cor.ambar : cor.ciano} opacity={0.08} />
			<Ic s={0.95} c={destaque ? cor.ambar : cor.ciano} />
		</svg>
		<div style={{ ...tipo.corpo, fontSize: 30, fontWeight: 600, color: cor.branco, textAlign: 'center', padding: '0 20px' }}>{titulo}</div>
	</div>
);

/* ───────────── Cena 16 — CNPEM em Campinas ───────────── */
export const Cena16: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tCnpem = t(0, 'CNPEM');
	const tCampinas = t(1, 'Campinas');
	const tracado = prog(f, 0, 60);
	const zoom = prog(f, tCampinas - 20, 60);
	const [cx, cy] = mapaBrasil.campinas;
	const foto = temMidia('cnpem/campus');
	return (
		<AbsoluteFill>
			<Fundo clima="claro" brilho={[30, 50]} />
			{foto ? (
				<AbsoluteFill style={{ opacity: prog(f, tCnpem - 10, 30) }}>
					<Midia chave="cnpem/campus" dur={dur} escurecer={0.6} />
				</AbsoluteFill>
			) : null}
			<div style={{ position: 'absolute', left: foto ? 80 : 120, top: foto ? 560 : 160, width: mapaBrasil.largura, height: mapaBrasil.altura, transform: `scale(${foto ? 0.5 : 1})`, transformOrigin: 'top left' }}>
				<svg width={mapaBrasil.largura} height={mapaBrasil.altura} style={{ overflow: 'visible' }}>
					<g transform={`translate(${cx} ${cy}) scale(${1 + zoom * 0.9}) translate(${-cx} ${-cy})`}>
						{mapaBrasil.vizinhos.map((d, i) => (
							<path key={i} d={d} fill="none" stroke={cor.cinza} strokeOpacity={0.15 * tracado} strokeWidth={1 / (1 + zoom * 0.9)} />
						))}
						<path d={mapaBrasil.brasil} fill={cor.ciano} fillOpacity={0.07 * tracado} stroke={cor.ciano} strokeWidth={2 / (1 + zoom * 0.9)} pathLength={1} strokeDasharray={`${tracado} 1`} />
					</g>
					<g transform={`translate(${cx} ${cy})`} opacity={prog(f, tCampinas - 10, 16)}>
						{[0, 1].map((i) => {
							const k = ((f + i * 30) % 60) / 60;
							return <circle key={i} r={10 + k * 50} fill="none" stroke={cor.ambar} strokeOpacity={1 - k} strokeWidth={2} />;
						})}
						<circle r={9} fill={cor.ambar} />
						<line x1={12} y1={0} x2={150} y2={-80} stroke={cor.ambar} strokeWidth={1.5} />
					</g>
				</svg>
				<div style={{ position: 'absolute', left: cx + 160, top: cy - 112, opacity: prog(f, tCampinas, 20), whiteSpace: 'nowrap' }}>
					<div style={{ ...tipo.rotulo, fontSize: 26, color: cor.branco, letterSpacing: '0.08em' }}>Campinas</div>
					<div style={{ ...tipo.nota, color: cor.cinza, marginTop: 6 }}>São Paulo</div>
				</div>
			</div>
			<TituloRevelado texto="CNPEM" sub={'Centro Nacional de Pesquisa\nem Energia e Materiais'} inicio={tCnpem} x={foto ? 960 : 1040} y={foto ? 320 : 420} alinhar={foto ? 'center' : 'left'} rotulo="Ciência no Brasil" />
			{!foto ? <TagIlustracao texto="Mapa: Natural Earth" /> : null}
		</AbsoluteFill>
	);
};

/* ───────────── Cena 17 — Ciência e pesquisadores ───────────── */
export const Cena17: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const pessoas = [
		{ r: 'Cientistas', tr: 'cientistas' },
		{ r: 'Engenheiros', tr: 'engenheiros' },
		{ r: 'Pesquisadores', tr: 'pesquisadores' },
	];
	const areas = [
		{ r: 'Energia', Ic: IconeRaio, tr: 'energia' },
		{ r: 'Saúde', Ic: IconeSaude, tr: 'saúde' },
		{ r: 'Nanotecnologia', Ic: IconeNano, tr: 'nanotecnologia' },
		{ r: 'Novos materiais', Ic: IconeMaterial, tr: 'novos materiais' },
	];
	const tAreas = t(2, 'áreas');
	const sobe = prog(f, tAreas - 10, 30);
	return (
		<AbsoluteFill>
			<Fundo clima="claro" />
			<Plate chave="cnpem/laboratorio" dur={dur} escurecer={0.7}>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					{pessoas.map((p, i) => {
						const x = 660 + i * 300;
						return (
							<g key={i} transform={`translate(0 ${-sobe * 120})`}>
								<No x={x} y={420} r={66} inicio={t(2, p.tr) - 6} ativo={0.5}>
									<IconePessoa s={1.2} c={cor.branco} />
								</No>
								{i < 2 ? <Fluxo de={[x + 70, 420]} para={[x + 230, 420]} inicio={t(2, pessoas[i + 1].tr)} curv={0} pulsos={1} velocidade={40} bidirecional /> : null}
							</g>
						);
					})}
				</svg>
			</Plate>
			{pessoas.map((p, i) => (
				<Nota key={i} texto={p.r} inicio={t(2, p.tr)} x={660 + i * 300} y={530 - sobe * 120} alinhar="center" corTexto={cor.branco} />
			))}
			{areas.map((a, i) => (
				<Cartao key={i} x={180 + i * 400} y={560} p={prog(f, t(2, a.tr) - 4, 24)} titulo={a.r} Ic={a.Ic} />
			))}
			<Nota texto="Áreas de pesquisa" inicio={tAreas} x={960} y={520} alinhar="center" corTexto={cor.ciano} />
		</AbsoluteFill>
	);
};

/* ───────────── Cena 18 — Sirius ───────────── */
export const Cena18: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const tSirius = t(3, 'Sirius');
	const tEsq = t(4);
	const tLuz = t(4, 'luz síncrotron');
	const tMateria = t(4, 'estudar a matéria');
	const tPequenos = t(4, 'extremamente pequenos');
	const foto = temMidia('cnpem/sirius');
	const titulo = 1 - prog(f, tEsq + 6, 20, entra);
	const esq = prog(f, tEsq - 4, 24);
	const C: [number, number] = [700, 540];
	const R = 260;
	const [sx, sy] = posicaoEstacao(R);
	const lupa = prog(f, tPequenos - 6, 30);
	return (
		<AbsoluteFill>
			<Fundo clima="claro" brilho={[40, 55]} />
			{foto ? (
				<AbsoluteFill style={{ opacity: titulo }}>
					<Midia chave="cnpem/sirius" dur={tEsq + 30} escurecer={0.55} />
				</AbsoluteFill>
			) : null}
			<AbsoluteFill style={{ opacity: titulo }}>
				<TituloRevelado texto="SIRIUS" sub="Ciência brasileira de alta precisão" inicio={tSirius - 6} y={foto ? 520 : 470} />
				{!foto ? <Nota texto="Fonte de luz síncrotron do CNPEM" inicio={tSirius + 20} x={960} y={660} alinhar="center" corTexto={cor.cinza} /> : null}
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: esq }}>
				<Camera chaves={[{ f: tEsq, e: { s: 1.08, x: 0, y: 20 } }, { f: dur, e: { s: 1, x: 0, y: 0 } }]}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<g transform={`translate(${C[0]} ${C[1]})`}>
							<SiriusEsquema
								f={f}
								r={R}
								linac={prog(f, tEsq, 20)}
								booster={prog(f, tEsq + 12, 20)}
								anel={prog(f, tEsq + 24, 24)}
								luz={prog(f, tLuz - 4, 30)}
								amostra={prog(f, tMateria - 6, 20)}
							/>
						</g>
						{/* "detalhes extremamente pequenos": lupa sobre a amostra mostrando arranjo de átomos */}
						<g transform={`translate(${C[0] + sx + 40} ${C[1] + sy})`} opacity={lupa}>
							<line x1={0} y1={30} x2={300} y2={210} stroke={cor.ambar} strokeWidth={1.5} strokeDasharray="4 6" />
							<g transform="translate(370 300)">
								<circle r={110} fill={cor.fundo} stroke={cor.ambar} strokeWidth={2} />
								<clipPath id="lupa">
									<circle r={108} />
								</clipPath>
								<g clipPath="url(#lupa)">
									{Array.from({ length: 49 }).map((_, i) => {
										const gx = (i % 7) - 3;
										const gy = Math.floor(i / 7) - 3;
										return <circle key={i} cx={gx * 34 + (gy % 2) * 17} cy={gy * 30} r={9} fill={cor.ciano} opacity={0.35 + 0.4 * Math.abs(Math.sin(i))} />;
									})}
								</g>
							</g>
						</g>
					</svg>
				</Camera>
				<Nota texto="1 · Acelerador linear" inicio={tEsq + 4} fim={tLuz + 10} x={C[0] - 120} y={C[1] + 50} alinhar="center" corTexto={cor.branco} tamanho={17} />
				<Nota texto="2 · Acelerador injetor" inicio={tEsq + 16} fim={tLuz + 10} x={C[0]} y={C[1] + R * 0.74 - 30} alinhar="center" corTexto={cor.cinza} tamanho={17} />
				<Nota texto="3 · Anel de armazenamento" inicio={tEsq + 28} x={C[0]} y={C[1] + R + 40} alinhar="center" corTexto={cor.ciano} tamanho={17} />
				<Nota texto="Elétrons quase na velocidade da luz" inicio={tEsq + 40} fim={tLuz} x={C[0] + R + 40} y={C[1] + 40} corTexto={cor.branco} tamanho={17} />
				<Nota texto="4 · Ímãs curvam a trajetória: os elétrons emitem luz síncrotron" inicio={tLuz} x={C[0]} y={C[1] - R - 110} alinhar="center" corTexto={cor.ambar} tamanho={17} />
				<Nota texto="Estação experimental: a luz ilumina a amostra" inicio={tMateria} x={C[0] + sx + 35} y={C[1] + sy - 100} alinhar="center" corTexto={cor.branco} tamanho={17} />
				<Nota texto="Estrutura da matéria em escala atômica" inicio={tPequenos + 10} x={C[0] + sx + 410} y={C[1] + sy + 440} alinhar="center" corTexto={cor.ambar} tamanho={16} />
				<TagIlustracao texto="Ilustração esquemática — fora de escala" />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ───────────── Cena 19 — Aplicações científicas ───────────── */
export const Cena19: React.FC<CenaProps> = ({ t }) => {
	const f = useCurrentFrame();
	const tNao = t(7);
	const tInova = t(7, 'conhecimento');
	const apl = [
		{ r: 'Pesquisa de medicamentos', Ic: IconeFrasco, tr: [5, 'medicamentos'] as const },
		{ r: 'Novos materiais', Ic: IconeMaterial, tr: [5, 'melhorar materiais'] as const },
		{ r: 'Agricultura', Ic: IconeFolha, tr: [6, 'agricultura'] as const },
		{ r: 'Energia', Ic: IconeRaio, tr: [6, 'energia'] as const },
	];
	const a = 1 - prog(f, tNao - 10, 20, entra);
	const b = prog(f, tNao - 10, 24);
	const cadeia = ['CONHECIMENTO', 'TECNOLOGIA', 'INOVAÇÃO'];
	return (
		<AbsoluteFill>
			<Fundo clima="claro" />
			<AbsoluteFill style={{ opacity: a }}>
				<Nota texto="Possíveis aplicações da pesquisa" inicio={6} x={960} y={250} alinhar="center" corTexto={cor.ciano} />
				{apl.map((x, i) => (
					<Cartao key={i} x={180 + i * 400} y={330} p={prog(f, t(x.tr[0], x.tr[1]) - 4, 24)} titulo={x.r} Ic={x.Ic} destaque={i === 3} />
				))}
			</AbsoluteFill>
			<AbsoluteFill style={{ opacity: b }}>
				<svg width="1920" height="1080" style={{ position: 'absolute' }}>
					<g transform="translate(560 400)">
						<circle r={80} fill={cor.fundo2} stroke={cor.cinza} strokeWidth={2} />
						<IconeFabrica s={1.4} c={cor.cinza} />
					</g>
					<g transform="translate(1360 400)">
						<circle r={80} fill={cor.fundo2} stroke={cor.ciano} strokeWidth={2} />
						<IconeNano s={1.4} c={cor.ciano} />
					</g>
					<Fluxo de={[1270, 400]} para={[650, 400]} inicio={tInova - 10} curv={0} pulsos={3} velocidade={40} />
				</svg>
				<Nota texto="Fábrica da Indústria 4.0" inicio={tNao} x={560} y={530} alinhar="center" corTexto={cor.cinza} />
				<Nota texto="Centro de pesquisa científica" inicio={tNao + 8} x={1360} y={530} alinhar="center" corTexto={cor.ciano} />
				<div style={{ position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', justifyContent: 'center', gap: 34, alignItems: 'center' }}>
					{cadeia.map((w, i) => {
						const p = prog(f, tInova + i * 14, 26);
						return (
							<React.Fragment key={w}>
								{i > 0 ? <span style={{ fontFamily: fonte, fontSize: 44, color: cor.ciano, opacity: p }}>→</span> : null}
								<span style={{ ...tipo.palavraChave, fontSize: 50, color: i === 2 ? cor.ambar : cor.branco, opacity: p }}>{w}</span>
							</React.Fragment>
						);
					})}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ───────────── Cena 20 — Encerramento e créditos ───────────── */
export const Cena20: React.FC<CenaProps> = ({ dur, t }) => {
	const f = useCurrentFrame();
	const marcos = [0, t(8, 'máquinas inteligentes'), t(9, 'pessoas'), t(9, 'pesquisa científica'), t(9, 'investimento')];
	const ativo = (i: number) => janela(f, marcos[i] - 6, i < 4 ? marcos[i + 1] + 8 : 99999, 14, 14);
	const tCreditos = dur - Math.round(9.5 * FPS);
	const creditos = prog(f, tCreditos, 30);
	const fimPreto = prog(f, dur - 40, 38);
	return (
		<AbsoluteFill>
			<Fundo />
			{/* 1. braços robóticos */}
			<AbsoluteFill style={{ opacity: ativo(0) }}>
				<Camera chaves={[{ f: 0, e: { s: 1.9, x: 60, y: 110 } }, { f: marcos[1] + 10, e: { s: 2.1, x: 90, y: 120 } }]}>
					<Plate chave="fabricas/encerramento-robos" dur={marcos[1] + 10}>
						<FabricaIlustrada />
					</Plate>
				</Camera>
			</AbsoluteFill>
			{/* 2. sensores industriais */}
			<AbsoluteFill style={{ opacity: ativo(1) }}>
				<Plate chave="tecnologias/encerramento-sensores" dur={marcos[2] - marcos[1] + 10}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						{[[620, 420], [960, 600], [1300, 420]].map(([x, y], i) => (
							<g key={i}>
								<SeloSensor x={x} y={y} f={f + i * 17} ativo={1} />
								{i < 2 ? <Fluxo de={[x, y]} para={[[960, 600], [1300, 420]][i] as [number, number]} inicio={marcos[1]} curv={0.1} pulsos={2} velocidade={30} bidirecional /> : null}
							</g>
						))}
					</svg>
				</Plate>
			</AbsoluteFill>
			{/* 3. profissionais e pesquisadores */}
			<AbsoluteFill style={{ opacity: ativo(2) }}>
				<Plate chave="cnpem/encerramento-pessoas" dur={marcos[3] - marcos[2] + 10}>
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						{[IconePessoa, IconeEducacao, IconePessoa, IconeFrasco, IconePessoa].map((Ic, i) => (
							<g key={i} transform={`translate(${560 + i * 200} ${500 + (i % 2) * 60})`}>
								<circle r={66} fill={cor.fundo2} stroke={i % 2 ? cor.ciano : cor.ambar} strokeWidth={2} opacity={prog(f, marcos[2] + i * 5, 16)} />
								<g opacity={prog(f, marcos[2] + i * 5, 16)}>
									<Ic s={1.1} c={cor.branco} />
								</g>
							</g>
						))}
					</svg>
				</Plate>
			</AbsoluteFill>
			{/* 4. Sirius */}
			<AbsoluteFill style={{ opacity: ativo(3) }}>
				<Plate chave="cnpem/encerramento-sirius" dur={marcos[4] - marcos[3] + 10} tag="Ilustração esquemática">
					<svg width="1920" height="1080" style={{ position: 'absolute' }}>
						<g transform={`translate(960 560) scale(${mapa(f, [marcos[3], marcos[4]], [1.1, 1.3])})`}>
							<SiriusEsquema f={f} r={260} linac={1} booster={1} anel={1} luz={1} amostra={0} />
						</g>
					</svg>
				</Plate>
			</AbsoluteFill>
			{/* 5. fábrica moderna + frase final */}
			<AbsoluteFill style={{ opacity: ativo(4) * (1 - creditos) }}>
				<Camera chaves={[{ f: marcos[4], e: { s: 1.2, x: 0, y: 40 } }, { f: tCreditos, e: { s: 1.0, x: 0, y: 0 } }]}>
					<Plate chave="fabricas/encerramento-fabrica" dur={tCreditos - marcos[4]}>
						<FabricaIlustrada rede={1} />
					</Plate>
				</Camera>
				<AbsoluteFill style={{ background: 'rgba(7,21,34,0.6)' }} />
				<TituloRevelado texto={'O FUTURO DA INDÚSTRIA\nCOMEÇA COM CONHECIMENTO.'} tamanho="medio" inicio={marcos[4] + 4} y={470} />
			</AbsoluteFill>
			{/* créditos */}
			<AbsoluteFill style={{ opacity: creditos, justifyContent: 'center', alignItems: 'center', background: cor.fundo }}>
				<div style={{ textAlign: 'center' }}>
					<div style={{ ...tipo.nota, color: cor.ciano }}>{roteiro.creditos.titulo}</div>
					<div style={{ width: 60, height: 2, background: cor.ciano, margin: '30px auto 40px', transform: `scaleX(${prog(f, tCreditos + 10, 30)})` }} />
					{roteiro.creditos.integrantes.map((n, i) => (
						<div key={n} style={{ ...tipo.corpo, fontWeight: 500, fontSize: 38, color: cor.branco, lineHeight: 1.7, opacity: prog(f, tCreditos + 20 + i * 8, 24) }}>
							{n}
						</div>
					))}
					<div style={{ ...tipo.nota, fontSize: 14, color: cor.cinza, marginTop: 50, opacity: prog(f, tCreditos + 70, 30), textTransform: 'none', letterSpacing: '0.04em' }}>
						Ilustrações, animações e trilha originais · Fontes e licenças em CREDITOS_FONTES.md
					</div>
				</div>
			</AbsoluteFill>
			<AbsoluteFill style={{ background: '#000', opacity: fimPreto }} />
		</AbsoluteFill>
	);
};
