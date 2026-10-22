import { useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, MessageCircle, NotebookPen, Scissors, SendHorizontal, Trash2 } from 'lucide-react'
import { useSessao } from '../../lib/sessao'
import { excluirMensagem, importarConversa, parseConversa, registrarMensagem, registrarVarias, restaurarMensagem, separarColadas, separarMensagem, type MensagemImportada } from '../../lib/acoes'
import type { Lead, Mensagem } from '../../lib/tipos'
import type { Sugerida } from '../../pages/LeadDetalhe'
import { cx, dataHora, hora, nomeCurto } from '../../lib/util'
import { useAviso, useExecutar } from '../Aviso'
import { useAbrirWhatsApp } from '../useWhatsApp'
import { Modal, Segmentos, Vazio, Linhas } from '../ui'

type Modo = 'enviar' | 'recebida' | 'minha'

export function Conversa({ lead, mensagens, carregando, sugerida, followupId, bloqueado = false }: {
  lead: Lead; mensagens: Mensagem[]; carregando: boolean; sugerida: Sugerida | null; followupId?: string; bloqueado?: boolean
}) {
  const { eu, nomeDe, equipe } = useSessao()
  const executar = useExecutar()
  const abrirWa = useAbrirWhatsApp()
  const avisar = useAviso()
  const [texto, setTexto] = useState('')
  // enviar: abre o WhatsApp. recebida: registra o que o lead mandou. minha: registra o que você já mandou.
  const [modo, setModo] = useState<Modo>('enviar')
  const [importar, setImportar] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  // Direção trocada à mão na prévia das mensagens coladas (índice → direção).
  const [trocas, setTrocas] = useState<Record<number, 'enviada' | 'recebida'>>({})
  const fim = useRef<HTMLDivElement>(null)
  const nomesEquipe = useMemo(() => equipe.map((m) => m.nome), [equipe])
  const separar = (t: string, padrao?: 'enviada' | 'recebida') => separarColadas(t, lead, nomesEquipe, padrao)

  // Texto colado do WhatsApp ("[17:22, 21/10/2026] Fulano: oi") vira uma mensagem por linha.
  const coladas = useMemo(() => modo === 'enviar' ? []
    : separar(texto, modo === 'minha' ? 'enviada' : 'recebida').map((m, i) => ({ ...m, direcao: trocas[i] ?? m.direcao })), [modo, texto, trocas, lead, nomesEquipe])
  useEffect(() => setTrocas({}), [texto])
  // Ao selecionar um balão, rola até os botões dele aparecerem.
  useEffect(() => { if (sel) document.getElementById(`acoes-${sel}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [sel])

  // A sugestão é para enviar; em "Registrar resposta" a caixa começa vazia.
  function trocarModo(m: Modo) {
    setModo(m)
    if (m !== 'enviar' && texto === sugerida?.texto) setTexto('')
    if (m === 'enviar' && !texto.trim() && sugerida) setTexto(sugerida.texto)
  }

  useEffect(() => { setTexto(sugerida?.texto ?? '') }, [sugerida?.texto])
  useEffect(() => { fim.current?.scrollIntoView({ block: 'nearest' }) }, [mensagens.length])

  // Agrupa por dia para a linha do tempo ficar legível.
  const dias = useMemo(() => {
    const g: { dia: string; itens: Mensagem[] }[] = []
    for (const m of mensagens) {
      const dia = new Date(m.enviada_em).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      if (g[g.length - 1]?.dia !== dia) g.push({ dia, itens: [] })
      g[g.length - 1].itens.push(m)
    }
    return g
  }, [mensagens])

  async function apagar(m: Mensagem) {
    setSel(null)
    let apagada: Mensagem | null = null
    if (await executar(async () => { apagada = await excluirMensagem(m.id) })) {
      avisar('Mensagem apagada', 'ok', { nome: 'Desfazer', fn: () => executar(() => restaurarMensagem(apagada!)) })
    }
  }

  async function confirmar() {
    if (modo !== 'enviar' && coladas.length) {
      if (await executar(() => registrarVarias(lead.id, coladas, eu!.email), `${coladas.length} ${coladas.length === 1 ? 'mensagem registrada' : 'mensagens registradas'}`)) setTexto('')
    } else if (modo === 'enviar') {
      const daSugestao = texto === sugerida?.texto
      const ok = await abrirWa(lead, texto, daSugestao ? followupId : undefined, daSugestao && sugerida?.rascunho ? { rascunhoId: sugerida.rascunho.id, variante: sugerida.rascunho.variante } : undefined)
      if (ok !== false) setTexto('')
    } else if (texto.trim()) {
      const minha = modo === 'minha'
      if (await executar(() => registrarMensagem(lead.id, minha ? 'enviada' : 'recebida', texto.trim(), eu!.email), minha ? 'Mensagem registrada' : 'Resposta registrada')) setTexto('')
    }
  }

  return (
    <div className="folha flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 h-12 border-b border-fio">
        <span className="rotulo">WhatsApp · {nomeCurto(lead.nome)}</span>
        <button className="btn-fantasma btn-sm -mr-2" onClick={() => setImportar(true)}><FileUp size={14} /> Importar conversa</button>
      </div>

      <div className="px-3 md:px-5 py-4 max-h-[52vh] min-h-[200px] overflow-y-auto rolagem-fina bg-fundo/50">
        {carregando ? <Linhas n={3} /> : !mensagens.length ? (
          <Vazio titulo="Nenhuma mensagem ainda." icone={<MessageCircle size={18} />}>
            {lead.mensagem_inicial ? 'A primeira mensagem do radar já está pronta aqui embaixo.' : 'Escreva a primeira mensagem abaixo.'}
          </Vazio>
        ) : dias.map((d) => (
          <div key={d.dia}>
            <div className="text-center my-3"><span className="font-mono text-[10px] uppercase tracking-wider text-tinta-3 bg-realce rounded px-2 py-1">{d.dia}</span></div>
            <div className="space-y-1.5">
              {d.itens.map((m) => {
                const nossa = m.direcao === 'enviada'
                const aberta = sel === m.id
                const partes = aberta && m.texto ? separar(m.texto) : []
                return (
                  <div key={m.id} className={cx('flex flex-col', nossa ? 'items-end' : 'items-start')}>
                    <button type="button" onClick={() => setSel(aberta ? null : m.id)} title="Clique para apagar ou corrigir"
                      className={cx('text-left max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 text-[14px] leading-relaxed whitespace-pre-wrap break-words transition-shadow',
                        nossa ? 'bg-tinta text-fundo rounded-br-sm' : 'bg-folha border border-fio rounded-bl-sm',
                        aberta && 'ring-2 ring-sinal/60 ring-offset-2 ring-offset-fundo')}>
                      {m.texto ?? <em className="opacity-60">[mídia]</em>}
                      <span className={cx('block text-[10px] mt-1 text-right font-mono', nossa ? 'text-fundo/50' : 'text-tinta-3')}>
                        {nossa && m.autor && `${nomeDe(m.autor).split(' ')[0]} · `}{hora(m.enviada_em)}{m.origem !== 'whatsapp' && ` · ${m.origem}`}{nossa && m.confirmada == null && m.origem === 'manual' && ' · envio não confirmado'}
                      </span>
                    </button>
                    {aberta && (
                      <div id={`acoes-${m.id}`} className="flex flex-wrap gap-1.5 mt-1.5 mb-1 animate-entra">
                        {partes.length > 0 && (
                          <button className="btn-sec btn-sm" onClick={() => { setSel(null); executar(() => separarMensagem(m, partes, eu!.email), `Separada em ${partes.length} mensagens`) }}>
                            <Scissors size={13} /> Separar em {partes.length} {partes.length === 1 ? 'mensagem' : 'mensagens'}
                          </button>
                        )}
                        <button className="btn-sec btn-sm text-sinal" onClick={() => apagar(m)}><Trash2 size={13} /> Apagar</button>
                        <button className="btn-fantasma btn-sm" onClick={() => setSel(null)}>Cancelar</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={fim} />
      </div>

      <div className="border-t border-fio p-3 md:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Segmentos valor={modo} onChange={trocarModo} opcoes={[
            { id: 'enviar', nome: <span className="inline-flex items-center gap-1.5"><MessageCircle size={13} /> Enviar</span> },
            { id: 'recebida', nome: <span className="inline-flex items-center gap-1.5"><NotebookPen size={13} /> <span className="sm:hidden">Do lead</span><span className="hidden sm:inline">Resposta do lead</span></span> },
            { id: 'minha', nome: <span className="inline-flex items-center gap-1.5"><SendHorizontal size={13} /> <span className="sm:hidden">Minha</span><span className="hidden sm:inline">Minha mensagem</span></span> },
          ]} />
          {modo === 'enviar' && sugerida && texto === sugerida.texto && <span className="text-xs text-tinta-3">{sugerida.origem}</span>}
        </div>
        <textarea className="inp text-[14px]" rows={modo === 'enviar' ? 4 : 3} value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); confirmar() } }}
          placeholder={modo === 'enviar' ? 'Escreva a mensagem. Ela abre pronta no WhatsApp.'
            : modo === 'minha' ? 'Cole aqui o que você já mandou pelo WhatsApp. Não abre o WhatsApp, só registra.'
            : 'Cole aqui o que o lead respondeu. Pode colar várias mensagens copiadas do WhatsApp de uma vez.'} />
        {coladas.length > 0 && (
          <div className="rounded border border-fio bg-fundo/50 p-2.5 animate-entra">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="rotulo">{coladas.length} {coladas.length === 1 ? 'mensagem' : 'mensagens'} · {dataHora(coladas[0].enviada_em)}</span>
              <span className="text-[11px] text-tinta-3">Toque em Lead ou Vera para trocar</span>
            </div>
            <ul className="space-y-1.5 max-h-56 overflow-y-auto rolagem-fina">
              {coladas.map((c, i) => (
                <li key={i} className={cx('flex items-start gap-2', c.direcao === 'enviada' && 'flex-row-reverse')}>
                  <button type="button" onClick={() => setTrocas((t) => ({ ...t, [i]: c.direcao === 'enviada' ? 'recebida' : 'enviada' }))}
                    className={cx('shrink-0 mt-1 font-mono text-[10px] uppercase rounded px-1.5 py-0.5 border', c.direcao === 'enviada' ? 'bg-tinta text-fundo border-tinta' : 'bg-folha border-fio text-tinta-2')}
                    title={c.autor}>
                    {c.direcao === 'enviada' ? 'Vera' : 'Lead'}
                  </button>
                  <div className={cx('rounded-lg px-2.5 py-1.5 text-[13px] leading-snug whitespace-pre-wrap break-words max-w-[85%]',
                    c.direcao === 'enviada' ? 'bg-tinta text-fundo rounded-br-sm' : 'bg-folha border border-fio rounded-bl-sm')}>
                    {c.texto}
                    <div className={cx('text-[10px] mt-0.5 text-right font-mono', c.direcao === 'enviada' ? 'text-fundo/50' : 'text-tinta-3')}>{hora(c.enviada_em)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-tinta-3 hidden sm:block">
            {modo === 'enviar' ? <>{texto.includes('{vendedor}') && <>{'{vendedor}'} vira {eu!.nome.split(' ')[0]} · </>}<span className="tecla">Ctrl Enter</span> envia</>
              : coladas.length ? 'Cada uma entra com o horário dela.'
              : modo === 'minha' ? 'Entra como enviada por você, com o horário de agora.' : 'Fica no histórico e move o lead para Respondeu.'}
          </span>
          {modo === 'enviar'
            ? <button className="btn-wa ml-auto" onClick={confirmar} disabled={bloqueado || (!lead.whatsapp && !lead.telefone)} title={bloqueado ? 'Contato bloqueado' : undefined}><MessageCircle size={15} /> Abrir no WhatsApp</button>
            : <button className="btn-pri ml-auto" onClick={confirmar} disabled={!texto.trim()}>{coladas.length > 1 ? `Registrar ${coladas.length} mensagens` : 'Registrar'}</button>}
        </div>
      </div>

      {importar && <Importar lead={lead} onFechar={() => setImportar(false)} />}
    </div>
  )
}

function Importar({ lead, onFechar }: { lead: Lead; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const [bruto, setBruto] = useState('')
  const msgs: MensagemImportada[] = useMemo(() => (bruto ? parseConversa(bruto, nomeCurto(lead.nome)) : []), [bruto, lead.nome])

  async function lerArquivo(f?: File) { if (f) setBruto(await f.text()) }
  async function salvar() {
    let n = 0
    if (await executar(async () => { n = await importarConversa(lead.id, msgs, eu!.email) })) {
      avisar(n ? `${n} mensagens importadas` : 'Essas mensagens já estavam no histórico')
      onFechar()
    }
  }

  return (
    <Modal titulo="Importar conversa do WhatsApp" largura="max-w-2xl" onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" disabled={!msgs.length} onClick={salvar}>Importar {msgs.length || ''} mensagens</button></>}>
      <ol className="text-sm text-tinta-2 space-y-1 mb-4 list-decimal pl-5">
        <li>No WhatsApp, abra a conversa, toque no nome e escolha <b>Exportar conversa</b> (sem mídia).</li>
        <li>Envie o arquivo .txt aqui ou cole o texto abaixo.</li>
      </ol>
      <label className="btn-sec mb-3 cursor-pointer"><FileUp size={15} /> Escolher arquivo .txt
        <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(e) => lerArquivo(e.target.files?.[0])} />
      </label>
      <textarea className="inp font-mono text-xs" rows={8} value={bruto} onChange={(e) => setBruto(e.target.value)} placeholder="12/09/2026 14:03 - Fulano: Oi, tudo bem?" />
      {bruto && (
        <div className="mt-4">
          <div className="rotulo mb-2">Prévia · {msgs.length} mensagens · {msgs.filter((m) => m.direcao === 'recebida').length} do lead</div>
          <div className="max-h-48 overflow-y-auto rolagem-fina space-y-1 text-[13px]">
            {msgs.slice(-12).map((m, i) => (
              <div key={i} className={cx('flex gap-2', m.direcao === 'recebida' && 'text-sinal')}>
                <span className="font-mono text-[11px] text-tinta-3 w-14 shrink-0">{m.direcao === 'enviada' ? 'Vera' : 'Lead'}</span>
                <span className="truncate">{m.texto}</span>
              </div>
            ))}
          </div>
          {!msgs.length && <p className="text-sm text-sinal">Não reconheci o formato. Confira se é o .txt exportado pelo WhatsApp.</p>}
        </div>
      )}
    </Modal>
  )
}
