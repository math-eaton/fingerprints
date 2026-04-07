// ─── VALUE NOISE / FBM ───────────────────────────────────────────────────────

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function vnoise(px, py) {
  const ix = Math.floor(px), iy = Math.floor(py);
  let fx = px - ix, fy = py - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  return (
    hash(ix,     iy    ) * (1 - fx) * (1 - fy) +
    hash(ix + 1, iy    ) *      fx  * (1 - fy) +
    hash(ix,     iy + 1) * (1 - fx) *      fy  +
    hash(ix + 1, iy + 1) *      fx  *      fy
  );
}

/**
 * 4-octave fractional Brownian motion.
 * @param {number} px
 * @param {number} py
 * @returns {number} value in [0, 1)
 */
export function fbm(px, py) {
  let v = 0, a = 0.5, x = px, y = py;
  for (let i = 0; i < 4; i++) {
    v += a * vnoise(x, y);
    x  = x * 2.07 + 1.72;
    y  = y * 2.07 + 9.23;
    a *= 0.5;
  }
  return v;
}
