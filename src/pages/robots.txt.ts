import type { APIRoute } from 'astro';
import { empresa } from '../data/empresa';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /previa\n\nSitemap: ${empresa.url}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
