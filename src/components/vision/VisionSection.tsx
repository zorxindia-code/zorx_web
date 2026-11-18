"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { servicesFont } from "@/components/services/font";
import { BIRD_PATH, BIRD_VIEWBOX } from "./birdPath";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Scroll range the story plays over (no pinning — the page scrolls normally):
 * the section's whole time on screen, from its top entering low in the
 * viewport until its bottom is above the middle — so the background develops
 * slowly enough to be watched, while the text still lands early (see build()).
 */
const START = "top 85%";
const END = "bottom 55%";
/** Scrub smoothing (s): the playhead glides after the scroll. */
const SCRUB = 1.6;

/**
 * "Your vision, our expertise" — the agency introduction between the showreel
 * and the services list. Black field, large Outfit headline, a small paragraph
 * lower right, and the ZORX bird as an oversized hairline outline behind both.
 *
 * One scroll-scrubbed timeline tells it as a flight:
 *  1. the outline unfolds from the V between the wings, both wings at once,
 *     round their tips and meet at the tail
 *  2. a soft light travels the wings' upper edge, left tip → right tip — the
 *     flight path behind the headline — and fades into the outline
 *  3. YOUR VISION, rises from a mask, a feathered edge sweeping across it in
 *     step with the light passing behind it
 *  4. OUR EXPERTISE glides up, landing as the outline closes
 *  5. the paragraph follows line by line; the outline settles to its tone
 *
 * The outline geometry is the traced logo, untouched: only dashes, opacity and
 * the stroke tone animate. Everything is transform / opacity / SVG stroke —
 * no layout work, no loops. Without JS or with reduced motion the section is
 * simply complete.
 */
