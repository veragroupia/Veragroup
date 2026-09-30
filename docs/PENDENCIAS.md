# Pendências (dependem da Vera Group)

Tudo o que está marcado como `TODO` no código, num lugar só. Nada disso impede o site de ir ao ar. Enquanto não chega, o site esconde o campo ou mostra um espaço neutro marcado como TODO.

## Dados da empresa (`src/config/site.ts`)

- [ ] **Nome do fundador**, como deve aparecer (hoje: Alaf Rocha, Davi Paulino e Otávio Barbieri).
- [ ] **Papel de cada sócio** (aparece em `/sobre`).
- [ ] **Fotos reais dos sócios.** Hoje aparecem as iniciais. Colocar em `public/brand/socios/`.
- [ ] **E-mail comercial.** Sem ele, não aparece no rodapé nem no contato.
- [ ] **CNPJ.** Sem ele, não aparece no rodapé nem na política de privacidade.
- [ ] **Cidade-base** (só a cidade). Entra no schema LocalBusiness.
- [ ] **Domínio próprio.** Trocar em `astro.config.mjs` (`SITE`) e em `src/config/site.ts` (`url`).

## Marca

- [ ] **Logo** em `public/brand/logo.svg`. Até lá, o site usa "Vera Group" em texto (Sora), e o favicon é a letra V.

## Portfólio (`src/content/portfolio/`)

- [ ] **Autorização por escrito** da ERK Pratas e da Vó Neis para uso no portfólio.
- [ ] **Números reais de resultado**, se os clientes autorizarem. Hoje o resultado é só qualitativo.
- [ ] **Depoimentos reais**, se houver. O campo `depoimento` do case só aparece se for preenchido.
- [ ] **Link público da Vó Neis:** confirmar se `cardapio-vo-neis.vercel.app` pode aparecer.
- [ ] **Vera Finances:** confirmar o nome ("Vera Finances" ou "vera.finance") e enviar as telas de celular e computador.

## Conteúdo (`src/content/servicos/`)

- [ ] **Escopo de cada serviço:** confirmar as entregas, as dores e as respostas do FAQ dos 8 serviços.
- [ ] **Plaquinha NFC:** foto real do produto e especificações (material, tamanho). Hoje há uma ilustração neutra.

## Calculadora (`src/lib/calc.ts`)

- [ ] **Validar as premissas padrão:** 5 a cada 100 clientes não te acham, 2 a cada 100 pedidos se perdem, 26 dias abertos. São suposições; se a experiência de vocês indicar outros números, trocar em `PREMISSAS`.

## Integrações

- [ ] **Destino do formulário** (opcional): definir `PUBLIC_FORM_WEBHOOK` na Vercel (ex.: webhook do n8n). Sem ele, o formulário abre o WhatsApp com a mensagem pronta.
- [ ] **Vercel Web Analytics:** ligar no painel do projeto. O script só carrega depois do "Aceitar" no banner de cookies.
- [ ] **Política de privacidade:** revisar com um advogado antes de publicar no domínio próprio.

## Troca do site no ar

- [ ] O site antigo continua em produção. A troca acontece quando este branch for aprovado e mesclado no branch de produção da Vercel.
