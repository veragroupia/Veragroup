# Créditos, fontes e licenças

Este arquivo registra a origem de **tudo** o que aparece ou se ouve no vídeo. Antes de colocar qualquer mídia nova em `public/media/` ou `public/audio/`, adicione uma linha aqui com a fonte, o autor, a licença e o link.

## Situação desta versão

Nesta versão, **nenhuma foto, vídeo ou música de terceiros foi usada**. O ambiente em que o projeto foi produzido não tinha acesso aos acervos de mídia (Wikimedia Commons, site do CNPEM e bancos de vídeo). Por isso, e seguindo a orientação do projeto, toda mídia que não pôde ser obtida legalmente foi trocada por animações explicativas originais. Elas aparecem marcadas na tela como **"Ilustração"** ou **"Ilustração esquemática — fora de escala"**.

## Material original deste projeto

| Item | Autoria | Observação |
|---|---|---|
| Todas as ilustrações e animações (fábrica, braços robóticos, linha do tempo, diagramas, esquema do Sirius, ícones) | Produzidas para este trabalho em React/SVG com o Remotion | Nenhuma ilustração foi apresentada como fotografia documental |
| Trilha sonora (`public/audio/musica/trilha-*.mp3`) | Sintetizada por `scripts/gerar-trilha.mjs` | Composição original, sem amostras de terceiros e sem vocais |
| Efeitos sonoros (`public/audio/efeitos/*.wav`) | Sintetizados por `scripts/gerar-trilha.mjs` | Originais |
| Gráfico de vibração (cena 05) | Ilustração | Marcado na tela como "Simulação ilustrativa — não são dados reais" |

## Recursos de terceiros

| Item | Fonte | Licença |
|---|---|---|
| Fonte tipográfica Inter | The Inter Project Authors, via pacote npm `@fontsource/inter` (arquivos em `public/fonts/`) | SIL Open Font License 1.1 |
| Contorno do Brasil e países vizinhos (cenas 11 e 16) | Natural Earth, escala 1:50m, via pacote npm `world-atlas` (`scripts/gerar-mapa.mjs`) | Domínio público |
| Remotion (biblioteca de vídeo) | remotion.dev | Licença do Remotion: gratuita para pessoas físicas e organizações sem fins lucrativos |

## Conteúdo científico: referências consultadas para os textos na tela

- O CNPEM (Centro Nacional de Pesquisa em Energia e Materiais) fica em Campinas, SP. Fonte oficial: https://cnpem.br
- O Sirius é a fonte de luz síncrotron operada pelo CNPEM, por meio do Laboratório Nacional de Luz Síncrotron (LNLS). Fonte oficial: https://lnls.cnpem.br/sirius/
- Esquema da cena 18, simplificado e fora de escala: elétrons acelerados no acelerador linear e no acelerador injetor (booster) circulam no anel de armazenamento. Quando ímãs curvam a trajetória deles, emitem luz síncrotron. Essa luz segue pelas linhas de luz até as estações experimentais, onde ilumina as amostras. É o princípio geral de qualquer fonte de luz síncrotron. Nenhum número técnico do Sirius aparece na tela.
- Aplicações (cena 19): aparecem como **possíveis** aplicações da pesquisa, como diz a narração. O vídeo não afirma que algum medicamento ou produto específico foi desenvolvido pelo CNPEM.
- Linha do tempo (cena 02): os períodos aparecem por século (fim do séc. XVIII, fim do séc. XIX, meados do séc. XX e séc. XXI), sem datas exatas que possam ser contestadas.
- O vídeo não traz percentuais de economia ou produtividade, preços nem estatísticas.

## Mídias reais (preencher ao adicionar)

Fontes recomendadas, sempre conferindo a licença de **cada arquivo**:

- Wikimedia Commons (commons.wikimedia.org): fotos históricas em domínio público ou licença Creative Commons. Copie o autor e a licença da própria página do arquivo.
- Acervo e imprensa do CNPEM (cnpem.br): use fotos do campus e do Sirius **só com autorização** ou dentro das condições que o próprio CNPEM informar.
- Bancos com licença de uso gratuito (por exemplo Pexels e Pixabay): confira os termos atuais de cada site e guarde o link do arquivo.

| Arquivo em `public/media/` | Descrição | Autor | Fonte (link) | Licença | Atribuição exigida |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## Narração

| Capítulo | Narrador | Arquivo |
|---|---|---|
| 01 | Davi Marques | `public/audio/vozes/01-davi.wav` |
| 02 | Alaf Rocha | `public/audio/vozes/02-alaf.wav` |
| 03 | Otávio Barbieri | `public/audio/vozes/03-otavio.wav` |
| 04 | Pedro Henrique | `public/audio/vozes/04-pedro.wav` |
| 05 | João Miguel | `public/audio/vozes/05-joao.wav` |

Vozes reais dos integrantes. Nenhuma voz artificial foi usada.
