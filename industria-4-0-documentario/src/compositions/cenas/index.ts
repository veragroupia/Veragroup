import type React from 'react';
import type { CenaProps } from '../tipos.ts';
import { Cena01, Cena02, Cena03 } from './Capitulo01.tsx';
import { Cena04, Cena05, Cena06, Cena07 } from './Capitulo02.tsx';
import { Cena08, Cena09, Cena10, Cena11 } from './Capitulo03.tsx';
import { Cena12, Cena13, Cena14, Cena15 } from './Capitulo04.tsx';
import { Cena16, Cena17, Cena18, Cena19, Cena20 } from './Capitulo05.tsx';

/** Cena (id em src/data/cenas.ts) → componente. */
export const COMPONENTES: Record<string, React.FC<CenaProps>> = {
	'c01-abertura': Cena01,
	'c02-linha-do-tempo': Cena02,
	'c03-conexao': Cena03,
	'c04-iot': Cena04,
	'c05-ia': Cena05,
	'c06-robotica-bigdata-3d': Cena06,
	'c07-aplicacao': Cena07,
	'c08-eficiencia': Cena08,
	'c09-qualidade-seguranca': Cena09,
	'c10-personalizacao': Cena10,
	'c11-brasil': Cena11,
	'c12-custos': Cena12,
	'c13-trabalho': Cena13,
	'c14-seguranca-digital': Cena14,
	'c15-inclusao': Cena15,
	'c16-cnpem': Cena16,
	'c17-ciencia': Cena17,
	'c18-sirius': Cena18,
	'c19-aplicacoes': Cena19,
	'c20-encerramento': Cena20,
};
