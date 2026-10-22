import { supabase } from './supabase'
import { invalidar, q } from './dados'
import type { Lead } from './tipos'
import { nomeCurto } from './util'

// ============================================================ Clientes

export type StatusCliente = 'ativo' | 'pausado' | 'encerrado'
export interface Cliente {
  id: string; nome: string; nicho: string | null; cidade: string | null; documento: string | null
  contato_nome: string | null; telefone: string | null; whatsapp: string | null; email: string | null
  endereco: string | null; site_url: string | null; instagram: string | null; status: StatusCliente
  cliente_desde: string; lead_id: string | null; responsavel: string | null; observacoes: string | null
  created_at: string; updated_at: string
}
export const STATUS_CLIENTE: { id: StatusCliente; nome: string; cor: string }[] = [
  { id: 'ativo', nome: 'Ativo', cor: 'bg-ok' },
  { id: 'pausado', nome: 'Pausado', cor: 'bg-alerta' },
  { id: 'encerrado', nome: 'Encerrado', cor: 'bg-fio' },
]

const CAMPOS_CLIENTE = ['nome', 'nicho', 'cidade', 'documento', 'contato_nome', 'telefone', 'whatsapp', 'email', 'endereco', 'site_url', 'instagram', 'status', 'cliente_desde', 'lead_id', 'responsavel', 'observacoes'] as const

function limpar<T extends string>(obj: Record<string, unknown>, campos: readonly T[]) {
  const r: Record<string, unknown> = {}
  for (const c of campos) {
    if (obj[c] === undefined) continue
    const v = obj[c]
    // Campo de texto vazio vai como null: evita "" no banco e quebra de FK.
    r[c] = typeof v === 'string' ? (v.trim() || null) : v
  }
  return r
}

export async function salvarCliente(c: Partial<Cliente>) {
  const campos = limpar(c as Record<string, unknown>, CAMPOS_CLIENTE)
  let id = c.id
  if (id) await q(supabase.from('clientes').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id))
  else id = (await q<{ id: string }>(supabase.from('clientes').insert(campos).select('id').single())).id
  invalidar('clientes')
  return id!
}

/** Cria o cliente a partir do lead (ou devolve o que já existe para ele). */
export async function clienteDoLead(lead: Lead, responsavel: string) {
  const { data } = await supabase.from('clientes').select('id').eq('lead_id', lead.id).maybeSingle()
  if (data) return data.id as string
  return salvarCliente({
    nome: nomeCurto(lead.nome), nicho: lead.nicho && lead.nicho.length <= 40 ? lead.nicho : null, cidade: lead.cidade,
    telefone: lead.telefone, whatsapp: lead.whatsapp, endereco: lead.endereco,
    site_url: lead.site && !/instagram/i.test(lead.site) ? lead.site : null, instagram: lead.instagram,
    lead_id: lead.id, responsavel: lead.responsavel ?? responsavel, observacoes: lead.observacoes,
  })
}

// ============================================================ Propostas

export interface ItemProposta { nome: string; descricao: string; valor: number; prazo_dias: number | null; recorrente: boolean }
export type StatusProposta = 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'
export interface Proposta {
  id: string; numero: number; titulo: string; cliente_id: string | null; lead_id: string | null
  itens: ItemProposta[]; valor_setup: number; valor_mensal: number; prazo_dias: number | null
  validade: string | null; condicoes: string | null; status: StatusProposta
  enviada_em: string | null; respondida_em: string | null; motivo_recusa: string | null
  contrato_url: string | null; contrato_assinado: boolean; responsavel: string | null
  created_at: string; updated_at: string
}
export const STATUS_PROPOSTA: { id: StatusProposta; nome: string; cor: string }[] = [
  { id: 'rascunho', nome: 'Rascunho', cor: 'bg-tinta-3' },
  { id: 'enviada', nome: 'Enviada', cor: 'bg-info' },
  { id: 'aceita', nome: 'Aceita', cor: 'bg-ok' },
  { id: 'recusada', nome: 'Recusada', cor: 'bg-sinal' },
  { id: 'expirada', nome: 'Expirada', cor: 'bg-fio' },
]

