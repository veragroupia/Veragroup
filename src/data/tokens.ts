/** Espelho dos tokens de cor, para a página /design-system. Fonte: src/styles/tokens.css */
export const cores = [
  { nome: 'ink', hex: '#0E1116', uso: 'Fundo das seções de impacto, texto principal' },
  { nome: 'ink-2', hex: '#1A1F27', uso: 'Cards sobre ink' },
  { nome: 'ink-3', hex: '#2A303A', uso: 'Bordas sobre ink (decorativas)' },
  { nome: 'paper', hex: '#F6F4EF', uso: 'Fundo principal' },
  { nome: 'paper-2', hex: '#EDEAE3', uso: 'Seções alternadas' },
  { nome: 'white', hex: '#FFFFFF', uso: 'Cards sobre paper' },
  { nome: 'stone', hex: '#5F6673', uso: 'Texto secundário no claro' },
  { nome: 'stone-on-ink', hex: '#A3A9B4', uso: 'Texto secundário no escuro' },
  { nome: 'line', hex: '#E4E1DA', uso: 'Divisórias decorativas' },
  { nome: 'line-strong', hex: '#7C828C', uso: 'Bordas de input e controles' },
  { nome: 'accent', hex: '#2F6BFF', uso: 'Marca: ícones, títulos grandes, foco' },
  { nome: 'accent-strong', hex: '#2458E8', uso: 'Botão primário, links no claro' },
  { nome: 'accent-deep', hex: '#1F4FD6', uso: 'Hover do primário' },
  { nome: 'accent-on-ink', hex: '#7FA2FF', uso: 'Links e destaques no escuro' },
  { nome: 'accent-2', hex: '#19C37D', uso: 'WhatsApp e sucesso (texto ink)' },
  { nome: 'accent-2-strong', hex: '#0B7A4B', uso: 'Texto de sucesso no claro' },
  { nome: 'warn', hex: '#F2A33A', uso: 'Destaques da perda, sobre ink' },
  { nome: 'warn-strong', hex: '#8F5500', uso: 'Texto de alerta no claro' },
] as const;

const hex = Object.fromEntries(cores.map((c) => [c.nome, c.hex])) as Record<(typeof cores)[number]['nome'], string>;

/** Pares texto/fundo usados no site. O contraste é calculado no build. */
export const pares: { texto: keyof typeof hex; fundo: keyof typeof hex; uso: string }[] = [
  { texto: 'ink', fundo: 'paper', uso: 'Texto principal' },
  { texto: 'ink', fundo: 'paper-2', uso: 'Texto em seção alternada' },
  { texto: 'ink', fundo: 'white', uso: 'Texto em card' },
  { texto: 'stone', fundo: 'paper', uso: 'Texto secundário' },
  { texto: 'stone', fundo: 'paper-2', uso: 'Texto secundário em seção alternada' },
  { texto: 'stone', fundo: 'white', uso: 'Texto secundário em card' },
  { texto: 'paper', fundo: 'ink', uso: 'Texto no escuro' },
  { texto: 'paper', fundo: 'ink-2', uso: 'Texto em card escuro' },
  { texto: 'stone-on-ink', fundo: 'ink', uso: 'Secundário no escuro' },
  { texto: 'stone-on-ink', fundo: 'ink-2', uso: 'Secundário em card escuro' },
  { texto: 'white', fundo: 'accent-strong', uso: 'Botão primário' },
  { texto: 'white', fundo: 'accent-deep', uso: 'Botão primário (hover)' },
  { texto: 'accent-strong', fundo: 'paper', uso: 'Link no claro' },
  { texto: 'accent-strong', fundo: 'white', uso: 'Link em card' },
  { texto: 'accent-on-ink', fundo: 'ink', uso: 'Link no escuro' },
  { texto: 'ink', fundo: 'accent-2', uso: 'Botão WhatsApp' },
  { texto: 'accent-2', fundo: 'ink', uso: 'Sucesso no escuro' },
  { texto: 'accent-2-strong', fundo: 'paper', uso: 'Sucesso no claro' },
  { texto: 'warn', fundo: 'ink', uso: 'Destaque da perda' },
  { texto: 'ink', fundo: 'warn', uso: 'Selo de alerta' },
  { texto: 'warn-strong', fundo: 'paper', uso: 'Alerta no claro' },
  { texto: 'accent', fundo: 'paper', uso: 'Só título ≥ 24 px ou ícone' },
  { texto: 'white', fundo: 'accent-2', uso: 'Reprovado: não usar' },
  { texto: 'warn', fundo: 'paper', uso: 'Reprovado: não usar como texto' },
];

export { hex };

export const tipos = [
  { token: 'display-2xl', classe: 'text-display-2xl', fonte: 'Sora 650', tamanho: '36 → 68 px', uso: 'H1', exemplo: 'Seu cliente procurou no Google.' },
  { token: 'display-page', classe: 'text-display-page', fonte: 'Sora 650', tamanho: '32 → 52 px', uso: 'H1 longo (serviço, case)', exemplo: 'Loja virtual em Salto para vender até com a porta fechada' },
  { token: 'display-xl', classe: 'text-display-xl', fonte: 'Sora 650', tamanho: '28 → 48 px', uso: 'H2', exemplo: 'Todo dia tem cliente indo embora.' },
  { token: 'display-lg', classe: 'text-display-lg', fonte: 'Sora 650', tamanho: '22 → 28 px', uso: 'H3', exemplo: 'Pedido pronto no WhatsApp' },
  { token: 'title', classe: 'text-title font-display font-semibold', fonte: 'Sora 600', tamanho: '18 → 20 px', uso: 'Título de card', exemplo: 'Lojas virtuais' },
  { token: 'body-lg', classe: 'text-body-lg', fonte: 'Inter 400', tamanho: '18 → 20 px', uso: 'Subtítulo', exemplo: 'Colocamos sua loja no Google e no WhatsApp.' },
  { token: 'body', classe: 'text-body', fonte: 'Inter 400', tamanho: '17 px', uso: 'Texto corrido', exemplo: 'Frases curtas. Nenhum parágrafo com mais de três linhas no celular.' },
  { token: 'small', classe: 'text-small', fonte: 'Inter 400', tamanho: '15 px', uso: 'Legenda', exemplo: 'Tela real da loja, no computador e no celular.' },
  { token: 'eyebrow', classe: 'eyebrow', fonte: 'Inter 600', tamanho: '13 px, caixa alta', uso: 'Rótulo', exemplo: 'Onde o dinheiro escapa' },
] as const;