export default function VisionSection() {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = section.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const svg = root.querySelector<SVGSVGElement>(".zorx-vision-bird")!;
    const shape = svg.querySelector<SVGPathElement>("#zorx-vision-bird-shape")!;
    const outline = svg.querySelector<SVGUseElement>(".zorx-vision-outline")!;
    const trail = svg.querySelectorAll<SVGUseElement>(".zorx-vision-trail use");
    const trailGroup = svg.querySelector<SVGGElement>(".zorx-vision-trail")!;
    const [line1, line2] = root.querySelectorAll<HTMLElement>(".zorx-vision-line");
    const copy = root.querySelector<HTMLElement>(".zorx-vision-copy")!;

    // ---------------------------------------------------------- outline geometry
    const L = shape.getTotalLength();
    // The path starts at the V notch. Going forward it runs along one wing's upper
    // edge to that wing's tip; the other wing's upper edge ends the loop. Find both
    // tips (min / max x) and the route left tip → notch → right tip along them.
    const N = 480;
    let sLeft = 0, sRight = 0, minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < N; i++) {
      const s = (i / N) * L;
      const { x } = shape.getPointAtLength(s);
      if (x < minX) { minX = x; sLeft = s; }
      if (x > maxX) { maxX = x; sRight = s; }
    }
    // Head position along the path (unwrapped): increasing if the right wing comes
    // first after the notch, decreasing otherwise.
    const forward = sRight < sLeft;
    const p0 = sLeft;
    const p1 = forward ? L + sRight : sRight - L;
    const mod = (v: number) => ((v % L) + L) % L;
    // Screen-independent sweep source: the head's x along the route, made
    // monotonic (the rounded wingtip curls back a little), as a lookup table.
    const M = 240;
    const routeX = new Float32Array(M + 1);
    for (let i = 0, run = -Infinity; i <= M; i++) {
      run = Math.max(run, shape.getPointAtLength(mod(p0 + (p1 - p0) * (i / M))).x);
      routeX[i] = run;
    }
    const xAt = (t: number) => {
      const f = Math.max(0, Math.min(1, t)) * M, i = Math.floor(f);
      return i >= M ? routeX[M] : routeX[i] + (routeX[i + 1] - routeX[i]) * (f - i);
    };

    // Comet: three stacked dashes, head bright and short, tail long and faint.
    const H = L * 0.085;
    const trailLens = [H, H * 0.55, H * 0.22];

    const draw = { d: 0 };
    const flight = { t: 0 };
    const setOutline = () => {
      const d = draw.d;
      if (d >= L / 2 - 0.25) outline.style.strokeDasharray = "none"; // closed: no dash seam
      else outline.style.strokeDasharray = `${d} ${L - 2 * d} ${d} 0`; // grows both ways from the notch
    };
    const setTrail = () => {
      const p = p0 + (p1 - p0) * flight.t;
      trail.forEach((u, i) => {
        const h = trailLens[i];
        // segment ending at the head, behind it in the direction of travel
        const from = forward ? p - h : p;
        u.style.strokeDasharray = `${h} ${L - h}`;
        u.style.strokeDashoffset = String(-mod(from));
      });
      // Feathered edge across line 1 follows the light behind it (screen x).
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const x = xAt(flight.t) * ctm.a + ctm.e;
      const r = line1.getBoundingClientRect();
      let sweep = ((x - r.left) / r.width) * 100;
      // The light is slow, the headline must not wait for it: from a fifth to
      // just past half of the flight the feathered edge is drawn clear of the
      // text, whatever the layout — no part of the line stays faded.
      const need = textEnd + 22;
      const k = Math.max(0, Math.min(1, (flight.t - 0.2) / 0.35));
      if (sweep < need) sweep += (need - sweep) * k * k * (3 - 2 * k);
      line1.style.setProperty("--sweep", `${sweep.toFixed(2)}%`);
    };

    /** Right end of line 1's text, as % of its (full-width) box. */
    let textEnd = 100;
    const measureText = () => {
      const range = document.createRange();
      range.selectNodeContents(line1);
      const t = range.getBoundingClientRect(), b = line1.getBoundingClientRect();
      textEnd = b.width ? ((t.right - b.left) / b.width) * 100 : 100;
    };

    let split: SplitText | null = null;
    let tl: gsap.core.Timeline | null = null;

    /** (Re)build the scrubbed story — scroll-driven, so a rebuild keeps its place. */
    const build = (s: SplitText) => {
      tl?.scrollTrigger?.kill();
      tl?.kill();
      root.dataset.motion = ""; // enables the mask / sweep styles (CSS)
      draw.d = 0;
      flight.t = 0;
      measureText();

      tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root, start: START, end: END, scrub: SCRUB, invalidateOnRefresh: true, refreshPriority: -1 },
      });
      // The background runs across most of the range; the text keeps its early
      // cues, so it is read while the outline and the light are still unfolding.
      // 1 · wings unfold from the notch (both directions at once)
      tl.fromTo(draw, { d: 0 }, { d: L / 2, duration: 9, ease: "power1.inOut", onUpdate: setOutline }, 0);
      tl.fromTo(outline, { opacity: 0.35 }, { opacity: 1, duration: 4, ease: "power1.out" }, 0);
      // 2 · light along the upper edges, left tip → right tip, then into the outline
      tl.fromTo(trailGroup, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1);
      tl.fromTo(flight, { t: 0 }, { t: 1, duration: 7.5, ease: "sine.inOut", onUpdate: setTrail }, 1);
      tl.to(trailGroup, { opacity: 0, duration: 1.6, ease: "power1.in" }, 7.6);
      // 3 · YOUR VISION, — masked rise; its feathered sweep is driven by the light
      tl.fromTo(line1, { yPercent: 100 }, { yPercent: 0, duration: 2, ease: "power3.out" }, 1.1);
      // 4 · OUR EXPERTISE — a glide (rise + fade + slight drift), lands with the outline
      tl.fromTo(
        line2,
        { yPercent: 100, autoAlpha: 0, x: "-0.06em" },
        { yPercent: 0, autoAlpha: 1, x: 0, duration: 2.8, ease: "power3.out" },
        2.8,
      );
      // 5 · paragraph, line by line
      // (one tween per line, not a stagger: each renders its hidden start state
      // immediately, so a later line can never show before its turn)
      s.lines.forEach((line, i) =>
        tl!.fromTo(
          line,
          { yPercent: 100, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 1.5, ease: "power2.out" },
          5.4 + i * 0.32,
        ),
      );
      // settle: the drawn stroke eases back to the reference tone
      tl.fromTo(outline, { stroke: "#34373a" }, { stroke: "#252627", duration: 3, ease: "power1.inOut" }, 9);
      tl.set({}, {}, 12.5); // a little held composition at the end of the range
      setOutline();
      setTrail();
    };

    // Build only after the pinned intro above has built its scroll (it marks its
    // stage data-ready then): this trigger is then created — and on every later
    // refresh measured — after the intro's pin spacing exists. Until then the
    // page is locked at the top, so the section can't be seen in its static state.
    const start = () => {
      if (split) return;
      split = SplitText.create(copy, {
        type: "lines",
        mask: "lines",
        aria: "none", // whole words stay plain text in line spans — readable as is (no aria-label on a <p>)
        linesClass: "zorx-vision-copy-line",
        autoSplit: true, // re-splits on resize / font load → onSplit rebuilds
        onSplit: build,
      });
    };
    const stage = document.querySelector<HTMLElement>(".zorx-stage");
    let mo: MutationObserver | null = null;
    if (!stage || "ready" in stage.dataset) start();
    else {
      mo = new MutationObserver(() => {
        if (!("ready" in stage.dataset)) return;
        mo?.disconnect();
        start();
      });
      mo.observe(stage, { attributes: true, attributeFilter: ["data-ready"] });
    }

    return () => {
      mo?.disconnect();
      tl?.scrollTrigger?.kill();
      tl?.kill();
      split?.revert();
      gsap.set([outline, trailGroup, line1, line2, ...trail], { clearProps: "all" });
      line1.style.removeProperty("--sweep");
      delete root.dataset.motion;
    };
  }, []);

  return (
    <section
      ref={section}
      className={`zorx-vision ${servicesFont.variable}`}
      aria-labelledby="zorx-vision-title"
    >
      <svg
        className="zorx-vision-bird"
        viewBox={BIRD_VIEWBOX}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path id="zorx-vision-bird-shape" d={BIRD_PATH} />
        </defs>
        <use href="#zorx-vision-bird-shape" className="zorx-vision-outline" />
        <g className="zorx-vision-trail">
          <use href="#zorx-vision-bird-shape" />
          <use href="#zorx-vision-bird-shape" />
          <use href="#zorx-vision-bird-shape" />
        </g>
      </svg>

      <div className="zorx-vision-inner">
        <h2 id="zorx-vision-title" className="zorx-vision-title">
          <span className="zorx-vision-mask">
            <span className="zorx-vision-line">Your vision,</span>
          </span>{" "}
          <span className="zorx-vision-mask">
            <span className="zorx-vision-line">our expertise</span>
          </span>
        </h2>
        <p className="zorx-vision-copy">
          We transform ambitious ideas into meaningful digital experiences. Through strategy,
          creativity and technology, we help brands build identities, digital platforms and
          experiences that move businesses forward.
        </p>
      </div>
    </section>
  );
}
