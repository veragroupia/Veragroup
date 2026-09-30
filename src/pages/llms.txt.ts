import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '@/config/site';

/** Resumo da empresa para assistentes de IA (padrão llms.txt). */
export const GET: APIRoute = async () => {
  const servicos = (await getCollection('servicos')).sort((a, b) => a.data.ordem - b.data.ordem);
  const cases = (await getCollection('portfolio')).sort((a, b) => a.data.ordem - b.data.ordem);
  const linhas = [
    `# ${site.nome}`,
    '',
    `> Agência de marketing digital e desenvolvimento web focada no comércio local do interior de São Paulo: ${site.cidades.join(', ')}. Atende lojas, confeitarias, joalherias, clínicas e prestadores de serviço, indo até a loja do cliente.`,
    '',
    `- WhatsApp: ${site.whatsapp.exibicao} (+${site.whatsapp.numero})`,
    `- Instagram: ${site.instagram.url}`,
    ...(site.email ? [`- E-mail: ${site.email}`] : []),
    `- Cidades atendidas: ${site.cidades.join(', ')} (SP, Brasil)`,
    '- Preço: não é público; é passado depois de um diagnóstico gratuito.',
    `- Garantia: ${site.garantiaDias} dias de correção de erros. Sites ficam no ar em até ${site.prazoSiteDias} dias.`,
    '',
    '## Serviços',
    '',
    ...servicos.map((s) => `- [${s.data.titulo}](${site.url}/servicos/${s.id}): ${s.data.resumo}`),
    '',
    '## Portfólio',
    '',
    ...cases.map((c) => `- [${c.data.nome}](${site.url}/portfolio/${c.data.slug}) (${c.data.segmento}, ${c.data.cidade}${c.data.status === 'em-desenvolvimento' ? ', em desenvolvimento' : ''}): ${c.data.resumo}`),
    '',
    '## Páginas',
    '',
    `- [Diagnóstico gratuito](${site.url}/diagnostico): calculadora de quanto um negócio deixa de vender.`,
    `- [Sobre](${site.url}/sobre)`,
    `- [Contato](${site.url}/contato)`,
    `- [Política de privacidade](${site.url}/politica-de-privacidade)`,
    '',
  ];
  return new Response(linhas.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
