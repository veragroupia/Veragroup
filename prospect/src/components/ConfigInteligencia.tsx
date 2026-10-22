import { useEffect, useState } from 'react'
import { Ban, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invalidar, q } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { PROMPT_VERSION, useBloqueios, useConfigComercial, type ConfigComercial } from '../lib/inteligencia'
import { CATALOGO_PADRAO, CATALOGO_VERSAO_PADRAO, NOME_SOLUCAO, type Oferta } from '../../supabase/functions/_shared/inteligencia/catalogo.ts'
import { PESOS_ADEQUACAO, PESOS_INTERESSE } from '../../supabase/functions/_shared/inteligencia/config.ts'
import { SINAIS, SOLUCOES, type CodigoSinal, type Solucao } from '../../supabase/functions/_shared/inteligencia/tipos.ts'
import { cx, dataHora } from '../lib/util'
import { useExecutar } from './Aviso'
import { Campo, Interruptor, Linhas } from './ui'

/* Configuração da Vera Sales Intelligence. O nome do vendedor vem da Equipe (não se repete aqui). */

export function ConfigInteligencia() {
  const { ehAdmin } = useSessao()
  const cfg = useConfigComercial()
  if (cfg.carregando && !cfg.data) return <Linhas n={4} />
  if (cfg.data && !cfg.data.disponivel) {
    return <div className="folha p-5 text-sm">A tabela de configuração comercial ainda não existe no banco. Aplique a migration <code className="font-mono">0004_inteligencia_comercial.sql</code> para editar. Enquanto isso, a IA usa os padrões do código.</div>
  }
  return (
    <div className="space-y-6">
      {!ehAdmin && <p className="text-sm text-tinta-3">Só admins alteram estas configurações. Você pode consultar.</p>}
      <Estilo c={cfg.config} admin={ehAdmin} />
      <Catalogo c={cfg.config} admin={ehAdmin} />
      <Pesos c={cfg.config} admin={ehAdmin} />
      <Bloqueados admin={ehAdmin} />
      <p className="text-xs text-tinta-3 font-mono">Instruções da IA: {PROMPT_VERSION} · catálogo: {cfg.config.catalogo_versao}</p>
    </div>
  )
}

async function salvar(campos: Partial<ConfigComercial>, email: string) {
  await q(supabase.from('config_comercial').update({ ...campos, updated_at: new Date().toISOString(), updated_by: email }).eq('id', 1))
  invalidar('config_comercial')
}

