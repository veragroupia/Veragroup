import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const cor = {
	fundo: '#071522',
	fundo2: '#0B1E30',
	fundo3: '#10283E',
	branco: '#F2F6FA',
	ciano: '#43C6EC',
	cinza: '#8A99AB',
	ambar: '#F6BC62',
	linha: 'rgba(138,153,171,0.28)',
	linhaForte: 'rgba(67,198,236,0.55)',
} as const;

export const fonte = "'Inter', 'Manrope', system-ui, sans-serif";

// Inter (SIL Open Font License) servida localmente: a renderização não depende da internet.
const pesos = [300, 400, 500, 600, 700, 800] as const;
let carregou = false;
export const carregarFontes = () => {
	if (carregou) return;
	carregou = true;
	for (const peso of pesos) {
		for (const sub of ['latin', 'latin-ext']) {
			loadFont({
				family: 'Inter',
				url: staticFile(`fonts/inter-${sub}-${peso}-normal.woff2`),
				weight: String(peso),
				unicodeRange:
					sub === 'latin'
						? 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
						: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
			});
		}
	}
};

/** Tipografia editorial: poucos tamanhos, sempre os mesmos. */
export const tipo = {
	titulo: { fontFamily: fonte, fontWeight: 800, fontSize: 132, letterSpacing: '-0.02em', lineHeight: 1 },
	tituloMedio: { fontFamily: fonte, fontWeight: 700, fontSize: 76, letterSpacing: '-0.01em', lineHeight: 1.05 },
	palavraChave: { fontFamily: fonte, fontWeight: 700, fontSize: 58, letterSpacing: '0.04em', lineHeight: 1.1 },
	subtitulo: { fontFamily: fonte, fontWeight: 400, fontSize: 38, letterSpacing: '0.01em', lineHeight: 1.3 },
	rotulo: { fontFamily: fonte, fontWeight: 600, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase' as const },
	nota: { fontFamily: fonte, fontWeight: 500, fontSize: 17, letterSpacing: '0.16em', textTransform: 'uppercase' as const },
	corpo: { fontFamily: fonte, fontWeight: 500, fontSize: 30, lineHeight: 1.3 },
};
