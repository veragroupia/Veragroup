/**
 * Calculadora "Quanto você está deixando na mesa?".
 * Conta simples e conservadora, com todas as premissas à vista e editáveis.
 * As premissas são suposições da Vera Group, não estatística de pesquisa.
 */

export const SEGMENTOS = [
  { value: 'confeitaria', label: 'Confeitaria ou padaria', busca: 'confeitaria' },
  { value: 'restaurante', label: 'Restaurante ou lanchonete', busca: 'restaurante' },
  { value: 'loja', label: 'Loja', busca: 'loja' },
  { value: 'joalheria', label: 'Joalheria ou acessórios', busca: 'joalheria' },
  { value: 'clinica', label: 'Clínica ou consultório', busca: 'clínica' },
  { value: 'beleza', label: 'Beleza e estética', busca: 'salão de beleza' },
  { value: 'servicos', label: 'Prestador de serviço', busca: 'serviço' },
  { value: 'outro', label: 'Outro', busca: 'negócio' },
] as const;

export type Segmento = (typeof SEGMENTOS)[number]['value'];

/** Valores de exemplo: o visitante troca pelos dele. */
export const EXEMPLO = { segmento: 'confeitaria' as Segmento, ticket: 50, clientesDia: 40 };

/** Premissas padrão (conservadoras). */
export const PREMISSAS = {
  diasMes: 26,
  /** A cada 100 clientes atendidos, quantos procuraram e não te acharam. */
  naoAcham: 5,
  /** A cada 100 clientes, quantos pedidos se perdem ou demoram no WhatsApp. */
  perdidos: 2,
};

export interface Entrada {
  ticket: number;
  clientesDia: number;
  diasMes: number;
  naoAcham: number;
  perdidos: number;
}

export function calcular(e: Entrada) {
  const ticket = Math.max(0, e.ticket || 0);
  const clientes = Math.max(0, e.clientesDia || 0);
  const dias = Math.min(31, Math.max(0, e.diasMes || 0));
  const faturamento = ticket * clientes * dias;
  const perdaGoogle = (faturamento * Math.max(0, e.naoAcham)) / 100;
  const perdaWhatsApp = (faturamento * Math.max(0, e.perdidos)) / 100;
  const mes = perdaGoogle + perdaWhatsApp;
  return {
    faturamento: Math.round(faturamento),
    perdaGoogle: Math.round(perdaGoogle),
    perdaWhatsApp: Math.round(perdaWhatsApp),
    mes: Math.round(mes),
    ano: Math.round(mes * 12),
    clientesMes: Math.round(clientes * dias * ((e.naoAcham + e.perdidos) / 100)),
  };
}

export const reais = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function rotuloSegmento(v: string) {
  return SEGMENTOS.find((s) => s.value === v)?.label ?? 'Outro';
}

/** Mapeia o nicho que vem no link do Maestro (?nicho=) para um segmento. */
export function segmentoDoNicho(nicho: string): Segmento | null {
  const n = nicho
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const mapa: [RegExp, Segmento][] = [
    [/confeit|padar|doce|bolo|sorvet|acai/, 'confeitaria'],
    [/restaur|lanch|pizz|hambur|buffet|bar\b|cafe/, 'restaurante'],
    [/joia|joalh|relog|acessor|otica/, 'joalheria'],
    [/dent|clinic|consult|medic|fisio|psico|odont|veterin|farmac/, 'clinica'],
    [/salao|barbe|estetic|beleza|manicure|cabel/, 'beleza'],
    [/oficin|advoc|contab|escola|academ|pet|mecan|eletric|servi/, 'servicos'],
    [/loja|moda|roupa|calcad|presente|decor|cosmet/, 'loja'],
  ];
  return mapa.find(([re]) => re.test(n))?.[1] ?? null;
}

export function mensagemDiagnostico(d: {
  segmento: string;
  ticket: number;
  clientesDia: number;
  diasMes: number;
  naoAcham: number;
  perdidos: number;
  cidade?: string;
  empresa?: string;
}) {
  const r = calcular(d);
  const linhas = [
    'Olá! Fiz o diagnóstico no site da Vera Group e quero receber o diagnóstico completo.',
    '',
    d.empresa ? `Negócio: ${d.empresa}` : null,
    `Segmento: ${rotuloSegmento(d.segmento)}`,
    d.cidade ? `Cidade: ${d.cidade}` : null,
    `Ticket médio: ${reais(d.ticket)}`,
    `Clientes por dia: ${d.clientesDia}`,
    `Dias abertos por mês: ${d.diasMes}`,
    `Premissas: ${d.naoAcham} a cada 100 não me acham; ${d.perdidos} a cada 100 pedidos se perdem`,
    `Estimativa: ${reais(r.mes)} por mês (${reais(r.ano)} por ano)`,
  ];
  return linhas.filter((l) => l !== null).join('\n');
}
