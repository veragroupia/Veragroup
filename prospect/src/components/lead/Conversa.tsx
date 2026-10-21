import { useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, MessageCircle, NotebookPen } from 'lucide-react'
import { useSessao } from '../../lib/sessao'
import { abrirWhatsApp, importarConversa, parseConversa, registrarMensagem, type MensagemImportada } from '../../lib/acoes'
import type { Lead, Mensagem } from '../../lib/tipos'
import { cx, hora, nomeCurto } from '../../lib/util'
import { useAviso, useExecutar } from '../Aviso'
import { Modal, Segmentos, Vazio, Linhas } from '../ui'

export function Conversa({ lead, mensagens, carregando, sugerida, followupId }: {
  lead: Lead; mensagens: Mensagem[]; carregando: boolean; sugerida: { texto: string; origem: string } | null; followupId?: string
}) {
  const { eu, nomeDe } = useSessao()
  const executar = useExecutar()
  const [texto, setTexto] = useState('')
  const [modo, setModo] = useState<'enviar' | 'recebida'>('enviar')
  const [importar, setImportar] = useState(false)
  const fim = useRef<HTMLDivElement>(null)

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

  async function confirmar() {
    if (modo === 'enviar') {
      const ok = await executar(() => abrirWhatsApp(lead, texto, eu!, texto === sugerida?.texto ? followupId : undefined))
      if (ok) setTexto('')
    } else if (texto.trim()) {
      if (await executar(() => registrarMensagem(lead.id, 'recebida', texto.trim(), eu!.email), 'Resposta registrada')) setTexto('')
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
                return (
                  <div key={m.id} className={cx('flex', nossa ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 text-[14px] leading-relaxed whitespace-pre-wrap break-words',
                      nossa ? 'bg-tinta text-fundo rounded-br-sm' : 'bg-folha border border-fio rounded-bl-sm')}>
                      {m.texto ?? <em className="opacity-60">[mídia]</em>}
                      <div className={cx('text-[10px] mt-1 text-right font-mono', nossa ? 'text-fundo/50' : 'text-tinta-3')}>
                        {nossa && m.autor && `${nomeDe(m.autor).split(' ')[0]} · `}{hora(m.enviada_em)}{m.origem !== 'whatsapp' && ` · ${m.origem}`}
                      </div>
                    </div>
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
          <Segmentos valor={modo} onChange={setModo} opcoes={[
            { id: 'enviar', nome: <span className="inline-flex items-center gap-1.5"><MessageCircle size={13} /> Enviar</span> },
            { id: 'recebida', nome: <span className="inline-flex items-center gap-1.5"><NotebookPen size={13} /> Registrar resposta</span> },
          ]} />
          {modo === 'enviar' && sugerida && texto === sugerida.texto && <span className="text-xs text-tinta-3">{sugerida.origem}</span>}
        </div>
        <textarea className="inp text-[14px]" rows={modo === 'enviar' ? 4 : 3} value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); confirmar() } }}
          placeholder={modo === 'enviar' ? 'Escreva a mensagem. Ela abre pronta no WhatsApp.' : 'Cole aqui o que o lead respondeu no WhatsApp'} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-tinta-3 hidden sm:block">
            {modo === 'enviar' ? <>{texto.includes('{vendedor}') && <>{'{vendedor}'} vira {eu!.nome.split(' ')[0]} · </>}<span className="tecla">Ctrl Enter</span> envia</> : 'Fica no histórico e move o lead para Respondeu.'}
          </span>
          {modo === 'enviar'
            ? <button className="btn-wa ml-auto" onClick={confirmar} disabled={!lead.whatsapp && !lead.telefone}><MessageCircle size={15} /> Abrir no WhatsApp</button>
            : <button className="btn-pri ml-auto" onClick={confirmar} disabled={!texto.trim()}>Registrar</button>}
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
