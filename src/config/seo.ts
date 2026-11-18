import { OFFICES } from "@/config/contact";
import { SOCIALS } from "@/config/socials";

/**
 * Search & sharing configuration — the one place for the site's identity in
 * metadata, the sitemap, robots.txt and structured data.
 *
 * SITE_URL (env, set at BUILD time) is the verified production origin, e.g.
 * https://www.example.com. It is never guessed: without a valid production
 * origin there are no absolute canonicals, no sitemap URLs, no structured data,
 * and the site asks not to be indexed (so a preview can never be indexed by
 * accident). See docs/ai-context/SEO_AUDIT_AND_IMPLEMENTATION.md → launch checklist.
 */
function productionOrigin(): URL | null {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname) || u.hostname.endsWith(".local");
    const preview = u.hostname.endsWith(".vercel.app"); // preview hosts are never canonical
    if (u.protocol !== "https:" || local || preview) return null;
    return new URL(u.origin);
  } catch {
    return null;
  }
}

export const SITE_ORIGIN = productionOrigin();

/**
 * Indexable only on the verified production build: SITE_URL valid, not a
 * Vercel preview, and not switched off with SITE_NOINDEX=true (staging).
 */
export const INDEXABLE = !!SITE_ORIGIN && process.env.VERCEL_ENV !== "preview" && process.env.SITE_NOINDEX !== "true";

/** Absolute URL on the production origin (null without one). */
export const absoluteUrl = (path = "/") => (SITE_ORIGIN ? new URL(path, SITE_ORIGIN).toString() : null);

/** Copy from the approved brief; refine only with approved business copy. */
export const SEO = {
  brand: "ZORX",
  title: "ZORX | Creative & Digital Agency in Dubai and Kerala",
  titleTemplate: "%s | ZORX",
  description:
    "ZORX is an interactive creative agency in Dubai and Kerala, specialising in branding, web development, media production and digital marketing.",
  tagline: "Interactive Agency", // as on the official lockup
  language: "en",
  /** Logo for structured data (the official lockup, black on transparent). */
  logo: "/logo/zorx-logo-black.png",
  /** Where ZORX operates (from the brief / office map). */
  areaServed: ["Dubai, United Arab Emirates", "Kerala, India"],
  /** Google Search Console HTML-tag token (env), only when supplied. */
  googleVerification: process.env.GOOGLE_SITE_VERIFICATION?.trim() || null,
} as const;

/** Open Graph base, shared by the layout and pages (metadata merges shallowly). */
export const OPEN_GRAPH = {
  type: "website" as const,
  siteName: SEO.brand,
  locale: "en",
  title: SEO.title,
  description: SEO.description,
};

/**
 * The four services (names from the brief; the homepage rows read Branding /
 * Website / Production / Marketing). `page` is the future service landing page:
 * listed in the sitemap only once `published` (no empty pages).
 */
export const SERVICE_PAGES = [
  { id: "branding", name: "Branding", slug: "branding", published: false },
  { id: "website", name: "Website Design & Development", slug: "web-development", published: false },
  { id: "production", name: "Media Production", slug: "media-production", published: false },
  { id: "marketing", name: "Digital Marketing", slug: "digital-marketing", published: false },
] as const;

/** Verified social profiles only (null URLs are left out). */
export const SAME_AS = SOCIALS.flatMap((s) => (s.href ? [s.href] : []));

/** Office facts for structured data — only what config actually holds. */
export const OFFICE_FACTS = OFFICES;
