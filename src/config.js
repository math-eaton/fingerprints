// ─── GRID ────────────────────────────────────────────────────────────────────
export const GRID_COLS  = 3;
export const GRID_ROWS  = 4;
export const CELL_GAP   = 0.125;
export const MARGIN     = 0.125;

// ─── CONTOURS ────────────────────────────────────────────────────────────────
export const CONTOUR_N  = 32;
export const SAMPLE_RES = 32 * 7.5;

// ─── CANVAS TEXTURE ──────────────────────────────────────────────────────────
export const CANVAS_PX  = 1024;
export const LINE_W     = 5;

// ─── SCENE ───────────────────────────────────────────────────────────────────
export const ORTHO_H    = 15.0;

// ─── ANIMATION ───────────────────────────────────────────────────────────────
export const UPDATES_PF = 1;       // cells redrawn per update tick
export const ANIM_FPS   = 1;       // texture update rate (ticks per second)

// ─── POST-PROCESSING ─────────────────────────────────────────────────────────
export const USE_SOBEL      = true;
export const USE_PIXELATION = true;
export const USE_THRESHOLD  = true;
export const PIXEL_SIZE     = 4;       // pixelation block size (px)
export const THRESHOLD      = 0.666;   // luminance cutoff (0–1)
export const DITHER_STR     = 0.125;   // dither band width
export const ABOVE_CSS      = '#ffffff'; // color when lum ≥ threshold
export const BELOW_CSS      = '#000000'; // color when lum < threshold
export const BELOW_ALPHA    = 0.0;       // 0 = transparent below

// ─── GRID 3D ─────────────────────────────────────────────────────────────────
export const DISP_AMP  = 0.05;   // fbm vertex Z displacement (fraction of cell size)
export const TILT_AMP  = 0.15;   // max per-axis tilt in radians
export const DEPTH_AMP = 0.25;   // max Z depth stratification (world units)

// ─── COLOURS ─────────────────────────────────────────────────────────────────
export const PAPER_CSS  = '#0000ff';
export const INK_CSS    = '#ffffff';
export const PAPER_HEX  = 0x0000ff;

// ─── BODY STYLE ──────────────────────────────────────────────────────────────
export const BODY_BG_CSS = '#0000ff';
export const BODY_BLEND  = 'normal';   // CSS mix-blend-mode on the canvas
