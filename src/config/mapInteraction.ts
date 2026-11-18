/**
 * Contact map interaction (src/lib/mapFlight.ts, src/lib/officeSpotlight.ts,
 * src/components/footer/MapMotion.tsx).
 *
 * Distances are FRACTIONS OF THE MAP'S WIDTH (the artwork's 1037 units), so the
 * zones, orbits and radar scale with the map: at the desktop map width (~600 px)
 * 0.1 ≈ 60 px; on a phone the same values give a smaller, shorter spiral.
 * Times are seconds (smoothing values are time constants: frame-rate independent).
 */
export const MAP_INTERACTION_TUNING = {
  /** The bird is drawn to a pin within this distance of the pointer (≈ 90 px desktop)… */
  entryRadius: 0.15,
  /** …and released beyond this one (≈ 123 px): hysteresis, no flicker at the edge. */
  exitRadius: 0.205,

  /** Spiral: from this radius (≈ 84 px)… */
  initialOrbitRadius: 0.14,
  /** …down to this stable orbit (≈ 30 px). Larger than the brief's 14–20 px on
   *  purpose: the bird's wingspan is ~44 px, so a smaller circle would cover the pin. */
  finalOrbitRadius: 0.05,
  /*
   * Cinematic pace (2026-11-18 refinement; previous values in brackets). Each
   * value was converted by what it is: speeds and angular speeds × 0.5, time
   * constants (smoothing τ) × 2 (≈ half the closing speed), the spiral's
   * duration × 1.75; entry / exit radii and orbit radii unchanged.
   */
  /** Time for the spiral to tighten (s) [3]. */
  spiralDuration: 5.25,
  /** Angular speed on every circle, spiral and stable alike, in turns per
   *  second [0.833 = 2.5 turns / 3 s]. Constant: a tighter circle never spins faster. */
  orbitRevsPerSecond: 0.42,

  /** Free flight: time constant of the bird closing on the pointer (s) [0.085]. */
  positionSmoothing: 0.17,
  /** On a circle the bird follows its path a little more softly (s) [0.12]. */
  orbitSmoothing: 0.16,
  /** Heading: time constant (s) [0.1] and a turn-rate cap (rad/s) [9] — no instant reversals. */
  rotationSmoothing: 0.154,
  maxTurnRate: 5.85,
  /** Top speed of the autonomous bird, in map widths per second [2.2]. */
  maxSpeed: 1.1,
  /** Top speed of the cursor's map bird (map widths / s) [none]: a flick of the
   *  mouse becomes a glide, not a dart. ≈ 840 px/s on the desktop map. */
  maxCursorSpeed: 1.4,
  /** Banking: wings foreshortened in turns (0 = none). */
  bank: 0.22,
  /** Joining / leaving a circle (blend time constant, s) [0.22 / 0.12]. */
  joinSmoothing: 0.38,
  leaveSmoothing: 0.21,

  /** Office spotlight [inactive 0.25, 0.45 s]. */
  activeOfficeOpacity: 1,
  inactiveOfficeOpacity: 0.2,
  officeTransitionDuration: 0.5,
  /** Address reveal when the active office changes (GSAP; px, s). */
  addressRevealOffset: 12,
  addressRevealDuration: 0.65,
  addressRevealStagger: 0.09,
  addressRevealEase: "power2.out",
  /** No office active for this long = back to the default view (both offices
   *  readable; the next activation reveals again). Shorter gaps — the pointer
   *  passing from a column to a pin — don't count as a change (ms). */
  defaultStateDelayMs: 450,
  /** Office info hover → map: settle delay against accidental switching (ms). */
  hoverDelayMs: 120,

  /** Radar pulse on the active pin (two rings) [2 s]. */
  radarDuration: 2.75,
  radarMaxRadius: 0.05,
  radarOpacity: 0.4,

  /** Optional fading trail behind the bird — off: the map stays clean. */
  enableFlightTrail: false,
  flightTrailLifetime: 0.65,
} as const;
