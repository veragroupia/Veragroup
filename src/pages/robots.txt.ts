import type { APIRoute } from 'astro';
import { site } from '@/config/site';

// /apresentacao e /design-system não são bloqueadas aqui de propósito:
// elas usam noindex, e o Google só enxerga o noindex se puder abrir a página.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