// Mesma tabela do site da Vera (seção Preços).
export const PACOTES: (ItemProposta & { tipo: TipoProjeto })[] = [
  { nome: 'Landing Express', descricao: 'Uma página completa para o negócio ser encontrado: serviços, fotos, localização e botão de WhatsApp.', valor: 1200, prazo_dias: 5, recorrente: false, tipo: 'landing' },
  { nome: 'Landing com WhatsApp automático', descricao: 'A página e um atendimento automático que responde as dúvidas mais comuns e encaminha o cliente.', valor: 1800, prazo_dias: 7, recorrente: false, tipo: 'landing_wa' },
  { nome: 'Site completo', descricao: 'Várias páginas, serviços detalhados, galeria, catálogo ou blog.', valor: 2500, prazo_dias: 14, recorrente: false, tipo: 'site' },
  { nome: 'Automação de WhatsApp', descricao: 'Para quem já tem site: respostas automáticas, agendamento e lembretes para o cliente.', valor: 800, prazo_dias: 5, recorrente: false, tipo: 'automacao' },
  { nome: 'Sistema sob medida', descricao: 'Loja online, cardápio com gestão ou painel de controle sob medida.', valor: 0, prazo_dias: null, recorrente: false, tipo: 'sistema' },
  { nome: 'Hospedagem e manutenção', descricao: 'Site no ar, domínio, ajustes de texto e foto e suporte por WhatsApp.', valor: 97, prazo_dias: null, recorrente: true, tipo: 'outro' },
]

export const totaisProposta = (itens: ItemProposta[]) => ({
  setup: itens.filter((i) => !i.recorrente).reduce((s, i) => s + (Number(i.valor) || 0), 0),
  mensal: itens.filter((i) => i.recorrente).reduce((s, i) => s + (Number(i.valor) || 0), 0),
  prazo: Math.max(0, ...itens.filter((i) => !i.recorrente).map((i) => i.prazo_dias ?? 0)) || null,
})

const CAMPOS_PROPOSTA = ['titulo', 'cliente_id', 'lead_id', 'itens', 'valor_setup', 'valor_mensal', 'prazo_dias', 'validade', 'condicoes', 'status', 'enviada_em', 'respondida_em', 'motivo_recusa', 'contrato_url', 'contrato_assinado', 'responsavel'] as const

export async function salvarProposta(p: Partial<Proposta>) {
  const campos = limpar(p as Record<string, unknown>, CAMPOS_PROPOSTA)
  if (p.itens) Object.assign(campos, { valor_setup: totaisProposta(p.itens).setup, valor_mensal: totaisProposta(p.itens).mensal, prazo_dias: totaisProposta(p.itens).prazo })
  let id = p.id
  if (id) await q(supabase.from('propostas').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id))
  else id = (await q<{ id: string }>(supabase.from('propostas').insert(campos).select('id').single())).id
  invalidar('propostas')
  return id!
}

export function textoProposta(p: Pick<Proposta, 'numero' | 'titulo' | 'itens' | 'validade' | 'condicoes'>, para: string) {
  const t = totaisProposta(p.itens)
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const linhas = [
    `*Proposta Vera Group nº ${p.numero ?? ''}*`,
    `${p.titulo}${para ? ` · ${para}` : ''}`,
    '',
    ...p.itens.map((i) => `• *${i.nome}*${i.valor ? ` · ${brl(i.valor)}${i.recorrente ? '/mês' : ''}` : ''}${i.prazo_dias ? ` · ${i.prazo_dias} dias` : ''}\n  ${i.descricao}`),
    '',
    t.setup ? `Investimento: *${brl(t.setup)}*` : '',
    t.mensal ? `Mensalidade: *${brl(t.mensal)}/mês*` : '',
    t.prazo ? `Prazo: ${t.prazo} dias a partir da aprovação` : '',
    p.validade ? `Válida até ${new Date(p.validade + 'T12:00').toLocaleDateString('pt-BR')}` : '',
    p.condicoes ? `\n${p.condicoes}` : '',
  ]
  return linhas.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').trim()
}

