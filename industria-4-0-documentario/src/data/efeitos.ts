// Efeitos sonoros pontuais, ancorados em trechos da fala (nunca em tempos fixos).
export type Efeito = { arquivo: string; capitulo: string; frase: number; trecho?: string; desloc?: number; volume: number };

const transicao = (capitulo: string): Efeito => ({ arquivo: 'transicao', capitulo, frase: 0, desloc: -0.9, volume: 0.35 });

export const EFEITOS: Efeito[] = [
	{ arquivo: 'titulo', capitulo: '01', frase: 2, trecho: 'Indústria 4.0', desloc: -0.05, volume: 0.55 },
	{ arquivo: 'marcador', capitulo: '01', frase: 4, volume: 0.35 },
	{ arquivo: 'marcador', capitulo: '01', frase: 5, volume: 0.35 },
	{ arquivo: 'marcador', capitulo: '01', frase: 6, volume: 0.35 },
	{ arquivo: 'conexao', capitulo: '01', frase: 7, trecho: 'máquinas', volume: 0.3 },
	{ arquivo: 'conexao', capitulo: '01', frase: 7, trecho: 'sensores', volume: 0.3 },
	{ arquivo: 'conexao', capitulo: '01', frase: 7, trecho: 'sistemas', volume: 0.3 },
	transicao('02'),
	{ arquivo: 'titulo', capitulo: '02', frase: 1, trecho: 'Internet das Coisas', volume: 0.35 },
	{ arquivo: 'conexao', capitulo: '02', frase: 1, trecho: 'conecta', volume: 0.3 },
	{ arquivo: 'alerta', capitulo: '02', frase: 3, trecho: 'perto de falhar', volume: 0.3 },
	{ arquivo: 'transicao', capitulo: '02', frase: 5, desloc: -0.2, volume: 0.22 },
	{ arquivo: 'transicao', capitulo: '02', frase: 6, desloc: -0.2, volume: 0.22 },
	{ arquivo: 'alerta', capitulo: '02', frase: 8, trecho: 'avisa', volume: 0.32 },
	transicao('03'),
	{ arquivo: 'marcador', capitulo: '03', frase: 1, trecho: 'reduzem', volume: 0.3 },
	{ arquivo: 'marcador', capitulo: '03', frase: 2, trecho: 'qualidade', volume: 0.3 },
	{ arquivo: 'titulo', capitulo: '03', frase: 6, trecho: 'competitividade', volume: 0.3 },
	transicao('04'),
	{ arquivo: 'alerta', capitulo: '04', frase: 7, trecho: 'ataques', volume: 0.26 },
	{ arquivo: 'bloqueio', capitulo: '04', frase: 8, trecho: 'proteger', volume: 0.34 },
	transicao('05'),
	{ arquivo: 'titulo', capitulo: '05', frase: 0, trecho: 'CNPEM', volume: 0.42 },
	{ arquivo: 'titulo', capitulo: '05', frase: 3, trecho: 'Sirius', volume: 0.42 },
	{ arquivo: 'titulo', capitulo: '05', frase: 9, trecho: 'educação', volume: 0.38 },
];
