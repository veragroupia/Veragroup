# Vera Group Manager

Centro de gestão da Vera Group (antes Vera Prospect): prospecção, propostas, clientes, projetos e financeiro. Mesma identidade do site (papel, tinta, vermelho de sinal; Archivo e Plex Mono) e o mesmo banco Supabase `vera-prospect` de antes: nenhuma tabela, gatilho ou função mudou.

## O que mudou no uso

- **Hoje é uma fila de trabalho.** Uma lista só, já na ordem certa: quem respondeu e espera retorno, reuniões do dia, follow-ups vencidos e os melhores leads novos do radar. Cada linha tem o botão de WhatsApp com a mensagem pronta (sugestão da IA, mensagem do follow-up ou a primeira mensagem do radar).
- **Modo sequência.** "Começar sequência" abre um lead por vez. `Enter` abre o WhatsApp e passa para o próximo, `→` pula (ou adia o follow-up 1 dia), `←` volta, `D` descarta. Dá para fazer 15 contatos sem tirar a mão do teclado.
- **Placar do dia** com meta de contatos ajustável.
- **Busca em qualquer tela:** `Ctrl K` (ou `/`) acha lead por nome ou telefone. `1` a `5` trocam de tela.
- **Funil** com arrastar e soltar, botão de avançar etapa, filtro Meus/Todos, dias parado na etapa e valor mensal por coluna.
- **Leads** com filtros que ficam no endereço (dá para mandar o link filtrado), ordenação, seleção em massa (atribuir, mudar etapa, descartar), cadastro manual e exportação CSV.
- **Página do lead**: etapas clicáveis no topo, conversa em balões, enviar ou registrar resposta, importar o .txt exportado do WhatsApp, avaliação da IA pelo Método Vera (Dor, Perda, Potencial, Solução), reuniões com upload de áudio e transcrição, histórico e observações que salvam sozinhas.
- Fechar pede plano e valores; perder pede o motivo. Isso alimenta Métricas.
- **Métricas**: contatos por dia, taxa de resposta, funil, desempenho por vendedor, resposta por nicho e por cidade (para calibrar o radar), motivos de perda e execuções do radar.
- Tempo real: mensagens, leads e follow-ups atualizam sozinhos. Tema claro e escuro. Celular com barra inferior.

## Gestão

- **Propostas**: monta com os pacotes da tabela do site, copia para o WhatsApp, imprime em PDF com espaço para assinatura e guarda o link do contrato. Ao marcar como aceita, o painel cria o cliente (a partir do lead, se for o caso), o projeto com o checklist do pacote, a cobrança do setup e a mensalidade recorrente, e leva o lead para "fechado".
- **Clientes**: ficha com dados, projetos, cobranças, mensalidades, propostas e o lead de origem.
- **Projetos**: quadro por etapa (briefing, layout, desenvolvimento, revisão, no ar, manutenção), com prazo, checklist, responsável e links de prévia e produção.
- **Financeiro**: visão do mês (recebido, pago, lucro, a receber e atrasado), lançamentos com "recebi" e "paguei" num toque, mensalidades e despesas fixas que geram o lançamento de cada mês sozinhas (`gerar_lancamentos_mes`) e divisão do lucro entre sócios com retiradas.
- A tela Hoje avisa cobrança vencendo, conta a pagar e projeto perto do prazo.

As tabelas ficam em `supabase/migrations/0002_gestao.sql`. Nenhuma tabela da prospecção foi alterada.

## Inteligência comercial (V5)

Ao abrir um lead, o painel responde: **qual é a melhor coisa a fazer agora?** A resposta pode ser:
- perguntar;
- responder o preço;
- apresentar a solução;
- enviar a proposta;
- aguardar;
- encerrar.

Quando faz sentido escrever, o rascunho aparece pronto na aba **Inteligência**. **Nada é enviado sozinho.**

**Como funciona (cinco etapas)**
1. **Compreender.** As regras leem a conversa: quem falou por último, o que ficou pendente, retornos combinados e frases como "não preciso agora" ou "já tenho, mas quero melhorar".
2. **Qualificar.** A IA classifica sinais, sempre citando a mensagem **do cliente** que prova cada um. Ela também atualiza a **memória do lead**:
   - o que já foi respondido;
   - necessidades e objeções;
   - compromissos;
   - ofertas já feitas;
   - o que se sabe de situação, problema, impacto e valor (SPIN) e de desafio, quem decide, condições e prioridade (CHAMP).