// ============================================================ Projetos

export type TipoProjeto = 'landing' | 'landing_wa' | 'site' | 'automacao' | 'sistema' | 'outro'
export type EtapaProjeto = 'briefing' | 'layout' | 'desenvolvimento' | 'revisao' | 'no_ar' | 'manutencao' | 'pausado'
export interface ItemChecklist { texto: string; feito: boolean }
export interface Projeto {
  id: string; nome: string; cliente_id: string; proposta_id: string | null; tipo: TipoProjeto; etapa: EtapaProjeto
  inicio: string; prazo: string | null; entregue_em: string | null; valor: number; url_previa: string | null
  url_producao: string | null; checklist: ItemChecklist[]; responsavel: string | null; observacoes: string | null
  created_at: string; updated_at: string
}
export const ETAPAS_PROJETO: { id: EtapaProjeto; nome: string; cor: string }[] = [
  { id: 'briefing', nome: 'Briefing', cor: 'bg-tinta-3' },
  { id: 'layout', nome: 'Layout', cor: 'bg-info' },
  { id: 'desenvolvimento', nome: 'Desenvolvimento', cor: 'bg-alerta' },
  { id: 'revisao', nome: 'Revisão do cliente', cor: 'bg-reuniao' },
  { id: 'no_ar', nome: 'No ar', cor: 'bg-ok' },
  { id: 'manutencao', nome: 'Manutenção', cor: 'bg-tinta' },
  { id: 'pausado', nome: 'Pausado', cor: 'bg-fio' },
]
export const etapaProjeto = (e: EtapaProjeto) => ETAPAS_PROJETO.find((x) => x.id === e) ?? ETAPAS_PROJETO[0]
export const TIPOS_PROJETO: { id: TipoProjeto; nome: string }[] = [
  { id: 'landing', nome: 'Landing Express' }, { id: 'landing_wa', nome: 'Landing + WhatsApp' }, { id: 'site', nome: 'Site completo' },
  { id: 'automacao', nome: 'Automação de WhatsApp' }, { id: 'sistema', nome: 'Sistema sob medida' }, { id: 'outro', nome: 'Outro' },
]
export const nomeTipoProjeto = (t: TipoProjeto) => TIPOS_PROJETO.find((x) => x.id === t)?.nome ?? t

const BASE_SITE = ['Receber logo, fotos e textos do cliente', 'Definir domínio', 'Montar o layout', 'Enviar prévia e aprovar com o cliente', 'Conectar botão de WhatsApp', 'Configurar Google (perfil da empresa e Search Console)', 'Publicar no domínio', 'Entregar acessos e mostrar ao cliente como usar']
export const CHECKLIST_PADRAO: Record<TipoProjeto, string[]> = {
  landing: BASE_SITE,
  landing_wa: [...BASE_SITE.slice(0, 5), 'Mapear as perguntas mais comuns', 'Configurar respostas automáticas e horário', 'Testar o atendimento com o cliente', ...BASE_SITE.slice(5)],
  site: ['Fechar o mapa de páginas', ...BASE_SITE.slice(0, 3), 'Escrever o texto de cada página', 'Montar galeria ou catálogo', ...BASE_SITE.slice(3)],
  automacao: ['Mapear as perguntas mais comuns', 'Conectar o número do cliente', 'Configurar respostas automáticas e horário', 'Configurar lembretes e agendamento', 'Testar com o cliente', 'Entregar e explicar como pausar o robô'],
  sistema: ['Levantar requisitos com o dono', 'Desenhar as telas principais', 'Modelar o banco', 'Construir e mostrar por etapas', 'Testar com a equipe do cliente', 'Treinamento', 'Publicar e acompanhar a primeira semana'],
  outro: [],
}
export const checklistDe = (t: TipoProjeto): ItemChecklist[] => CHECKLIST_PADRAO[t].map((texto) => ({ texto, feito: false }))

