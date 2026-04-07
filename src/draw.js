import { sampleField, marchLevel, quantileLevels } from './contours.js';
import { cfg } from './config.js';

const BUCKET_N    = 47;
const MAX_DENSITY = 6;
const MIN_SEG_FRAC = 1.966 / 501;

export function drawCell(canvas, config) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = cfg.PAPER_CSS;
  ctx.fillRect(0, 0, W, H);

  const { field } = sampleField(config);
  const levels    = quantileLevels(field, cfg.CONTOUR_N);

  ctx.strokeStyle = cfg.INK_CSS;
  ctx.lineWidth   = cfg.LINE_W;
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

      const ddx = x2 - x1, ddy = y2 - y1;
      if (ddx * ddx + ddy * ddy < minSqFrac) continue;

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
