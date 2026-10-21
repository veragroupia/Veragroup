# Vera Prospect

Painel comercial da Vera Group. Mesma identidade do site (papel, tinta, vermelho de sinal; Archivo e Plex Mono) e o mesmo banco Supabase `vera-prospect` de antes: nenhuma tabela, gatilho ou função mudou.

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

## Desempenho

O código antigo era um arquivo único de 540 KB. Agora cada tela carrega só quando é aberta, as fontes vêm do próprio site (sem Google Fonts) e as consultas ficam em cache e só são refeitas quando o banco avisa que algo mudou.

## Rodar

```bash
cp .env.example .env   # preencha VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`npm run build` checa os tipos e gera `dist/`.

## Publicar na Vercel

O projeto `vera-prospect` hoje recebe deploy direto da máquina (sem Git). Para usar este código:

1. Na Vercel, abra o projeto `vera-prospect` › Settings › Git e conecte o repositório `veragroupia/Veragroup`.
2. Em Settings › General, defina **Root Directory** como `prospect` (framework Vite).
3. Em Settings › Environment Variables, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Ou, pela linha de comando, dentro de `prospect/`: `vercel --prod`.

O `vercel.json` cuida das rotas (qualquer endereço abre o app) e do cache dos arquivos.
