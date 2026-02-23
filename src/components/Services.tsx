import { Scissors, Sparkles } from "lucide-react";

const services = [
  { name: "Corte", desc: "Corte moderno e estiloso", price: "R$ 30", icon: "✂️" },
  { name: "Barba", desc: "Barba profissional e bem feita", price: "R$ 20", icon: "🪒" },
  { name: "Corte + Barba", desc: "Pacote completo: corte moderno + barba bem feita", price: "R$ 45", icon: "💈" },
  { name: "Corte Infantil", desc: "Corte infantil com cuidado especial", price: "R$ 25", icon: "👦" },
  { name: "Sobrancelha", desc: "Design de sobrancelha perfeito", price: "R$ 10", icon: "✨" },
  { name: "Pezinho", desc: "Finalização perfeita", price: "R$ 10", icon: "💇" },
];

const Services = () => {
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
              key={service.name}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/40 transition-all group"
            >
              <span className="text-3xl mb-4 block">{service.icon}</span>
              <h3 className="text-xl font-bold font-display text-foreground mb-2">
                {service.name}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">{service.desc}</p>
              <p className="text-primary font-bold text-2xl">{service.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
