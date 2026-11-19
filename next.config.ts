import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * Browser caching of /public media. Next serves these with `max-age=0`, so every
   * repeat visit revalidates each video, logo and image. Their filenames are NOT
   * content-hashed (a changed asset keeps its URL), so they must not be immutable:
   * one day fresh, then up to a week served from cache while it revalidates in the
   * background — repeat visits within a day make no request at all, and a replaced
   * asset is picked up within a day of a deploy. (/_next/static stays Next's
   * `max-age=31536000, immutable`; HTML and metadata routes keep Next's defaults.)
   * To make an asset immutable, version its filename (e.g. showreel-720.v2.mp4).
   */
  async headers() {
    const media = "public, max-age=86400, stale-while-revalidate=604800";
    return ["/videos/:path*", "/clients/:path*", "/logo/:path*", "/images/:path*", "/icons/:path*"].map(
      (source) => ({ source, headers: [{ key: "Cache-Control", value: media }] }),
    );
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
