import { INDEXABLE } from "@/config/seo";
import { FEATURED_WORK, NEXT_PROJECT_WRAPS, type FeaturedProject, type ProjectPageContent } from "@/config/work";

/**
 * Project pages derived from src/config/work.ts (server side: depends on the
 * build's INDEXABLE flag, which client code cannot see — pass results down as
 * props).
 */
export type ProjectWithPage = FeaturedProject & { page: ProjectPageContent };

/** Every project that has a page — all are prerendered. */
export const PROJECT_PAGES = FEATURED_WORK.filter((p): p is ProjectWithPage => !!p.page);

/**
 * Pages live in this build: on the live (indexable) site only published ones;
 * in local / preview builds all of them, so unfinished pages can be reviewed.
 * Unlisted pages are a 404, unlinked and out of the sitemap.
 */
export const LIVE_PROJECTS = PROJECT_PAGES.filter((p) => p.published || !INDEXABLE);

export const projectPath = (p: FeaturedProject) => `/work/${p.slug}`;

export const findLiveProject = (slug: string) => LIVE_PROJECTS.find((p) => p.slug === slug) ?? null;

/** The homepage card's link (null: the card is not a link). */
export const projectHref = (p: FeaturedProject) =>
  LIVE_PROJECTS.some((l) => l.id === p.id) ? projectPath(p) : null;

/** The next live project in the configured order (wraps round when allowed). */
export function nextProject(p: FeaturedProject): ProjectWithPage | null {
  const i = LIVE_PROJECTS.findIndex((l) => l.id === p.id);
  if (i < 0 || LIVE_PROJECTS.length < 2) return null;
  if (i + 1 < LIVE_PROJECTS.length) return LIVE_PROJECTS[i + 1];
  return NEXT_PROJECT_WRAPS ? LIVE_PROJECTS[0] : null;
}

/** "Boat Seafood Restaurant — Branding & Website Project" (unless overridden). */
export function projectSeoTitle(p: ProjectWithPage) {
  if (p.page.seo?.title) return p.page.seo.title;
  const kind = p.page.services.slice(0, 2).join(" & ");
  return kind ? `${p.title} — ${kind} Project` : p.title;
}
