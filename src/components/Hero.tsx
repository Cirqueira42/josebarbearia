import { Scissors, Calendar, MapPin, Instagram } from "lucide-react";
import heroImage from "@/assets/hero-barbershop.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-background/85" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-pulse-glow">
          <Scissors className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold font-display text-gradient mb-6">
          José Barbearia
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
          Agende seu horário e venha viver a melhor experiência em barbearia
        </p>

        <a
          href="https://josebarbearia.app.br/agendar"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 transition-all glow-primary"
        >
          <Calendar className="w-5 h-5" />
          Agendar Horário Online
        </a>

        <p className="text-muted-foreground text-sm mt-4">
          Acesse: josebarbearia.app.br/agendar
        </p>

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
