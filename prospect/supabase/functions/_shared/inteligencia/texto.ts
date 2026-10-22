import { normalizar } from './conversa.ts'

/** Frases de marketing que denunciam texto de IA. O prompt proíbe; a validação avisa se escapar. */
export const EXPRESSOES_PROIBIDAS = [
  'identifiquei uma oportunidade',
  'gostaria de compreender melhor',
  'potencializar seus resultados',
  'potencializar o seu',
  'impulsionar sua presenca digital',
  'impulsionar a sua presenca',
  'elevar seu negocio',
  'elevar o seu negocio',
  'solucao inovadora',
  'maximizar conversoes',
  'maximizar suas vendas',
  'transformar sua presenca online',
  'gostaria de apresentar uma proposta',
  'grande potencial',
  'oportunidade de otimizacao',
  'potencializar a presenca digital',
  'potencializar a sua presenca',
  'elevar o posicionamento',
  'impulsionar os resultados',
  'impulsionar o seu negocio',
  'desenvolvemos solucoes',
  'solucoes inovadoras',
  'transformar a experiencia',
  'oportunidade de melhorar a apresentacao',
  'gostaria de entender melhor',
  'passando pra saber',
  'oi, conseguiu ver',
  'so passando para',
  'sobre aquela minha mensagem',
  'passando novamente',
  'conseguiu ver minha mensagem',
  'passando para saber se tem interesse',
  'estou aguardando seu retorno',
  'gostaria de retomar nosso contato',
  'voltando a nossa conversa',
  'conforme conversamos',
  'sobre o que falamos anteriormente',
  'so retomando aquele assunto',
  'voltando ao nosso ultimo assunto',
] as const

/** Frases que só fazem sentido quando a IA decidiu retomar o assunto anterior. */
const RETOMADA = ['voltando a nossa conversa', 'conforme conversamos', 'sobre o que falamos anteriormente', 'so retomando aquele assunto', 'voltando ao nosso ultimo assunto']

export function expressoesProibidas(texto: string, permitirRetomada = false): string[] {
  const t = normalizar(texto)
  return EXPRESSOES_PROIBIDAS.filter((e) => t.includes(e) && !(permitirRetomada && RETOMADA.includes(e)))
}

function palavras(texto: string) {
  // Radical de 5 letras: "mostrando" e "mostram" contam como a mesma palavra.
  return normalizar(texto).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((p) => p.length > 2).map((p) => p.slice(0, 5))
}

/** Semelhança de 0 a 1 (Jaccard das palavras). Acima de ~0,7 as duas opções dizem a mesma coisa. */
export function semelhanca(a: string, b: string): number {
  const x = new Set(palavras(a)), y = new Set(palavras(b))
  if (!x.size && !y.size) return 1
  let comum = 0
  for (const p of x) if (y.has(p)) comum++
  return comum / (x.size + y.size - comum)
}

export const LIMITE_SEMELHANCA = 0.7

/** Quantas perguntas a mensagem faz (aproximado pelos "?"). */
export function perguntas(texto: string) {
  return (texto.match(/\?/g) ?? []).length
}
