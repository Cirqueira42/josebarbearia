import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Products />
      <Services />
      <Gallery />
      <Location />
      <Footer />
      <WhatsAppButton />
    </main>
  );
};

export default Index;
