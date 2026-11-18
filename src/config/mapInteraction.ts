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
  /** Time for the spiral to tighten (s) and the turns flown meanwhile. */
  spiralDuration: 3,
  spiralRevolutions: 2.5,

  /** Free flight: time constant of the bird closing on the pointer (s). */
  positionSmoothing: 0.085,
  /** On a circle the bird follows its path a little more softly (s). */
  orbitSmoothing: 0.12,
  /** Heading: time constant (s) and a turn-rate cap (rad/s) — no instant reversals. */
  rotationSmoothing: 0.1,
  maxTurnRate: 9,
  /** Top speed, in map widths per second (the autonomous bird's approach). */
  maxSpeed: 2.2,
  /** Banking: wings foreshortened in turns (0 = none). */
  bank: 0.22,
  /** Joining / leaving a circle (blend time constant, s). */
  joinSmoothing: 0.22,
  leaveSmoothing: 0.12,

  /** Office spotlight. */
  activeOfficeOpacity: 1,
  inactiveOfficeOpacity: 0.25,
  officeTransitionDuration: 0.45,
  /** Office info hover → map: settle delay against accidental switching (ms). */
  hoverDelayMs: 120,

  /** Radar pulse on the active pin (two rings). */
  radarDuration: 2,
  radarMaxRadius: 0.05,
  radarOpacity: 0.4,

  /** Optional fading trail behind the bird — off: the map stays clean. */
  enableFlightTrail: false,
  flightTrailLifetime: 0.65,
} as const;
