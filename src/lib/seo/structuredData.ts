import { SAME_AS, SEO, SERVICE_PAGES, absoluteUrl } from "@/config/seo";
import { projectPath, type ProjectWithPage } from "@/lib/work/projects";

/**
 * Schema.org JSON-LD for the homepage — only facts the site actually shows.
 * Needs the verified production origin for stable identifiers (@id); without
 * it, nothing is emitted. LocalBusiness entities for the Dubai / Kerala offices
 * are deferred until their real addresses exist in src/config/contact.ts.
 */
export function homeStructuredData() {
  const site = absoluteUrl("/");
  if (!site) return null;
  const org = `${site}#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: SEO.brand,
        url: site,
        logo: absoluteUrl(SEO.logo),
        description: SEO.description,
        areaServed: SEO.areaServed,
        ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${site}#website`,
        url: site,
        name: SEO.brand,
        inLanguage: SEO.language,
        publisher: { "@id": org },
      },
      ...SERVICE_PAGES.map((s) => ({
        "@type": "Service",
        "@id": `${site}#service-${s.id}`,
        name: s.name,
        serviceType: s.name,
        provider: { "@id": org },
        areaServed: SEO.areaServed,
        ...(s.published ? { url: absoluteUrl(`/services/${s.slug}`) } : {}),
      })),
    ],
  };
}

/**
 * CreativeWork for a published project page — only what the page shows. Needs
 * the production origin; unpublished pages get none.
 */
export function projectStructuredData(p: ProjectWithPage) {
  const url = absoluteUrl(projectPath(p));
  const site = absoluteUrl("/");
  if (!url || !site || !p.published) return null;
  const images = p.page.gallery.filter((m) => m.type === "image").map((m) => absoluteUrl(m.src));
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#work`,
    name: p.title,
    url,
    ...(p.page.description ? { description: p.page.description } : {}),
    ...(p.page.year ? { dateCreated: p.page.year } : {}),
    ...(p.page.services.length ? { keywords: p.page.services.join(", ") } : {}),
    ...(images.length ? { image: images } : {}),
    creator: { "@id": `${site}#organization` },
    inLanguage: SEO.language,
  };
}

/** Safe for a <script> element: no "</script>" break-out, no HTML comments. */
export const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
