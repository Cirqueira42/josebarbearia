import { Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJ_____JOSE_BARBEARIA";
const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/JVahTmuAYLfAiyx57";

const Reviews = () => {
  return (
    <section className="section-padding bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient mb-4">
          Avaliações no Google
        </h2>
        <div className="flex items-center justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className="w-6 h-6 fill-primary text-primary" />
          ))}
        </div>
        <p className="text-muted-foreground mb-2">
          Veja o que nossos clientes estão dizendo no Google Maps
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Sua avaliação ajuda outras pessoas a conhecerem nosso trabalho 💈
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          <Button asChild size="lg" className="font-bold">
            <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
              <Star className="w-5 h-5 mr-2 fill-current" />
              Avaliar no Google
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-bold">
            <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-5 h-5 mr-2" />
              Ver Avaliações
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
