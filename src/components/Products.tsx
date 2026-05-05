import { MessageCircle, Sparkles } from "lucide-react";
import ceraExtra from "@/assets/produto-cera-extra-forte.jpg";
import ceraBlack from "@/assets/produto-cera-black.jpg";
import ceraMatte from "@/assets/produto-cera-matte.jpg";
import ceraTeia from "@/assets/produto-cera-teia.jpg";
import shampooPuroFio from "@/assets/produto-shampoo-puro-fio.jpg";
import oleoDonVitor from "@/assets/produto-oleo-donvitor.jpg";

type Product = {
  brand: string;
  name: string;
  description: string;
  price: number;
  image: string;
  highlight?: string;
};

const PHONE = "5516997369740";

const products: Product[] = [
  {
    brand: "Vision Barber Shop",
    name: "Cera Extra Forte",
    description: "Estilizadora de fixação máxima — 250g",
    price: 17.99,
    image: ceraExtra,
    highlight: "Mais Vendida",
  },
  {
    brand: "Vision Barber Shop",
    name: "Cera Black",
    description: "Estilizadora preta — 130g",
    price: 17.99,
    image: ceraBlack,
  },
  {
    brand: "Vision Barber Shop",
    name: "Cera Matte",
    description: "Acabamento fosco natural — 70g",
    price: 11.99,
    image: ceraMatte,
  },
  {
    brand: "Vision Barber Shop",
    name: "Cera Efeito Teia",
    description: "Efeito teia / textura — 70g",
    price: 11.99,
    image: ceraTeia,
  },
  {
    brand: "Puro Fio",
    name: "Shampoo Anticaspa",
    description: "Frescor e equilíbrio — 250ml",
    price: 19.99,
    image: shampooPuroFio,
  },
  {
    brand: "DonVitor",
    name: "Óleo para Barba Adrenaline",
    description: "Premium Edition — barba, cabelo e bigode — 30ml",
    price: 14.99,
    image: oleoDonVitor,
  },
];

const formatPrice = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const buildWhatsappLink = (p: Product) => {
  const msg = `Olá! Gostaria de comprar *${p.brand} — ${p.name}* (${formatPrice(p.price)}).`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(msg)}`;
};

const Products = () => {
  return (
    <section id="produtos" className="section-padding bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Catálogo Oficial
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-3">
          Produtos da Barbearia
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Pomadas, shampoo e óleo para barba selecionados. Peça direto pelo WhatsApp e retire na loja.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <article
              key={`${product.brand}-${product.name}`}
              className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all flex flex-col shadow-sm hover:shadow-lg hover:shadow-primary/10"
            >
              {product.highlight && (
                <span className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                  {product.highlight}
                </span>
              )}

              <div className="aspect-square overflow-hidden bg-background">
                <img
                  src={product.image}
                  alt={`${product.brand} ${product.name}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              <div className="p-4 flex flex-col flex-1">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                  {product.brand}
                </span>
                <h3 className="text-foreground font-bold mt-0.5 leading-tight">
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3 flex-1">
                  {product.description}
                </p>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Preço
                    </span>
                    <span className="text-primary font-bold text-2xl font-display leading-none">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-success uppercase tracking-wider bg-success/10 px-2 py-1 rounded">
                    Disponível
                  </span>
                </div>

                <a
                  href={buildWhatsappLink(product)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-whatsapp text-success-foreground py-2.5 rounded-md font-semibold hover:brightness-110 transition-all text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Pedir pelo WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Estoque limitado · Retirada na barbearia · Pagamento na entrega
        </p>
      </div>
    </section>
  );
};

export default Products;
