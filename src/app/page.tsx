import ZorxExperience from "@/components/zorx/ZorxExperience";
import VisionSection from "@/components/vision/VisionSection";
import ServicesSection from "@/components/services/ServicesSection";
import ClientsSection from "@/components/clients/ClientsSection";
import FeaturedWork from "@/components/work/FeaturedWork";
import SiteFooter from "@/components/footer/SiteFooter";
import type { Metadata } from "next";
import { OPEN_GRAPH, SITE_ORIGIN } from "@/config/seo";
import { homeStructuredData, serializeJsonLd } from "@/lib/seo/structuredData";

/** The homepage's own canonical (resolved against the production origin). */
export const metadata: Metadata = SITE_ORIGIN ? { alternates: { canonical: "/" }, openGraph: { ...OPEN_GRAPH, url: "/" } } : {};

export default function Home() {
  const jsonLd = homeStructuredData();
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />}
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
