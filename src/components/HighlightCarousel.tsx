import { useRef, useState } from "react";
import { Calendar, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";

const VIDEO_SRC = "/videos/destaque.mp4";

const HighlightCarousel = () => {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section className="relative w-full bg-background">
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[80vh] overflow-hidden">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          className="w-full h-full object-cover"
          playsInline
          muted={muted}
          autoPlay
          loop
          preload="metadata"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Texto + CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8 z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-primary mb-2">Destaque</p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold font-display text-gradient mb-2 sm:mb-3">
              José Barbearia
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Estilo, precisão e tradição em cada corte
            </p>
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 sm:px-7 sm:py-4 rounded-lg text-sm sm:text-base font-semibold hover:brightness-110 transition-all glow-primary"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Agendar Agora
            </Link>
          </div>
        </div>

        {/* Mute toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Ativar som" : "Desativar som"}
          className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-background/60 backdrop-blur border border-border flex items-center justify-center hover:bg-background/80 transition"
        >
          {muted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
        </button>
      </div>
    </section>
  );
};

export default HighlightCarousel;
