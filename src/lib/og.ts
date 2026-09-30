/**
 * Imagens de prévia (Open Graph / WhatsApp) 1200 × 630, geradas no build.
 * Satori desenha o layout em SVG e o sharp converte para PNG.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import type { ImageMetadata } from 'astro';
import { site } from '@/config/site';

const raiz = process.cwd();
const fonte = (arquivo: string) => fs.readFile(path.join(raiz, 'node_modules', arquivo));

let fontes: Awaited<ReturnType<typeof carregarFontes>> | null = null;
async function carregarFontes() {
  const [sora700, sora600, inter400, inter600] = await Promise.all([
    fonte('@fontsource/sora/files/sora-latin-700-normal.woff'),
    fonte('@fontsource/sora/files/sora-latin-600-normal.woff'),
    fonte('@fontsource/inter/files/inter-latin-400-normal.woff'),
    fonte('@fontsource/inter/files/inter-latin-600-normal.woff'),
  ]);
  return [
    { name: 'Sora', data: sora700, weight: 700 as const, style: 'normal' as const },
    { name: 'Sora', data: sora600, weight: 600 as const, style: 'normal' as const },
    { name: 'Inter', data: inter400, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: inter600, weight: 600 as const, style: 'normal' as const },
  ];
}

/** Converte uma imagem do projeto em PNG base64 (o Satori não lê WebP). */
async function comoDataUri(img: ImageMetadata, largura: number) {
  const origem = (img as ImageMetadata & { fsPath?: string }).fsPath;
  if (!origem) return null;
  const png = await sharp(origem).resize({ width: largura }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

// Mini "JSX" para o Satori.
type No = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): No => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

export interface DadosOg {
  eyebrow: string;
  titulo: string;
  sub?: string;
  /** Tela real do projeto (celular) para o lado direito. */
  celular?: ImageMetadata;
  /** Tela real do projeto (computador) para o lado direito. */
  computador?: ImageMetadata;
}

export async function gerarOg(d: DadosOg): Promise<Buffer> {
  fontes ??= await carregarFontes();
  const celular = d.celular ? await comoDataUri(d.celular, 300) : null;
  const computador = !celular && d.computador ? await comoDataUri(d.computador, 900) : null;
  const temImagem = Boolean(celular || computador);
  const tamanhoTitulo = d.titulo.length > 60 ? 50 : d.titulo.length > 38 ? 58 : 68;

  const lado = celular
    ? h(
        'div',
        { display: 'flex', width: 262, height: 540, padding: 9, borderRadius: 44, background: '#0b0d11', boxShadow: '0 30px 60px rgba(0,0,0,.5)', border: '2px solid #2e3440' },
        h('img', { width: 244, height: 522, borderRadius: 36, objectFit: 'cover', objectPosition: 'top' }, undefined),
      )
    : computador
      ? h(
          'div',
          { display: 'flex', width: 520, height: 340, padding: 10, borderRadius: 18, background: '#0b0d11', border: '2px solid #2e3440' },
          h('img', { width: 500, height: 320, borderRadius: 8, objectFit: 'cover', objectPosition: 'top' }, undefined),
        )
      : null;
  // Satori usa src no props da imagem.
  if (lado) (lado.props.children as No).props.src = celular ?? computador;

  const arvore = h(
    'div',
    { width: 1200, height: 630, display: 'flex', background: '#0E1116', color: '#F6F4EF', padding: '64px 72px', fontFamily: 'Inter' },
    h(
      'div',
      { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: temImagem ? 48 : 0 },
      h('div', { display: 'flex', fontFamily: 'Sora', fontWeight: 700, fontSize: 34, letterSpacing: -1 }, site.nome),
      h(
        'div',
        { display: 'flex', flexDirection: 'column' },
        h('div', { display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#F2A33A' }, d.eyebrow),
        h('div', { display: 'flex', marginTop: 18, fontFamily: 'Sora', fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.06, letterSpacing: -2 }, d.titulo),
        d.sub ? h('div', { display: 'flex', marginTop: 20, fontSize: 26, lineHeight: 1.35, color: '#A3A9B4' }, d.sub) : h('div', { display: 'flex' }, ''),
      ),
      h(
        'div',
        { display: 'flex', alignItems: 'center', fontSize: 22, color: '#A3A9B4' },
        h('div', { display: 'flex', flexShrink: 0, width: 14, height: 14, borderRadius: 7, background: '#19C37D', marginRight: 12 }, ''),
        computador ? site.cidades.join(' · ') : `${site.cidades.join(' · ')}  ·  WhatsApp ${site.whatsapp.exibicao}`,
      ),
    ),
    lado ? h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center' }, lado) : h('div', { display: 'flex' }, ''),
  );

  const svg = await satori(arvore as never, { width: 1200, height: 630, fonts: fontes });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toBuffer();
}
