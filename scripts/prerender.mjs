// Depois do build: injeta o HTML do App e o schema LocalBusiness no dist/index.html.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const empresa = (await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href)).empresa;
const html = render();
const caminho = resolve('dist/index.html');
let pagina = readFileSync(caminho, 'utf8');
if (!pagina.includes('<div id="raiz"></div>')) throw new Error('marcador #raiz não encontrado em dist/index.html');
pagina = pagina.replace('<div id="raiz"></div>', `<div id="raiz">${html}</div>`);

const dados = empresa ?? { cidades: ['Itu', 'Salto', 'Sorocaba', 'Indaiatuba'], socios: [] };
const schema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Vera Group',
  alternateName: 'vera.',
  slogan: 'do design ao resultado, para negócios locais',
  description:
    'Agência de presença digital para negócios locais: site, landing page, loja online, cardápio digital, Google Meu Negócio, plaquinha NFC de avaliação, WhatsApp com IA e manutenção.',
  areaServed: dados.cidades.map((c) => ({ '@type': 'City', name: c, containedInPlace: { '@type': 'State', name: 'São Paulo' } })),
  founder: dados.socios.map((s) => ({ '@type': 'Person', name: s.nome })),
  makesOffer: [
    { '@type': 'Offer', name: 'Landing Express', price: '690', priceCurrency: 'BRL', description: 'R$ 690 de implantação + R$ 97 por mês' },
    { '@type': 'Offer', name: 'Plaquinha NFC de avaliação', price: '100', priceCurrency: 'BRL', description: 'Configurada e instalada' },
  ],
};
if (dados.whatsapp) schema.telephone = '+' + dados.whatsapp.replace(/\D/g, '');
if (dados.email) schema.email = dados.email;
pagina = pagina.replace('<!--schema-->', `<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
writeFileSync(caminho, pagina);

// página de privacidade: linha de contato só se houver canal definido
const privacidade = resolve('dist/privacidade.html');
let priv = readFileSync(privacidade, 'utf8');
const canais = [];
const digitos = (dados.whatsapp ?? '').replace(/\D/g, '');
if (digitos) canais.push(`<a href="https://wa.me/${digitos}">WhatsApp</a>`);
if (dados.email) canais.push(`<a href="mailto:${dados.email}">${dados.email}</a>`);
priv = priv.replace('<!--contato-->', canais.length ? `<p>Para qualquer pedido: ${canais.join(' ou ')}.</p>` : '');
writeFileSync(privacidade, priv);

rmSync(resolve('dist-ssr'), { recursive: true, force: true });
console.log('prerender: ok', (html.length / 1024).toFixed(1), 'KB de HTML');
