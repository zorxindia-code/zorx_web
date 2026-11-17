import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { BirdCursor } from "@/components/ui/BirdCursor";

/** Geometric sans closest to the official lockup's tagline lettering. */
const tagline = Jost({
  variable: "--font-tagline",
  weight: "500",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZORX — Interactive Agency",
  description: "ZORX is an interactive creative agency.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${tagline.variable} antialiased`}>
      <body>
        {children}
        <BirdCursor />
      </body>
    </html>
  );
}
