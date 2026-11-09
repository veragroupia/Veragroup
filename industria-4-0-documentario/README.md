# Indústria 4.0 — minidocumentário (Remotion)

Trabalho escolar de Tecnologia sobre a Indústria 4.0, seus impactos, desafios e o papel do CNPEM.
Vídeo de cerca de 5 minutos, 1920 × 1080, 30 fps, H.264, em português, em cinco capítulos:

| Capítulo | Narrador | Tema | Cenas |
|---|---|---|---|
| 01 | Davi Marques | Introdução e revoluções industriais | 01 abertura · 02 linha do tempo · 03 a conexão |
| 02 | Alaf Rocha | Principais tecnologias | 04 IoT · 05 IA · 06 robótica, Big Data e 3D · 07 aplicação prática |
| 03 | Otávio Barbieri | Benefícios e impactos | 08 eficiência · 09 qualidade e segurança · 10 personalização · 11 Brasil |
| 04 | Pedro Henrique | Desafios | 12 custos · 13 trabalho · 14 segurança digital · 15 inclusão |
| 05 | João Miguel | CNPEM e conclusão | 16 CNPEM · 17 ciência · 18 Sirius · 19 aplicações · 20 encerramento e créditos |

## Situação atual

- **Parte visual pronta**: as 20 cenas, a trilha e os efeitos sonoros. Tudo é original e foi feito para este projeto.
- **Prévia sem narração**: `out/previa-sem-narracao.mp4`. Os tempos são **estimados** pelo tamanho de cada frase. As legendas aparecem nesses tempos estimados só para ajudar a revisar.
- **Vozes**: as cinco gravações já foram recebidas, preparadas e alinhadas (veja "Estado das vozes" abaixo). Nenhuma voz artificial é usada. Os WAVs **não vão para o Git** (`.gitignore`); sem eles o vídeo sai sem voz, com os mesmos tempos.

## Requisitos

- Node.js 18 ou mais novo (testado com o 22), npm e **ffmpeg** no PATH.
- Para sincronizar as vozes: Python 3.9 ou mais novo e `pip install faster-whisper`. É gratuito e roda no próprio computador.

```bash
cd industria-4-0-documentario
npm install
npm run dev          # abre o Remotion Studio (prévia interativa no navegador)
npm run previa       # renderiza out/previa-sem-narracao.mp4
npm run render       # renderiza out/industria-4-0.mp4 (versão final)
npm run lint         # checagem de tipos (TypeScript)
```

Se o Remotion não conseguir baixar o próprio navegador, aponte para um Chrome ou Chromium instalado:
`REMOTION_CHROME=/caminho/do/chrome npm run previa`.

## Como colocar as vozes reais

1. Coloque os arquivos recebidos pelo celular em `public/audio/vozes/originais/`. Servem M4A, MP3, WAV, AAC, OGG, OPUS ou MP4. Comece o nome pelo número do capítulo ou pelo nome do narrador, por exemplo `01-davi.m4a`, `02 alaf.mp3` ou `joao.ogg`.
2. Prepare os áudios:
   ```bash
   node scripts/preparar-vozes.mjs
   ```
   Para cada capítulo, o script:
   - verifica se o arquivo abre inteiro e mede a duração;
   - tira **só** o silêncio excessivo do começo e do fim, deixando uma margem para não cortar palavras;
   - aplica um tratamento leve: graves, redução de ruído, presença e volume;
   - grava os arquivos obrigatórios `public/audio/vozes/01-davi.wav`, `02-alaf.wav`, `03-otavio.wav`, `04-pedro.wav` e `05-joao.wav`.

   **A velocidade da voz não muda.** Use `--sem-tratamento` se o filtro de ruído deixar a voz estranha, ou `--so-nivelar` quando as gravações já chegaram tratadas (apara as pontas e iguala o volume, sem mexer em ruído nem equalização).

   Falas que não fazem parte do roteiro (um título falado antes do texto, uma frase repetida no fim) saem com um recorte manual em `public/audio/vozes/originais/recortes.json`, em segundos do arquivo original: `{ "02": { "inicio": 2.75 }, "05": { "fim": 56.3 } }`. O original nunca é alterado.
