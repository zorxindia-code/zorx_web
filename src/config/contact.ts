/**
 * Contact section ("Interested in working together?").
 *
 * CONTACT_HREF — the LET'S TALK destination (a mailto:, tel:, a contact page
 * route or a booking link) — defined below OFFICES: it falls back to the
 * first office email. While there is none it is null and the CTA is shown as
 * designed but is not a link.
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
 * No office details exist in the project yet, so every detail is null and
 * nothing is invented: a column shows only the lines that are filled in.
 * Fill these in (phone as written for people, e.g. "+971 4 000 0000") and they
 * appear as tel: / mailto: links. The map pins (Dubai, Kerala) are part of
 * the map artwork: src/lib/contactMap.ts, keyed by `id`.
 */
export interface Office {
  id: string;
  /** Country label, shown in capitals (UAE, INDIA). */
  country: string;
  /** Short description / address — one entry per line. */
  address: readonly string[] | null;
  phone: string | null;
  email: string | null;
}

export const OFFICES: readonly Office[] = [
  { id: "uae", country: "UAE", address: null, phone: null, email: null },
  { id: "india", country: "India", address: null, phone: null, email: null },
];

/** LET'S TALK: an explicit destination, else the first office email once one is set. */
const firstEmail = OFFICES.find((o) => o.email)?.email ?? null;
export const CONTACT_HREF: string | null = firstEmail ? `mailto:${firstEmail}` : null;

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
  },
};
