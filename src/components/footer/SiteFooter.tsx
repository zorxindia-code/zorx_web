import ContactSection from "@/components/contact/ContactSection";
import GravityFooter from "./GravityFooter";
import OfficesSection from "./OfficesSection";

/**
 * The homepage footer, in order:
 *   1. Bird courtship — "Interested in working together?" / LET'S TALK
 *   2. Offices — UAE + India contact columns and the route map
 *   3. THANKS — social icons and multilingual greetings that fall onto the
 *      outlined letters (GravityFooter, Matter.js)
 * Each part is its own section on the same black ground, so the next ones slot
 * in below OfficesSection without touching the others.
 */
export default function SiteFooter() {
  return (
    <footer className="zorx-footer">
      <ContactSection />
      <OfficesSection />
      <GravityFooter />
    </footer>
  );
}
