import { useMemo, useState } from 'react'
import { Clock, ExternalLink, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { ETAPAS_PROJETO, nomeTipoProjeto, salvarProjeto, type EtapaProjeto, type Projeto } from '../lib/gestao'
import { cx } from '../lib/util'
import { useAviso, useExecutar } from '../components/Aviso'
import { Avatar, Erro, Esqueleto, Pagina, Segmentos } from '../components/ui'
import { FormProjeto } from '../components/gestao/Formularios'

type ProjetoCliente = Projeto & { cliente: { id: string; nome: string } | null }

export default function Projetos() {
  const { eu, nomeDe } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const [quem, setQuem] = useState<'todos' | 'meus'>('todos')
  const [mostrarFim, setMostrarFim] = useState(false)
  const [aberto, setAberto] = useState<Projeto | 'novo' | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<EtapaProjeto | null>(null)
  const hoje = new Date().toLocaleDateString('sv-SE')

  const dados = useConsulta('projetos:quadro', () => q<ProjetoCliente[]>(supabase.from('projetos').select('*, cliente:clientes(id, nome)').order('prazo', { nullsFirst: false })), ['projetos', 'clientes'])

  const colunas = useMemo(() => {
    const base = (dados.data ?? []).filter((p) => quem === 'todos' || p.responsavel === eu!.email)
    return ETAPAS_PROJETO.filter((e) => mostrarFim || !['manutencao', 'pausado'].includes(e.id)).map((e) => ({ ...e, itens: base.filter((p) => p.etapa === e.id) }))
  }, [dados.data, quem, mostrarFim, eu])

  const emAndamento = (dados.data ?? []).filter((p) => !['no_ar', 'manutencao', 'pausado'].includes(p.etapa))
  const atrasados = emAndamento.filter((p) => p.prazo && p.prazo < hoje).length

  async function mover(id: string, etapa: EtapaProjeto) {
    const p = dados.data?.find((x) => x.id === id)
    if (!p || p.etapa === etapa) return
    const de = p.etapa
    if (await executar(() => salvarProjeto({ id, etapa, entregue_em: p.entregue_em }))) {
      avisar(`${p.nome}: ${ETAPAS_PROJETO.find((e) => e.id === etapa)!.nome}`, 'ok', { nome: 'Desfazer', fn: () => executar(() => salvarProjeto({ id, etapa: de, entregue_em: p.entregue_em })) })
    }
  }

  return (
    <Pagina titulo="Projetos" largura="max-w-none"
      sub={<>{emAndamento.length} em andamento{atrasados > 0 && <span className="text-sinal"> · {atrasados} com prazo vencido</span>}</>}
      acoes={<>
        <button className="btn-fantasma btn-sm" onClick={() => setMostrarFim((v) => !v)}>{mostrarFim ? 'Esconder' : 'Mostrar'} manutenção e pausados</button>
        <Segmentos valor={quem} onChange={setQuem} opcoes={[{ id: 'todos', nome: 'Todos' }, { id: 'meus', nome: 'Meus' }]} />
        <button className="btn-pri" onClick={() => setAberto('novo')}><Plus size={16} /> Projeto</button>
      </>}>
      {dados.erro && <Erro msg={dados.erro} onTentar={dados.recarregar} />}
      <div className="-mx-4 md:-mx-8 px-4 md:px-8 overflow-x-auto rolagem-fina snap-x snap-mandatory md:snap-none pb-4">
        <div className="flex gap-3 min-w-max items-start">
          {colunas.map((c) => (
            <section key={c.id}
              onDragOver={(e) => { if (arrastando) { e.preventDefault(); setAlvo(c.id) } }}
              onDragLeave={() => setAlvo((a) => (a === c.id ? null : a))}
              onDrop={() => { if (arrastando) mover(arrastando, c.id); setArrastando(null); setAlvo(null) }}
              className={cx('snap-start w-[82vw] sm:w-72 shrink-0 rounded-lg border flex flex-col max-h-[calc(100vh-190px)] transition-colors', alvo === c.id ? 'border-tinta bg-realce' : 'border-fio bg-realce/40')}>
              <header className="px-3 pt-3 pb-2.5 flex items-center gap-2">
                <span className={cx('w-2 h-2 rounded-full', c.cor)} /><h2 className="font-semibold text-sm">{c.nome}</h2>
                <span className="numero text-xs text-tinta-3 ml-auto">{c.itens.length}</span>
              </header>
              <div className="px-2 pb-2 space-y-1.5 overflow-y-auto rolagem-fina">
                {dados.carregando && <Esqueleto className="h-24" />}
                {c.itens.map((p) => {
                  const feitos = p.checklist.filter((i) => i.feito).length
                  const vencido = p.prazo && p.prazo < hoje && !['no_ar', 'manutencao'].includes(p.etapa)
                  const faltam = p.prazo ? Math.round((+new Date(p.prazo + 'T12:00') - +new Date(hoje + 'T12:00')) / 86400e3) : null
                  return (
                    <article key={p.id} draggable onDragStart={() => setArrastando(p.id)} onDragEnd={() => { setArrastando(null); setAlvo(null) }}
                      onClick={() => setAberto(p)}
                      className={cx('bg-folha border rounded p-3 cursor-pointer hover:border-tinta-3 transition-[border-color,opacity]', vencido ? 'border-sinal/50' : 'border-fio', arrastando === p.id && 'opacity-40')}>
                      <div className="text-xs text-tinta-3 truncate">{p.cliente?.nome}</div>
                      <h3 className="text-sm font-medium leading-snug mt-0.5">{p.nome}</h3>
                      <div className="text-xs text-tinta-3 mt-0.5">{nomeTipoProjeto(p.tipo)}</div>
                      {p.checklist.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="flex-1 h-1 rounded-full bg-realce overflow-hidden"><span className="block h-full bg-ok" style={{ width: `${(feitos / p.checklist.length) * 100}%` }} /></span>
                          <span className="numero text-[11px] text-tinta-3">{feitos}/{p.checklist.length}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        {p.prazo && !['no_ar', 'manutencao'].includes(p.etapa) && (
                          <span className={cx('inline-flex items-center gap-1', vencido ? 'text-sinal' : faltam !== null && faltam <= 2 ? 'text-alerta' : 'text-tinta-3')}>
                            <Clock size={11} />{vencido ? `${-faltam!} d atrasado` : faltam === 0 ? 'entrega hoje' : `${faltam} d`}
                          </span>
                        )}
                        {(p.url_producao || p.url_previa) && (
                          <a href={p.url_producao ?? p.url_previa!} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-tinta-3 hover:text-tinta">
                            <ExternalLink size={11} />{p.url_producao ? 'no ar' : 'prévia'}
                          </a>
                        )}
                        {p.responsavel && <span className="ml-auto" title={nomeDe(p.responsavel)}><Avatar nome={nomeDe(p.responsavel)} tamanho="sm" /></span>}
                      </div>
                    </article>
                  )
                })}
                {!dados.carregando && c.itens.length === 0 && <p className="text-xs text-tinta-3 text-center py-6">Vazio</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
      {aberto && <FormProjeto projeto={aberto === 'novo' ? undefined : aberto} onFechar={() => setAberto(null)} />}
    </Pagina>
  )
}
