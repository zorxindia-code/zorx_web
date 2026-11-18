/**
 * Featured Work — the four projects shown under the client carousel.
 *
 * No project imagery or project pages exist in the repository yet, so:
 * - `image` is null → the card shows a clean placeholder panel (with the
 *   client's own logo from /public/clients, faint) at the final aspect ratio;
 *   add `{ src, width, height }` when a real project image is available.
 * - `href` is null → the card is not a link; add the route when the project
 *   page exists and the whole card becomes clickable (with its arrow).
 */
export interface WorkImage {
  src: string;
  width: number;
  height: number;
}

export interface FeaturedProject {
  id: string;
  title: string;
  image: WorkImage | null;
  /** Client logo shown on the placeholder (white on transparent). */
  logo: WorkImage;
  href: string | null;
  /** Future case-study route: /work/{slug}. */
  slug: string;
  /** Only published projects get a page, a sitemap entry and a link. No placeholders. */
  published: boolean;
  /** Last real update of the published case study (ISO date) — for the sitemap. */
  updatedAt?: string;
}

export const FEATURED_WORK: readonly FeaturedProject[] = [
  {
    id: "boat",
    title: "Boat Seafood Restaurant",
    image: null,
    logo: { src: "/clients/boat.webp", width: 97, height: 105 },
    href: null,
    slug: "boat-seafood-restaurant",
    published: false,
  },
  {
    id: "pressd",
    title: "Press'd Cafe",
    image: null,
    logo: { src: "/clients/pressd-cafe.webp", width: 238, height: 77 },
    href: null,
    slug: "pressd-cafe",
    published: false,
  },
  {
    id: "harven",
    title: "Harven",
    image: null,
    logo: { src: "/clients/harven.webp", width: 219, height: 71 },
    href: null,
    slug: "harven",
    published: false,
  },
  {
    id: "cravo",
    title: "Cravo - Resto Cafe",
    image: null,
    logo: { src: "/clients/crav.webp", width: 213, height: 87 },
    href: null,
    slug: "cravo-resto-cafe",
    published: false,
  },
];

/** "View all projects" destination — null until a projects page exists (shown, not linked). */
export const ALL_PROJECTS_HREF: string | null = null;
