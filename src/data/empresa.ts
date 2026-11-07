/* Dados da Vera Group.
   Tudo que aparece no rodapé, no WhatsApp, no Google (schema) e na política de
   privacidade sai daqui. Edite este arquivo, não o layout.

   Regra da casa: o que ainda não foi confirmado fica como [[PREENCHER: ...]].
   O site mostra esse marcador destacado em vermelho para ninguém esquecer, e
   nunca o coloca em metadados (Google, WhatsApp, redes). Para listar todos:
   npm run check:preencher */

export const empresa = {
  nome: 'Vera Group',

  /* Endereço público do site, sem barra no fim. Troque quando ligar o domínio
     próprio: canonical, sitemap, Open Graph e schema usam este valor. */
  url: 'https://vera-group.vercel.app',

  /* Quem responde pela empresa enquanto não existe CNPJ. */
  responsavel: '[[PREENCHER: nome do responsável]]',

  /* Vazio = não aparece em lugar nenhum. Preencha só quando existir. */
  cnpj: '',

  /* Só dígitos, com 55 e DDD. Ex.: 5511999999999.
     Enquanto não for um número, os botões abrem o WhatsApp para a pessoa
     escolher a conversa (funciona, mas sem cair direto na Vera). */
  whatsapp: '[[PREENCHER: WhatsApp comercial com 55 e DDD]]',

  email: '[[PREENCHER: e-mail comercial]]',

  /* Link do perfil da Vera no Google, na parte de avaliações. */
  avaliacoesGoogle: '[[PREENCHER: link das avaliações da Vera no Google]]',

  cidades: ['Itu', 'Salto', 'Sorocaba', 'Indaiatuba'] as const,
  regiao: 'Itu, Salto, Sorocaba e Indaiatuba (SP)',

  socios: ['Otávio Barbieri', 'Davi Marques', 'Alaf'],

  pagamento:
    'Aceitamos cartão de crédito parcelado. A taxa da maquininha do parcelamento é repassada ao cliente.',

  /* Medição de conversão. Nada é carregado sem o visitante aceitar os cookies.
     Preencha UM dos dois: ga4 ('G-XXXXXXX') ou gtm ('GTM-XXXXXX').
     Enquanto os dois estiverem vazios, o banner de cookies não aparece,
     porque o site não usa cookie nenhum. Os eventos continuam indo para
     window.dataLayer (só no navegador, nada sai). */
  analytics: {
    ferramenta: '[[PREENCHER: GA4/GTM]]',
    ga4: '',
    gtm: '',
  },

  /* Oferta de lançamento. Fica desligada (ativa: false) até existir uma oferta
     real: data final ou número de vagas verdadeiros, e o preço que passa a
     valer depois. Nada de preço riscado que nunca foi cobrado. */
  ofertaLancamento: {
    ativa: false,
    titulo: '[[PREENCHER: nome da oferta]]',
    condicao: '[[PREENCHER: o que muda no preço durante a oferta]]',
    prazoFinal: '[[PREENCHER: data final, ex.: 30/11/2026]]',
    vagas: '[[PREENCHER: número de vagas, ou deixe vazio]]',
    precoDepois: '[[PREENCHER: preço que vale depois da oferta]]',
  },
};

export type Empresa = typeof empresa;
