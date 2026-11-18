import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { INDEXABLE, OPEN_GRAPH, SEO, SITE_ORIGIN } from "@/config/seo";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { BirdCursor } from "@/components/ui/BirdCursor";

/** Geometric sans closest to the official lockup's tagline lettering. */
const tagline = Jost({
  variable: "--font-tagline",
  weight: "500",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Site-wide metadata (server-rendered). Absolute URLs, canonicals and indexing
 * come only from the verified production origin (src/config/seo.ts — SITE_URL);
 * each page sets its own canonical. The share image is app/opengraph-image.tsx.
 */
export const metadata: Metadata = {
  ...(SITE_ORIGIN ? { metadataBase: SITE_ORIGIN } : {}),
  applicationName: SEO.brand,
  title: { default: SEO.title, template: SEO.titleTemplate },
  description: SEO.description,
  robots: INDEXABLE
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
    : { index: false, follow: false },
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image", title: SEO.title, description: SEO.description },
  ...(SEO.googleVerification ? { verification: { google: SEO.googleVerification } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${tagline.variable} antialiased`}>
      <body>
        <SmoothScrollProvider />
        {children}
        <BirdCursor />
      </body>
    </html>
  );
}
