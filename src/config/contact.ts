/**
 * Contact section ("Interested in working together?").
 *
 * CONTACT_HREF — the LET'S TALK destination, defined below OFFICES: a WhatsApp
 * chat with CONTACT_WHATSAPP (as ZORX asked, 2026-11-18). Any URL works here
 * (a mailto:, tel:, a contact page route or a booking link); an external one
 * opens in a new tab. null = the CTA is shown as designed but is not a link.
 *
 * CONTACT_BIRDS — the courtship scene on the frame's top border: three male
 * Blue Manakins (looping clip) to the left, the female (still image) to the
 * right. All values are measured in each asset's own pixels.
 *   Males: from assets-src/videos/bird-videos/bird-dancing-video.mp4 (untouched) via
 *     scripts/process-bird-video.mjs → public/videos/contact/ (transparent
 *     VP9 WebM + HEVC-alpha MP4 + poster; placement from manakins.json):
 *       --name manakins --out public/videos/contact --end 7 --crop 1720:926:132:26
 *       --width 960 --key linear --screen-d 95 --temporal --line-y 847
 *       --line-band 838:856 --erase 1696:856:86:86,132:806:334:146,1760:806:92:146
 *       --loop-xfade 14
 *       --loop-slots 796,1130 --loop-dissolve 6 --rest first --poster
 *   Female: public/images/female-bird.png as supplied (already transparent),
 *     served resized by next/image.
 */
/**
 * Offices — the footer's contact columns (ids also key the map's pins).
 *
 * Addresses and phone numbers as supplied by ZORX (2026-11-18); no email yet.
 * A column shows only the lines that are filled in; the phone is written for
 * people (grouped digits) and dialled from its digits (tel:), an email would
 * become a mailto: link. The map pins (Dubai, Kerala) are part of the map
 * artwork: src/lib/contactMap.ts, keyed by `id`.
 */
export interface Office {
  id: string;
  /** Country label, shown in capitals (UAE, INDIA). */
  country: string;
  /** The postal address — one entry per line (null: not supplied). */
  address: readonly string[] | null;
  phone: string | null;
  email: string | null;
}

export const OFFICES: readonly Office[] = [
  {
    id: "uae",
    country: "UAE",
    // non-breaking spaces mark a run that never wraps inside (OfficesSection
    // sets it nowrap): a narrow column breaks after "Road -", not before "Dubai"
    address: ["Office No 147, Emarat Atrium,", "Sheikh Zayed Road - E11\u00a0-\u00a0Dubai"],
    phone: "+971 54 396 2660",
    email: null,
  },
  {
    id: "india",
    country: "India",
    address: ["KFC Building 1st Floor, Kunthipuzha", "Mannarkkad", "Palakkad - 678762"],
    phone: "+91 97781 75804",
    email: null,
  },
];

/** LET'S TALK opens a WhatsApp chat with this number (the India office's). */
export const CONTACT_WHATSAPP = "+91 97781 75804";
/** LET'S TALK: WhatsApp's click-to-chat link (wa.me takes the number as digits only). */
export const CONTACT_HREF: string | null = `https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, "")}`;

/** A looping transparent clip of birds perched on a line. */
export interface PerchedClip {
  webm: string;
  hevc: string;
  /** Still first frame — shown before the clip loads and with reduced motion. */
  poster: string;
  width: number;
  height: number;
  /** Row the feet grip — aligned to the frame's top border. */
  perchY: number;
  /** Top of the resting birds (their height is perchY − crownY). */
  crownY: number;
  /** Horizontal span of the resting birds. */
  x0: number;
  x1: number;
}

/** A still bird image: where it grips, its crown, and its feet's centre. */
export interface PerchedImage {
  src: string;
  width: number;
  height: number;
  perchY: number;
  crownY: number;
  feetX: number;
  /**
   * Optional looping transparent clip of the same bird (e.g. head turns),
   * framed exactly like `src` (same canvas aspect, body and feet on the same
   * pixels; first frame = the still). Played over the still when set; the still
   * stays the fallback (before load, reduced motion). null = still only.
   */
  motion: { webm: string; hevc: string } | null;
}

export interface ContactBirds {
  males: PerchedClip;
  female: PerchedImage;
}

export const CONTACT_BIRDS: ContactBirds = {
  males: {
    webm: "/videos/contact/manakins.webm",
    hevc: "/videos/contact/manakins-hevc.mp4",
    poster: "/videos/contact/manakins-poster.webp",
    width: 960,
    height: 516,
    perchY: 458.2,
    crownY: 169.7,
    x0: 189.8,
    x1: 716.1,
  },
  female: {
    src: "/images/female-bird.png",
    width: 1000,
    height: 1378,
    perchY: 1000, // the curl of her toes
    crownY: 79,
    feetX: 465,
    // Head-turn clip not supplied yet — the still image cannot be turned
    // convincingly (3/4 view, left side of the face only). Asset spec:
    // docs/ai-context/CHATGPT_HANDOVER.md → "Female Manakin head-turn clip".
    motion: null,
  },
};
