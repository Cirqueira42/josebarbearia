import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const PHONE = "5516997369740";
const TEXT = "Olá! Gostaria de agendar um horário na José Barbearia.";

const WhatsAppButton = () => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Recalcula no clique para detectar mobile corretamente (abre direto no app/Business)
    window.open(buildWhatsAppLink(PHONE, TEXT), "_blank");
  };

  return (
    <a
      href={`https://wa.me/${PHONE}?text=${encodeURIComponent(TEXT)}`}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-whatsapp text-success-foreground px-5 py-3 rounded-full shadow-lg hover:brightness-110 transition-all flex items-center gap-2 font-medium"
      aria-label="Agendar pelo WhatsApp"
    >
      <MessageCircle className="w-5 h-5" />
      WhatsApp
    </a>
  );
};

export default WhatsAppButton;
