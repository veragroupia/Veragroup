/**
 * Dados de contato da Vera Group.
 *
 * Enquanto um campo estiver vazio, todo elemento que depende dele simplesmente não aparece no site
 * (nada de texto provisório). Para ligar o botão do WhatsApp, por exemplo, basta preencher `whatsapp`
 * com DDI + DDD + número, só dígitos: '5511999999999'.
 */
export const empresa = {
  nome: 'Vera Group',
  whatsapp: '',
  email: '',
  responsavel: '',
  cnpj: '',
  cidades: ['Itu', 'Salto', 'Sorocaba', 'Indaiatuba'] as const,
  estado: 'SP',
  socios: [
    { nome: 'Otávio Barbieri', papel: 'Sócio' },
    { nome: 'Davi Marques', papel: 'Sócio' },
    { nome: 'Alaf', papel: 'Sócio' },
  ],
};

export type Empresa = typeof empresa;

/** Link de WhatsApp com mensagem pronta, ou `null` se o número ainda não foi definido. */
export function linkWhatsApp(mensagem: string, numero = empresa.whatsapp): string | null {
  const digitos = numero.replace(/\D/g, '');
  if (!digitos) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}
