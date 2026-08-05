import Hero from "@/components/Hero";
import HighlightCarousel from "@/components/HighlightCarousel";
import Products from "@/components/Products";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import Reviews from "@/components/Reviews";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

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
      <WhatsAppButton />
    </main>
  );
};

export default Index;
