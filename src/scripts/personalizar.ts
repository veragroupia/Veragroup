/**
 * Aplica o link personalizado (?empresa=&nicho=&cidade=) na página:
 * mensagens de WhatsApp, "Preparado para", pesquisa de exemplo e formulário.
 */
import { lerProspect, mensagemComProspect } from './prospect';

const p = lerProspect();
if (p.empresa || p.nicho || p.cidade) {
  document.querySelectorAll<HTMLAnchorElement>('a[data-wa]').forEach((a) => {
    const base = a.dataset.wa || '';
    const numero = new URL(a.href).pathname.replace(/\D/g, '');
    a.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemComProspect(base, p))}`;
  });
  if (p.empresa) {
    document.querySelectorAll<HTMLElement>('[data-p-empresa]').forEach((el) => (el.textContent = p.empresa!));
    document.querySelectorAll<HTMLElement>('[data-p-preparado]').forEach((el) => (el.hidden = false));
  }
  if (p.cidade) document.querySelectorAll<HTMLElement>('[data-p-cidade]').forEach((el) => (el.textContent = p.cidade!));
  if (p.nicho) {
    const cidade = p.cidade || 'Salto';
    document.querySelectorAll<HTMLElement>('[data-p-busca]').forEach((el) => (el.textContent = `${p.nicho} em ${cidade}`));
  }
  document.querySelectorAll<HTMLInputElement>('[data-p-campo]').forEach((campo) => {
    const valor = p[campo.dataset.pCampo as keyof typeof p];
    if (valor && !campo.value) campo.value = valor;
  });
}
