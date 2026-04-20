import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { bgImages } from "@/components/PhotoCarousel";

type Slide =
  | { type: "video"; src: string; title: string; subtitle: string }
  | { type: "image"; src: string; title: string; subtitle: string };

const slides: Slide[] = [
  {
    type: "video",
    src: "/videos/destaque.mp4",
    title: "José Barbearia",
    subtitle: "Estilo, precisão e tradição em cada corte",
  },
  ...bgImages.map((src, i) => ({
    type: "image" as const,
    src,
    title: ["Ambiente Premium", "Atendimento Profissional", "Cortes Modernos", "Experiência Completa"][i] || "José Barbearia",
    subtitle: "Conheça nosso espaço",
  })),
];

const AUTO_MS = 6000;

const HighlightCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  const go = (i: number) => setCurrent((i + slides.length) % slides.length);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const slide = slides[current];

    if (slide.type === "video" && videoRef.current) {
      const v = videoRef.current;
      v.currentTime = 0;
      v.play().catch(() => {});
      const onEnded = () => go(current + 1);
      v.addEventListener("ended", onEnded);
      return () => v.removeEventListener("ended", onEnded);
    } else {
      timerRef.current = window.setTimeout(() => go(current + 1), AUTO_MS);
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [current]);

  return (
    <section className="relative w-full bg-background">
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[80vh] overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
          >
            {s.type === "video" ? (
              <video
                ref={i === current ? videoRef : undefined}
                src={s.src}
                className="w-full h-full object-cover"
                playsInline
                muted={muted}
                autoPlay={i === current}
                preload="metadata"
              />
            ) : (
              <img src={s.src} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ))}

        {/* Texto + CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8 z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-primary mb-2">Destaque</p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold font-display text-gradient mb-2 sm:mb-3">
              {slides[current].title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              {slides[current].subtitle}
            </p>
            <a
              href="/agendar"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 sm:px-7 sm:py-4 rounded-lg text-sm sm:text-base font-semibold hover:brightness-110 transition-all glow-primary"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Agendar Agora
            </a>
          </div>
        </div>

        {/* Mute toggle (apenas vídeo) */}
        {slides[current].type === "video" && (
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Ativar som" : "Desativar som"}
            className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-background/60 backdrop-blur border border-border flex items-center justify-center hover:bg-background/80 transition"
          >
            {muted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
          </button>
        )}

        {/* Setas */}
        <button
          onClick={() => go(current - 1)}
          aria-label="Anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/50 backdrop-blur border border-border flex items-center justify-center hover:bg-background/80 transition"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => go(current + 1)}
          aria-label="Próximo"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/50 backdrop-blur border border-border flex items-center justify-center hover:bg-background/80 transition"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>

        {/* Indicadores */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-primary" : "w-2 bg-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HighlightCarousel;
