"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SMOOTH_SCROLL } from "@/config/scroll";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * The site's one smooth-scroll controller (Lenis), mounted once in the root
 * layout. The document still scrolls natively — no wrapper, no transformed
 * page — Lenis only eases wheel / trackpad input, so fixed and sticky elements,
 * the pinned intro and every ScrollTrigger keep working as they are.
 *
 *  - one clock: Lenis is stepped by GSAP's ticker (autoRaf off, no extra rAF
 *    loop) and tells ScrollTrigger about each step — only while it has work:
 *    the step joins the ticker on wheel / trackpad input ('virtual-scroll') and
 *    leaves once the glide has settled. Idle, it costs no frames (touch keeps
 *    native scrolling and never needs it).
 *  - the intro owns the scroll lock: while <html> has `zorx-locked` (the
 *    preloader), Lenis is stopped — wheel input is discarded, not queued — and
 *    it starts again, from where the page is, the moment the intro unlocks
 *  - reduced motion, or Lenis failing to start: plain native scrolling
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: Lenis;
    try {
      lenis = new Lenis(SMOOTH_SCROLL);
    } catch {
      return; // native scrolling
    }

    lenis.on("scroll", ScrollTrigger.update);
    let stepping = false;
    let idleFrames = 0;
    const step = (time: number) => {
      lenis.raf(time * 1000);
      if (lenis.isScrolling) idleFrames = 0;
      // Settled for two frames: off the ticker until the next input. (Not after
      // one: a sleeping GSAP ticker runs a newly added listener at once — inside
      // the wheel handler, before Lenis has started the glide it is about to.)
      else if (++idleFrames >= 2) {
        gsap.ticker.remove(step);
        stepping = false;
      }
    };
    const wake = () => {
      if (stepping) return;
      stepping = true;
      // Lenis measures each frame from its previous one: after an idle pause that
      // would be one huge step (the glide finishing in a single frame). Restart
      // its clock so the first frame after waking is a normal one.
      lenis.time = 0;
      idleFrames = 0;
      gsap.ticker.add(step);
    };
    const offInput = lenis.on("virtual-scroll", wake);
    wake();
    gsap.ticker.lagSmoothing(0); // the scroll must never skip ahead after a slow frame

    // Follow the intro's scroll lock (ZorxExperience adds / removes html.zorx-locked).
    const html = document.documentElement;
    const syncLock = () => {
      const locked = html.classList.contains("zorx-locked");
      if (locked && !lenis.isStopped) lenis.stop();
      else if (!locked && lenis.isStopped) {
        lenis.start(); // resets to the current position: nothing queued, no jump
        lenis.resize(); // the intro's pin spacing has just been added
      }
    };
    const lock = new MutationObserver(syncLock);
    lock.observe(html, { attributes: true, attributeFilter: ["class"] });
    syncLock();

    return () => {
      lock.disconnect();
      offInput();
      gsap.ticker.remove(step);
      gsap.ticker.lagSmoothing(500, 33); // GSAP's default
      lenis.destroy();
    };
  }, []);

  return null;
}
