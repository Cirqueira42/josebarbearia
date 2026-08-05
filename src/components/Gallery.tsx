import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Scissors } from "lucide-react";

const FALLBACK = [
  { src: "https://dull-gray-4q5gqzly1a.edgeone.app/Screenshot_20260129-130048.Chrome.jpg", alt: "Interior da barbearia" },
  { src: "https://quintessential-teal-urcrjl7agg.edgeone.app/Screenshot_20260129-130055.Chrome.jpg", alt: "Fachada da barbearia" },
  { src: "https://scattered-chocolate-dua0vnwwnm.edgeone.app/Screenshot_20260129-130043.Chrome.jpg", alt: "Área de espera" },
  { src: "https://private-pink-wgdurvqpwk.edgeone.app/Screenshot_20260129-130040.Chrome.jpg", alt: "Estação de corte" },
];

type Photo = { src: string; alt: string };

const Gallery = () => {
  const [photos, setPhotos] = useState<Photo[]>(FALLBACK);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("gallery_photos")
        .select("storage_path, caption")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const mapped = data.map((p) => {
          const { data: pub } = supabase.storage.from("gallery").getPublicUrl(p.storage_path);
          return { src: pub.publicUrl, alt: p.caption || "Trabalho realizado na José Barbearia" };
        });
        setPhotos(mapped);
      }
    };
    load();
  }, []);

  const [featured, ...rest] = photos;

  return (
    <section id="portfolio" className="section-padding bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 px-3 py-1 rounded-full">
            <Scissors className="w-3 h-3" /> Portfólio
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-4">
          Nossos Trabalhos
        </h2>
        <p className="text-muted-foreground text-center mb-10">
          Cortes, barbas e acabamentos feitos aqui na José Barbearia
        </p>

        {featured && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-primary/30 shadow-xl group">
            <img
              src={featured.src}
              alt={featured.alt}
              className="w-full h-64 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground drop-shadow">{featured.alt}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rest.map((img, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
