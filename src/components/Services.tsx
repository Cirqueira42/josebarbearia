import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
};

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("services").select("id, name, description, price, icon").order("name");
      if (data) setServices(data);
    };
    fetch();
  }, []);

  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-4">
          Nossos Serviços
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          Escolha o serviço e agende seu horário
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/40 transition-all group"
            >
              <span className="text-3xl mb-4 block">{service.icon}</span>
              <h3 className="text-xl font-bold font-display text-foreground mb-2">
                {service.name}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
              <p className="text-primary font-bold text-2xl mb-4">R$ {service.price.toFixed(2)}</p>
              <button
                onClick={() => navigate(`/agendar?service=${service.id}`)}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:brightness-110 transition-all text-sm"
              >
                <Calendar className="w-4 h-4" />
                Agendar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
