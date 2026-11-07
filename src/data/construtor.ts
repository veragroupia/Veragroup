/* Modelos do Construtor ao vivo.
   Cada segmento vira uma prévia de site no celular, montada no navegador do
   visitante, sem IA e sem inventar dado do negócio: endereço, horário, fotos e
   avaliações aparecem como espaço reservado, porque são do cliente.
   Use {nome} onde o nome digitado deve entrar. Evite "da {nome}" / "na {nome}":
   sem saber o gênero do nome, a frase pode sair errada. */

export type Segmento = {
  id: string;
  rotulo: string;
  titulo: string;
  sub: string;
  botao: string;
  secundario: string;
  foto: string;
  lista: { titulo: string; itens: string[] };
  passos: { titulo: string; itens: [string, string, string] };
  extra?: { titulo: string; texto: string };
  /** Desenho de linha, viewBox 0 0 48 48, traço em currentColor. */
  glifo: string;
};

export const segmentos: Segmento[] = [
  {
    id: 'confeitaria',
    rotulo: 'Confeitaria',
    titulo: '{nome}: bolos e doces para encomendar',
    sub: 'Escolha no cardápio e faça a encomenda pelo WhatsApp.',
    botao: 'Encomendar pelo WhatsApp',
    secundario: 'Ver cardápio',
    foto: 'Foto dos seus doces',
    lista: { titulo: 'Cardápio', itens: ['Bolos', 'Doces', 'Tortas', 'Encomendas para festa'] },
    passos: { titulo: 'Como encomendar', itens: ['Escolha no cardápio', 'Monte o pedido', 'Confirme no WhatsApp'] },
    glifo: '<path d="M8 40h32M11 40V25h26v15M11 31.5c3.5 2.5 7 2.5 10.5 0s7-2.5 10.5 0 5 2.5 5 2.5M24 25v-5"/><path d="M24 11.5c-2.2 2.3-2.2 4.5 0 6.5 2.2-2 2.2-4.2 0-6.5z"/>',
  },
  {
    id: 'odonto',
    rotulo: 'Odontologia',
    titulo: '{nome}: cuidado com o seu sorriso',
    sub: 'Agende a sua avaliação pelo WhatsApp.',
    botao: 'Agendar pelo WhatsApp',
    secundario: 'Ver tratamentos',
    foto: 'Foto do consultório',
    lista: { titulo: 'Tratamentos', itens: ['Limpeza', 'Clareamento', 'Ortodontia', 'Implantes'] },
    passos: { titulo: 'Como agendar', itens: ['Chame no WhatsApp', 'Escolha o horário', 'Venha para a avaliação'] },
    extra: { titulo: 'Convênios', texto: 'Liste aqui os convênios que você atende.' },
    glifo: '<path d="M16 8.5c-6 0-9 5-8 11 .8 4.6 3 7 4 12.5.9 5 2 9 5 9s3.2-7.5 7-7.5 4 7.5 7 7.5 4.1-4 5-9c1-5.5 3.2-7.9 4-12.5 1-6-2-11-8-11-4 0-5.2 2-8 2s-4-2-8-2z"/>',
  },
  {
    id: 'oficina',
    rotulo: 'Oficina',
    titulo: '{nome}: o seu carro em dia',
    sub: 'Peça orçamento pelo WhatsApp, com foto do problema.',
    botao: 'Pedir orçamento',
    secundario: 'Ver serviços',
    foto: 'Foto da sua oficina',
    lista: { titulo: 'Serviços', itens: ['Revisão', 'Freios', 'Suspensão', 'Troca de óleo'] },
    passos: { titulo: 'Como funciona', itens: ['Mande foto pelo WhatsApp', 'Receba o orçamento', 'Agende o serviço'] },
    glifo: '<path d="M31 7.5a9.5 9.5 0 0 0-9 12.7L8.7 33.5a4.2 4.2 0 0 0 5.9 5.9L27.8 26a9.5 9.5 0 0 0 12.7-9l-6.1 2.4-4.6-4.6L32.2 8.6z"/>',
  },
  {
    id: 'petshop',
    rotulo: 'Pet shop',
    titulo: '{nome}: banho, tosa e cuidado para o seu pet',
    sub: 'Agende o banho do seu pet pelo WhatsApp.',
    botao: 'Agendar banho',
    secundario: 'Ver serviços',
    foto: 'Foto do seu espaço',
    lista: { titulo: 'Serviços', itens: ['Banho', 'Tosa', 'Rações', 'Acessórios'] },
    passos: { titulo: 'Como agendar', itens: ['Chame no WhatsApp', 'Escolha o dia', 'Traga o seu pet'] },
    glifo: '<path d="M24 25c-6.5 0-11.5 6.5-11.5 11.5 0 4 4 5.5 11.5 5.5s11.5-1.5 11.5-5.5C35.5 31.5 30.5 25 24 25z"/><ellipse cx="13" cy="20" rx="3.6" ry="4.6"/><ellipse cx="20" cy="12.5" rx="3.6" ry="4.6"/><ellipse cx="28" cy="12.5" rx="3.6" ry="4.6"/><ellipse cx="35" cy="20" rx="3.6" ry="4.6"/>',
  },
  {
    id: 'academia',
    rotulo: 'Academia',
    titulo: '{nome}: comece a treinar',
    sub: 'Agende uma visita pelo WhatsApp e conheça a estrutura.',
    botao: 'Agendar visita',
    secundario: 'Ver modalidades',
    foto: 'Foto da academia',
    lista: { titulo: 'Modalidades', itens: ['Musculação', 'Funcional', 'Aulas coletivas', 'Avaliação física'] },
    passos: { titulo: 'Como começar', itens: ['Chame no WhatsApp', 'Visite a academia', 'Escolha o seu plano'] },
    glifo: '<path d="M5 20v8M10 15v18M15 15v18M33 15v18M38 15v18M43 20v8M15 24h18"/>',
  },
  {
    id: 'advocacia',
    rotulo: 'Advocacia',
    titulo: '{nome}',
    sub: 'Atendimento jurídico com hora marcada. Fale com o escritório pelo WhatsApp.',
    botao: 'Falar com o escritório',
    secundario: 'Áreas de atuação',
    foto: 'Foto do escritório',
    lista: { titulo: 'Áreas de atuação', itens: ['Trabalhista', 'Família', 'Previdenciário', 'Cível'] },
    passos: { titulo: 'Como é o atendimento', itens: ['Chame no WhatsApp', 'Agende a conversa', 'Traga os documentos'] },
    glifo: '<path d="M24 7v33M15 40h18M10 13h28M10 13 5 25h10zM38 13l-5 12h10zM5 25a5 3 0 0 0 10 0M33 25a5 3 0 0 0 10 0"/>',
  },
  {
    id: 'loja',
    rotulo: 'Loja',
    titulo: '{nome}: escolha e peça pelo WhatsApp',
    sub: 'Escolha, mande pelo WhatsApp e combine a retirada ou a entrega.',
    botao: 'Comprar pelo WhatsApp',
    secundario: 'Ver produtos',
    foto: 'Foto dos seus produtos',
    lista: { titulo: 'Categorias', itens: ['Novidades', 'Mais procurados', 'Presentes', 'Todos os produtos'] },
    passos: { titulo: 'Como comprar', itens: ['Escolha o produto', 'Mande pelo WhatsApp', 'Combine retirada ou entrega'] },
    glifo: '<path d="M10 16h28l-2.2 24.5H12.2zM18 16v-3a6 6 0 0 1 12 0v3"/>',
  },
];

export const cores = [
  { nome: 'Vermelho', hex: '#D4371C' },
  { nome: 'Azul', hex: '#1F56C9' },
  { nome: 'Verde', hex: '#1C7A52' },
  { nome: 'Rosa', hex: '#C2386F' },
  { nome: 'Mostarda', hex: '#C9900E' },
  { nome: 'Vinho', hex: '#7A1F3D' },
  { nome: 'Turquesa', hex: '#0F8187' },
  { nome: 'Grafite', hex: '#2B2B28' },
];

export const padrao = { nome: '', segmento: 'confeitaria', cor: '#D4371C' };
