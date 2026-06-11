// Helpers para abrir conversas direto no app do WhatsApp (incluindo WhatsApp Business)
// O scheme `whatsapp://` é registrado tanto pelo WhatsApp comum quanto pelo Business.
// Se o usuário tiver SÓ o Business instalado, o sistema operacional abre direto nele,
// evitando o web.whatsapp.com (que é o que acontecia com os links wa.me/api.whatsapp).

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const isMobile = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

/**
 * Monta um link que abre direto no app do WhatsApp (Business inclusive) em mobile.
 * Em desktop, mantém o wa.me que abre o WhatsApp Desktop / Web.
 */
export const buildWhatsAppLink = (phone: string, text: string) => {
  const p = onlyDigits(phone);
  const t = encodeURIComponent(text);
  if (isMobile()) {
    return `whatsapp://send?phone=${p}&text=${t}`;
  }
  return `https://wa.me/${p}?text=${t}`;
};

/**
 * Abre o WhatsApp em uma nova aba/app. Em mobile usa o scheme nativo
 * (que força o app — Business se for o único instalado).
 */
export const openWhatsApp = (phone: string, text: string) => {
  const url = buildWhatsAppLink(phone, text);
  window.open(url, "_blank");
};
