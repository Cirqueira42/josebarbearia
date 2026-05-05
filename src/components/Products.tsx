import { useEffect, useState } from "react";
import { MessageCircle, Sparkles, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id: string;
  brand: string;
  name: string;
  description: string | null;
  price: number;
  image_path: string | null;
  in_stock: boolean;
  highlight: string | null;
};

const PHONE = "5516997369740";

const formatPrice = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const buildWhatsappLink = (p: Product) => {
  const msg = `Olá! Gostaria de comprar *${p.brand} — ${p.name}* (${formatPrice(p.price)}).`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(msg)}`;
};

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (data) setProducts(data as Product[]);
    };
    load();

    const channel = supabase
      .channel("products-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (products.length === 0) return null;

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
          {products.map((product) => {
            const imgUrl = product.image_path
              ? supabase.storage.from("products").getPublicUrl(product.image_path).data.publicUrl
              : null;
            const out = !product.in_stock;
            return (
              <article
                key={product.id}
                className={`group relative bg-card rounded-xl overflow-hidden border border-border transition-all flex flex-col shadow-sm ${
                  out ? "opacity-60" : "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                }`}
              >
                {product.highlight && !out && (
                  <span className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                    {product.highlight}
                  </span>
                )}
                {out && (
                  <span className="absolute top-3 left-3 z-10 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                    Esgotado
                  </span>
                )}

                <div className="aspect-square overflow-hidden bg-background flex items-center justify-center">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={`${product.brand} ${product.name}`}
                      className={`w-full h-full object-cover transition-transform duration-500 ${out ? "grayscale" : "group-hover:scale-105"}`}
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                    {product.brand}
                  </span>
                  <h3 className="text-foreground font-bold mt-0.5 leading-tight">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-1 mb-3 flex-1">{product.description}</p>
                  )}

                  <div className="flex items-end justify-between mb-3 mt-auto">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Preço</span>
                      <span className="text-primary font-bold text-2xl font-display leading-none">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    {!out && (
                      <span className="text-[10px] font-semibold text-success uppercase tracking-wider bg-success/10 px-2 py-1 rounded">
                        Disponível
                      </span>
                    )}
                  </div>

                  {out ? (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground py-2.5 rounded-md font-semibold text-sm cursor-not-allowed"
                    >
                      Indisponível no momento
                    </button>
                  ) : (
                    <a
                      href={buildWhatsappLink(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-whatsapp text-success-foreground py-2.5 rounded-md font-semibold hover:brightness-110 transition-all text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Pedir pelo WhatsApp
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Estoque limitado · Retirada na barbearia · Pagamento na entrega
        </p>
      </div>
    </section>
  );
};

export default Products;
