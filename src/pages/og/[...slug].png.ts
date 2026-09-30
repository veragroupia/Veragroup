import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { gerarOg, type DadosOg } from '@/lib/og';
import { site } from '@/config/site';

export const getStaticPaths = (async () => {
  const servicos = await getCollection('servicos');
  const cases = await getCollection('portfolio');
  const casePorSlug = Object.fromEntries(cases.map((c) => [c.data.slug, c.data]));
  const cidades = site.cidades.join(' · ');

  const paginas: { slug: string; dados: DadosOg }[] = [
    {
      slug: 'home',
      dados: {
        eyebrow: 'Sites, Google e WhatsApp',
        titulo: 'Seu cliente procurou no Google. Achou o concorrente.',
        sub: 'A gente coloca a sua loja no Google, no WhatsApp e no celular do cliente.',
        celular: casePorSlug['erk-pratas']?.capa.mobile,
      },
    },
    { slug: 'servicos', dados: { eyebrow: 'Serviços', titulo: 'Tudo para o seu negócio vender no digital.', sub: `Para o comércio de ${cidades}.` } },
    { slug: 'portfolio', dados: { eyebrow: 'Portfólio', titulo: 'Trabalhos reais, de negócios daqui.', celular: casePorSlug['vo-neis-confeitaria']?.capa.mobile } },
    { slug: 'sobre', dados: { eyebrow: 'Quem somos', titulo: 'Uma agência do interior, para o comércio do interior.' } },
    { slug: 'contato', dados: { eyebrow: 'Contato', titulo: 'Conta pra gente o que o seu negócio precisa.', sub: 'A gente vai até a sua loja.' } },
    { slug: 'diagnostico', dados: { eyebrow: 'Diagnóstico gratuito', titulo: 'Quanto você está deixando na mesa?', sub: 'Uma conta honesta, com os seus números.' } },
    { slug: 'politica-de-privacidade', dados: { eyebrow: 'LGPD', titulo: 'Política de privacidade' } },
    ...servicos.map((s) => {
      const exemplo = s.data.cases[0] ? casePorSlug[s.data.cases[0]] : undefined;
      return {
        slug: `servicos/${s.id}`,
        dados: { eyebrow: `${s.data.tituloCurto} · ${s.data.cidadeFoco} e região`, titulo: s.data.h1, celular: exemplo?.capa.mobile },
      };
    }),
    ...cases.map((c) => ({
      slug: `portfolio/${c.data.slug}`,
      dados: { eyebrow: `${c.data.segmento} · ${c.data.cidade}`, titulo: c.data.nome, sub: c.data.resumo, computador: c.data.capa.desktop, celular: undefined },
    })),
  ];
  return paginas.map((p) => ({ params: { slug: p.slug }, props: { dados: p.dados } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await gerarOg((props as { dados: DadosOg }).dados);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
