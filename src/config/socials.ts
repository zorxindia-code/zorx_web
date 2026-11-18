/**
 * The THANKS footer: social links and the "thank you" greetings that fall onto
 * the THANKS letters (src/components/footer/GravityFooter.tsx).
 *
 * `href` is the account URL. No social accounts exist in the project yet, so
 * every link is null: the icon is shown (and is still a physical object) but is
 * not a link. Add the URL and it becomes a link (opens in a new tab), reachable
 * by keyboard. Never invent a URL.
 *
 * Colours are measured from the supplied design (the footer reference images).
 */
export type SocialId = "whatsapp" | "linkedin" | "instagram" | "x" | "facebook";
export type GreetingId = "gracias" | "nanni" | "shukran" | "danke";

export interface Social {
  id: SocialId;
  /** Accessible name. */
  label: string;
  href: string | null;
  /** Disc colour and glyph colour. */
  bg: string;
  fg: string;
}

export interface Greeting {
  id: GreetingId;
  text: string;
  bg: string;
}

const GREEN = "#32ea70";
const ICE = "#e9f6ff";
const RED = "#f33837";
const BLUE = "#4781ff";

export const SOCIALS: readonly Social[] = [
  { id: "whatsapp", label: "WhatsApp", href: null, bg: GREEN, fg: "#ffffff" },
  { id: "linkedin", label: "LinkedIn", href: null, bg: ICE, fg: BLUE },
  { id: "instagram", label: "Instagram", href: null, bg: RED, fg: "#ffffff" },
  { id: "x", label: "X", href: null, bg: ICE, fg: "#000000" },
  { id: "facebook", label: "Facebook", href: null, bg: BLUE, fg: "#ffffff" },
];

export const GREETINGS: readonly Greeting[] = [
  { id: "gracias", text: "Gracias!", bg: BLUE },
  { id: "nanni", text: "Nanni!", bg: GREEN },
  { id: "shukran", text: "Shukran!", bg: RED },
  { id: "danke", text: "Danke!", bg: ICE },
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
  minLabelPx: 22,
  /** First landing: soft guide toward the designed resting spot, then removed (s). */
  landingSeconds: 2.6,
} as const;
