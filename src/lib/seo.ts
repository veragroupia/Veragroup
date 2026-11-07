/* Dados estruturados (schema.org). Nenhum [[PREENCHER]] entra aqui. */
import { empresa } from '../data/empresa';
import { servicos, type Servico } from '../data/servicos';
import { limpo, numeroWhats, semMarcadores } from './texto';

export const ID_EMPRESA = `${empresa.url}/#empresa`;

const cidadesSchema = (lista: readonly string[] = empresa.cidades) =>
  lista.map((nome) => ({
    '@type': 'City',
    name: nome,
    containedInPlace: { '@type': 'State', name: 'São Paulo' },
  }));

function oferta(s: Servico) {
  if (!s.preco) return undefined;
  const preco = s.preco.tipo === 'mensal' ? s.preco.implantacao : s.preco.valor;
  return {
    '@type': 'Offer',
    price: String(preco),
    priceCurrency: 'BRL',
    ...(s.preco.tipo === 'mensal'
      ? {
          priceSpecification: [
            { '@type': 'UnitPriceSpecification', price: String(s.preco.implantacao), priceCurrency: 'BRL', name: 'Implantação' },
            {
              '@type': 'UnitPriceSpecification',
              price: String(s.preco.mensal),
              priceCurrency: 'BRL',
              name: 'Mensalidade',
              unitCode: 'MON',
            },
          ],
        }
      : {}),
  };
}

export function schemaEmpresa() {
  const tel = numeroWhats();
  const email = limpo(empresa.email);
  const avaliacoes = limpo(empresa.avaliacoesGoogle);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': ID_EMPRESA,
    name: empresa.nome,
    url: empresa.url,
    image: `${empresa.url}/og/home.jpg`,
    logo: `${empresa.url}/favicon.svg`,
    description:
      'Agência de presença digital para negócios locais: sites, lojas online, Google Meu Negócio, plaquinha NFC de avaliação e WhatsApp com IA revisada por pessoas.',
    areaServed: cidadesSchema(),
    address: { '@type': 'PostalAddress', addressRegion: 'SP', addressCountry: 'BR' },
    founder: empresa.socios.map((name) => ({ '@type': 'Person', name })),
    paymentAccepted: 'Cartão de crédito',
    ...(tel ? { telephone: `+${tel}` } : {}),
    ...(email ? { email } : {}),
    ...(avaliacoes ? { sameAs: [avaliacoes] } : {}),
    ...(empresa.cnpj ? { taxID: empresa.cnpj } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Serviços',
      itemListElement: servicos.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.nome, url: `${empresa.url}/servicos/${s.slug}` },
        ...(oferta(s) ? { price: oferta(s)!.price, priceCurrency: 'BRL' } : {}),
      })),
    },
  };
}

export function schemaServico(s: Servico) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.nome,
    serviceType: s.nome,
    description: semMarcadores(s.paraQuem),
    url: `${empresa.url}/servicos/${s.slug}`,
    provider: { '@id': ID_EMPRESA },
    areaServed: cidadesSchema(),
    ...(oferta(s) ? { offers: oferta(s) } : {}),
  };
}

export function schemaFaq(perguntas: { p: string; r: string }[]) {
  const validas = perguntas.filter((x) => semMarcadores(x.r).length > 20);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validas.map((x) => ({
      '@type': 'Question',
      name: x.p,
      acceptedAnswer: { '@type': 'Answer', text: semMarcadores(x.r) },
    })),
  };
}

export function schemaTrilha(itens: { nome: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nome,
      item: `${empresa.url}${it.url}`,
    })),
  };
}

export function schemaCidade(nome: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': ID_EMPRESA,
    name: empresa.nome,
    url: empresa.url,
    areaServed: cidadesSchema([nome]),
  };
}
