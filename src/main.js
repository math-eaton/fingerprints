import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { drawCell } from './draw.js';
import { buildGrid, rebuildCell, cells } from './grid.js';
import { cfg } from './config.js';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function cssToVec4(hex, alpha = 1) {
  const c = new THREE.Color(hex);
  return new THREE.Vector4(c.r, c.g, c.b, alpha);
}

// ─── SHADERS ─────────────────────────────────────────────────────────────────
const _vert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const PixelationShader = {
  uniforms: {
    tDiffuse:   { value: null },
    resolution: { value: new THREE.Vector2() },
    pixelSize:  { value: cfg.PIXEL_SIZE },
  },
  vertexShader: _vert,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    void main() {
      vec2 dxy = pixelSize / resolution;
      vec2 uv  = dxy * floor(vUv / dxy) + dxy * 0.5;
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};

const SobelAlphaShader = {
  uniforms: {
    tDiffuse:   { value: null },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader: _vert,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    #define LUM(uv) dot(texture2D(tDiffuse,(uv)).rgb, vec3(0.299,0.587,0.114))
    void main() {
      vec2 t  = 1.0 / resolution;
      float tl=LUM(vUv+vec2(-t.x,-t.y)), tm=LUM(vUv+vec2(0.0,-t.y)), tr=LUM(vUv+vec2(t.x,-t.y));
      float ml=LUM(vUv+vec2(-t.x, 0.0)),                               mr=LUM(vUv+vec2(t.x, 0.0));
      float bl=LUM(vUv+vec2(-t.x, t.y)), bm=LUM(vUv+vec2(0.0, t.y)), br=LUM(vUv+vec2(t.x, t.y));
      float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
      float gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
      float e  = clamp(sqrt(gx*gx + gy*gy), 0.0, 1.0);
      gl_FragColor = vec4(vec3(e), e);
    }
  `,
};

const ThresholdShader = {
  uniforms: {
    tDiffuse:       { value: null },
    resolution:     { value: new THREE.Vector2() },
    threshold:      { value: cfg.THRESHOLD },
    ditherStrength: { value: cfg.DITHER_STR },
    aboveColor:     { value: cssToVec4(cfg.ABOVE_CSS, 1.0) },
    belowColor:     { value: cssToVec4(cfg.BELOW_CSS, cfg.BELOW_ALPHA) },
  },
  vertexShader: _vert,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float threshold;
    uniform float ditherStrength;
    uniform vec4 aboveColor;
    uniform vec4 belowColor;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      float lum  = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      vec2 px    = floor(vUv * resolution);
      float dith = (rand(px) - 0.5) * ditherStrength;
      gl_FragColor = (lum + dith) >= threshold ? aboveColor : belowColor;
    }
  `,
};

// ─── RENDERER ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 16));
renderer.setClearColor(cfg.PAPER_HEX);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

document.body.style.backgroundColor       = cfg.BODY_BG_CSS;
renderer.domElement.style.mixBlendMode    = cfg.BODY_BLEND;

// ─── CAMERA ──────────────────────────────────────────────────────────────────
let aspect = window.innerWidth / window.innerHeight;

function updateCameraFrustum() {
  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect;
  } else {
    const hw = (cfg.ORTHO_H * aspect) / 2, hh = cfg.ORTHO_H / 2;
    camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
  }
  camera.updateProjectionMatrix();
}

const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
camera.position.set(0, 0, 20);

// ─── SCENE ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ─── CONTROLS ────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping      = false;
controls.enablePan          = true;
controls.enableZoom         = true;
controls.enableRotate       = true;
controls.screenSpacePanning = true;
controls.minZoom            = 0.5;
controls.maxZoom            = 100.0;
controls.update();

// ─── POST-PROCESSING ─────────────────────────────────────────────────────────
const { innerWidth: W, innerHeight: H } = window;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const sobelPass = new ShaderPass(SobelAlphaShader);
sobelPass.uniforms.resolution.value.set(W, H);
sobelPass.enabled = cfg.USE_SOBEL;
composer.addPass(sobelPass);

const pixelPass = new ShaderPass(PixelationShader);
pixelPass.uniforms.resolution.value.set(W, H);
pixelPass.enabled = cfg.USE_PIXELATION;
composer.addPass(pixelPass);

const thresholdPass = new ShaderPass(ThresholdShader);
thresholdPass.uniforms.resolution.value.set(W, H);
thresholdPass.enabled = cfg.USE_THRESHOLD;
composer.addPass(thresholdPass);

// ─── GRID ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
buildGrid(scene, aspect, clock.getElapsedTime());

// ─── ANIMATION ───────────────────────────────────────────────────────────────
let updateIdx   = 0;
let accumulator = 0;

function forceRedrawAll() {
  const t = clock.elapsedTime;
  cells.forEach(cell => {
    cell.config.time = t;
    drawCell(cell.canvas, cell.config);
    cell.texture.needsUpdate = true;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.elapsedTime;

  accumulator += dt;
  const interval = 1 / cfg.ANIM_FPS;

  if (accumulator >= interval) {
    for (let i = 0; i < cfg.UPDATES_PF; i++) {
      const cell = cells[updateIdx % cells.length];
      cell.config.time = t;
      drawCell(cell.canvas, cell.config);
      cell.texture.needsUpdate = true;
      updateIdx++;
    }
    accumulator -= interval;
  }

  controls.update();
  composer.render();
}

animate();

// ─── GUI ─────────────────────────────────────────────────────────────────────
const ARCHETYPES = {
  'Arch':        0,
  'Loop ->':      2,
  'Loop <-':      3,
  'Whorl':       4,
  'Composite':   5,
  'Double Loop': 6,
};
const ARCHETYPE_OPTIONS  = Object.keys(ARCHETYPES);
const ARCHETYPE_BY_TYPE  = Object.fromEntries(Object.entries(ARCHETYPES).map(([k, v]) => [v, k]));

const gui = new GUI({ title: 'Controls', touchStyles: true });
let guiState = {};

// ── Edge detection ─────────────────────────────────────────────────────────
const sobelFolder = gui.addFolder('Edge detection');
sobelFolder.add({ enabled: cfg.USE_SOBEL }, 'enabled').name('enabled')
  .onChange(v => { sobelPass.enabled = v; });

// ── Pixelation ─────────────────────────────────────────────────────────────
const pixelFolder = gui.addFolder('Pixelation');
pixelFolder.add({ enabled: cfg.USE_PIXELATION }, 'enabled').name('enabled')
  .onChange(v => { pixelPass.enabled = v; });
pixelFolder.add(pixelPass.uniforms.pixelSize, 'value', 1, 32, 0.5).name('pixel size');

// ── Threshold ──────────────────────────────────────────────────────────────
const threshFolder = gui.addFolder('Threshold');
threshFolder.add({ enabled: cfg.USE_THRESHOLD }, 'enabled').name('enabled')
  .onChange(v => { thresholdPass.enabled = v; });
threshFolder.add(thresholdPass.uniforms.threshold,      'value', 0, 1,   0.001).name('threshold');
threshFolder.add(thresholdPass.uniforms.ditherStrength, 'value', 0, 0.5, 0.001).name('dither');

const aboveProxy = { color: cfg.ABOVE_CSS };
threshFolder.addColor(aboveProxy, 'color').name('above color').onChange(v => {
  const c = new THREE.Color(v);
  thresholdPass.uniforms.aboveColor.value.set(c.r, c.g, c.b, 1.0);
});

const belowProxy = { color: cfg.BELOW_CSS, alpha: cfg.BELOW_ALPHA };
threshFolder.addColor(belowProxy, 'color').name('below color').onChange(v => {
  const c = new THREE.Color(v);
  const a = thresholdPass.uniforms.belowColor.value.w;
  thresholdPass.uniforms.belowColor.value.set(c.r, c.g, c.b, a);
});
threshFolder.add(belowProxy, 'alpha', 0, 1, 0.01).name('below alpha')
  .onChange(v => { thresholdPass.uniforms.belowColor.value.w = v; });

// ── Scene ──────────────────────────────────────────────────────────────────
const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];
const sceneFolder = gui.addFolder('Scene');
const bodyProxy   = { bg: cfg.BODY_BG_CSS, blend: cfg.BODY_BLEND };
sceneFolder.addColor(bodyProxy, 'bg').name('background')
  .onChange(v => { document.body.style.backgroundColor = v; });
sceneFolder.add(bodyProxy, 'blend', BLEND_MODES).name('blend mode')
  .onChange(v => { renderer.domElement.style.mixBlendMode = v; });

// ── Grid layout ────────────────────────────────────────────────────────────
const gridFolder = gui.addFolder('Grid');

function fullRebuild() {
  buildGrid(scene, aspect, clock.elapsedTime);
  rebuildTileGUI();
}

gridFolder.add(cfg, 'GRID_COLS',  1,  8, 1).name('columns') .onChange(fullRebuild);
gridFolder.add(cfg, 'GRID_ROWS',  1,  8, 1).name('rows')    .onChange(fullRebuild);
gridFolder.add(cfg, 'CELL_GAP',   0,  1, 0.01).name('gap')  .onChange(fullRebuild);
gridFolder.add(cfg, 'MARGIN',     0,  2, 0.01).name('margin').onChange(fullRebuild);

// ── Canvas / contours ──────────────────────────────────────────────────────
const canvasFolder = gui.addFolder('Canvas');
canvasFolder.add(cfg, 'CANVAS_PX', 64, 2048, 64).name('canvas px').onChange(fullRebuild);
canvasFolder.add(cfg, 'CONTOUR_N',  4,   64,  1).name('contour levels').onChange(forceRedrawAll);
canvasFolder.add(cfg, 'SAMPLE_RES', 64, 512,  8).name('sample res').onChange(forceRedrawAll);
canvasFolder.add(cfg, 'LINE_W',     0.5, 20, 0.5).name('line width').onChange(forceRedrawAll);

// ── Grid 3D ────────────────────────────────────────────────────────────────
const grid3dFolder = gui.addFolder('Grid 3D');
grid3dFolder.add(cfg, 'DISP_AMP',  0, 0.5,  0.1).name('vertex displacement').onChange(fullRebuild);
grid3dFolder.add(cfg, 'TILT_AMP',  0, 0.8,  0.1).name('tilt (rad)').onChange(fullRebuild);
grid3dFolder.add(cfg, 'DEPTH_AMP', 0, 2.0,  0.1).name('depth spread').onChange(fullRebuild);

// ── Animation ──────────────────────────────────────────────────────────────
const animFolder = gui.addFolder('Animation');
animFolder.add(cfg, 'ANIM_FPS', 0.1, 30, 0.1).name('update FPS');

// ── Tiles ──────────────────────────────────────────────────────────────────
let tilesFolder = gui.addFolder('Tiles');

function rebuildTileGUI() {
  tilesFolder.destroy();
  tilesFolder = gui.addFolder('Tiles');
  cells.forEach((cell, i) => {
    const row = Math.floor(i / cfg.GRID_COLS);
    const col = i % cfg.GRID_COLS;
    const proxy = { archetype: ARCHETYPE_BY_TYPE[cell.config.type] ?? 'Arch' };
    tilesFolder.add(proxy, 'archetype', ARCHETYPE_OPTIONS)
      .name(`R${row} C${col}`)
      .onChange(label => {
        rebuildCell(scene, i, ARCHETYPES[label], aspect, clock.elapsedTime);
        // keep proxy in sync if user triggers another change before re-render
        proxy.archetype = label;
      });
  });
}

rebuildTileGUI();

// All subfolders start collapsed
gui.folders.forEach(f => f.close());

// ── Toggle button (appears when panel is dismissed) ───────────────────────
const toggleBtn = document.getElementById('gui-toggle');

function showGUI() {
  gui.show();
  gui.load(guiState); // restore folder states
  toggleBtn.style.display = 'none';
}
function hideGUI() {
  guiState = gui.save(); // save folder states before hiding
  gui.hide();
  toggleBtn.style.display = 'flex';
}

// Intercept the root GUI's own close click → fully hide instead of collapsing.
// Guard `changed === gui` so subfolder open/close doesn't trigger this.
gui.onOpenClose(changed => {
  if (changed === gui && changed._closed) hideGUI();
});

toggleBtn.addEventListener('click', showGUI);

// ─── RESIZE ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  aspect = w / h;
  updateCameraFrustum();
  controls.update();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  sobelPass.uniforms.resolution.value.set(w, h);
  pixelPass.uniforms.resolution.value.set(w, h);
  thresholdPass.uniforms.resolution.value.set(w, h);
  buildGrid(scene, aspect, clock.getElapsedTime());
  rebuildTileGUI();
});