3. **Decidir.** As regras definem a temperatura (frio, interesse desconhecido, morno, quente), a ação e o melhor horário. Também decidem se ainda é hora de descobrir ou já é **hora de vender**, se cabe uma pergunta e sobre o quê. Intenção antiga ou desmentida depois não conta.
4. **Comunicar.** A IA escreve até duas opções diferentes (A natural, B estratégica) dentro dessas diretrizes. Cada opção passa por uma **checagem objetiva**:
   - preço fora do catálogo;
   - elogio ou "vi seu site" sem verificação;
   - pergunta repetida;
   - pedido de preço ignorado;
   - jargão e tamanho.

   Problema grave deixa o rascunho em "revisar".
5. **Aprender.**
   - Só contam envios confirmados e respostas reais.
   - Respostas negativas não contam como sucesso.
   - A taxa de resposta por segmento ajusta a ordem do primeiro contato quando há 5 casos ou mais.
   - A equipe marca cada sugestão como boa ou ruim.

**No painel**
- **Lead:** o rascunho é preparado sozinho ao abrir um lead elegível, uma vez por contexto: não gera de novo a cada visita. A edição é salva sem apagar o texto gerado, e dá para aprovar, copiar, regenerar e abrir no WhatsApp. A memória do lead pode ser corrigida pela equipe:
  - confirmar uma hipótese;
  - marcar um item como errado;
  - adicionar um fato;
  - informar o horário de funcionamento.
- **Hoje:** a fila usa a mesma decisão do lead e mostra a situação da mensagem de cada item. **Preparar mensagens** faz o lote, até 20 por vez, dois em paralelo, e para se a IA estiver fora. Na sequência, quando ainda não há rascunho, use **G** (Preparar com IA).
- **Textos antigos** (mensagem do radar, follow-up fixo, sugestão da avaliação antiga) não aparecem mais como mensagem atual.
- **Abrir o WhatsApp não é envio.** Só o "Enviei" grava a mensagem. Sem a tabela de envios, nada é registrado sozinho.
- **Sem as variáveis de ambiente**, o app mostra o que configurar, em vez de tela branca.

**Onde está cada coisa** (`supabase/functions/_shared/inteligencia/`, usado pelo painel e pela função)
- `conversa.ts`: leitura e interpretação das falas.
- `pontuacao.ts`: pesos, recência e temperatura.
- `decisao.ts`: próxima ação.
- `diretrizes.ts`: descobrir ou vender, e qual pergunta.
- `memoria.ts`: memória do lead com as correções da equipe.
- `horario.ts`: melhor momento.
- `qualidade.ts`: checagem das mensagens.
- `contrato.ts`: validação Zod e de evidências.
- `prompts.ts`: instruções `vera-sales-v5`.
- `motor.ts`: junta regras e IA.
- `validade.ts`: hash do contexto.

A função fica em `supabase/functions/mensagem/` (modos `analisar`, `gerar` e `preparar`). No painel: `src/lib/inteligencia.ts`, `src/lib/lote.ts`, `src/components/lead/Inteligencia.tsx`, `src/pages/Hoje.tsx`.

**Banco.** As migrations `0004_inteligencia_comercial.sql` e `0005_inteligencia_v5.sql` só acrescentam (o rollback está comentado no fim de cada uma). Sem elas, o painel funciona só com as regras.

**Ativar em produção**, nesta ordem:
1. Aplicar as migrations 0004 e 0005.
2. Publicar a função `mensagem` com a pasta `_shared`: `supabase functions deploy mensagem`.
3. Publicar o painel.

**Testes**
- `npm test` roda 103 testes, incluindo os 40 cenários da especificação.
- `ANTHROPIC_API_KEY=... npx vitest run tests/ia-real.test.ts` gera rascunhos com o modelo de verdade para revisão, sem enviar nada.

## Desempenho

O código antigo era um arquivo único de 540 KB. Agora cada tela carrega só quando é aberta, as fontes vêm do próprio site (sem Google Fonts) e as consultas ficam em cache e só são refeitas quando o banco avisa que algo mudou.

## Rodar

```bash
cp .env.example .env   # preencha VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`npm run build` checa os tipos e gera `dist/`. `npm test` roda os testes.

## Publicar na Vercel

O projeto `vera-prospect` hoje recebe deploy direto da máquina (sem Git). Para usar este código:

1. Na Vercel, abra o projeto `vera-prospect` › Settings › Git e conecte o repositório `veragroupia/Veragroup`.
2. Em Settings › General, defina **Root Directory** como `prospect` (framework Vite).
3. Em Settings › Environment Variables, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Ou, pela linha de comando, dentro de `prospect/`: `vercel --prod`.

O `vercel.json` cuida das rotas (qualquer endereço abre o app) e do cache dos arquivos.
