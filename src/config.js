export const cfg = {
  // ─── GRID ──────────────────────────────────────────────────────────────────
  GRID_COLS:  3,
  GRID_ROWS:  4,
  CELL_GAP:   0.125,
  MARGIN:     0.125,

  // ─── CONTOURS ──────────────────────────────────────────────────────────────
  CONTOUR_N:  32,
  SAMPLE_RES: 240,      // marching-squares field resolution per side

  // ─── CANVAS TEXTURE ────────────────────────────────────────────────────────
  CANVAS_PX:  1024,
  LINE_W:     3.0,

  // ─── SCENE ─────────────────────────────────────────────────────────────────
  ORTHO_H:    15.0,

  // ─── ANIMATION ─────────────────────────────────────────────────────────────
  UPDATES_PF: 1,
  ANIM_FPS:   1,

  // ─── POST-PROCESSING ───────────────────────────────────────────────────────
  USE_SOBEL:      false,
  USE_PIXELATION: true,
  USE_THRESHOLD:  true,
  PIXEL_SIZE:     1.5,
  THRESHOLD:      0.175,
  DITHER_STR:     0.0,
  ABOVE_CSS:      '#ffffff',
  BELOW_CSS:      '#000000',
  BELOW_ALPHA:    0.0,

  // ─── GRID 3D ───────────────────────────────────────────────────────────────
  DISP_AMP:   0.05,
  TILT_AMP:   0.05,
  DEPTH_AMP:  0.05,

  // ─── COLOURS ───────────────────────────────────────────────────────────────
  PAPER_CSS:  '#0000ff',
  INK_CSS:    '#ffffff',
  PAPER_HEX:  0x0000ff,

  // ─── BODY ──────────────────────────────────────────────────────────────────
  BODY_BG_CSS: '#0000ff',
  BODY_BLEND:  'normal',
};
