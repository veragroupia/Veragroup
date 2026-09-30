# Vera Group · site

Site oficial da Vera Group, em Astro (saída estática) + TypeScript + Tailwind CSS.
Em construção por fases. Este README ganha a versão completa na fase final.

```bash
npm install
npm run dev          # desenvolvimento em http://localhost:4321
npm run build        # gera dist/
npm run preview      # serve dist/ em http://localhost:4321
npm run verificar    # checagens automáticas (com o preview rodando)
```

- Tokens do design system: `src/styles/tokens.css` (página interna `/design-system`)
- Dados da empresa (WhatsApp, Instagram, cidades): `src/config/site.ts`
- Serviços: `src/content/servicos/*.md`
- Cases: `src/content/portfolio/[case]/index.md` + imagens na mesma pasta
