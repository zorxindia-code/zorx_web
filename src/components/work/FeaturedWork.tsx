"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { servicesFont } from "@/components/services/font";
import { ALL_PROJECTS_HREF, FEATURED_WORK, type FeaturedProject } from "@/config/work";
import "./FeaturedWork.css";

/**
 * Featured Work: centred heading, a two-column grid of project cards (one
 * column on phones) and a "View all projects" outline button, on black.
 *
 * Entrance: the heading, then each card, then the button rise softly into
 * place as they enter the viewport — CSS transitions toggled once by an
 * IntersectionObserver (no scroll listeners, no loops). Without JS or with
 * reduced motion everything is simply shown.
 */
export default function FeaturedWork() {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = section.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.dataset.motion = ""; // hidden start state applies only now
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          // Reveal this item and everything before it — a fast scroll or jump can
          // carry earlier items past the viewport without them ever intersecting.
          const last = items.indexOf(e.target as HTMLElement);
          for (const el of items.slice(0, last + 1)) {
            if ("in" in el.dataset) continue;
            el.dataset.in = "";
            io.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    items.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
      items.forEach((el) => delete el.dataset.in);
    };
  }, []);

  return (
    <section
      ref={section}
      className={`zorx-work ${servicesFont.variable}`}
      aria-labelledby="zorx-work-title"
    >
      <h2 id="zorx-work-title" className="zorx-work-title" data-reveal="">
        Featured Work
      </h2>

      <ul className="zorx-work-grid">
        {FEATURED_WORK.map((project, i) => (
          <li
            key={project.id}
            className="zorx-work-item"
            data-reveal=""
            style={{ "--col": i % 2 } as CSSProperties}
          >
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>

      <div className="zorx-work-more" data-reveal="">
        {ALL_PROJECTS_HREF ? (
          <Link href={ALL_PROJECTS_HREF} className="zorx-work-button">
            View All Projects
          </Link>
        ) : (
          // No projects page yet: shown as designed, not a dead link.
          <span className="zorx-work-button" data-static="">
            View All Projects
          </span>
        )}
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: FeaturedProject }) {
  const body: ReactNode = (
    <>
      <div className="zorx-work-media">
        {project.image ? (
          <Image
            src={project.image.src}
            alt=""
            width={project.image.width}
            height={project.image.height}
            sizes="(max-width: 640px) 92vw, 42vw"
            loading="lazy"
            className="zorx-work-image"
          />
        ) : (
          // Temporary placeholder: the client's own logo, faint, on a dark panel.
          <div className="zorx-work-placeholder" aria-hidden="true">
            <Image
              src={project.logo.src}
              alt=""
              width={project.logo.width}
              height={project.logo.height}
              unoptimized
              loading="lazy"
              className="zorx-work-placeholder-logo"
              style={{ "--h": project.logo.height } as CSSProperties}
            />
          </div>
        )}
        {project.href && (
          <span className="zorx-work-view" aria-hidden="true">
            View project <span className="zorx-work-arrow">→</span>
          </span>
        )}
      </div>
      <h3 className="zorx-work-name">{project.title}</h3>
    </>
  );

  return project.href ? (
    <Link href={project.href} className="zorx-work-card" data-link="">
      {body}
    </Link>
  ) : (
    <div className="zorx-work-card">{body}</div>
  );
}
