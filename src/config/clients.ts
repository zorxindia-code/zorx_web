/**
 * Client logos for the carousel. Each file in /public/clients is one logo cut
 * from /public/icons/zorx-clients.png (3428×214 sheet, white on transparent;
 * the sheet itself is untouched): the logo's alpha bounds + 2 px, lossless
 * WebP at its native size. `width` / `height` are those native pixel sizes —
 * every logo is drawn at the same scale, so the balance between logos stays
 * exactly as designed on the sheet.
 */
export interface ClientLogo {
  name: string;
  src: string;
  width: number;
  height: number;
}

export const CLIENT_LOGOS: readonly ClientLogo[] = [
  { name: "Wash Zone Laundry", src: "/clients/wash-zone-laundry.webp", width: 166, height: 126 },
  { name: "Super Cut", src: "/clients/super-cut.webp", width: 161, height: 120 },
  { name: "Replica Gallery", src: "/clients/replica-gallery.webp", width: 258, height: 62 },
  { name: "Al Sarab", src: "/clients/al-sarab.webp", width: 96, height: 97 },
  { name: "Audiopro", src: "/clients/audiopro.webp", width: 254, height: 53 },
  { name: "CRAV Grill N Cafe", src: "/clients/crav.webp", width: 213, height: 87 },
  { name: "Boat", src: "/clients/boat.webp", width: 97, height: 105 },
  { name: "Harven", src: "/clients/harven.webp", width: 219, height: 71 },
  { name: "M10 Resto", src: "/clients/m10-resto.webp", width: 167, height: 100 },
  { name: "Pizza Sixteen", src: "/clients/pizza-sixteen.webp", width: 135, height: 116 },
  { name: "Press'D Café", src: "/clients/pressd-cafe.webp", width: 238, height: 77 },
  { name: "Shots Laundry", src: "/clients/shots-laundry.webp", width: 273, height: 108 },
];

export const CLIENTS_TUNING = {
  /** Carousel speed (CSS px per second), the same on every screen size. */
  speed: 48,
  /** Hover: time to glide to a stop / back up to speed (ms). */
  easeMs: 650,
} as const;
