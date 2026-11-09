export type CenaProps = {
	/** duração da cena em frames */
	dur: number;
	/** frame (relativo ao início da cena) em que a frase `i` do capítulo — ou um trecho dela — é falada */
	t: (frase: number, trecho?: string) => number;
	/** frame em que a frase `i` termina */
	fim: (frase: number) => number;
};
