import { Calendar, MapPin, Instagram, Download, Share } from "lucide-react";
import PhotoCarousel from "@/components/PhotoCarousel";
import ShareButton from "@/components/ShareButton";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { toast } from "sonner";

const Hero = () => {
  const { canInstall, isInstalled, isIOS, isAndroid, promptInstall } = useInstallPrompt();

  const openInChrome = () => {
    const host = window.location.host;
    const path = window.location.pathname + window.location.search;
    // Intent URL: força abrir no Chrome no Android
    const intentUrl = `intent://${host}${path}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  };

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
      return;
    }
    if (isAndroid) {
      // Sem prompt nativo (provavelmente fora do Chrome) → abre direto no Chrome
      toast.info("Abrindo no Chrome... toque em 'Instalar app' no menu (⋮).", { duration: 5000 });
      openInChrome();
      return;
    }
    if (isIOS) {
      toast.info("Para instalar no iPhone: toque em Compartilhar e depois em 'Adicionar à Tela de Início'.", {
        duration: 6000,
      });
      return;
    }
    toast.info("Abra este site no Chrome e use o menu (⋮) → 'Instalar app'.", { duration: 6000 });
  };

  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
      <PhotoCarousel overlay="light" />

      {/* Véu para leitura sobre a foto, sem apagar o ambiente real */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />

      {/* Marca */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-10">
        <div className="w-12 h-px bg-primary/60 mb-6" />

        <h1 className="text-[2.6rem] leading-[1.05] md:text-7xl font-bold font-display text-gradient tracking-tight">
          JOSÉ
          <span className="block">BARBEARIA</span>
        </h1>

        <p className="mt-5 text-base md:text-lg text-foreground/75 max-w-sm mx-auto font-light italic">
          “Barba, cabelo e bigode é coisa séria.”
        </p>

        <a
          href="/agendar"
          className="mt-9 w-full max-w-xs inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-5 rounded-xl text-base font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all glow-primary"
        >
          <Calendar className="w-5 h-5" />
          Agendar meu horário
        </a>

        <p className="mt-6 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
          Corte <span className="text-primary/70">•</span> Barba <span className="text-primary/70">•</span> Estilo
        </p>
      </div>

      {/* Informações secundárias */}
      <div className="relative z-10 px-6 pb-10">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2">
            {!isInstalled && (
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-2 border border-border/70 bg-background/40 backdrop-blur text-foreground/80 px-4 py-2.5 rounded-lg text-xs font-medium hover:border-primary/60 hover:text-primary transition-all"
                aria-label="Baixar aplicativo"
              >
                {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                Baixar app
              </button>
            )}
            <ShareButton />
          </div>

          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs pt-2 border-t border-border/40">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Av.%20Ot%C3%A1vio%20Rangel%2C%20477%20-%20Vila%20Cecap%2C%20Guariba%20-%20SP%2C%2014845-106"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-primary transition-colors mt-3"
            >
              <MapPin className="w-3.5 h-3.5" />
              Av. Otávio Rangel, 477 — Guariba/SP
            </a>
            <a
              href="https://www.instagram.com/josebarbeariaa/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
              @josebarbeariaa
            </a>
            <a
              href="/meus-agendamentos"
              className="text-primary/70 hover:text-primary underline underline-offset-4 mt-1"
            >
              Já tenho agendamento
            </a>
            <a href="/admin-login" className="text-muted-foreground/60 text-[10px] hover:text-primary transition-colors mt-1">
              Área administrativa
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