function Estilo({ c, admin }: { c: ConfigComercial; admin: boolean }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const [f, setF] = useState(c)
  useEffect(() => setF(c), [c])
  const campos = ['estilo', 'formalidade', 'emojis', 'objetivo', 'preferir_qualificacao', 'janelas', 'apenas_dias_uteis', 'limite_followups', 'dias_aguardar', 'min_respostas_padrao', 'politica_previas', 'preparo_automatico', 'limite_lote'] as const
  const mudou = campos.some((k) => JSON.stringify(f[k]) !== JSON.stringify(c[k]))
  const set = <K extends keyof ConfigComercial>(k: K, v: ConfigComercial[K]) => setF((x) => ({ ...x, [k]: v }))

  return (
    <section className="folha p-5 space-y-5">
      <div>
        <h2 className="font-semibold">Como a IA conversa</h2>
        <p className="text-sm text-tinta-3">O nome do vendedor que assina vem da aba Equipe.</p>
      </div>
      <fieldset disabled={!admin} className="grid sm:grid-cols-2 gap-4">
        <Campo rotulo="Estilo"><select className="inp" value={f.estilo} onChange={(e) => set('estilo', e.target.value as ConfigComercial['estilo'])}><option value="consultivo">Consultivo (entender antes de oferecer)</option><option value="direto">Direto</option></select></Campo>
        <Campo rotulo="Formalidade"><select className="inp" value={f.formalidade} onChange={(e) => set('formalidade', e.target.value as ConfigComercial['formalidade'])}><option value="informal">Leve, de WhatsApp</option><option value="neutro">Cordial, sem gíria</option><option value="formal">Mais formal</option></select></Campo>
        <Campo rotulo="Emojis"><select className="inp" value={f.emojis} onChange={(e) => set('emojis', e.target.value as ConfigComercial['emojis'])}><option value="nenhum">Nenhum</option><option value="moderado">No máximo um, quando combinar</option></select></Campo>
        <Campo rotulo="Objetivo da prospecção"><select className="inp" value={f.objetivo} onChange={(e) => set('objetivo', e.target.value as ConfigComercial['objetivo'])}><option value="qualificar">Qualificar a necessidade</option><option value="demonstrar">Mostrar uma demonstração</option><option value="agendar_conversa">Marcar uma conversa</option></select></Campo>
        <Campo rotulo="Prévias e demonstrações"><select className="inp" value={f.politica_previas} onChange={(e) => set('politica_previas', e.target.value as ConfigComercial['politica_previas'])}><option value="demonstracao_quando_apropriado">Oferecer quando houver interesse</option><option value="demonstracao_quando_pedido">Só quando o cliente pedir</option><option value="nao_oferecer">Não oferecer</option></select></Campo>
        <div className="flex items-end pb-2"><Interruptor ligado={f.preferir_qualificacao} onChange={(v) => set('preferir_qualificacao', v)} rotulo={<span className="text-sm">Primeiro contato com pergunta de qualificação</span>} /></div>
      </fieldset>

      <fieldset disabled={!admin} className="border-t border-fio pt-5 space-y-4">
        <div>
          <span className="lbl">Janelas de contato permitidas ({f.fuso.replace('America/', '').replace('_', ' ')})</span>
          <div className="space-y-2">
            {f.janelas.map((j, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" className="inp w-32 numero" value={j.inicio} onChange={(e) => set('janelas', f.janelas.map((x, k) => (k === i ? { ...x, inicio: e.target.value } : x)))} />
                <span className="text-tinta-3">até</span>
                <input type="time" className="inp w-32 numero" value={j.fim} onChange={(e) => set('janelas', f.janelas.map((x, k) => (k === i ? { ...x, fim: e.target.value } : x)))} />
                {f.janelas.length > 1 && <button className="btn-icone" onClick={() => set('janelas', f.janelas.filter((_, k) => k !== i))} aria-label="Remover janela"><X size={14} /></button>}
              </div>
            ))}
            <button className="btn-fantasma btn-sm" onClick={() => set('janelas', [...f.janelas, { inicio: '14:00', fim: '17:00' }])}><Plus size={13} /> Janela</button>
          </div>
          <p className="text-xs text-tinta-3 mt-1">Prospecção nunca sai destas faixas. Responder um cliente que escreveu não espera a janela: vale das 8h às 21h.</p>
        </div>
        <Interruptor ligado={f.apenas_dias_uteis} onChange={(v) => set('apenas_dias_uteis', v)} rotulo={<span className="text-sm">Só dias úteis</span>} />
        <div className="grid sm:grid-cols-3 gap-4">
          <Campo rotulo="Follow-ups sem resposta" dica="Depois disso, a IA recomenda encerrar."><input type="number" min={1} max={10} className="inp numero" value={f.limite_followups} onChange={(e) => set('limite_followups', Number(e.target.value))} /></Campo>
          <Campo rotulo="Dias para aguardar" dica="Tempo mínimo antes de um novo contato."><input type="number" min={1} max={30} className="inp numero" value={f.dias_aguardar} onChange={(e) => set('dias_aguardar', Number(e.target.value))} /></Campo>
          <Campo rotulo="Respostas para padrão" dica="Mínimo para confiar no horário em que o cliente responde."><input type="number" min={2} max={20} className="inp numero" value={f.min_respostas_padrao} onChange={(e) => set('min_respostas_padrao', Number(e.target.value))} /></Campo>
        </div>
      </fieldset>

      <fieldset disabled={!admin} className="border-t border-fio pt-5 grid sm:grid-cols-[1fr_200px] gap-4 items-end">
        <div>
          <Interruptor ligado={f.preparo_automatico} onChange={(v) => set('preparo_automatico', v)} rotulo={<span className="text-sm">Preparar o rascunho sozinho ao abrir um lead</span>} />
          <p className="text-xs text-tinta-3 mt-1">Só quando a regra diz que vale escrever e ainda não há rascunho para a conversa de agora. Uma vez por contexto: não gera de novo a cada visita. Nada é enviado.</p>
        </div>
        <Campo rotulo="Máximo por lote" dica="Preparação em lote na tela Hoje."><input type="number" min={1} max={100} className="inp numero" value={f.limite_lote} onChange={(e) => set('limite_lote', Number(e.target.value))} /></Campo>
      </fieldset>

      {admin && (
        <div className="flex justify-end gap-2 border-t border-fio pt-4">
          {mudou && <button className="btn-fantasma" onClick={() => setF(c)}>Desfazer</button>}
          <button className="btn-pri" disabled={!mudou} onClick={() => executar(() => salvar(Object.fromEntries(campos.map((k) => [k, f[k]])) as Partial<ConfigComercial>, eu!.email), 'Configuração salva')}>Salvar</button>
        </div>
      )}
    </section>
  )
}

