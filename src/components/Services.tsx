import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
  image_path: string | null;
  duration_minutes: number | null;
};

const isMostWanted = (name: string) => /corte\s*\+\s*barba/i.test(name);

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, description, price, icon, image_path, duration_minutes")
        .order("name");
      if (data) setServices(data as Service[]);
    };
    fetch();
  }, []);

  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80 text-center mb-3">
          Escolha o serviço
        </p>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-3">
          Nossos Serviços
        </h2>
        <div className="w-12 h-px bg-primary/50 mx-auto mb-12" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => {
            const imgUrl = service.image_path
              ? supabase.storage.from("services").getPublicUrl(service.image_path).data.publicUrl
              : null;
            return (
              <article
                key={service.id}
                className="relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors duration-300 group"
              >
                {imgUrl && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                    <img
                      src={imgUrl}
                      alt={`Serviço de ${service.name} na José Barbearia`}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                  </div>
                )}

                {isMostWanted(service.name) && (
                  <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.2em] font-semibold text-primary border border-primary/50 bg-background/70 backdrop-blur px-2.5 py-1 rounded-full">
                    Mais pedido
                  </span>
                )}

                <div className="flex flex-col flex-1 p-5">
                  <h3 className="text-lg font-bold font-display text-foreground uppercase tracking-wide">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{service.description}</p>
                  )}

                  <div className="flex items-baseline justify-between gap-3 mt-4 pt-4 border-t border-border/70">
                    <p className="text-primary font-bold text-2xl leading-none">
                      R$ {service.price.toFixed(0)}
                      <span className="text-sm">{(service.price % 1).toFixed(2).slice(1)}</span>
                    </p>
                    {service.duration_minutes ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {service.duration_minutes} min
                      </span>
                    ) : null}
                  </div>

                  <button
                    onClick={() => navigate(`/agendar?service=${service.id}`)}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-primary/10 border border-primary/40 text-primary py-3 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary hover:text-primary-foreground active:scale-[0.98] transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
