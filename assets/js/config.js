/* Configuração do site da Vera Group.
   Tudo que muda sem mexer no layout fica aqui. */
window.VERA = {
  // Número do WhatsApp comercial, só dígitos, com 55 e DDD. Ex.: '5511999999999'.
  // Enquanto estiver vazio, os botões levam para o formulário de contato, e o
  // formulário abre o WhatsApp com a mensagem pronta para a pessoa escolher o contato.
  whatsapp: '',

  // Pesquisas que aparecem no título de Soluções quando o link não vem personalizado.
  // Nichos e cidades do radar de prospecção.
  pesquisas: [
    'dentista em Itu',
    'pet shop em Salto',
    'oficina em Sorocaba',
    'salão de beleza em Indaiatuba',
    'academia em Porto Feliz',
    'restaurante em Tietê',
    'barbearia em Salto',
    'clínica veterinária em Itu',
  ],

  // Projetos que podem ser citados na mensagem de contato.
  // A chave é o que vai no link (?projeto=erk); o valor é o nome que aparece.
  projetos: {
    erk: 'ERK Pratas',
    voneis: 'Vó Neis Confeitaria',
  },
};
