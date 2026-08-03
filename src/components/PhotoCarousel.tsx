import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const defaultBgImages = [
  "https://dull-gray-4q5gqzly1a.edgeone.app/Screenshot_20260129-130048.Chrome.jpg",
  "https://quintessential-teal-urcrjl7agg.edgeone.app/Screenshot_20260129-130055.Chrome.jpg",
  "https://scattered-chocolate-dua0vnwwnm.edgeone.app/Screenshot_20260129-130043.Chrome.jpg",
  "https://private-pink-wgdurvqpwk.edgeone.app/Screenshot_20260129-130040.Chrome.jpg",
];

export { defaultBgImages, defaultBgImages as bgImages };

const PhotoCarousel = ({ overlay = "light" }: { overlay?: "light" | "medium" | "heavy" }) => {
  const [images, setImages] = useState<string[]>(defaultBgImages);
  const [currentBg, setCurrentBg] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("hero_backgrounds")
      .select("storage_path, display_order, created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const urls = data.map(
        (b) => supabase.storage.from("gallery").getPublicUrl(b.storage_path).data.publicUrl
      );
      setImages(urls);
      setCurrentBg(0);
    } else {
      setImages(defaultBgImages);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("hero-bg-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_backgrounds" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images]);

  const overlayClass =
    overlay === "light"
      ? "bg-gradient-to-b from-background/10 via-transparent to-background/20"
      : overlay === "medium"
      ? "bg-gradient-to-b from-background/20 via-transparent to-background/20"
      : "bg-gradient-to-b from-background/30 via-background/5 to-background/30";

  return (
    <>
      {images.map((img, i) => (
        <div
          key={img + i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${img})`,
            opacity: i === currentBg ? 1 : 0,
          }}
        />
      ))}
      <div className={`absolute inset-0 ${overlayClass}`} />
    </>
  );
};

export default PhotoCarousel;
