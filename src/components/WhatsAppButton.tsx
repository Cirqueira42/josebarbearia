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
      className="fixed bottom-4 right-4 z-[9999] bg-whatsapp/95 backdrop-blur text-success-foreground pl-4 pr-5 py-3 min-h-[52px] rounded-full shadow-xl ring-1 ring-background/40 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm font-semibold tracking-wide"
      aria-label="Agendar pelo WhatsApp"
    >
      <MessageCircle className="w-5 h-5" />
      WhatsApp

    </a>
  );
};

export default WhatsAppButton;
