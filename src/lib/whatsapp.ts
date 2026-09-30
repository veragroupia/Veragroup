import { site } from '@/config/site';

/** Monta o link wa.me com a mensagem já escrita. */
export function linkWhatsApp(mensagem: string = site.whatsapp.mensagem): string {
  return `https://wa.me/${site.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`;
}
