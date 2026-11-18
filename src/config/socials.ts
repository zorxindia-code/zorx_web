/**
 * The THANKS footer: social links and the "thank you" greetings that fall onto
 * the THANKS letters (src/components/footer/GravityFooter.tsx).
 *
 * `href` is the account URL, as supplied by ZORX (Instagram and Facebook,
 * 2026-11-18). An icon with a URL is a link (opens in a new tab, reachable by
 * keyboard; a drag never opens it); one without (null) is shown — and is still
 * a physical object — but is not a link. Never invent a URL. The URLs also feed
 * the Organization's `sameAs` (src/config/seo.ts).
 *
 * Colours are measured from the supplied design (the footer reference images).
 */
export type SocialId = "whatsapp" | "linkedin" | "instagram" | "x" | "facebook";
export type GreetingId = "gracias" | "nanni" | "shukran" | "xiexie";

export interface Social {
  id: SocialId;
  /** Accessible name. */
  label: string;
  href: string | null;
  /** Disc colour and glyph colour. */
  bg: string;
  fg: string;
}

/**
 * A greeting card: romanised on the front, the language's own script on the
 * back (a click / tap / Enter / Space turns it over).
 */
export interface Greeting {
  id: GreetingId;
  /** Language name, for the accessible label. */
  language: string;
  front: string;
  back: string;
  /** BCP 47 tag of the back text (font fallback + pronunciation), and its direction. */
  backLang: string;
  backDir: "ltr" | "rtl";
  bg: string;
}

const GREEN = "#32ea70";
const ICE = "#e9f6ff";
const RED = "#f33837";
const BLUE = "#4781ff";

export const SOCIALS: readonly Social[] = [
  { id: "whatsapp", label: "WhatsApp", href: null, bg: GREEN, fg: "#ffffff" },
  { id: "linkedin", label: "LinkedIn", href: null, bg: ICE, fg: BLUE },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/zorx_intreactive_ageny/", bg: RED, fg: "#ffffff" },
  { id: "x", label: "X", href: null, bg: ICE, fg: "#000000" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594189226842", bg: BLUE, fg: "#ffffff" },
];

export const GREETINGS: readonly Greeting[] = [
  { id: "gracias", language: "Spanish", front: "Gracias!", back: "¡Gracias!", backLang: "es", backDir: "ltr", bg: BLUE },
  { id: "nanni", language: "Malayalam", front: "Nanni!", back: "നന്ദി", backLang: "ml", backDir: "ltr", bg: GREEN },
  { id: "shukran", language: "Arabic", front: "Shukran!", back: "شكرًا", backLang: "ar", backDir: "rtl", bg: RED },
  { id: "xiexie", language: "Chinese", front: "Xièxiè!", back: "谢谢", backLang: "zh-Hans", backDir: "ltr", bg: ICE },
];

/**
 * Physics tuning (Matter.js units: the scene's 1252-wide coordinate system).
 * Starting values from the brief, tuned for a light, controlled feel.
 */
export const GRAVITY_TUNING = {
  gravityX: 0,
  gravityY: 0.45,
  restitution: 0.35,
  friction: 0.65,
  frictionAir: 0.025,
  /** Pointer knock strength (× pointer velocity). */
  impact: 1.0,
  /** Largest knock, in scene units per step. */
  maxImpact: 16,
  /** Minimum on-screen sizes, so the objects stay legible on phones (px). */
  minIconPx: 34,
  minLabelPx: 28, // ≥ 12 px text on phones (legibility)
  /** First landing: soft guide toward the designed resting spot, then removed (s). */
  landingSeconds: 2.6,
} as const;
