// Linha do tempo do documentário, calculada a partir do roteiro e dos tempos de fala.
// Funções puras: usadas pelo Remotion e pelos scripts de Node (legendas .srt).
// A regra é sempre a mesma: a imagem acompanha a voz. Nenhuma duração de cena é fixa;
// todas nascem dos tempos das frases em src/data/tempos.json.

export const FPS = 30;
export const INICIO = 0.6; // a narração começa quase imediatamente
export const INTERVALO = 1.4; // respiro entre capítulos (troca de narrador)
export const CREDITOS = 13; // tempo após a última fala (frase final + créditos)

export type Palavra = { t: string; inicio: number; fim: number };
export type FraseTempo = { inicio: number; fim: number; confiavel?: boolean; palavras?: Palavra[] };
export type CapituloTempo = {
	temAudio: boolean;
	origem: string;
	duracao: number;
	frases: FraseTempo[];
};
export type Tempos = { capitulos: Record<string, CapituloTempo> };
export type CapituloRoteiro = {
	id: string;
	narrador: string;
	tema: string;
	audio: string;
	paragrafos: string[][];
};
export type Roteiro = {
	capitulos: CapituloRoteiro[];
	destaques: string[];
	creditos: { titulo: string; integrantes: string[] };
};

export type CenaDef = { id: string; capitulo: string; de: number; ate: number };

export type FraseAbs = {
	capitulo: string;
	indice: number;
	texto: string;
	inicio: number; // segundos absolutos
	fim: number;
	palavras?: Palavra[]; // tempos absolutos
	confiavel: boolean;
};

export type CapituloAbs = {
	id: string;
	narrador: string;
	tema: string;
	audio: string;
	temAudio: boolean;
	inicio: number;
	fim: number;
	frases: FraseAbs[];
};

export type CenaAbs = CenaDef & { inicio: number; fim: number };

export type Linha = {
	capitulos: CapituloAbs[];
	cenas: CenaAbs[];
	frases: FraseAbs[];
	total: number; // segundos
	fimFala: number;
};

export const frasesDoCapitulo = (c: CapituloRoteiro) => c.paragrafos.flat();

export function montarLinha(roteiro: Roteiro, tempos: Tempos, cenas: CenaDef[]): Linha {
	let cursor = INICIO;
	const capitulos: CapituloAbs[] = roteiro.capitulos.map((c) => {
		const t = tempos.capitulos[c.id];
		if (!t) throw new Error(`Sem tempos para o capítulo ${c.id}. Rode: node scripts/estimar-tempos.mjs`);
		const textos = frasesDoCapitulo(c);
		if (t.frases.length !== textos.length) {
			throw new Error(`Capítulo ${c.id}: ${textos.length} frases no roteiro, ${t.frases.length} em tempos.json`);
		}
		const inicio = cursor;
		const frases = textos.map((texto, i) => ({
			capitulo: c.id,
			indice: i,
			texto,
			inicio: inicio + t.frases[i].inicio,
			fim: inicio + t.frases[i].fim,
			palavras: t.frases[i].palavras?.map((p) => ({ ...p, inicio: inicio + p.inicio, fim: inicio + p.fim })),
			confiavel: Boolean(t.frases[i].confiavel),
		}));
		cursor = inicio + t.duracao + INTERVALO;
		return { id: c.id, narrador: c.narrador, tema: c.tema, audio: c.audio, temAudio: t.temAudio, inicio, fim: inicio + t.duracao, frases };
	});
	const fimFala = capitulos[capitulos.length - 1].fim;
	const total = fimFala + CREDITOS;

	const inicios = cenas.map((cena, i) => {
		if (i === 0) return 0;
		const cap = capitulos.find((c) => c.id === cena.capitulo)!;
		const anterior = cenas[i - 1];
		// primeira cena de um capítulo: entra no meio do respiro entre narradores
		if (anterior.capitulo !== cena.capitulo) return cap.inicio - INTERVALO * 0.55;
		return cap.frases[cena.de].inicio - 0.3;
	});
	const cenasAbs = cenas.map((c, i) => ({ ...c, inicio: inicios[i], fim: i + 1 < cenas.length ? inicios[i + 1] : total }));
	return { capitulos, cenas: cenasAbs, frases: capitulos.flatMap((c) => c.frases), total, fimFala };
}

const normalizar = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9 ]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

/** Momento (s, absoluto) em que um trecho da frase é falado. Usa os tempos de palavra quando existem. */
export function momento(f: FraseAbs, trecho?: string): number {
	if (!trecho) return f.inicio;
	const alvo = normalizar(trecho).split(' ')[0];
	// palavras[] tem um item por palavra do texto (separadas por espaço), na mesma ordem
	if (f.palavras?.length) {
		const ws = f.texto.split(' ').map(normalizar);
		const alvoTodo = normalizar(trecho);
		const pos = ws.findIndex((w, i) => w === alvo && ws.slice(i).join(' ').startsWith(alvoTodo));
		if (pos >= 0 && f.palavras[pos]) return f.palavras[pos].inicio;
	}
	const i = f.texto.toLowerCase().indexOf(trecho.toLowerCase());
	if (i < 0) return f.inicio;
	return f.inicio + (f.fim - f.inicio) * (i / f.texto.length);
}
