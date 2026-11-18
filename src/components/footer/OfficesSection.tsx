import { servicesFont } from "@/components/services/font";
import { OFFICES, type Office } from "@/config/contact";
import ContactMap from "./ContactMap";
import "./OfficesSection.css";

/**
 * Footer part 2: two contact columns (UAE in white, India in muted grey) and the
 * illustrated route map on the right. Server-rendered; only the map's motion
 * control runs on the client. Each column shows only the details that exist in
 * config (src/config/contact.ts) — nothing is invented.
 */
export default function OfficesSection() {
  return (
    <section className={`zorx-offices ${servicesFont.variable}`} aria-labelledby="zorx-offices-title">
      <h2 id="zorx-offices-title" className="sr-only">
        Our offices — Dubai, UAE and Kerala, India
      </h2>
      <div className="zorx-offices-grid">
        {OFFICES.map((office) => (
          <OfficeColumn key={office.id} office={office} />
        ))}
        <ContactMap offices={OFFICES} />
      </div>
    </section>
  );
}

function OfficeColumn({ office }: { office: Office }) {
  return (
    <address className="zorx-office" data-office={office.id}>
      <h3 className="zorx-office-heading">Contact</h3>
      {office.address && (
        <p className="zorx-office-address">
          {office.address.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </p>
      )}
      <p className="zorx-office-country">{office.country}</p>
      {office.phone && (
        <a className="zorx-office-link" href={`tel:${office.phone.replace(/[^\d+]/g, "")}`}>
          {office.phone}
        </a>
      )}
      {office.email && (
        <a className="zorx-office-link" href={`mailto:${office.email}`}>
          {office.email}
        </a>
      )}
    </address>
  );
}
