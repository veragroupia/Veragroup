# Vera Group · site oficial

Site da Vera Group, agência de sites, lojas, sistemas e marketing para o comércio de Itu, Salto, Sorocaba e Indaiatuba.

Tem dois usos:

1. **Site público** no Google, que leva o contato para o WhatsApp.
2. **Ferramenta de visita:** o modo `/apresentacao` roda em tela cheia no celular ou tablet, dentro da loja do cliente, e funciona sem internet.

Feito em **Astro** (páginas estáticas) + **TypeScript** + **Tailwind CSS v4**. Sem framework de JavaScript no navegador: a home manda cerca de 5 KB de JS.

## Como rodar

Precisa de Node 22 ou mais novo.

```bash
npm install
npm run dev              # desenvolvimento em http://localhost:4321
npm run build            # gera o site em dist/
npm run preview          # serve o dist/ em http://localhost:4321
npm run verificar        # checagens automáticas (com o preview rodando)
npm run verificar:fotos  # checagens + screenshots em 390, 768 e 1440 px (pasta screenshots/)
```

`npm run verificar` confere, em todas as páginas:
- rolagem horizontal em 360, 390, 430, 768, 1024, 1280, 1440 e 1920 px;
- um único `h1` e títulos sem pular nível;
- title, description, canonical, hreflang, og:image e JSON-LD;
- links de WhatsApp;
- alvos de toque de 44 px;
- parágrafos de no máximo 3 linhas no celular;
- acessibilidade com axe-core (WCAG 2.1 AA);
- erros no console.

## Onde fica cada coisa

| O que | Onde |
|---|---|
| WhatsApp, Instagram, e-mail, CNPJ, cidades, sócios | `src/config/site.ts` |
| Cores, fontes, espaços, raios, sombras, animação | `src/styles/tokens.css` (veja em `/design-system`) |
| Serviços (texto, SEO, FAQ) | `src/content/servicos/*.md` |
| Cases do portfólio (texto + imagens) | `src/content/portfolio/[case]/` |
| FAQ da home | `src/data/faq.ts` |
| Premissas da calculadora | `src/lib/calc.ts` |
| Seções da home | `src/components/home/` |
| Páginas | `src/pages/` |
| Modo apresentação offline | `src/pages/apresentacao.astro` + `public/sw.js` |
| Imagens de prévia (1200×630) | geradas no build por `src/pages/og/[...slug].png.ts` |

## Como trocar textos

- **Textos de um serviço:** abra o `.md` do serviço em `src/content/servicos/`. O topo do arquivo (entre os `---`) tem título, SEO, dores, entregas e FAQ. O texto abaixo dele aparece na seção "Para quem é".
- **Textos da home:** cada seção é um arquivo em `src/components/home/`.
- **Telefone, Instagram, e-mail:** só em `src/config/site.ts`. O site inteiro se atualiza.
- **Regra da casa:** frases curtas, sem jargão, no máximo 3 linhas por parágrafo no celular. O `npm run verificar` avisa se algum passar disso.
- **Parágrafos no FAQ:** separe com uma linha em branco (`\n\n`). Cada um vira um parágrafo curto.

## Como adicionar um case novo

1. Crie a pasta `src/content/portfolio/nome-do-case/`.
2. Coloque as telas reais nela (`.webp`, `.png` ou `.jpg`). O ideal:
   - uma tela de celular em 390 × 844 (ou o dobro);
   - uma tela de computador em 1440 × 900.
3. Copie o `index.md` de um case existente e ajuste os campos:
   - `slug`: o endereço (`/portfolio/slug`);
   - `ordem`: posição no carrossel;
   - `status`: `no-ar` ou `em-desenvolvimento`;
   - `tema`: `escuro` ou `claro` (cor do topo da página);
   - `capa.desktop` e `capa.mobile`: caminhos das imagens, começando com `./`;
   - `problema`, `oQueFizemos`, `resultado`: o texto do case;
   - `galeria`: as telas, cada uma com `tipo` (`celular`, `desktop` ou `foto`) e `alt` (descrição da imagem);
   - `depoimento`: só se for real e autorizado.
4. Rode `npm run build`. O case entra sozinho na home, no `/portfolio`, no sitemap, no `llms.txt`, na apresentação e ganha a imagem de prévia.

Sem imagem ainda? Deixe `capa` e `imagem` de fora. O site mostra um espaço neutro marcado como TODO, nunca uma foto que finge ser o projeto.

## Como adicionar um serviço

Copie um `.md` de `src/content/servicos/` com outro nome de arquivo. O nome vira o endereço (`/servicos/nome-do-arquivo`). Os campos obrigatórios são checados no build: se faltar algo, o build avisa qual é.

## Link personalizado de prospecção

A página aceita parâmetros que o Maestro pode usar nas mensagens:

```
https://vera-group.vercel.app/?empresa=Clínica%20Sorriso&nicho=dentista&cidade=Itu
```

Com eles:
- o topo mostra "Preparado para Clínica Sorriso";
- a pesquisa de exemplo vira "dentista em Itu";
- a calculadora já escolhe o segmento;
- o formulário vem preenchido;
- toda mensagem de WhatsApp cita a empresa.

Vale também para `/apresentacao?empresa=...` nas visitas.

## Modo apresentação (visitas)

`/apresentacao` fica fora do menu e fora do Google. Abra uma vez com internet (aparece "Pronto para usar sem internet"). Depois disso ele abre mesmo sem sinal. Para atualizar, basta abrir com internet: a versão nova é baixada em segundo plano.

## Deploy

O projeto `vera-group` na Vercel está ligado a este repositório. O `vercel.json` define o build do Astro (`npm run build`, pasta `dist`), cache longo para arquivos com hash e cabeçalhos de segurança.

Variável opcional: `PUBLIC_FORM_WEBHOOK` (veja `.env.example`).

## Documentos

- [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md): o que depende da Vera Group (fotos, textos, dados).
- [`docs/CHECKLIST.md`](docs/CHECKLIST.md): verificação final.
- [`docs/lighthouse/`](docs/lighthouse/): relatório Lighthouse mobile e desktop.
- [`docs/DIAGNOSTICO.md`](docs/DIAGNOSTICO.md): o raciocínio da primeira versão do site.

## Licenças

Fontes Sora e Inter: SIL Open Font License (`src/assets/fonts/`). three.js: MIT (`public/vendor/THREE-LICENSE.txt`). Ícones: Lucide (ISC) e Simple Icons (CC0).
