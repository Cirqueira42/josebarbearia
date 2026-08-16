import Hero from "@/components/Hero";
import HighlightCarousel from "@/components/HighlightCarousel";
import Products from "@/components/Products";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import Reviews from "@/components/Reviews";
import Location from "@/components/Location";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <HighlightCarousel />
      <Gallery />
      <Services />
      <Products />
      <Reviews />

      <Location />
      <Footer />
    </main>
  );
};

export default Index;
