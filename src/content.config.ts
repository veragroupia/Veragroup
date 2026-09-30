import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const cidade = z.enum(['Itu', 'Salto', 'Sorocaba', 'Indaiatuba']);
const pergunta = z.object({ pergunta: z.string(), resposta: z.string() });

/**
 * Serviços: um arquivo .md por serviço em src/content/servicos.
 * O nome do arquivo vira o endereço: loja-virtual.md → /servicos/loja-virtual
 */
const servicos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/servicos' }),
  schema: z.object({
    titulo: z.string(),
    tituloCurto: z.string(),
    ordem: z.number(),
    grupo: z.enum(['vender', 'encontrado']),
    icone: z.string(),
    /** Uma frase para o card. */
    resumo: z.string().max(110),
    cidadeFoco: cidade,
    seo: z.object({
      title: z.string().max(48),
      description: z.string().min(70).max(160),
    }),
    h1: z.string(),
    sub: z.string(),
    whatsapp: z.string(),
    dores: z.array(z.object({ titulo: z.string(), texto: z.string().max(130) })).length(3),
    entregas: z.array(z.object({ titulo: z.string(), texto: z.string().max(130), icone: z.string() })).min(3),
    paraQuem: z.array(z.string()).min(3),
    prazo: z.string().optional(),
    nota: z.string().optional(),
    cases: z.array(z.string()).default([]),
    faq: z.array(pergunta).min(2),
  }),
});

/**
 * Portfólio: uma pasta por case em src/content/portfolio/[slug]/,
 * com o index.md e as imagens do projeto lado a lado.
 */
const portfolio = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/portfolio' }),
  schema: ({ image }) =>
    z.object({
      slug: z.string(),
      nome: z.string(),
      ordem: z.number(),
      segmento: z.string(),
      cidade: z.string(),
      status: z.enum(['no-ar', 'em-desenvolvimento']),
      /** Cor da página do case: escuro (preto premium) ou claro (papel). */
      tema: z.enum(['escuro', 'claro']),
      resumo: z.string().max(140),
      h1: z.string(),
      sub: z.string(),
      seo: z.object({
        title: z.string().max(48),
        description: z.string().min(70).max(160),
      }),
      link: z.url().optional(),
      linkRotulo: z.string().optional(),
      servicos: z.array(z.string()),
      whatsapp: z.string(),
      capa: z
        .object({
          desktop: image().optional(),
          mobile: image().optional(),
          altDesktop: z.string().optional(),
          altMobile: z.string().optional(),
        })
        .default({}),
      ficha: z.array(z.object({ rotulo: z.string(), valor: z.string() })),
      problema: z.array(z.string()).min(1),
      oQueFizemos: z.array(z.object({ titulo: z.string(), texto: z.string() })).min(2),
      /** Resultado qualitativo. Número só entra se for real e autorizado. */
      resultado: z.array(z.string()).min(1),
      resultadoTitulo: z.string().default('Resultado'),
      galeria: z
        .array(
          z.object({
            imagem: image().optional(),
            alt: z.string(),
            legenda: z.string().optional(),
            tipo: z.enum(['celular', 'desktop', 'foto']),
          }),
        )
        .default([]),
      depoimento: z.object({ texto: z.string(), autor: z.string(), cargo: z.string() }).optional(),
    }),
});

export const collections = { servicos, portfolio };
