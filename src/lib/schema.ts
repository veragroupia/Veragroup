/**
 * Dados estruturados (Schema.org, JSON-LD) usados nas páginas.
 */
import { site } from '@/config/site';

export type JsonLd = Record<string, unknown>;

export const ORG_ID = `${site.url}/#organizacao`;
export const NEGOCIO_ID = `${site.url}/#negocio`;

export const url = (path: string) => new URL(path, site.url).href.replace(/\/$/, '') || site.url;

const cidadesServidas = site.cidades.map((nome) => ({
  '@type': 'City',
  name: nome,
  containedInPlace: { '@type': 'State', name: 'São Paulo' },
}));

export function organizacao(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.nome,
    url: site.url,
    description: site.descricao,
    sameAs: [site.instagram.url],
    founder: site.socios.map((s) => ({ '@type': 'Person', name: s.nome })),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: `+${site.whatsapp.numero}`,
      availableLanguage: 'pt-BR',
      areaServed: 'BR',
    },
    ...(site.email ? { email: site.email } : {}),
    ...(site.cnpj ? { taxID: site.cnpj } : {}),
  };
}

/** LocalBusiness: sem endereço fixo, atende nas cidades listadas. */
export function negocioLocal(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': NEGOCIO_ID,
    name: site.nome,
    url: site.url,
    description: site.descricao,
    telephone: `+${site.whatsapp.numero}`,
    parentOrganization: { '@id': ORG_ID },
    areaServed: cidadesServidas,
    address: {
      '@type': 'PostalAddress',
      addressRegion: site.estado,
      addressCountry: 'BR',
      ...(site.cidadeBase ? { addressLocality: site.cidadeBase } : {}),
    },
    sameAs: [site.instagram.url],
    knowsLanguage: 'pt-BR',
  };
}

export function website(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#site`,
    name: site.nome,
    url: site.url,
    inLanguage: 'pt-BR',
    publisher: { '@id': ORG_ID },
  };
}

export function servico(opts: { nome: string; descricao: string; path: string; tipo: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.nome,
    serviceType: opts.tipo,
    description: opts.descricao,
    url: url(opts.path),
    provider: { '@id': NEGOCIO_ID },
    areaServed: cidadesServidas,
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: url(opts.path),
      servicePhone: `+${site.whatsapp.numero}`,
    },
  };
}

export function trabalho(opts: {
  nome: string;
  descricao: string;
  path: string;
  imagem?: string;
  cliente: string;
  cidade: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: opts.nome,
    description: opts.descricao,
    url: url(opts.path),
    ...(opts.imagem ? { image: url(opts.imagem) } : {}),
    creator: { '@id': ORG_ID },
    inLanguage: 'pt-BR',
    about: {
      '@type': 'LocalBusiness',
      name: opts.cliente,
      address: { '@type': 'PostalAddress', addressLocality: opts.cidade, addressRegion: 'SP', addressCountry: 'BR' },
    },
  };
}

export function faq(items: { pergunta: string; resposta: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: i.resposta.replace(/\n\n/g, ' ') },
    })),
  };
}

export function breadcrumbs(itens: { nome: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nome,
      item: url(item.path),
    })),
  };
}
