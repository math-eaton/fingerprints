// ─── GRID ────────────────────────────────────────────────────────────────────
export const GRID_COLS  = 3;      // number of columns
export const GRID_ROWS  = 4;      // number of rows
export const CELL_GAP   = 0.125;   // world-unit gap between grid cells
export const MARGIN     = 0.125;   // world-unit margin (left + top/bottom)

// ─── CONTOURS ────────────────────────────────────────────────────────────────
export const CONTOUR_N  = 24;     // iso-contour levels per fingerprint
export const SAMPLE_RES = 256;    // marching-squares field resolution (per side)

// ─── CANVAS TEXTURE ──────────────────────────────────────────────────────────
export const CANVAS_PX  = 1024;    // off-screen canvas pixel size (square)
export const LINE_W     = 4;    // contour stroke width (canvas px) — uniform, no hierarchy

// ─── SCENE ───────────────────────────────────────────────────────────────────
export const ORTHO_H    = 15.0;   // orthographic camera view height (world units)

// ─── ANIMATION ───────────────────────────────────────────────────────────────
export const UPDATES_PF = 1;      // cells refreshed per animation frame

// ─── COLOURS ─────────────────────────────────────────────────────────────────
export const PAPER_CSS  = '#0000ff';
export const INK_CSS    = '#ffffff';
export const PAPER_HEX = 0x0000ff;
