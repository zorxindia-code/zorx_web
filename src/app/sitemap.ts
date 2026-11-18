import type { MetadataRoute } from "next";
import { FEATURED_WORK } from "@/config/work";
import { INDEXABLE, SERVICE_PAGES, absoluteUrl } from "@/config/seo";

/**
 * /sitemap.xml — only real, published, canonical pages on the verified
 * production origin. Service and project pages join automatically once they
 * are marked published (with their real update date). No fake lastModified.
 * Off (empty) on previews / without SITE_URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];
  const home = absoluteUrl("/")!;
  const services = SERVICE_PAGES.filter((s) => s.published).map((s) => ({ url: absoluteUrl(`/services/${s.slug}`)! }));
  const work = FEATURED_WORK.filter((p) => p.published && p.slug).map((p) => ({
    url: absoluteUrl(`/work/${p.slug}`)!,
    ...(p.updatedAt ? { lastModified: p.updatedAt } : {}),
  }));
  return [{ url: home }, ...services, ...work];
}
