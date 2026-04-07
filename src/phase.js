import { fbm } from './noise.js';

function archPhase(wx, wy) {
  return wy + 0.38 * Math.exp(-1.9 * wx * wx) + 0.07 * Math.sin(wx * 2.6);
}

function tentedPhase(wx, wy) {
  return wy + 0.52 * Math.max(0, 1 - 1.75 * Math.abs(wx));
}

function loopPhase(dx, dy, dir) {
  dx *= dir;
  const r     = Math.sqrt(dx * dx + dy * dy + 0.025);
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

export function evalPhase(x, y, config) {
  const { type, seed, core, time } = config;
  const angle     = config.angle     ?? 0;
  const warpFreq  = config.warpFreq  ?? 1.55;
  const warpAmp   = config.warpAmp   ?? 0.05;
  const coreScale = config.coreScale ?? 1.0;

  const tw = time * 0.18;
  const sx = seed * 7.13 + 1.05;
  const sy = seed * 4.87 + 2.34;
  const wx = fbm(x * warpFreq + sx + tw, y * warpFreq + sy);
  const wy = fbm(x * warpFreq + sx,      y * warpFreq + sy + tw + 3.71);
  const wpx = x + warpAmp * (wx * 2 - 1);
  const wpy = y + warpAmp * (wy * 2 - 1);

  const tc = time * 0.065;
  const cx = core.x * 2 - 1 + 0.045 * Math.sin(tc * 1.13 + seed);
  const cy = core.y * 2 - 1 + 0.045 * Math.cos(tc * 0.81 + seed * 3.07);

  // Rotate the entire sample space so each cell's pattern flows in a unique direction
  const ca   = Math.cos(angle), sa = Math.sin(angle);
  const rwpx = wpx * ca - wpy * sa;
  const rwpy = wpx * sa + wpy * ca;
  const rcx  = cx  * ca - cy  * sa;
  const rcy  = cx  * sa + cy  * ca;
  const dx   = (rwpx - rcx) * coreScale;
  const dy   = (rwpy - rcy) * coreScale;

  let phase;
  switch (type % 7) {
    case 0:  phase = archPhase(rwpx, rwpy);    break;
    // case 1:  phase = tentedPhase(rwpx, rwpy);  break;
    case 2:  phase = loopPhase(dx, dy,  1.0);  break;
    case 3:  phase = loopPhase(dx, dy, -1.0);  break;
    case 4:  phase = whorlPhase(dx, dy);        break;
    case 5:  phase = cplPhase(dx, dy);          break;
    default: phase = doublePhase(dx, dy);       break;
  }

  phase += 0.03 * (fbm(wpx * 3.0 + seed * 6.3 + time * 0.008, wpy * 3.0) - 0.5);
  return phase;
}