3. Sincronize as frases com a voz:
   ```bash
   python3 scripts/alinhar.py            # ou --modelo medium, mais preciso e mais lento
   ```
   O script reconhece cada palavra falada e compara com o roteiro. Depois grava os tempos reais em `src/data/tempos.json` e um relatório em `out/relatorio-alinhamento.txt`. Frases com pouco reconhecimento saem marcadas como **REVISAR**.
4. Revise no Studio (`npm run dev`). As frases marcadas como REVISAR, e qualquer momento que pareça fora do lugar, podem ser corrigidos em `src/data/ajustes-manuais.json`, em segundos contados a partir do começo da gravação daquele capítulo. Depois rode o `alinhar.py` de novo.
5. Gere as legendas e renderize:
   ```bash
   npm run legendas     # out/industria-4-0.srt, com o texto real falado
   npm run render
   ```

**Sem o faster-whisper?** `python3 scripts/alinhar-por-pausas.py` alinha por frase usando as pausas da fala. Com `MODELO_SHERPA=<pasta do modelo> ... --verificar` ele também confere cada trecho com reconhecimento de fala (sherpa-onnx + Whisper, baixado de https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models) e ajusta as fronteiras que caírem fora do lugar. Não gera tempo de palavra: dentro de uma frase, os destaques são proporcionais ao texto. O relatório mostra, frase a frase, o que foi ouvido.

**Sem Python?** `node scripts/estimar-tempos.mjs --proporcional` usa a duração real de cada gravação e espalha as frases de forma proporcional. É só aproximado: todas as frases ficam para revisão manual. Saber a duração do arquivo não garante que a fala esteja sincronizada.

### Como a sincronização funciona

Nenhuma cena tem duração fixa. `src/data/linhaDoTempo.ts` calcula a linha do tempo inteira a partir dos tempos de cada frase:

- cada cena (`src/data/cenas.ts`) cobre um grupo de frases e começa quando a primeira delas é dita;
- dentro da cena, os títulos e os passos de cada diagrama são presos a **trechos da fala**. Por exemplo, `t(2, 'Indústria 4.0')` é o momento em que essa expressão é dita na frase 2. Com o áudio alinhado, esse momento vem do tempo exato da palavra;
- os efeitos sonoros (`src/data/efeitos.ts`) também são presos a trechos da fala;
- a trilha abaixa sozinha enquanto alguém fala.

Assim, quando as gravações mudam, o vídeo inteiro se ajusta. A animação acompanha a voz, e não o contrário.

## Estado das vozes

| Capítulo | Arquivo recebido | Observação |
|---|---|---|
| 01 Davi | `Industria_4_0_Voz_Limpa.wav` | |
| 02 Alaf | `Industria_4_0_Narracao_Limpa.mp3` | começa com um título falado ("Tecnologias da Indústria 4.0"), cortado: `inicio: 2.75` |
| 03 Otávio | `Industria_4_0_audio_tratado.wav` | o `.mp3` com o mesmo nome é o mesmo áudio; foi usado o WAV |
| 04 Pedro | `industria_4_0_desafios_audio_01.mp3` | pico acima de 0 dBFS no MP3; o nivelamento corrige |
| 05 João | `Audio_CNPEm_Voz_Tratada_48kHz.wav` | termina com uma fala extra depois de "educação" ("Orientação. O CNPEM."), cortada: `fim: 56.3` |

Os cinco foram aparados e nivelados com `--so-nivelar` (todos entre −16,1 e −16,7 LUFS). O alinhamento está em `src/data/tempos.json`, e o relatório frase a frase em `out/relatorio-alinhamento.txt`.

## Como colocar imagens e vídeos reais

Cada cena tem um "espaço de mídia". Se existir um arquivo com o nome certo em `public/media/`, a cena usa a mídia real em tela cheia, com movimento de câmera lento, e mantém títulos e textos. Se não existir, a cena mostra a ilustração original, marcada como "Ilustração". Formatos aceitos: `.mp4`, `.webm`, `.mov`, `.jpg`, `.png` e `.webp`. A proporção é preservada, nada é esticado.

