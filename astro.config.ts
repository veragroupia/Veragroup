import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { empresa } from './src/data/empresa';

export default defineConfig({
  site: empresa.url,
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (pagina) => !/\/(previa|404)$/.test(pagina),
    }),
  ],
});