function Catalogo({ c, admin }: { c: ConfigComercial; admin: boolean }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const original = c.catalogo ?? CATALOGO_PADRAO
  const [lista, setLista] = useState<Oferta[]>(original)
  useEffect(() => setLista(c.catalogo ?? CATALOGO_PADRAO), [c.catalogo])
  const mudou = JSON.stringify(lista) !== JSON.stringify(original)
  const altera = (i: number, campos: Partial<Oferta>) => setLista((l) => l.map((o, k) => (k === i ? { ...o, ...campos } : o)))
  const valido = lista.every((o) => /^[a-z0-9_]+$/.test(o.id) && o.nome.trim() && o.preco.trim()) && new Set(lista.map((o) => o.id)).size === lista.length

  return (
    <section className="folha p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold">Catálogo aprovado</h2>
          <p className="text-sm text-tinta-3">A IA só fala de preço, prazo e itens que estão aqui. {c.catalogo ? 'Personalizado.' : 'Igual à tabela do site.'}</p>
        </div>
        {admin && c.catalogo && <button className="btn-sec btn-sm" onClick={() => executar(() => salvar({ catalogo: null, catalogo_versao: CATALOGO_VERSAO_PADRAO }, eu!.email), 'Catálogo do site restaurado')}><RotateCcw size={13} /> Voltar à tabela do site</button>}
      </div>
      <fieldset disabled={!admin} className="space-y-3">
        {lista.map((o, i) => (
          <div key={i} className={cx('rounded border border-fio p-3 space-y-2', o.ativo === false && 'opacity-60')}>
            <div className="grid sm:grid-cols-[1fr_140px_120px_auto] gap-2 items-center">
              <input className="inp" value={o.nome} onChange={(e) => altera(i, { nome: e.target.value })} placeholder="Nome" />
              <input className="inp" value={o.preco} onChange={(e) => altera(i, { preco: e.target.value })} placeholder="Preço" />
              <input className="inp" value={o.prazo} onChange={(e) => altera(i, { prazo: e.target.value })} placeholder="Prazo" />
              <div className="flex items-center gap-1">
                <Interruptor ligado={o.ativo !== false} onChange={(v) => altera(i, { ativo: v })} rotulo={<span className="text-xs text-tinta-3">Ativo</span>} />
                {!CATALOGO_PADRAO.some((p) => p.id === o.id) && <button className="btn-icone" onClick={() => setLista((l) => l.filter((_, k) => k !== i))} aria-label="Remover oferta"><Trash2 size={14} /></button>}
              </div>
            </div>
            <input className="inp" value={o.itens} onChange={(e) => altera(i, { itens: e.target.value })} placeholder="O que inclui" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-tinta-3 mr-1">{o.id}</span>
              {SOLUCOES.filter((s) => s !== 'nenhuma' && s !== 'indefinida').map((s) => {
                const tem = o.solucoes.includes(s)
                return <button key={s} type="button" onClick={() => altera(i, { solucoes: tem ? o.solucoes.filter((x) => x !== s) : [...o.solucoes, s as Solucao] })}
                  className={cx('text-xs px-2 py-0.5 rounded-full border', tem ? 'bg-tinta text-fundo border-tinta' : 'border-fio text-tinta-3')}>{NOME_SOLUCAO[s]}</button>
              })}
            </div>
          </div>
        ))}
      </fieldset>
      {admin && (
        <div className="flex flex-wrap justify-between gap-2 mt-4">
          <button className="btn-fantasma btn-sm" onClick={() => {
            const id = prompt('Identificador da nova oferta (letras minúsculas e _), ex.: cardapio_digital')?.trim()
            if (id) setLista((l) => [...l, { id, nome: '', preco: '', prazo: '', itens: '', solucoes: [], ativo: true }])
          }}><Plus size={13} /> Oferta</button>
          <div className="flex gap-2">
            {mudou && <button className="btn-fantasma" onClick={() => setLista(original)}>Desfazer</button>}
            <button className="btn-pri" disabled={!mudou || !valido} onClick={() => executar(() => salvar({ catalogo: lista, catalogo_versao: `personalizado-${new Date().toISOString().slice(0, 16)}` }, eu!.email), 'Catálogo salvo')}>Salvar catálogo</button>
          </div>
        </div>
      )}
      <p className="text-xs text-tinta-3 mt-3">Salvar uma mudança marca as sugestões antigas como desatualizadas, para nenhuma mensagem sair com preço velho.</p>
    </section>
  )
}

