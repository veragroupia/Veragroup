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

## Inteligência comercial (V4)

Aba **Inteligência** na página do lead. Ela substitui a antiga "Mensagem IA". Cada lead recebe:

- temperatura (frio, morno, quente) por evidência;
- interesse e adequação de 0 a 100, separados;
- confiança da análise;
- situação do contato;
- a próxima ação, que pode ser "aguardar";
- o melhor horário, com o nível de certeza;
- quando faz sentido escrever, duas opções de mensagem: A (conversa natural) e B (abordagem estratégica).

**Onde está cada coisa**

- `supabase/functions/_shared/inteligencia/`: as regras, em TypeScript puro, usadas pelo painel e pela função.
  - `pontuacao.ts`: pesos, temperatura e confiança.
  - `decisao.ts`: próxima ação.
  - `horario.ts`: melhor momento.
  - `conversa.ts`: leitura da conversa, pedidos para parar e datas combinadas.
  - `validade.ts`: quando uma sugestão fica velha.
  - `contrato.ts`: validação Zod da resposta da IA.
  - `prompts.ts`: instruções versionadas (`vera-sales-v4`).
  - `motor.ts`: junta regras e IA.
- `supabase/functions/mensagem/`: a função faz duas chamadas.
  1. Análise: classifica sinais com o id da mensagem que prova cada um. Ela é reaproveitada enquanto a conversa não muda.
  2. Redação: só roda quando as regras permitem uma mensagem.
- `src/lib/inteligencia.ts`: leitura das tabelas e ajustes manuais (temperatura, retorno combinado, não contatar).
- `src/components/lead/Inteligencia.tsx`: o painel do lead.
- `src/components/ConfigInteligencia.tsx`: estilo, catálogo, pesos e lista de "não contatar" (Configurações › Inteligência).
- `src/lib/metricas.ts`: as contas da tela Métricas.

**Envio confirmado.** Abrir o WhatsApp não conta mais como envio. Fica um registro em `envios` e o painel pergunta "Você enviou a mensagem?". Só o "Enviei" grava a mensagem como enviada e cria o follow-up. Mensagens antigas ficam como "envio não confirmado" e não entram nas taxas.

**Não contatar.** Vale por telefone e pelo cadastro do Google. Um lead reimportado já entra descartado.

**Banco.** `supabase/migrations/0004_inteligencia_comercial.sql` só adiciona coisas: tabelas e colunas novas. Nada é apagado. O fim do arquivo tem o rollback comentado. Sem a migration, o painel continua funcionando só com as regras.

**Ativar em produção** (nesta ordem):

1. Aplicar a migration 0004.
2. Publicar a função `mensagem`. A pasta `_shared` precisa ir junto, e o `deno.json` resolve o `zod`. Comando: `supabase functions deploy mensagem`.
3. Publicar o painel.

**Testes.** `npm test` roda os cenários com Vitest: temperatura, decisão, horário, contrato da IA, Hoje, métricas e envio confirmado.

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
