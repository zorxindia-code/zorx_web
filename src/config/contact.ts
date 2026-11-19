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
  /** Optional transparent clip of the same bird on the same canvas (see FemaleClip). */
  motion: FemaleClip | null;
}

/**
 * The female's clip: one transparent video on exactly the poster's canvas
 * (first frame = the poster = her resting pose), played in ranges (seconds):
 *   watch  — rest → a blink and a look around (front, right, back to the
 *            males), ending near the rest pose
 *   react  — continues from `watch`'s end: a crouch and a wing flap, landing
 *            and settling; its last 12 frames dissolve into the rest pose, so
 *            the return is seamless (process-bird-video --loop-xfade 12)
 */
export interface FemaleClip {
  webm: string;
  hevc: string;
  rest: number;
  watch: readonly [number, number];
  react: readonly [number, number];
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
    // From assets-src/videos/bird-videos/femalebird.mp4 (green screen, untouched)
    // via scripts/process-bird-video.mjs → public/videos/contact/ (VP9-alpha WebM +
    // HEVC-alpha MP4 + poster; placement from female-bird.json):
    //   --name female-bird --out public/videos/contact --start 0 --end 7.625
    //   --crop 940:1030:60:470 --width 480 --key protect --protect-still
    //   --line-green --line-neutral --line-pad 22 --temporal --stabilize
    //   --loop-xfade 12 --rest first --poster
    // (the earlier still, female-bird.png, is kept in assets-src/images/)
    src: "/videos/contact/female-bird-poster.webp",
    width: 480,
    height: 526,
    perchY: 401.6, // the wire her feet grip
    crownY: 81.7,
    feetX: 235.1,
    motion: {
      webm: "/videos/contact/female-bird.webm",
      hevc: "/videos/contact/female-bird-hevc.mp4",
      rest: 0,
      watch: [0, 4.0],
      react: [4.0, 7.125],
    },
  },
};

/**
 * The female's behaviour (ContactSection → FemaleBird).
 *  - maleCues: courtship bursts in the males' 6.42 s loop (manakins.webm), measured
 *    as frame-to-frame motion peaks at 1.08 / 2.50 / 4.17 s; she reacts as one
 *    begins — when she has rested at least `restMs` (a random value in the range)
 *  - ctaCooldownMs: after a LET'S TALK reaction starts, hover / tap / focus again
 *    within this time does nothing (no restarts, no overlap)
 *  - ctaJoinS: a look-around this close to its end runs straight on into the
 *    flap (seamless — the two ranges are continuous footage) instead of jumping
 */
export const FEMALE_TUNING = {
  maleCues: [0.7, 2.2, 3.7],
  restMs: [2500, 4000],
  ctaCooldownMs: 1500,
  ctaJoinS: 0.6,
} as const;
