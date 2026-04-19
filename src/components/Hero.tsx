import { Scissors, Calendar, MapPin, Instagram, Download, Share } from "lucide-react";
import PhotoCarousel from "@/components/PhotoCarousel";
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <PhotoCarousel overlay="light" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-pulse-glow">
          <Scissors className="w-10 h-10 text-primary" />
        </div>

        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Conheça Nossa Barbearia</p>

        <h1 className="text-5xl md:text-7xl font-bold font-display text-gradient mb-6">
          José Barbearia
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
          Barba, cabelo e bigode é coisa séria!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/agendar"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 transition-all glow-primary"
          >
            <Calendar className="w-5 h-5" />
            Agendar Horário Online
          </a>

          {!isInstalled && (
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-3 bg-primary/15 backdrop-blur border-2 border-primary text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-all glow-primary"
              aria-label="Baixar aplicativo"
            >
              {isIOS ? <Share className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              Baixar App
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10 text-muted-foreground text-sm">
          <a
            href="https://www.google.com/maps/search/?api=1&query=Av.%20Ot%C3%A1vio%20Rangel%2C%20477%20-%20Vila%20Cecap%2C%20Guariba%20-%20SP%2C%2014845-106"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP
          </a>
          <a
            href="https://www.instagram.com/josebarbeariaa/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <Instagram className="w-4 h-4" />
            @josebarbeariaa
          </a>
        </div>

        <div className="mt-6">
          <a href="/admin-login" className="text-muted-foreground text-xs hover:text-primary transition-colors">
            🔒 Área Administrativa
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
