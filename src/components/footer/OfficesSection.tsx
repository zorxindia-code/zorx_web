import { Fragment, type ReactNode } from "react";
import { servicesFont } from "@/components/services/font";
import { OFFICES, type Office } from "@/config/contact";
import ContactMap from "./ContactMap";
import "./OfficesSection.css";

/**
 * Footer part 2: two contact columns (both white; the spotlight dims the other) and the
 * illustrated route map on the right. Server-rendered; only the map's motion
 * control runs on the client. Each column shows only the details that exist in
 * config (src/config/contact.ts) — nothing is invented.
 *
 * Each address line sits in a clipping wrapper so MapMotion can reveal
 * it (rise + fade) when its office becomes the active one; without JS or with
 * reduced motion the lines are simply there.
 *
 * Each column: CONTACT, country and address at the top; phone and email in a
 * lower group pushed to the column's foot (the map's bottom edge on desktop),
 * so different address lengths never move it. When any office has an email,
 * the others keep an empty line in its place, so the phones share a baseline.
 */
const ANY_EMAIL = OFFICES.some((o) => o.email);
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
      <p className="zorx-office-country">{office.country}</p>
      {office.address && (
        <p className="zorx-office-address">
          {office.address.map((line, i) => (
            <Line key={i} text={line} />
          ))}
        </p>
      )}
      {(office.phone || ANY_EMAIL) && (
        <div className="zorx-office-reach">
          {office.phone && (
            <a className="zorx-office-link" href={`tel:${office.phone.replace(/[^\d+]/g, "")}`}>
              {office.phone}
            </a>
          )}
          {office.email ? (
            <a className="zorx-office-link" href={`mailto:${office.email}`}>
              {office.email}
            </a>
          ) : (
            ANY_EMAIL && <span className="zorx-office-link" aria-hidden="true">{"\u00a0"}</span>
          )}
        </div>
      )}
    </address>
  );
}

/** One masked line: the outer span clips, the inner one moves (MapMotion reveal). */
function Line({ text }: { text: string }) {
  return (
    <span className="zorx-office-line">
      <span className="zorx-office-line-in" data-reveal-line="">
        {keepTogether(text)}
      </span>
    </span>
  );
}

/**
 * A run joined by non-breaking spaces in config never wraps inside: rendered
 * nowrap, because browsers (Safari especially) may still break right after a
 * hyphen even when a non-breaking space follows it.
 */
function keepTogether(text: string): ReactNode {
  if (!text.includes("\u00a0")) return text;
  const words = text.split(" ");
  return words.map((w, i) => (
    <Fragment key={i}>
      {w.includes("\u00a0") ? <span className="zorx-office-nowrap">{w}</span> : w}
      {i < words.length - 1 ? " " : null}
    </Fragment>
  ));
}
