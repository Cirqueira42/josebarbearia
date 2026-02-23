import { MessageCircle } from "lucide-react";

const products = [
  {
    name: "Cera Extra Forte",
    price: "R$ 17.99",
    image: "https://balanced-salmon-qsofaxkatm.edgeone.app/IMG_20260123_170049871.jpg",
    whatsapp: "https://wa.me/5516997369740?text=Ol%C3%A1!%20Gostaria%20de%20comprar%20*Cera%20Extra%20Forte*%20-%20R%24%2017.99",
  },
  {
    name: "Cera Perolada",
    price: "R$ 17.99",
    image: "https://theoretical-purple-vn8yt2jhi8.edgeone.app/IMG_20260123_170040419.jpg",
    whatsapp: "https://wa.me/5516997369740?text=Ol%C3%A1!%20Gostaria%20de%20comprar%20*Cera%20Perolada*%20-%20R%24%2017.99",
  },
  {
    name: "Cera Black",
    price: "R$ 17.99",
    image: "https://intense-lime-lkcmgnmiy5.edgeone.app/IMG_20260123_170135657.jpg",
    whatsapp: "https://wa.me/5516997369740?text=Ol%C3%A1!%20Gostaria%20de%20comprar%20*Cera%20Black*%20-%20R%24%2017.99",
  },
  {
    name: "Cera Matte",
    price: "R$ 17.99",
    image: "https://horrible-blue-zxweihvc7r.edgeone.app/IMG_20260123_170127186.jpg",
    whatsapp: "https://wa.me/5516997369740?text=Ol%C3%A1!%20Gostaria%20de%20comprar%20*Cera%20Matte*%20-%20R%24%2017.99",
  },
];

const Products = () => {
  return (
    <section className="section-padding bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-4">
          Pomadas Modeladoras
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          R$ 17.99 por unidade
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.name}
              className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-all group"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <span className="text-xs font-semibold text-success uppercase tracking-wider">
                  Disponível
                </span>
                <h3 className="text-foreground font-semibold mt-1">{product.name}</h3>
                <p className="text-primary font-bold text-xl mt-2">{product.price}</p>
                <a
                  href={product.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-whatsapp text-success-foreground py-2.5 rounded-md font-medium hover:brightness-110 transition-all text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Comprar via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;
