// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Endereço público do site. Troque aqui quando o domínio próprio existir
// (e em src/config/site.ts, campo `url`).
const SITE = 'https://vera-group.vercel.app';

// Páginas que não entram no sitemap (também levam noindex).
const FORA_DO_SITEMAP = ['/apresentacao', '/design-system', '/404'];

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  // Compressão sem perda: mantém o espaço entre texto e link quebrados em linhas diferentes.
  compressHTML: true,
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !FORA_DO_SITEMAP.some((p) => new URL(page).pathname.startsWith(p)),
      i18n: { defaultLocale: 'pt-BR', locales: { 'pt-BR': 'pt-BR' } },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Sora',
      cssVariable: '--font-sora',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [{ src: ['./src/assets/fonts/sora-latin-wght.woff2'], weight: '100 800', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [{ src: ['./src/assets/fonts/inter-latin-wght.woff2'], weight: '100 900', style: 'normal' }],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
