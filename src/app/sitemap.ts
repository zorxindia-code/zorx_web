import type { MetadataRoute } from "next";
import { LIVE_PROJECTS, projectPath } from "@/lib/work/projects";
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
  const work = LIVE_PROJECTS.map((p) => ({
    url: absoluteUrl(projectPath(p))!,
    ...(p.updatedAt ? { lastModified: p.updatedAt } : {}),
  }));
  return [{ url: home }, ...services, ...work];
}
