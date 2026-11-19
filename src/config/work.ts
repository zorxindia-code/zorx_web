/**
 * Featured Work (the four homepage cards) and the project pages (/work/{slug}).
 * One list drives the homepage cards, the project pages, their order ("Next
 * project"), the sitemap and the project metadata — nothing is repeated
 * elsewhere.
 *
 * Nothing here is invented. Fields not supplied yet are null / empty:
 * - `image` null → the homepage card shows a placeholder panel with the
 *   client's own logo, faint, at the final aspect ratio.
 * - `page` set → the project has a page. Until it is `published` it exists only
 *   in non-indexable builds (local, previews), where missing fields show as
 *   marked placeholders; on the live site an unpublished page is a 404, is not
 *   linked from the homepage, and is not in the sitemap.
 */
export interface WorkImage {
  src: string;
  width: number;
  height: number;
}

/** One gallery item. Shown at its own aspect ratio (never cropped or stretched). */
export interface ProjectMedia {
  type: "image" | "video";
  /** Image file, or the video file (MP4 / WebM, muted, loops). */
  src: string;
  width: number;
  height: number;
  /** What the image shows — read by screen readers and search engines. */
  alt: string;
  /** Video only: the still shown before (and instead of) playback. */
  poster?: string;
}

export interface ProjectPageContent {
  /** Short editorial title on the page (e.g. "BOAT"); the full `title` otherwise. */
  displayTitle?: string;
  /** Year of the project, shown as [2026]. Never filled in automatically. */
  year: string | null;
  /** One per line, e.g. "Branding", "Website". */
  services: readonly string[];
  /** About 35–60 words. */
  description: string | null;
  /** The client's live site (opens in a new tab). */
  website: string | null;
  /** Images and videos in order. The design's first item is portrait 3 : 4
   *  (export 1080 × 1440 or larger); the rest any ratio. */
  gallery: readonly ProjectMedia[];
  /** Colours of the layout blocks shown while the gallery is empty (non-indexable
   *  builds only). */
  placeholderColors?: readonly string[];
  /** Search / sharing overrides (defaults: title + services, the description,
   *  the first gallery image). */
  seo?: { title?: string; description?: string; image?: string };
}

export interface FeaturedProject {
  id: string;
  /** Full project name (homepage card, page title, metadata). */
  title: string;
  image: WorkImage | null;
  /** Client logo shown on the homepage placeholder (white on transparent). */
  logo: WorkImage;
  /** URL segment: /work/{slug}. */
  slug: string;
  /** Live, linked and indexed only when true — and only with real content. */
  published: boolean;
  /** Last real update of the published case study (ISO date) — for the sitemap. */
  updatedAt?: string;
  /** The project page. */
  page?: ProjectPageContent;
}

const EMPTY_PAGE: ProjectPageContent = { year: null, services: [], description: null, website: null, gallery: [] };

export const FEATURED_WORK: readonly FeaturedProject[] = [
  {
    id: "boat",
    title: "Boat Seafood Restaurant",
    image: null,
    logo: { src: "/clients/boat.webp", width: 97, height: 105 },
    slug: "boat-seafood-restaurant",
    published: false,
    page: {
      displayTitle: "BOAT",
      // Year and services as on the approved page design (2026-11-19); website
      // supplied by ZORX (2026-11-19). Description and media still to come.
      year: "2026",
      services: ["Branding", "Website", "Graphic design", "Digital Marketing"],
      description: null,
      website: "https://boatseafood.com/",
      gallery: [],
      placeholderColors: ["#133a4f", "#78b9bf"], // the design's blocks
    },
  },
  {
    id: "pressd",
    title: "Press'd Cafe",
    image: null,
    logo: { src: "/clients/pressd-cafe.webp", width: 238, height: 77 },
    slug: "pressd-cafe",
    published: false,
    page: EMPTY_PAGE,
  },
  {
    id: "harven",
    title: "Harven",
    image: null,
    logo: { src: "/clients/harven.webp", width: 219, height: 71 },
    slug: "harven",
    published: false,
    page: EMPTY_PAGE,
  },
  {
    id: "cravo",
    title: "Cravo - Resto Cafe",
    image: null,
    logo: { src: "/clients/crav.webp", width: 213, height: 87 },
    slug: "cravo-resto-cafe",
    published: false,
    page: EMPTY_PAGE,
  },
];

/** "View all projects" destination — null until a projects page exists (shown, not linked). */
export const ALL_PROJECTS_HREF: string | null = null;

/** After the last project, "Next project" goes back to the first. */
export const NEXT_PROJECT_WRAPS = true;
