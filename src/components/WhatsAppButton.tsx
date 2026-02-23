import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => {
  return (
    <a
      href="https://wa.me/5516997369740?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20um%20hor%C3%A1rio%20na%20Jos%C3%A9%20Barbearia."
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
