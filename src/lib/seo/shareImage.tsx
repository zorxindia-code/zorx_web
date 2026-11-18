import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** The share card: the official ZORX lockup (logo + INTERACTIVE AGENCY) on black. */
export const SHARE_IMAGE = {
  alt: "ZORX — Interactive Agency logo on black",
  size: { width: 1200, height: 630 },
  contentType: "image/png",
} as const;

export async function shareImage() {
  // the supplied white lockup, 1920 × 800, unmodified
  const logo = await readFile(join(process.cwd(), "public/logo/zorx-logo-white.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={src} width={720} height={300} alt="" />
      </div>
    ),
    { ...SHARE_IMAGE.size },
  );
}
