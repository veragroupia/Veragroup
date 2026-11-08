import type { FraseAbs } from './linhaDoTempo.ts';

export type Bloco = { texto: string; inicio: number; fim: number; capitulo: string; confiavel: boolean };

export const MAX_CARACTERES = 84; // até duas linhas de ~42 caracteres

/** Divide uma frase longa em blocos de até duas linhas, preferindo pausas naturais (vírgulas, dois-pontos). */
export function dividir(texto: string, max = MAX_CARACTERES): string[] {
	if (texto.length <= max) return [texto];
	const palavras = texto.split(' ');
	const partes = Math.ceil(texto.length / max);
	const alvo = texto.length / partes;
	const blocos: string[] = [];
	let atual: string[] = [];
	for (let i = 0; i < palavras.length; i++) {
		atual.push(palavras[i]);
		const s = atual.join(' ');
		const restante = palavras.slice(i + 1).join(' ');
		const pausa = /[,:;]$/.test(palavras[i]);
		if (restante && (s.length >= alvo * (pausa ? 0.7 : 1) || s.length + 1 + (palavras[i + 1]?.length ?? 0) > max) && blocos.length < partes - 1) {
			blocos.push(s);
			atual = [];
		}
	}
	if (atual.length) blocos.push(atual.join(' '));
	return blocos;
}

/** Blocos de legenda com tempos. Com tempos de palavra (áudio alinhado) usa-os; senão divide proporcionalmente. */
export function blocosDeLegenda(frases: FraseAbs[]): Bloco[] {
	const out: Bloco[] = [];
	for (const f of frases) {
		const partes = dividir(f.texto);
		let palavraIdx = 0;
		let acumulado = 0;
		const total = f.texto.length;
		partes.forEach((p, i) => {
			const n = p.split(' ').length;
			let inicio = f.inicio + (f.fim - f.inicio) * (acumulado / total);
			let fim = f.inicio + (f.fim - f.inicio) * ((acumulado + p.length) / total);
			if (f.palavras && f.palavras.length) {
				// um tempo por palavra do texto (mesma ordem): índices diretos
				inicio = f.palavras[Math.min(palavraIdx, f.palavras.length - 1)].inicio;
				fim = f.palavras[Math.min(palavraIdx + n - 1, f.palavras.length - 1)].fim;
			}
			if (i === 0) inicio = f.inicio;
			if (i === partes.length - 1) fim = f.fim;
			out.push({ texto: p, inicio, fim, capitulo: f.capitulo, confiavel: f.confiavel });
			palavraIdx += n;
			acumulado += p.length + 1;
		});
	}
	// legendas permanecem um pouco após a fala, sem invadir a próxima
	for (let i = 0; i < out.length; i++) {
		const prox = out[i + 1]?.inicio ?? Infinity;
		out[i].fim = Math.min(out[i].fim + 0.35, prox - 0.04);
	}
	return out;
}


const hms = (s: number) => {
	const ms = Math.max(0, Math.round(s * 1000));
	const h = Math.floor(ms / 3600000);
	const m = Math.floor((ms % 3600000) / 60000);
	const ss = Math.floor((ms % 60000) / 1000);
	const r = ms % 1000;
	const p = (n: number, l = 2) => String(n).padStart(l, '0');
	return `${p(h)}:${p(m)}:${p(ss)},${p(r, 3)}`;
};

/** Quebra em até duas linhas equilibradas. */
export function duasLinhas(texto: string, max = 44): string[] {
	if (texto.length <= max) return [texto];
	const palavras = texto.split(' ');
	let melhor = 1;
	let menor = Infinity;
	for (let i = 1; i < palavras.length; i++) {
		const a = palavras.slice(0, i).join(' ').length;
		const b = palavras.slice(i).join(' ').length;
		const custo = Math.abs(a - b) + (a > max || b > max ? 1000 : 0);
		if (custo < menor) {
			menor = custo;
			melhor = i;
		}
	}
	return [palavras.slice(0, melhor).join(' '), palavras.slice(melhor).join(' ')];
}

export function gerarSrt(blocos: Bloco[]): string {
	return blocos.map((b, i) => `${i + 1}\n${hms(b.inicio)} --> ${hms(b.fim)}\n${duasLinhas(b.texto).join('\n')}\n`).join('\n');
}
