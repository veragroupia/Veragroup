import type { ConfigComercial } from './config.ts'
import { normalizar, paraLocal } from './conversa.ts'
import type { Confianca, JanelaContato, TipoJanela } from './tipos.ts'

/* Melhor momento para falar com o lead, em ordem de força:
   1. data que o cliente pediu · 2. pergunta dele esperando resposta · 3. padrão real de respostas
   4. horário de funcionamento verificado pela equipe · 5. hábito do segmento (hipótese) · 6. janela comercial genérica (hipótese).
   Prospecção nunca sai das janelas permitidas na configuração. Responder quem escreveu não é prospecção:
   vale de 08:00 às 21:00, qualquer dia, para não atrasar um cliente que está esperando.
   Nunca recomenda horário para quem pediu para parar. */

interface Faixa { inicio: string; fim: string }

const SEGMENTOS: { padrao: RegExp; faixa: Faixa; motivo: string }[] = [
  { padrao: /confeitar|doceria|doce|bolo|padaria|cafeteria|brigadeir/, faixa: { inicio: '14:00', fim: '17:00' }, motivo: 'Confeitarias costumam produzir de manhã; a tarde tende a ser mais tranquila' },
  { padrao: /restaurante|lanchonete|pizzar|hamburg|marmit|churrasc|sushi|acai/, faixa: { inicio: '14:30', fim: '17:00' }, motivo: 'Entre o almoço e o jantar o movimento costuma ser menor' },
  { padrao: /salao|barbear|estetic|manicure|cabelei|sobrancelha|depila/, faixa: { inicio: '09:00', fim: '10:30' }, motivo: 'Antes de a agenda de atendimentos costumar encher' },
  { padrao: /clinic|dentist|odonto|fisio|psicolog|nutri|consultorio/, faixa: { inicio: '12:00', fim: '13:30' }, motivo: 'Consultórios costumam ter pausa no meio do dia' },
  { padrao: /oficina|mecanic|auto ?center|funilar|borrachar|autopec/, faixa: { inicio: '08:00', fim: '10:00' }, motivo: 'Oficinas costumam atender e receber carros cedo' },
  { padrao: /academia|studio|pilates|crossfit|personal/, faixa: { inicio: '10:00', fim: '12:00' }, motivo: 'Entre os picos de treino da manhã e do fim do dia' },
  { padrao: /pet ?shop|veterin|banho e tosa/, faixa: { inicio: '10:00', fim: '12:00' }, motivo: 'Meio da manhã, antes do horário de maior procura' },
]

export interface EntradaHorario {
  agora: Date
  config: ConfigComercial
  bloqueado: boolean
  retornoEm: string | null
  leadAguarda: boolean
  respostas: { em: string }[]
  nicho: string | null
  /** false = o cliente falou "semana que vem" sem dizer o dia. */
  retornoExato?: boolean
  /** Horário de funcionamento verificado pela equipe. */
  funcionamento?: { inicio: string; fim: string } | null
}

/** Janela para responder quem escreveu: não é prospecção, então não espera a janela comercial ideal. */
const RESPOSTA = { inicio: '08:00', fim: '21:00' }

export function recomendarHorario(e: EntradaHorario): JanelaContato | null {
  if (e.bloqueado) return null
  const { config, agora } = e
  const fuso = config.fuso

  if (e.retornoEm) {
    const r = new Date(e.retornoEm)
    const venceu = r <= agora
    const base = venceu ? agora : r
    const j = proximaJanela(base, { inicio: hhmm(base, fuso), fim: '23:59' }, config)
    const exato = e.retornoExato !== false
    if (j) return montar('compromisso', j, fuso,
      venceu ? 'Retorno combinado (venceu, faça hoje)' : exato ? `Retorno combinado para ${dia(r, fuso)}` : `A partir de ${dia(r, fuso)} (dia não combinado)`,
      exato ? 'O cliente pediu para conversar nessa data' : 'O cliente falou em um período ("semana que vem"), sem dia certo. A data é só referência',
      exato ? 'alta' : 'media', exato)
  }

  if (e.leadAguarda) {
    const j = proximaJanela(agora, RESPOSTA, { ...config, janelas: [RESPOSTA], apenas_dias_uteis: false })
    if (j) {
      const ja = j.inicio <= new Date(agora.getTime() + 60e3)
      return montar('agora', j, fuso, ja ? 'Agora' : `${dia(j.inicio, fuso)} a partir das ${hhmm(j.inicio, fuso)}`,
        'O cliente escreveu e está esperando resposta. Responder não precisa esperar a janela de prospecção', 'alta', false)
    }
  }

  const padrao = padraoDeRespostas(e.respostas, fuso, config.min_respostas_padrao)
  if (padrao) {
    const j = proximaJanela(agora, padrao.faixa, config)
    if (j) return montar('historico', j, fuso, `${dia(j.inicio, fuso)}, ${padrao.faixa.inicio}–${padrao.faixa.fim}`,
      `${padrao.dentro} de ${padrao.total} respostas do cliente chegaram nessa faixa`, padrao.confianca, false)
  }

  if (e.funcionamento && /^\d{2}:\d{2}$/.test(e.funcionamento.inicio) && /^\d{2}:\d{2}$/.test(e.funcionamento.fim)) {
    const j = proximaJanela(agora, e.funcionamento, config)
    if (j) return montar('funcionamento', j, fuso, `${dia(j.inicio, fuso)}, ${hhmm(j.inicio, fuso)}–${hhmm(j.fim, fuso)}`,
      'Dentro do horário de funcionamento verificado pela equipe. Ainda sem histórico de respostas deste cliente', 'media', false)
  }

  const nicho = normalizar(e.nicho)
  const seg = nicho ? SEGMENTOS.find((s) => s.padrao.test(nicho)) : null
  if (seg) {
    const j = proximaJanela(agora, seg.faixa, config)
    if (j) return montar('segmento', j, fuso, `${dia(j.inicio, fuso)}, ${seg.faixa.inicio}–${seg.faixa.fim}`,
      `${seg.motivo}. Hipótese pelo segmento, sem histórico deste cliente`, 'baixa', false)
  }

  for (const f of [...config.janelas].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const j = proximaJanela(agora, f, config)
    if (j) return montar('generico', j, fuso, `${dia(j.inicio, fuso)}, ${f.inicio}–${f.fim}`,
      'Janela comercial padrão. Ainda não há histórico de respostas para estimar melhor', 'baixa', false)
  }
  return null
}

