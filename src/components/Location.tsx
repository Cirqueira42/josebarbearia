import { MapPin, Navigation } from "lucide-react";

const Location = () => {
  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-4">
          Nossa Localização
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          Visite-nos em Guariba - SP
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-lg p-8 flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-6">
              <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold font-display text-foreground mb-2">
                  Endereço
                </h3>
                <p className="text-muted-foreground">
                  Av. Otávio Rangel, 477 - Vila Cecap, Guariba - SP, 14845-106
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 mb-8">
              <Navigation className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold font-display text-foreground mb-2">
                  Como Chegar
                </h3>
                <p className="text-muted-foreground">
                  Estamos localizados na Av. Otávio Rangel, próximo ao centro de Guariba. Fácil acesso e estacionamento disponível.
                </p>
              </div>
            </div>

            <a
              href="https://www.google.com/maps/search/?api=1&query=Av.%20Ot%C3%A1vio%20Rangel%2C%20477%20-%20Vila%20Cecap%2C%20Guariba%20-%20SP%2C%2014845-106"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:brightness-110 transition-all"
            >
              <MapPin className="w-4 h-4" />
              Abrir no Google Maps
            </a>
          </div>

          <div className="rounded-lg overflow-hidden border border-border aspect-video md:aspect-auto">
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=-48.2475%2C-21.3620%2C-48.2375%2C-21.3550&layer=mapnik&marker=-21.3585%2C-48.2425"
              className="w-full h-full min-h-[300px]"
              style={{ border: 0 }}
              loading="lazy"
              title="Localização José Barbearia"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;
