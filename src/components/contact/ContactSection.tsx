"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { servicesFont } from "@/components/services/font";
import { CONTACT_BIRDS, CONTACT_HREF, type ContactBirds } from "@/config/contact";
import { prefersHevcAlpha } from "@/lib/videoSupport";
import "./ContactSection.css";

/**
 * Contact: a thin outlined frame on black with "Interested in working
 * together?" and LET'S TALK — and the Blue Manakin courtship perched on the
 * frame's top border: the three dancing males to the left, the female to the
 * right, still, watching them.
 *
 * Entrance: headline, then CTA, rise softly into place once (IntersectionObserver
 * + CSS transitions). The bird clip loads only as the section approaches, plays
 * only while it is on screen, and is a still poster with reduced motion.
 */
export default function ContactSection() {
  const section = useRef<HTMLElement>(null);

  // Text entrance — once, never on hover; reduced motion / no JS: simply shown.
  useEffect(() => {
    const root = section.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.dataset.motion = "";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        items.forEach((el) => (el.dataset.in = ""));
        io.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 },
    );
    io.observe(root.querySelector(".zorx-contact-frame")!);
    return () => {
      io.disconnect();
      delete root.dataset.motion;
      items.forEach((el) => delete el.dataset.in);
    };
  }, []);

  return (
    <section ref={section} className={`zorx-contact ${servicesFont.variable}`} aria-labelledby="zorx-contact-title">
      <div className="zorx-contact-frame">
        <PerchedBirds birds={CONTACT_BIRDS} />
        <h2 id="zorx-contact-title" className="zorx-contact-title" data-reveal="">
          Interested in working together?
        </h2>
        <div className="zorx-contact-cta-wrap" data-reveal="">
          {CONTACT_HREF && /^https?:/.test(CONTACT_HREF) ? (
            // external (e.g. WhatsApp): a new tab, so the site stays open behind it
            <a href={CONTACT_HREF} target="_blank" rel="noopener noreferrer" className="zorx-cta zorx-cta-primary zorx-contact-cta">
              Let&apos;s Talk
              <span className="sr-only">
                {/^https:\/\/wa\.me\//.test(CONTACT_HREF) ? " — chat on WhatsApp" : ""} (opens in a new tab)
              </span>
            </a>
          ) : CONTACT_HREF ? (
            <Link href={CONTACT_HREF} className="zorx-cta zorx-cta-primary zorx-contact-cta">
              Let&apos;s Talk
            </Link>
          ) : (
            // No contact destination yet: shown as designed, not a dead link.
            <span className="zorx-cta zorx-cta-primary zorx-contact-cta" data-static="">
              Let&apos;s Talk
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The males' clip and the female, both scaled to the same bird height and set
 * so the row their feet grip lies exactly on the top border (ContactSection.css).
 * The clip is lazy: no source until the section is near; it plays only while
 * on screen and is never restarted by interaction. Reduced motion: its poster.
 */
function PerchedBirds({ birds }: { birds: ContactBirds }) {
  const video = useRef<HTMLVideoElement>(null);
  const { males, female } = birds;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // poster only
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      v.src = prefersHevcAlpha() ? males.hevc : males.webm; // HEVC alpha on Safari / iOS, VP9 alpha elsewhere
      v.preload = "auto";
    };
    const near = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && load(), {
      rootMargin: "600px 0px",
    });
    const onScreen = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (e.isIntersecting) {
        load();
        v.play().catch(() => {});
      } else v.pause();
    });
    near.observe(v);
    onScreen.observe(v);
    return () => {
      near.disconnect();
      onScreen.disconnect();
      v.pause();
    };
  }, [males]);

  const style = {
    "--mw": males.width,
    "--mh": males.height,
    "--mp": males.perchY,
    "--mc": males.crownY,
    "--mx": (males.x0 + males.x1) / 2,
    "--fw": female.width,
    "--fh": female.height,
    "--fp": female.perchY,
    "--fc": female.crownY,
    "--fx": female.feetX,
  } as CSSProperties;
  return (
    <div className="zorx-contact-birds" style={style} aria-hidden="true">
      <div className="zorx-contact-males">
        <video
          ref={video}
          className="zorx-contact-birds-video"
          poster={males.poster}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
        />
      </div>
      <div className="zorx-contact-female">
        <Image
          src={female.src}
          alt=""
          width={female.width}
          height={female.height}
          sizes="(max-width: 640px) 12vw, (max-width: 1900px) 9vw, 170px"
          draggable={false}
        />
        {female.motion && <FemaleMotion clip={female.motion} />}
      </div>
    </div>
  );
}

/**
 * The female's optional looping clip (config: CONTACT_BIRDS.female.motion),
 * laid exactly over her still, which stays underneath as the fallback. Lazy:
 * no source until the section is near; plays only on screen and while the tab
 * is visible; shown only once a frame is playing (so no blank flash). Reduced
 * motion: never loaded — the still remains.
 */
function FemaleMotion({ clip }: { clip: { webm: string; hevc: string } }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let loaded = false;
    let onScreen = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      v.src = prefersHevcAlpha() ? clip.hevc : clip.webm;
      v.preload = "auto";
    };
    const sync = () => {
      if (onScreen && !document.hidden) {
        load();
        v.play().catch(() => {});
      } else v.pause();
    };
    const showing = () => (v.dataset.playing = "");
    const near = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && load(), {
      rootMargin: "600px 0px",
    });
    const seen = new IntersectionObserver((es) => {
      onScreen = es[es.length - 1].isIntersecting;
      sync();
    });
    v.addEventListener("playing", showing);
    document.addEventListener("visibilitychange", sync);
    near.observe(v);
    seen.observe(v);
    return () => {
      near.disconnect();
      seen.disconnect();
      v.removeEventListener("playing", showing);
      document.removeEventListener("visibilitychange", sync);
      v.pause();
    };
  }, [clip]);

  return (
    <video
      ref={video}
      className="zorx-contact-female-video"
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
    />
  );
}
