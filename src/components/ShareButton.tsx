import { Share2 } from "lucide-react";
import { toast } from "sonner";

const SHARE_TITLE = "José Barbearia";
const SHARE_TEXT =
  "✂️ José Barbearia — Barba, cabelo e bigode é coisa séria!\nAgende seu horário online pelo app:";

type Props = {
  className?: string;
};

const ShareButton = ({ className = "" }: Props) => {
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const full = `${SHARE_TEXT} ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
        return;
      } catch (err) {
        // usuário cancelou o compartilhamento
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(full);
      toast.success("Link copiado! É só colar e enviar.");
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, "_blank");
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Compartilhar o app da José Barbearia"
      className={`inline-flex items-center gap-3 bg-primary/15 backdrop-blur border-2 border-primary text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-all glow-primary ${className}`}
    >
      <Share2 className="w-5 h-5" />
      Compartilhar
    </button>
  );
};

export default ShareButton;
