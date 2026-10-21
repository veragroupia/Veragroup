export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const brl = (v?: number | null) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const num = (v?: number | null) => (v ?? 0).toLocaleString('pt-BR')

export function dataHora(s?: string | null) {
  if (!s) return '-'
  return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
export function data(s?: string | null) {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
export function hora(s?: string | null) {
  if (!s) return '-'
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function relativo(s?: string | null) {
  if (!s) return '-'
  const diff = (Date.now() - new Date(s).getTime()) / 1000
  const fut = diff < 0
  const a = Math.abs(diff)
  if (a < 60) return 'agora'
  const t = a < 3600 ? `${Math.round(a / 60)} min` : a < 86400 ? `${Math.round(a / 3600)} h` : `${Math.round(a / 86400)} d`
  return fut ? `em ${t}` : `há ${t}`
}

export function diasDesde(s?: string | null) {
  if (!s) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86400e3))
}

export function fimDoDia(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
export function inicioDoDia(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const ehHoje = (s?: string | null) => !!s && new Date(s).toDateString() === new Date().toDateString()

export function soDigitos(s?: string | null) { return (s ?? '').replace(/\D/g, '') }

/** Número pronto para o wa.me, sempre com 55 na frente. */
export function numeroWa(whatsapp?: string | null, telefone?: string | null) {
  const d = soDigitos(whatsapp || telefone)
  if (!d) return null
  return d.startsWith('55') ? d : '55' + d
}
export function waLink(numero: string, texto?: string | null) {
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}
export function telefoneBonito(s?: string | null) {
  let d = soDigitos(s)
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return s ?? '-'
}

export function preencher(msg: string | null | undefined, vendedor: string) {
  return (msg ?? '').replaceAll('{vendedor}', primeiroNome(vendedor))
}
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome

export function nomeCurto(nome: string) {
  return nome.split('|')[0].split(' - ')[0].trim()
}
export function iniciais(nome: string) {
  const p = nomeCurto(nome).split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

/** Nichos com texto absurdo (ex.: um modelo de mensagem colado no campo) não viram filtro. */
export const nichoValido = (n?: string | null) => !!n && n.length <= 40

export function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function baixarCsv(nome: string, linhas: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const csv = '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nome })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
