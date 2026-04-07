import { fbm } from './noise.js';

// ─── PRIMITIVE PHASE FIELDS ──────────────────────────────────────────────────
// Each function returns a scalar whose iso-level sets form fingerprint ridges.
// Warped point (wx, wy) and delta-from-core (dx, dy) are in [-1, 1]².

function archPhase(wx, wy) {
  return wy + 0.38 * Math.exp(-1.9 * wx * wx) + 0.07 * Math.sin(wx * 2.6);
}

function tentedPhase(wx, wy) {
  return wy + 0.52 * Math.max(0, 1 - 1.75 * Math.abs(wx));
}

function loopPhase(dx, dy, dir) {
  dx *= dir;
  // Regularise: sqrt(r² + EPS) keeps gradient finite at the core singularity,
  // preventing iso-contours from packing infinitely tight near r = 0.
  const EPS   = 0.025;   // larger radius opens the innermost loop, further reducing gradient spike
  const r     = Math.sqrt(dx * dx + dy * dy + EPS);
  const theta = Math.atan2(dy, dx);
  return Math.sqrt(r) * Math.sin(theta * 0.5);
}

function whorlPhase(dx, dy) {
  const r     = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);
  return r * 1.12 + theta * 0.028;
}

function smstep(a, b, t) {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function cplPhase(dx, dy) {
  const inner = whorlPhase(dx * 1.4, dy * 1.4);
  const outer = loopPhase(dx, dy, 1.0);
  return inner + (outer - inner) * smstep(0.28, 0.80, Math.sqrt(dx * dx + dy * dy));
}

function doublePhase(dx, dy) {
  const l1 = loopPhase(dx + 0.28, dy - 0.07,  1.0);
  const l2 = loopPhase(dx - 0.28, dy + 0.07, -1.0);
  return l1 + (l2 - l1) * smstep(-0.30, 0.30, dy * 0.78 - dx * 0.24);
}

// ─── FULL PHASE EVALUATION ───────────────────────────────────────────────────

/**
 * Evaluate the animated, domain-warped phase field at (x, y) in [-1, 1]².
 *
 * @param {number} x
 * @param {number} y
 * @param {{ type: number, seed: number, core: {x: number, y: number}, time: number }} config
 * @returns {number}
 */
export function evalPhase(x, y, config) {
  const { type, seed, core, time } = config;

  // Slow domain warp
  const tw  = time * 0.18;
  const sx  = seed * 7.13 + 1.05;
  const sy  = seed * 4.87 + 2.34;
  const wx  = fbm(x * 1.55 + sx + tw,        y * 1.55 + sy             );
  const wy  = fbm(x * 1.55 + sx,              y * 1.55 + sy + tw + 3.71 );
  const wpx = x + 0.05 * (wx * 2 - 1);
  const wpy = y + 0.05 * (wy * 2 - 1);

  // Animated core drift
  const tc = time * 0.065;
  const cx = core.x * 2 - 1 + 0.045 * Math.sin(tc * 1.13 + seed);
  const cy = core.y * 2 - 1 + 0.045 * Math.cos(tc * 0.81 + seed * 3.07);

  const dx = wpx - cx;
  const dy = wpy - cy;

  let phase;
  switch (type % 7) {
    case 0:  phase = archPhase(wpx, wpy);      break;
    // case 1:  phase = tentedPhase(wpx, wpy);    break;
    case 2:  phase = loopPhase(dx, dy,  1.0);  break;
    case 3:  phase = loopPhase(dx, dy, -1.0);  break;
    case 4:  phase = whorlPhase(dx, dy);        break;
    case 5:  phase = cplPhase(dx, dy);          break;
    default: phase = doublePhase(dx, dy);       break;
  }

  // Organic irregularity — frequency must stay below grid Nyquist (~30 cycles/unit).
  phase += 0.03 * (fbm(wpx * 3.0 + seed * 6.3 + time * 0.008, wpy * 3.0) - 0.5);

  return phase;
}
