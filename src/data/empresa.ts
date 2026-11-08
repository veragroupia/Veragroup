/**
 * Dados da Vera Group. Fonte: pacote de referências (REFERENCIAS-VERA-3D.md).
 *
 * Campos de contato vazios = o elemento que depende deles NÃO aparece no site.
 * Para ligar o WhatsApp, preencha `whatsapp` com DDI + DDD + número, só dígitos: '5511999999999'.
 * A Vera ainda não tem CNPJ: deixe `cnpj` vazio até ter.
 */
export const empresa = {
  nome: 'Vera Group',
  marca: 'vera.',
  assinatura: 'do design ao resultado, para negócios locais',
  whatsapp: '',
  email: '',
  responsavel: '',
  cnpj: '',
  cidades: ['Itu', 'Salto', 'Sorocaba', 'Indaiatuba'] as const,
  estado: 'SP',
  socios: [{ nome: 'Otávio Barbieri' }, { nome: 'Davi Marques' }, { nome: 'Alaf' }],
  produtosProprios: [
    { nome: 'Vera Prospect', descricao: 'painel comercial da equipe' },
    { nome: 'Vera Finances', descricao: 'app de finanças pessoais, em desenvolvimento' },
  ],
};

export type Cidade = (typeof empresa.cidades)[number];

/** "Itu, Salto, Sorocaba e Indaiatuba" */
export const listaCidades = `${empresa.cidades.slice(0, -1).join(', ')} e ${empresa.cidades[empresa.cidades.length - 1]}`;

/** Link de WhatsApp com mensagem pronta, ou `null` se o número ainda não foi definido. */
export function linkWhatsApp(mensagem: string, numero = empresa.whatsapp): string | null {
  const digitos = numero.replace(/\D/g, '');
  if (!digitos) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

export const temContato = () => Boolean(empresa.whatsapp.replace(/\D/g, '') || empresa.email.trim());
