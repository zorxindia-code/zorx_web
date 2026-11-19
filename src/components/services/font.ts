import localFont from "next/font/local";

/**
 * Outfit — the services section typeface, from the supplied font folder
 * (assets-src/fonts/Outfit, © The Outfit Project Authors, SIL OFL 1.1). next/font
 * reads it at build time and serves its own fingerprinted copy, so the folder
 * is not deployed.
 *
 * The variable font as provided (one file, wght 100–900, so the 500 outlined →
 * 700 solid change interpolates smoothly), served as WOFF2: a lossless
 * re-packaging of Outfit-VariableFont_wght.ttf (kept as the source) — same
 * 414 glyphs, same cmap, same wght axis; 110.6 KB → 44.9 KB (fontTools
 * `TTFont(ttf).flavor = "woff2"`). next/font self-hosts it with a
 * metric-matched fallback (no layout shift).
 */
export const servicesFont = localFont({
  src: "../../../assets-src/fonts/Outfit/Outfit-VariableFont_wght.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-services",
  display: "swap",
  // Not preloaded: no first-screen text uses it (the intro shows only the loader;
  // Outfit's first section is several screens down), so a preload would only
  // compete with the loader's assets — and Firefox reports it as unused. The
  // browser still fetches it at first layout, long before it is seen.
  preload: false,
});
