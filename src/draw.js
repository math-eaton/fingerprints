import { sampleField, marchLevel, quantileLevels } from './contours.js';
import { CONTOUR_N, LINE_W, PAPER_CSS, INK_CSS } from './config.js';

// ─── DENSITY BUCKET ──────────────────────────────────────────────────────────
// The canvas is divided into a BUCKET_N × BUCKET_N grid. Each bucket tracks
// how many contour segments have already been drawn through it. Once a bucket
// reaches MAX_DENSITY, any further segments whose midpoint falls there are
// skipped. This puts a hard cap on local line density, replacing merged blobs
// with natural-looking ridge terminations (fingerprint minutiae).
const BUCKET_N    = 47;   // grid cells per side — 512/N ≈ N px per cell
// const MAX_DENSITY = Math.random() * 9 + 1;    // max segments per bucket before culling
const MAX_DENSITY = 6;    // max segments per bucket before culling


// ─── SEGMENT LENGTH FLOOR ────────────────────────────────────────────────────
// Sub-pixel segments cluster near phase singularities and read as dots/blobs.
const MIN_SEG_FRAC = 1.966 / 501; 
// in [0,1]^2 1.8 / 512 is equivalent to ~1.8 px on a 512-px canvas

export function drawCell(canvas, config) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = PAPER_CSS;
  ctx.fillRect(0, 0, W, H);

  const { field } = sampleField(config);
  const levels    = quantileLevels(field, CONTOUR_N);

  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth   = LINE_W;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  const minSqFrac = MIN_SEG_FRAC * MIN_SEG_FRAC;
  const density   = new Uint8Array(BUCKET_N * BUCKET_N);

  for (const level of levels) {
    const segs = marchLevel(field, level);

    ctx.beginPath();
    for (let s = 0; s < segs.length; s += 4) {
      const x1 = segs[s    ], y1 = segs[s + 1];
      const x2 = segs[s + 2], y2 = segs[s + 3];

      // 1. Skip sub-pixel segments
      const ddx = x2 - x1, ddy = y2 - y1;
      if (ddx * ddx + ddy * ddy < minSqFrac) continue;

      // 2. Density cap: look up midpoint bucket
      const mx = (x1 + x2) * 0.5;
      const my = (y1 + y2) * 0.5;
      const bx = Math.min(BUCKET_N - 1, (mx * BUCKET_N) | 0);
      const by = Math.min(BUCKET_N - 1, (my * BUCKET_N) | 0);
      const bi = by * BUCKET_N + bx;
      if (density[bi] >= MAX_DENSITY) continue;
      density[bi]++;

      ctx.moveTo(x1 * W, y1 * H);
      ctx.lineTo(x2 * W, y2 * H);
    }
    ctx.stroke();
  }
}
