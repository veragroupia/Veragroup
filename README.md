# Vera Group · site portfólio

Site de apresentação e prospecção da Vera Group. Mostra os trabalhos no ar (ERK Pratas e Vó Neis Confeitaria), os sistemas próprios, a tabela de preços e leva a conversa para o WhatsApp.

O raciocínio por trás de cada decisão está em [`docs/DIAGNOSTICO.md`](docs/DIAGNOSTICO.md).

## Como rodar

É um site estático, sem etapa de build. Qualquer servidor serve:

```bash
python3 -m http.server 8080
# ou
npx serve .
```

Abra `http://localhost:8080`.

## Antes de publicar

1. **WhatsApp:** coloque o número comercial em `assets/js/config.js` (`whatsapp: '5511...'`). Sem ele, os botões levam para o formulário, e o formulário abre o WhatsApp para a pessoa escolher o contato.
2. **Vídeos:** rode `sh scripts/baixar-videos.sh` para trazer os dois vídeos do Higgsfield para `assets/video/`. Enquanto isso não acontece, o site usa o endereço do CDN do Higgsfield.
3. **Prévia do link:** com o domínio definido, troque `assets/img/og.jpg` no `<meta property="og:image">` do `index.html` pelo endereço completo (`https://seudominio.com.br/assets/img/og.jpg`). O WhatsApp só mostra a imagem com endereço completo.

## Publicar na Vercel

Importe o repositório como projeto novo, sem framework e sem comando de build. O `vercel.json` já cuida de cache e cabeçalhos.

## Link personalizado para prospecção

A página aceita três parâmetros. O Maestro pode montar esse link em cada mensagem:

```
https://seudominio.com.br/?empresa=Clínica%20Sorriso&nicho=dentista&cidade=Itu
```

O que muda:

- o topo mostra "Preparado para Clínica Sorriso" e a data com a cidade;
- a pesquisa do topo fica fixa em "dentista em Itu";
- no teste, a linha "Seu negócio" vira "Clínica Sorriso";
- o formulário já vem com o nome do negócio e a cidade;
- a mensagem de WhatsApp cita a empresa.

Sem parâmetros, a pesquisa do topo alterna entre os nichos e cidades de `assets/js/config.js`.

## Estrutura

```
index.html                 a página
assets/css/site.css        estilo (papel, tinta, vermelho de sinal)
assets/js/config.js        número de WhatsApp e pesquisas do topo
assets/js/site.js          personalização, teste, prévia, vídeos, 3D, formulário
assets/js/erk-3d.js        visualizador 3D do projeto ERK Pratas
assets/vendor/             three.js (licença MIT em THREE-LICENSE.txt)
assets/fonts/              Archivo e IBM Plex Mono (SIL Open Font License)
assets/img/                telas reais dos projetos, fotos da Vó Neis e og.jpg
assets/video/              vídeos locais (ver scripts/baixar-videos.sh)
tools/og.html              molde da imagem de prévia; gere com node tools/gerar-og.mjs
docs/DIAGNOSTICO.md        diagnóstico e perguntas em aberto
```

## De onde vem cada imagem

- **ERK Pratas:** capturas do site no ar (`site-production-0686.up.railway.app`).
- **Vó Neis:** o cardápio real (código do repositório do cliente) renderizado com os produtos e as fotos da própria loja, porque a versão no ar está temporariamente sem fotos cadastradas.
- **Vídeos:** gerados no Higgsfield. O do topo é luz natural numa parede, sem produto. O da Vó Neis parte da foto real do bolo Chocolatudo.
