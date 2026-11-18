/**
 * Client logos for the carousel. Each file in /public/clients is one logo,
 * white on transparent: the logo's alpha bounds + 2 px, lossless WebP at its
 * native size. `width` / `height` are those native pixel sizes — every logo is
 * drawn at the same scale, so the balance between logos stays as designed.
 *
 * Most are cut from assets-src/icons/zorx-clients.png (3428×214 sheet, white
 * on transparent; the sheet itself is untouched). Logos supplied in their own
 * colours are converted to the same white style by scripts/make-client-logo.mjs
 * from the untouched originals in assets-src/clients/, sized by eye against
 * the sheet's logos (wordmarks in the sheet's range):
 *   halima-trading — red / black on transparent: every pixel white, alpha kept
 *     --in assets-src/clients/halima-trading.png --out public/clients/halima-trading.webp --mode alpha --height 76
 *   stepvision — gold on white: gold → white by its warmth, the white S / silver V
 *     become knockouts, the white outlined subtitle is filled white
 *     --in assets-src/clients/stepvision.png --out public/clients/stepvision.webp --mode warm
 *     --warm 12:60 --fill-outlines 425:252:1012:296 --outline 247 --height 68
 */
export interface ClientLogo {
  name: string;
  src: string;
  width: number;
  height: number;
}

export const CLIENT_LOGOS: readonly ClientLogo[] = [
  { name: "Wash Zone Laundry", src: "/clients/wash-zone-laundry.webp", width: 166, height: 126 },
  { name: "Stepvision International Trading LLC", src: "/clients/stepvision.webp", width: 309, height: 72 },
  { name: "Super Cut", src: "/clients/super-cut.webp", width: 161, height: 120 },
  { name: "Replica Gallery", src: "/clients/replica-gallery.webp", width: 258, height: 62 },
  { name: "Al Sarab", src: "/clients/al-sarab.webp", width: 96, height: 97 },
  { name: "Audiopro", src: "/clients/audiopro.webp", width: 254, height: 53 },
  { name: "CRAV Grill N Cafe", src: "/clients/crav.webp", width: 213, height: 87 },
  { name: "Boat", src: "/clients/boat.webp", width: 97, height: 105 },
  { name: "Harven", src: "/clients/harven.webp", width: 219, height: 71 },
  { name: "M10 Resto", src: "/clients/m10-resto.webp", width: 167, height: 100 },
  { name: "Halima Trading LLC", src: "/clients/halima-trading.webp", width: 330, height: 80 },
  { name: "Pizza Sixteen", src: "/clients/pizza-sixteen.webp", width: 135, height: 116 },
  { name: "Press'D Café", src: "/clients/pressd-cafe.webp", width: 238, height: 77 },
  { name: "Shots Laundry", src: "/clients/shots-laundry.webp", width: 273, height: 108 },
];

export const CLIENTS_TUNING = {
  /** Carousel speed (CSS px per second), the same on every screen size (48 × 1.25). */
  speed: 60,
  /** Hover: time to glide to a stop / back up to speed (ms). */
  easeMs: 650,
} as const;