/** Padrão confiável: pelo menos `min` respostas e 60% delas dentro de uma faixa de 2 horas. */
export function padraoDeRespostas(respostas: { em: string }[], fuso: string, min: number) {
  if (respostas.length < min) return null
  const horas = respostas.map((r) => paraLocal(new Date(r.em), fuso).h)
  let melhor = { h: -1, n: 0 }
  for (let h = 6; h <= 21; h++) {
    if (!horas.includes(h)) continue
    const n = horas.filter((x) => x === h || x === h + 1).length
    if (n >= melhor.n) melhor = { h, n } // empate: a faixa mais tarde começa na hora em que as respostas chegam
  }
  if (melhor.n / horas.length < 0.6) return null
  const c: Confianca = respostas.length >= min * 2 ? 'alta' : 'media'
  return { faixa: { inicio: `${pad(melhor.h)}:00`, fim: `${pad(melhor.h + 2)}:00` }, dentro: melhor.n, total: horas.length, confianca: c }
}

/** Primeira faixa, a partir de `de`, que caiba numa janela permitida (e em dia útil, se configurado). */
export function proximaJanela(de: Date, faixa: Faixa, config: ConfigComercial): { inicio: Date; fim: Date } | null {
  const fuso = config.fuso
  const l = paraLocal(de, fuso)
  for (let k = 0; k < 14; k++) {
    const d = new Date(Date.UTC(l.y, l.m - 1, l.dia + k))
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate(), semana = d.getUTCDay()
    if (config.apenas_dias_uteis && (semana === 0 || semana === 6)) continue
    for (const p of [...config.janelas].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
      const ini = maior(faixa.inicio, p.inicio), fim = menor(faixa.fim, p.fim)
      if (ini >= fim) continue
      let a = emFuso(y, m, dd, ini, fuso)
      const b = emFuso(y, m, dd, fim, fuso)
      if (b <= de) continue
      if (a < de) a = de
      return { inicio: a, fim: b }
    }
  }
  return null
}

function montar(tipo: TipoJanela, j: { inicio: Date; fim: Date }, fuso: string, rotulo: string, motivo: string, confianca: Confianca, confirmado: boolean): JanelaContato {
  return { tipo, inicio: j.inicio.toISOString(), fim: j.fim.toISOString(), fuso, rotulo, motivo, confianca, confirmado }
}

const pad = (n: number) => String(n).padStart(2, '0')
const maior = (a: string, b: string) => (a > b ? a : b)
const menor = (a: string, b: string) => (a < b ? a : b)
function hhmm(d: Date, fuso: string) { const l = paraLocal(d, fuso); return `${pad(l.h)}:${pad(l.min)}` }
function dia(d: Date | string, fuso: string) {
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: fuso, weekday: 'short', day: '2-digit', month: '2-digit' })
}

/** Converte data e hora locais do fuso em instante UTC. */
export function emFuso(y: number, m: number, d: number, hora: string, fuso: string): Date {
  const [h, min] = hora.split(':').map(Number)
  const palpite = Date.UTC(y, m - 1, d, h, min)
  const l = paraLocal(new Date(palpite), fuso)
  const offset = Date.UTC(l.y, l.m - 1, l.dia, l.h, l.min) - palpite
  return new Date(palpite - offset)
}