const CAMPOS_PROJETO = ['nome', 'cliente_id', 'proposta_id', 'tipo', 'etapa', 'inicio', 'prazo', 'entregue_em', 'valor', 'url_previa', 'url_producao', 'checklist', 'responsavel', 'observacoes'] as const

export async function salvarProjeto(p: Partial<Projeto>) {
  const campos = limpar(p as Record<string, unknown>, CAMPOS_PROJETO)
  // Entrou no ar: guarda o dia da entrega (uma vez só).
  if (p.etapa === 'no_ar' && !p.entregue_em) campos.entregue_em = new Date().toLocaleDateString('sv-SE')
  let id = p.id
  if (id) await q(supabase.from('projetos').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id))
  else id = (await q<{ id: string }>(supabase.from('projetos').insert(campos).select('id').single())).id
  invalidar('projetos')
  return id!
}

// ============================================================ Financeiro

export type TipoLanc = 'receita' | 'despesa'
export interface Lancamento {
  id: string; tipo: TipoLanc; descricao: string; categoria: string; valor: number; vencimento: string
  pago_em: string | null; forma: string | null; cliente_id: string | null; projeto_id: string | null
  proposta_id: string | null; recorrencia_id: string | null; competencia: string | null; socio: string | null
  observacoes: string | null; created_at: string
}
export interface Recorrencia {
  id: string; tipo: TipoLanc; descricao: string; categoria: string; valor: number; dia_vencimento: number
  cliente_id: string | null; ativo: boolean; inicio: string; fim: string | null; created_at: string
}
export const CATEGORIAS: Record<TipoLanc, string[]> = {
  receita: ['Setup de projeto', 'Mensalidade', 'Projeto avulso', 'Outras receitas'],
  despesa: ['Ferramentas e software', 'Hospedagem e domínios', 'Anúncios', 'Impostos', 'Contador', 'Retirada de sócio', 'Equipamento', 'Outras despesas'],
}
export const FORMAS = [{ id: 'pix', nome: 'Pix' }, { id: 'boleto', nome: 'Boleto' }, { id: 'cartao', nome: 'Cartão' }, { id: 'transferencia', nome: 'Transferência' }, { id: 'dinheiro', nome: 'Dinheiro' }]
export const RETIRADA = 'Retirada de sócio'

export type SituacaoLanc = 'pago' | 'atrasado' | 'hoje' | 'aberto'
export function situacao(l: Pick<Lancamento, 'pago_em' | 'vencimento'>, hoje = new Date().toLocaleDateString('sv-SE')): SituacaoLanc {
  if (l.pago_em) return 'pago'
  if (l.vencimento < hoje) return 'atrasado'
  if (l.vencimento === hoje) return 'hoje'
  return 'aberto'
}

const CAMPOS_LANC = ['tipo', 'descricao', 'categoria', 'valor', 'vencimento', 'pago_em', 'forma', 'cliente_id', 'projeto_id', 'proposta_id', 'socio', 'observacoes'] as const
export async function salvarLancamento(l: Partial<Lancamento>) {
  const campos = limpar(l as Record<string, unknown>, CAMPOS_LANC)
  if (l.id) await q(supabase.from('fin_lancamentos').update(campos).eq('id', l.id))
  else await q(supabase.from('fin_lancamentos').insert(campos))
  invalidar('fin')
}
export async function marcarPago(id: string, pago: boolean, forma?: string) {
  await q(supabase.from('fin_lancamentos').update({ pago_em: pago ? new Date().toLocaleDateString('sv-SE') : null, ...(forma ? { forma } : {}) }).eq('id', id))
  invalidar('fin')
}
export async function excluirLancamento(id: string) {
  await q(supabase.from('fin_lancamentos').delete().eq('id', id))
  invalidar('fin')
}

