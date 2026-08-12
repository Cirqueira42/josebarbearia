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
      className={`inline-flex items-center gap-2 border border-border/70 bg-background/40 backdrop-blur text-foreground/80 px-4 py-2.5 rounded-lg text-xs font-medium hover:border-primary/60 hover:text-primary transition-all ${className}`}
    >
      <Share2 className="w-4 h-4" />
      Compartilhar
    </button>

  );
};

export default ShareButton;
