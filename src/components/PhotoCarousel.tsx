import { useState, useEffect } from "react";
import heroImage from "@/assets/hero-barbershop.jpg";

const bgImages = [
  heroImage,
  "https://dull-gray-4q5gqzly1a.edgeone.app/Screenshot_20260129-130048.Chrome.jpg",
  "https://quintessential-teal-urcrjl7agg.edgeone.app/Screenshot_20260129-130055.Chrome.jpg",
  "https://scattered-chocolate-dua0vnwwnm.edgeone.app/Screenshot_20260129-130043.Chrome.jpg",
  "https://private-pink-wgdurvqpwk.edgeone.app/Screenshot_20260129-130040.Chrome.jpg",
];

export { bgImages };

const PhotoCarousel = ({ overlay = "light" }: { overlay?: "light" | "medium" | "heavy" }) => {
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const overlayClass =
    overlay === "light"
      ? "bg-gradient-to-b from-background/40 via-background/30 to-background/60"
      : overlay === "medium"
      ? "bg-gradient-to-b from-background/60 via-background/50 to-background/70"
      : "bg-gradient-to-b from-background/70 via-background/60 to-background/80";

  return (
    <>
      {bgImages.map((img, i) => (
        <div
          key={i}
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
