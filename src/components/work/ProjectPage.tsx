import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { servicesFont } from "@/components/services/font";
import { ASSETS } from "@/config/brand";
import { CONTACT_HREF } from "@/config/contact";
import { INDEXABLE } from "@/config/seo";
import { nextProject, projectPath, type ProjectWithPage } from "@/lib/work/projects";
import { BackHomeLink } from "./BackHomeLink";
import { ProjectVideo } from "./ProjectVideo";
import "./ProjectPage.css";

/**
 * A project page (/work/{slug}) — the approved design (1600 × 900 reference):
 * black page, Ice Blue type; fixed header with Back to home · the black ZORX lockup ·
 * Let's talk; a left information column (title, [year], services, description,
 * Next project · Visit website) that stays put while the narrow gallery column
 * scrolls. Phones / tablets: one column. Geometry in ProjectPage.css.
 *
 * Only real content is shown. In non-indexable builds (local, previews) missing
 * fields show as marked, muted placeholders and an empty gallery as the
 * design's colour blocks; unpublished pages do not exist on the live site.
 */

/** Design placeholder text, shown muted and only outside the live site. */
const DESCRIPTION_SLOT =
  "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum";

/** The design's gallery blocks (668 × 418 at 1600). */
const BLOCKS = ["8 / 5", "8 / 5"];
const BLOCK_COLORS = ["rgb(232 245 255 / 0.1)", "rgb(232 245 255 / 0.06)"];

function Arrow({ dir }: { dir: "left" | "right" | "out" }) {
  if (dir === "out")
    return (
      <svg className="zorx-project-arrow-out" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M1.5 10.5 10.5 1.5M3.5 1.5h7v7" />
      </svg>
    );
  return (
    <svg className="zorx-project-arrow" viewBox="0 0 28 12" aria-hidden="true">
      <path d={dir === "left" ? "M27 6H1M6.5 .5 1 6l5.5 5.5" : "M1 6h26M21.5 .5 27 6l-5.5 5.5"} />
    </svg>
  );
}

export default function ProjectPage({ project }: { project: ProjectWithPage }) {
  const { page } = project;
  const slots = !INDEXABLE && !project.published; // marked placeholders: never on the live site
  const display = page.displayTitle ?? project.title;
  const next = nextProject(project);
  const external = !!CONTACT_HREF && /^https?:/.test(CONTACT_HREF);
  const blocks = slots && page.gallery.length === 0;
  const colors = page.placeholderColors?.length ? page.placeholderColors : BLOCK_COLORS;

  return (
    <div className={`zorx-project ${servicesFont.variable}`}>
      <header className="zorx-project-header">
        <BackHomeLink className="zorx-project-link zorx-project-back zorx-cta-host">
          <Arrow dir="left" />
          <span className="zorx-cta">Back to home</span>
        </BackHomeLink>
        <Link href="/" className="zorx-project-logo" aria-label="ZORX — home">
          <Image
            src={ASSETS.logoWhite}
            alt="ZORX Interactive Agency"
            width={1920}
            height={800}
            sizes="(max-width: 1023px) 150px, 13vw"
            priority
          />
        </Link>
        {CONTACT_HREF &&
          (external ? (
            <a href={CONTACT_HREF} target="_blank" rel="noopener noreferrer" className="zorx-project-link zorx-project-talk zorx-cta-host">
              <span className="zorx-cta">Let&apos;s talk</span>
              <span className="sr-only"> (opens WhatsApp in a new tab)</span>
            </a>
          ) : (
            <Link href={CONTACT_HREF} className="zorx-project-link zorx-project-talk zorx-cta-host">
              <span className="zorx-cta">Let&apos;s talk</span>
            </Link>
          ))}
      </header>

      <main className="zorx-project-main">
        <article className="zorx-project-article" aria-labelledby="zorx-project-title">
          <div className="zorx-project-info">
            <h1 id="zorx-project-title" className="zorx-project-title">
              {display === project.title ? (
                <span className="zorx-project-title-line">{display}</span>
              ) : (
                <>
                  <span className="zorx-project-title-line" aria-hidden="true">
                    {display}
                  </span>
                  <span className="sr-only">{project.title}</span>
                </>
              )}
            </h1>

            <div className="zorx-project-facts">
              {page.year ? (
                <p className="zorx-project-year">[{page.year}]</p>
              ) : (
                slots && (
                  <p className="zorx-project-year" data-slot="">
                    [Year]
                  </p>
                )
              )}
              {page.services.length > 0 ? (
                <ul className="zorx-project-services" aria-label="Services">
                  {page.services.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                slots && (
                  <p className="zorx-project-services" data-slot="">
                    Services to be supplied
                  </p>
                )
              )}
              {page.description ? (
                <p className="zorx-project-description">{page.description}</p>
              ) : (
                slots && (
                  <p className="zorx-project-description" data-slot="" title="Placeholder — description to be supplied">
                    {DESCRIPTION_SLOT}
                  </p>
                )
              )}
            </div>

            <nav className="zorx-project-nav" aria-label="Project navigation">
              {next ? (
                <Link href={projectPath(next)} prefetch className="zorx-project-link zorx-project-next zorx-cta-host">
                  <Arrow dir="right" />
                  <span className="zorx-cta">Next project</span>
                  <span className="sr-only">: {next.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {page.website ? (
                <a href={page.website} target="_blank" rel="noopener noreferrer" className="zorx-project-link zorx-project-visit zorx-cta-host">
                  <span className="zorx-cta">Visit website</span>
                  <Arrow dir="out" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                slots && (
                  <span className="zorx-project-link zorx-project-visit" data-slot="" title="Website link to be supplied">
                    <span>Visit website</span>
                    <Arrow dir="out" />
                  </span>
                )
              )}
            </nav>
          </div>

          {/* media scrolling up under the fixed header fades into black (top only) */}
          <div className="zorx-project-fade" aria-hidden="true" />
          <section className="zorx-project-gallery" aria-label={`${project.title} — project gallery`}>
            {page.gallery.map((m, i) => (
              <figure
                key={m.src}
                className="zorx-project-media"
                style={{ aspectRatio: `${m.width} / ${m.height}` }}
              >
                {m.type === "video" ? (
                  <ProjectVideo media={m} />
                ) : (
                  <Image
                    src={m.src}
                    alt={m.alt}
                    width={m.width}
                    height={m.height}
                    sizes="(max-width: 1023px) calc(100vw - 2.5rem), min(26vw, 500px)"
                    priority={i === 0}
                  />
                )}
              </figure>
            ))}
            {blocks &&
              BLOCKS.map((ratio, i) => (
                <div
                  key={`block-${i}-${ratio}`}
                  className="zorx-project-media zorx-project-block"
                  data-slot=""
                  aria-hidden="true"
                  style={{ aspectRatio: ratio, "--block": colors[i % colors.length] } as CSSProperties}
                />
              ))}
          </section>
        </article>
      </main>
    </div>
  );
}