function Pesos({ c, admin }: { c: ConfigComercial; admin: boolean }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const padrao: Partial<Record<CodigoSinal, number>> = { ...PESOS_INTERESSE, ...PESOS_ADEQUACAO }
  const [pesos, setPesos] = useState(c.pesos)
  useEffect(() => setPesos(c.pesos), [c.pesos])
  const mudou = JSON.stringify(pesos) !== JSON.stringify(c.pesos)
  return (
    <section className="folha p-5">
      <h2 className="font-semibold">Regras de pontuação</h2>
      <p className="text-sm text-tinta-3 mb-4">Cada sinal soma ou tira pontos uma vez. Interesse vai de 0 a 100; adequação começa em 40 e muda só com evidência. Temperatura quente exige pedido concreto, não só pontos.</p>
      <details>
        <summary className="text-sm text-tinta-2 cursor-pointer select-none">Ver e ajustar os pesos</summary>
        <fieldset disabled={!admin} className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
          {(Object.keys(padrao) as CodigoSinal[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 text-sm">
              <span><span className="font-mono text-[10px] text-tinta-3 mr-1.5">{SINAIS[k].grupo === 'interesse' ? 'INT' : 'ADQ'}</span>{SINAIS[k].nome}</span>
              <input type="number" className="inp w-20 h-8 numero" value={pesos[k] ?? padrao[k]} onChange={(e) => {
                const v = Number(e.target.value)
                setPesos((p) => { const n = { ...p }; if (v === padrao[k]) delete n[k]; else n[k] = v; return n })
              }} />
            </label>
          ))}
        </fieldset>
        {admin && (
          <div className="flex justify-end gap-2 mt-4">
            {Object.keys(c.pesos).length > 0 && <button className="btn-fantasma" onClick={() => setPesos({})}>Usar padrão</button>}
            <button className="btn-pri" disabled={!mudou} onClick={() => executar(() => salvar({ pesos }, eu!.email), 'Pesos salvos')}>Salvar pesos</button>
          </div>
        )}
      </details>
    </section>
  )
}

function Bloqueados({ admin }: { admin: boolean }) {
  const executar = useExecutar()
  const lista = useBloqueios()
  return (
    <section className="folha p-5">
      <h2 className="font-semibold flex items-center gap-2"><Ban size={15} /> Não contatar</h2>
      <p className="text-sm text-tinta-3 mb-3">Contatos que pediram para não receber mensagens ou que a equipe bloqueou. Valem por telefone e cadastro do Google, mesmo se o lead for reimportado.</p>
      {!lista.data?.length ? <p className="text-sm text-tinta-3">Ninguém bloqueado.</p> : (
        <ul className="divide-y divide-fio">
          {lista.data.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1 min-w-0 truncate">{b.motivo}<span className="text-tinta-3"> · {b.origem === 'pedido_do_cliente' ? 'pedido do cliente' : 'equipe'} · {dataHora(b.created_at)}</span></span>
              <span className="font-mono text-xs text-tinta-3">{b.telefone_chave ?? b.place_id ?? ''}</span>
              {admin && <button className="btn-fantasma btn-sm" onClick={() => { if (confirm('Remover o bloqueio? Só faça isso se o próprio cliente pediu para voltar a conversar.')) executar(async () => { await q(supabase.from('contatos_bloqueados').delete().eq('id', b.id)); invalidar('contatos_bloqueados') }, 'Bloqueio removido') }}>Remover</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
