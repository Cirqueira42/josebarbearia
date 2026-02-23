const images = [
  "https://dull-gray-4q5gqzly1a.edgeone.app/Screenshot_20260129-130048.Chrome.jpg",
  "https://quintessential-teal-urcrjl7agg.edgeone.app/Screenshot_20260129-130055.Chrome.jpg",
  "https://scattered-chocolate-dua0vnwwnm.edgeone.app/Screenshot_20260129-130043.Chrome.jpg",
  "https://private-pink-wgdurvqpwk.edgeone.app/Screenshot_20260129-130040.Chrome.jpg",
];

const Gallery = () => {
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
          {images.map((src, i) => (
            <div
              key={i}
              className="aspect-video rounded-lg overflow-hidden border border-border"
            >
              <img
                src={src}
                alt={`Interior da barbearia ${i + 1}`}
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
