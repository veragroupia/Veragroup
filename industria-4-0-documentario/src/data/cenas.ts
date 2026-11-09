import type { CenaDef } from './linhaDoTempo.ts';

// Cada cena cobre um intervalo de frases (índices dentro do capítulo, inclusivos).
export const CENAS: CenaDef[] = [
	{ id: 'c01-abertura', capitulo: '01', de: 0, ate: 2 },
	{ id: 'c02-linha-do-tempo', capitulo: '01', de: 3, ate: 6 },
	{ id: 'c03-conexao', capitulo: '01', de: 7, ate: 10 },
	{ id: 'c04-iot', capitulo: '02', de: 0, ate: 1 },
	{ id: 'c05-ia', capitulo: '02', de: 2, ate: 3 },
	{ id: 'c06-robotica-bigdata-3d', capitulo: '02', de: 4, ate: 6 },
	{ id: 'c07-aplicacao', capitulo: '02', de: 7, ate: 10 },
	{ id: 'c08-eficiencia', capitulo: '03', de: 0, ate: 1 },
	{ id: 'c09-qualidade-seguranca', capitulo: '03', de: 2, ate: 2 },
	{ id: 'c10-personalizacao', capitulo: '03', de: 3, ate: 3 },
	{ id: 'c11-brasil', capitulo: '03', de: 4, ate: 8 },
	{ id: 'c12-custos', capitulo: '04', de: 0, ate: 2 },
	{ id: 'c13-trabalho', capitulo: '04', de: 3, ate: 6 },
	{ id: 'c14-seguranca-digital', capitulo: '04', de: 7, ate: 8 },
	{ id: 'c15-inclusao', capitulo: '04', de: 9, ate: 11 },
	{ id: 'c16-cnpem', capitulo: '05', de: 0, ate: 1 },
	{ id: 'c17-ciencia', capitulo: '05', de: 2, ate: 2 },
	{ id: 'c18-sirius', capitulo: '05', de: 3, ate: 4 },
	{ id: 'c19-aplicacoes', capitulo: '05', de: 5, ate: 7 },
	{ id: 'c20-encerramento', capitulo: '05', de: 8, ate: 9 },
];