| Arquivo (sem extensão) | Cena |
|---|---|
| `fabricas/abertura` | 01 fábrica automatizada com braços robóticos |
| `fabricas/historia-1-vapor`, `historia-2-eletricidade`, `historia-3-automacao`, `tecnologias/historia-4-conectada` | 02 fotos históricas (aparecem nos cartões da linha do tempo) |
| `fabricas/fabrica-inteligente` | 03 fábrica moderna |
| `tecnologias/maquinas-conectadas` | 04 máquinas industriais |
| `fabricas/bracos-roboticos`, `tecnologias/impressao-3d` | 06 |
| `fabricas/linha-automoveis` | 07 |
| `fabricas/linha-producao` | 08 |
| `tecnologias/inspecao-automatizada`, `fabricas/seguranca-trabalho` | 09 |
| `tecnologias/personalizacao` | 10 |
| `brasil/industria-brasileira` | 11 |
| `brasil/pequena-industria` | 12 |
| `fabricas/trabalhadores` | 13 |
| `tecnologias/servidores-rede` | 14 |
| `brasil/ambientes-industriais` | 15 |
| `cnpem/campus` | 16 campus do CNPEM (o mapa vira um detalhe no canto) |
| `cnpem/laboratorio` | 17 |
| `cnpem/sirius` | 18 foto do Sirius antes do esquema animado |
| `fabricas/encerramento-robos`, `tecnologias/encerramento-sensores`, `cnpem/encerramento-pessoas`, `cnpem/encerramento-sirius`, `fabricas/encerramento-fabrica` | 20 montagem final |

Depois de copiar os arquivos, rode `npm run midias`. O comando já roda sozinho antes de `previa` e `render`. **Registre cada arquivo em `CREDITOS_FONTES.md`**, com a fonte e a licença, antes de usá-lo. Fotos do CNPEM e do Sirius só podem entrar com autorização ou licença que permita o uso. Imagens geradas por IA não podem aparecer como registro real.

## Estrutura

```
src/
  index.ts, Root.tsx            registro das composições (Documentario e DocumentarioSemLegendas)
  compositions/Documentario.tsx montagem: cenas, transição única, identificação dos capítulos, legendas, áudio
  compositions/Audio.tsx        narração, trilha com abaixamento automático e efeitos
  compositions/cenas/           Capitulo01.tsx … Capitulo05.tsx (cenas 01–20)
  components/                   fundo, câmera virtual e parallax, títulos com máscara, fluxos de dados,
                                braço robótico, fábrica, equipamentos, esquema do Sirius, ícones, legendas, mídia
  animations/movimento.ts       curvas de aceleração e desaceleração (as mesmas no filme inteiro)
  data/roteiro.json             texto exato de cada capítulo, dividido em frases
  data/tempos.json              tempos das frases (estimados ou alinhados com a voz)
  data/cenas.ts                 qual grupo de frases cada cena cobre
  data/efeitos.ts               efeitos sonoros presos a trechos da fala
  data/linhaDoTempo.ts          cálculo da linha do tempo
  data/legendas.ts              divisão das legendas e geração do .srt
  data/mapa-brasil.json         contorno do Brasil (Natural Earth, domínio público)
  styles/tema.ts                paleta, tipografia (Inter local) e hierarquia
scripts/
  preparar-vozes.mjs            conversão e tratamento das gravações (ffmpeg)
  alinhar.py                    alinhamento palavra a palavra (faster-whisper)
  alinhar-por-pausas.py         alinhamento por frase (pausas + verificação opcional com sherpa-onnx)
  estimar-tempos.mjs            tempos estimados (prévia) ou proporcionais
  gerar-srt.mjs                 legendas .srt
  gerar-trilha.mjs              trilha e efeitos originais, sintetizados (regera public/audio/musica e efeitos)
  gerar-mapa.mjs                regera o contorno do Brasil
  indexar-midias.mjs            detecta as mídias reais em public/media
public/
  media/{fabricas,tecnologias,brasil,cnpem}/   mídias reais (opcionais)
  audio/vozes/                  narrações (originais/ recebe os arquivos do celular)
  audio/musica/, audio/efeitos/ trilha e efeitos originais
  fonts/                        Inter (SIL Open Font License)
out/                            vídeos, legendas e relatórios gerados
```

## Licença do Remotion

O Remotion é gratuito para pessoas físicas, equipes pequenas e organizações sem fins lucrativos. Um trabalho escolar se enquadra nesses casos. Confira os termos atuais em https://www.remotion.dev/license.
