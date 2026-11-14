import localFont from "next/font/local";

/**
 * Outfit — the services section typeface, from the supplied font folder
 * (public/fonts/Outfit, © The Outfit Project Authors, SIL OFL 1.1).
 *
 * Uses the variable file exactly as provided: one file covers every weight
 * (wght 100–900), so the 500 outlined → 700 solid change interpolates smoothly.
 * next/font self-hosts it with a metric-matched fallback (no layout shift).
 */
export const servicesFont = localFont({
  src: "../../../public/fonts/Outfit/Outfit-VariableFont_wght.ttf",
  weight: "100 900",
  style: "normal",
  variable: "--font-services",
  display: "swap",
});
