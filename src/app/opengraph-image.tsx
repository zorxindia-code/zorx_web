import { shareImage } from "@/lib/seo/shareImage";

// Segment config must be literal (statically analysed) — keep in step with SHARE_IMAGE.
export const alt = "ZORX — Interactive Agency logo on black";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return shareImage();
}
