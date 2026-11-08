const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const inteiro = new Intl.NumberFormat('pt-BR');

export const reais = (v: number) => brl.format(v).replace(/ /g, ' ');
export const reaisCentavos = (v: number) => brlCentavos.format(v).replace(/ /g, ' ');
export const numero = (v: number) => inteiro.format(v);
