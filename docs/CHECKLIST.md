# Checklist de verificação final

Conferido em 30/09/2026 sobre o build de produção. Para repetir: `npm run build && npm run preview` e, em outro terminal, `npm run verificar`.

## Pedidos do briefing

- [x] **Links de WhatsApp testados.** 157 links `wa.me` em 21 páginas, todos com o número 55 11 94072-3507 e mensagem preenchida. São 28 mensagens diferentes, conforme a página e o serviço.
  - O formulário de contato foi testado no navegador: valida os campos, ignora robôs (honeypot) e abre o WhatsApp com a mensagem montada.
  - A calculadora foi testada: o botão leva todos os dados preenchidos.
  - O link personalizado (`?empresa=&nicho=&cidade=`) foi testado: a empresa entra nas mensagens.
- [x] **Nenhuma rolagem horizontal** nas 21 páginas, em 360, 390, 430, 768, 1024, 1280, 1440 e 1920 px.
- [x] **Nenhum texto inventado.**
  - Sem depoimentos, prêmios, logos de terceiros ou porcentagem de resultado.
  - Todo número visível tem origem:
    - briefing: 10 dias, 60 dias;
    - trabalho real: 8 etapas e 11 telas da ERK, 106 e 31 fotos da Vó Neis;
    - medição: 170 KB do 3D, escala do mapa;
    - exemplo marcado como exemplo: valores da calculadora.
  - Onde falta dado, há um TODO no código (lista em `docs/PENDENCIAS.md`).
- [x] **Todas as páginas com metadados:**
  - title único (até 62 caracteres) e description única (70 a 160);
  - canonical, hreflang pt-BR;
  - Open Graph e Twitter Card com imagem 1200×630 gerada para cada página;
  - JSON-LD válido.
- [x] **Modo apresentação funcionando offline.** Testado com o aparelho desconectado:
  - a página abre e as 8 telas navegam;
  - as fontes e as imagens aparecem, inclusive girando o aparelho depois de sem internet;
  - também abre com `?empresa=` no endereço.

## SEO

- [x] Um único `h1` por página e títulos sem pular nível.
- [x] JSON-LD:
  - Organization em todas as páginas;
  - ProfessionalService (LocalBusiness) com as 4 cidades em `areaServed`;
  - Service em cada serviço;
  - CreativeWork em cada case;
  - FAQPage na home e nos serviços;
  - BreadcrumbList nas páginas internas.
- [x] `sitemap-index.xml` com 18 páginas. Ficam de fora `/apresentacao`, `/design-system` e `/404`.
- [x] `robots.txt` apontando para o sitemap.
- [x] `llms.txt` com a empresa, os serviços e os cases.
- [x] Páginas estáticas: todo o conteúdo já está no HTML, sem depender de JavaScript.
- [x] SEO local: cada serviço tem uma cidade principal no título e as 4 cidades no texto e no schema.

## Performance

- [x] Lighthouse mobile nas páginas indexáveis: Performance 99 a 100, Acessibilidade 100, Boas práticas 100, SEO 100. Detalhes em `docs/lighthouse/`.
- [x] LCP de 1,7 a 2,1 s no mobile (4G lento emulado). CLS 0.
- [x] JavaScript da home: cerca de 5 KB com gzip. O 3D da ERK (170 KB) só baixa quando a pessoa toca no botão.
- [x] Imagens em AVIF com fallback WebP, `srcset`, largura e altura declaradas, lazy abaixo da dobra.
- [x] Fontes no próprio site (woff2 latin), pré-carregadas, com fallback métrico.

## Acessibilidade (WCAG 2.1 AA)

- [x] axe-core sem violações:
  - nas 21 páginas em 390 px;
  - nas páginas principais em 768 e 1280 px, com as animações ligadas.
- [x] Navegação completa por teclado, com foco visível. Link "Pular para o conteúdo". O menu mobile prende o foco.
- [x] Pares de cor com contraste AA documentados em `/design-system`.
- [x] Alvos de toque de no mínimo 44 × 44 px.
- [x] `alt` em todas as imagens e `label` em todos os campos.
- [x] `prefers-reduced-motion`: animações viram trocas instantâneas, e o hero e a NFC começam parados.
- [x] Troca automática do hero com botão de pausa (WCAG 2.2.2).

## LGPD

- [x] Banner de cookies com Aceitar e Recusar, e "Preferências de cookies" no rodapé.
- [x] Analytics (Vercel Web Analytics) só carrega depois do "Aceitar".
- [x] Política de privacidade em `/politica-de-privacidade`.
- [x] O formulário diz para onde os dados vão (WhatsApp) e aponta para a política.

## Deploy

- [x] Build de preview na Vercel concluído com sucesso (status "Vercel: Deployment has completed" no PR).
- [ ] Troca do site em produção: depende da aprovação e do merge do PR.
