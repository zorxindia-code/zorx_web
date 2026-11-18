import ZorxExperience from "@/components/zorx/ZorxExperience";
import VisionSection from "@/components/vision/VisionSection";
import ServicesSection from "@/components/services/ServicesSection";
import ClientsSection from "@/components/clients/ClientsSection";
import FeaturedWork from "@/components/work/FeaturedWork";
import SiteFooter from "@/components/footer/SiteFooter";

export default function Home() {
  return (
    <>
      <main>
        <ZorxExperience />
        <VisionSection />
        <ServicesSection />
        <ClientsSection />
        <FeaturedWork />
      </main>
      <SiteFooter />
    </>
  );
}
