"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { CLIENT_LOGOS, CLIENTS_TUNING } from "@/config/clients";
import "./ClientsSection.css";

/**
 * Client showcase: one horizontal row of white logos on black, travelling
 * right → left in a seamless infinite loop.
 *
 * The motion is a plain CSS animation: the track holds the logos twice and
 * slides by exactly one set, so the loop point is invisible. JavaScript only
 * - sets the duration from the measured set width (same px/s on every screen);
 * - when the pointer (or a finger) is on a logo, glides the animation to a stop
 *   and marks that one logo for the focus scale-up; leaving glides it back to
 *   speed from exactly where it stopped. These are short ramps, not a running loop.
 * Reduced motion: nothing moves by itself; the single row can be swiped instead.
 */
export default function ClientsSection() {
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;

    // Speed: duration = one set's width ÷ px per second.
    const setDuration = () => {
      const setWidth = el.scrollWidth / 2;
      if (setWidth > 0) el.style.setProperty("--clients-dur", `${setWidth / CLIENTS_TUNING.speed}s`);
    };
    setDuration();
    const ro = new ResizeObserver(setDuration);
    ro.observe(el);

    // Playback rate eased 1 ↔ 0 — never an abrupt stop or start. Changing the
    // rate keeps the current position, so it resumes exactly where it paused.
    let raf = 0;
    let rate = 1;
    const glide = (to: number) => {
      const anim = el.getAnimations()[0];
      if (!anim) return;
      cancelAnimationFrame(raf);
      const from = rate;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / CLIENTS_TUNING.easeMs);
        rate = from + (to - from) * p * p * (3 - 2 * p);
        anim.updatePlaybackRate(rate);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    let focused: HTMLElement | null = null;
    const focus = (item: HTMLElement | null) => {
      if (item === focused) return;
      if (focused) delete focused.dataset.focus;
      focused = item;
      if (item) item.dataset.focus = "";
      glide(item ? 0 : 1);
    };
    // Only the logo itself counts — the spacing between logos releases the focus.
    const itemAt = (e: Event) => {
      const t = e.target as HTMLElement;
      return t.tagName === "IMG" ? t.parentElement : null;
    };

    // Mouse / pen: focus follows the pointer from logo to logo.
    const onOver = (e: PointerEvent) => e.pointerType !== "touch" && focus(itemAt(e));
    const onLeave = (e: PointerEvent) => e.pointerType !== "touch" && focus(null);
    // Touch: focus while the finger rests on a logo; a vertical scroll cancels
    // the pointer (the browser takes over), which releases it — scrolling is untouched.
    const onDown = (e: PointerEvent) => e.pointerType === "touch" && focus(itemAt(e));
    const onUp = (e: PointerEvent) => e.pointerType === "touch" && focus(null);

    el.addEventListener("pointerover", onOver);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerover", onOver);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <section className="zorx-clients" aria-labelledby="zorx-clients-title">
      <h2 id="zorx-clients-title" className="sr-only">
        Our clients
      </h2>
      <div className="zorx-clients-viewport">
        <ul ref={track} className="zorx-clients-track">
          {[0, 1].map((copy) =>
            CLIENT_LOGOS.map((logo) => (
              <li
                key={`${copy}-${logo.src}`}
                className="zorx-clients-item"
                aria-hidden={copy === 1 ? true : undefined}
                data-copy={copy === 1 ? "" : undefined}
              >
                <Image
                  src={logo.src}
                  alt={copy === 1 ? "" : logo.name}
                  width={logo.width}
                  height={logo.height}
                  unoptimized
                  // Off-screen to the side, so lazy-loading would only fetch a logo as it
                  // slides in (a visible pop). 48 KB in all, fetched at low priority.
                  loading="eager"
                  fetchPriority="low"
                  decoding="async"
                  draggable={false}
                  className="zorx-clients-logo"
                  style={{ "--h": logo.height } as CSSProperties}
                />
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}
