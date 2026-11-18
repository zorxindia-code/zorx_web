import type { MetadataRoute } from "next";
import { INDEXABLE, absoluteUrl } from "@/config/seo";

/**
 * /robots.txt — production: crawl everything (JS, CSS, fonts and media
 * included) and find the sitemap. Previews / builds without a verified
 * SITE_URL: crawl nothing (the pages also carry noindex — robots.txt alone
 * doesn't keep a URL out of the index).
 */
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml")! };
}
