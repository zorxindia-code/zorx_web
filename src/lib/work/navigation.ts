/**
 * Homepage ⇄ project page hand-off (client only, in-memory: lives for the
 * session's client-side navigations, gone on a reload or a direct visit).
 *
 * Leaving the homepage from a Featured Work card records where the user was,
 * relative to the Featured Work section. When the homepage is shown again
 * (Back to home, the logo, or the browser's back button) ZorxExperience takes
 * the record once and returns there, instead of starting the intro from the
 * top.
 */
let workOffset: number | null = null;

const WORK = ".zorx-work";

export function leaveHomeForProject() {
  const section = document.querySelector<HTMLElement>(WORK);
  workOffset = section ? -section.getBoundingClientRect().top : null; // scrollY − section top
}

/** BACK TO HOME without a record (e.g. the project page was opened directly):
 *  return to the top of Featured Work. */
export function returnToWorkByDefault() {
  if (workOffset === null) workOffset = 0;
}

/** Where to return on the homepage (once): the page Y, or null for the top. */
export function takeHomeReturn(): (() => number) | null {
  const offset = workOffset;
  workOffset = null;
  if (offset === null) return null;
  return () => {
    const section = document.querySelector<HTMLElement>(WORK);
    return section ? Math.max(0, section.getBoundingClientRect().top + window.scrollY + offset) : 0;
  };
}