const CAMPOS_REC = ['tipo', 'descricao', 'categoria', 'valor', 'dia_vencimento', 'cliente_id', 'ativo', 'inicio', 'fim'] as const
export async function salvarRecorrencia(r: Partial<Recorrencia>) {
  const campos = limpar(r as Record<string, unknown>, CAMPOS_REC)
  if (r.id) await q(supabase.from('fin_recorrencias').update(campos).eq('id', r.id))
  else await q(supabase.from('fin_recorrencias').insert(campos))
  await gerarMes(new Date())
  invalidar('fin')
}

/** Garante que as mensalidades e despesas fixas do mês existam. */
export async function gerarMes(d: Date) {
  const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const { error } = await supabase.rpc('gerar_lancamentos_mes', { p_mes: mes })
  if (error) throw new Error(error.message)
}

// ============================================================ Proposta aceita

/**
 * Proposta aceita vira operação: cliente (do lead, se preciso), projeto com o
 * checklist do pacote, cobrança do setup e mensalidade recorrente. O lead,
 * quando existe, vai para "fechado" com o plano e os valores.
 */
export async function aceitarProposta(p: Proposta, op: { inicio: string; vencimentoSetup: string; diaMensalidade: number; setupPago: boolean; responsavel: string }) {
  let clienteId = p.cliente_id
  if (!clienteId && p.lead_id) {
    const lead = await q<Lead>(supabase.from('leads').select('*').eq('id', p.lead_id).single())
    clienteId = await clienteDoLead(lead, op.responsavel)
  }
  if (!clienteId) throw new Error('Escolha o cliente ou o lead da proposta antes de aceitar.')

  const t = totaisProposta(p.itens)
  const principal = p.itens.find((i) => !i.recorrente)
  const tipo = PACOTES.find((x) => x.nome === principal?.nome)?.tipo ?? 'outro'
  const prazo = t.prazo ? new Date(new Date(op.inicio + 'T12:00').getTime() + t.prazo * 86400e3).toLocaleDateString('sv-SE') : null

  const projetoId = await salvarProjeto({
    nome: principal?.nome ?? p.titulo, cliente_id: clienteId, proposta_id: p.id, tipo, etapa: 'briefing',
    inicio: op.inicio, prazo, valor: t.setup, checklist: checklistDe(tipo), responsavel: op.responsavel,
  })
  if (t.setup > 0) {
    await q(supabase.from('fin_lancamentos').insert({
      tipo: 'receita', descricao: `Setup · ${p.titulo}`, categoria: 'Setup de projeto', valor: t.setup,
      vencimento: op.vencimentoSetup, pago_em: op.setupPago ? new Date().toLocaleDateString('sv-SE') : null,
      cliente_id: clienteId, projeto_id: projetoId, proposta_id: p.id,
    }))
  }
  if (t.mensal > 0) {
    await q(supabase.from('fin_recorrencias').insert({
      tipo: 'receita', descricao: `Mensalidade · ${p.itens.filter((i) => i.recorrente).map((i) => i.nome).join(' + ')}`,
      categoria: 'Mensalidade', valor: t.mensal, dia_vencimento: op.diaMensalidade, cliente_id: clienteId, inicio: op.inicio,
    }))
    await gerarMes(new Date(op.inicio + 'T12:00'))
  }
  await q(supabase.from('propostas').update({ status: 'aceita', respondida_em: new Date().toISOString(), cliente_id: clienteId, updated_at: new Date().toISOString() }).eq('id', p.id))
  if (p.lead_id) {
    await supabase.from('leads').update({ etapa: 'fechado', plano: principal?.nome ?? p.titulo, valor_setup: t.setup || null, valor_mensal: t.mensal || null }).eq('id', p.lead_id)
  }
  invalidar('propostas', 'clientes', 'projetos', 'fin', 'leads')
  return { clienteId, projetoId }
}
