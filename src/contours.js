import { evalPhase } from './phase.js';
import { cfg } from './config.js';

export function sampleField(config) {
  const res   = cfg.SAMPLE_RES | 0;
  const field = new Float32Array(res * res);
  let min = Infinity, max = -Infinity;

  for (let row = 0; row < res; row++) {
    const y = 1 - (row / (res - 1)) * 2;
    for (let col = 0; col < res; col++) {
      const x = (col / (res - 1)) * 2 - 1;
      const v = evalPhase(x, y, config);
      field[row * res + col] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  return { field, min, max };
}

export function quantileLevels(field, n) {
  const sorted = Array.from(field).sort((a, b) => a - b);
  const len    = sorted.length;
  const levels = [];
  for (let i = 0; i < n; i++) {
    const q   = (i + 0.5) / n;
    const idx = q * (len - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.min(lo + 1, len - 1);
    levels.push(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
  }
  return levels;
}

export function marchLevel(field, level) {
  const res   = cfg.SAMPLE_RES | 0;
  const pairs = [];

  const lerp = (a, b, t) => a + (b - a) * t;
  const frac  = (v1, v2) =>
    Math.abs(v2 - v1) < 1e-10
      ? 0.5
      : Math.max(0, Math.min(1, (level - v1) / (v2 - v1)));

  for (let row = 0; row < res - 1; row++) {
    for (let col = 0; col < res - 1; col++) {
      const tl = field[ row      * res + col    ];
      const tr = field[ row      * res + col + 1];
      const bl = field[(row + 1) * res + col    ];
      const br = field[(row + 1) * res + col + 1];

      const x0 = col       / (res - 1);
      const x1 = (col + 1) / (res - 1);
      const y0 = row       / (res - 1);
      const y1 = (row + 1) / (res - 1);

      const tX = lerp(x0, x1, frac(tl, tr)); const tY = y0;
      const rX = x1;                          const rY = lerp(y0, y1, frac(tr, br));
      const bX = lerp(x0, x1, frac(bl, br)); const bY = y1;
      const lX = x0;                          const lY = lerp(y0, y1, frac(tl, bl));

      const idx = ((tl > level) ? 8 : 0)
                | ((tr > level) ? 4 : 0)
                | ((br > level) ? 2 : 0)
                | ((bl > level) ? 1 : 0);

      switch (idx) {
        case  1: case 14: pairs.push(lX, lY, bX, bY); break;
        case  2: case 13: pairs.push(bX, bY, rX, rY); break;
        case  3: case 12: pairs.push(lX, lY, rX, rY); break;
        case  4: case 11: pairs.push(tX, tY, rX, rY); break;
        case  5:          pairs.push(tX, tY, rX, rY);
                          pairs.push(lX, lY, bX, bY); break;
        case  6: case  9: pairs.push(tX, tY, bX, bY); break;
        case  7: case  8: pairs.push(tX, tY, lX, lY); break;
        case 10:          pairs.push(tX, tY, lX, lY);
                          pairs.push(rX, rY, bX, bY); break;
      }
    }
  }

  return new Float32Array(pairs);
}
