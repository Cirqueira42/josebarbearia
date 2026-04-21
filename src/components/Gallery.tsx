import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
          return { src: pub.publicUrl, alt: p.caption || "Foto da barbearia" };
        });
        setPhotos(mapped);
      }
    };
    load();
  }, []);

  return (
    <section className="section-padding bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-gradient text-center mb-4">
          Nossa Barbearia
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          Conheça nosso espaço profissional
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map((img, i) => (
            <div
              key={i}
              className="aspect-video rounded-lg overflow-hidden border border-border"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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
