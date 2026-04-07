import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { drawCell } from './draw.js';
import { buildGrid, cells, gridParams } from './grid.js';
import {
  ORTHO_H, PAPER_HEX, UPDATES_PF,
  USE_SOBEL, USE_PIXELATION, USE_THRESHOLD,
  PIXEL_SIZE, THRESHOLD, DITHER_STR, ABOVE_CSS, BELOW_CSS, BELOW_ALPHA,
  ANIM_FPS,
  BODY_BG_CSS, BODY_BLEND,
} from './config.js';

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
    pixelSize:  { value: PIXEL_SIZE },
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
    threshold:      { value: THRESHOLD },
    ditherStrength: { value: DITHER_STR },
    aboveColor:     { value: cssToVec4(ABOVE_CSS, 1.0) },
    belowColor:     { value: cssToVec4(BELOW_CSS, BELOW_ALPHA) },
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
renderer.setClearColor(PAPER_HEX);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ─── BODY STYLE ──────────────────────────────────────────────────────────────
document.body.style.backgroundColor = BODY_BG_CSS;
renderer.domElement.style.mixBlendMode = BODY_BLEND;

// ─── CAMERA ──────────────────────────────────────────────────────────────────
let aspect = window.innerWidth / window.innerHeight;

function updateCameraFrustum() {
  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect;
  } else {
    const hw = (ORTHO_H * aspect) / 2, hh = ORTHO_H / 2;
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
controls.maxZoom            = 15.0;
controls.update();

// ─── POST-PROCESSING SETUP ───────────────────────────────────────────────────
const { innerWidth: W, innerHeight: H } = window;
const composer      = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const sobelPass     = new ShaderPass(SobelAlphaShader);
sobelPass.uniforms.resolution.value.set(W, H);
sobelPass.enabled   = USE_SOBEL;
composer.addPass(sobelPass);

const pixelPass     = new ShaderPass(PixelationShader);
pixelPass.uniforms.resolution.value.set(W, H);
pixelPass.enabled   = USE_PIXELATION;
composer.addPass(pixelPass);

const thresholdPass = new ShaderPass(ThresholdShader);
thresholdPass.uniforms.resolution.value.set(W, H);
thresholdPass.enabled = USE_THRESHOLD;
composer.addPass(thresholdPass);

// ─── GRID ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
buildGrid(scene, aspect, clock.getElapsedTime());

// ─── ANIMATION ───────────────────────────────────────────────────────────────
let updateIdx   = 0;
let accumulator = 0;
const state = { animFps: ANIM_FPS };

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.elapsedTime;

  accumulator += dt;
  const interval = 1 / state.animFps;

  if (accumulator >= interval) {
    for (let i = 0; i < UPDATES_PF; i++) {
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
const gui = new GUI({ title: 'Controls' });

// Sobel
const sobelFolder = gui.addFolder('Edge detection');
sobelFolder.add({ enabled: USE_SOBEL }, 'enabled').name('enabled').onChange(v => {
  sobelPass.enabled = v;
});

// Pixelation
const pixelFolder = gui.addFolder('Pixelation');
pixelFolder.add({ enabled: USE_PIXELATION }, 'enabled').name('enabled').onChange(v => {
  pixelPass.enabled = v;
});
pixelFolder.add(pixelPass.uniforms.pixelSize, 'value', 1, 32, 0.5).name('pixel size');

// Threshold
const threshFolder = gui.addFolder('Threshold');
threshFolder.add({ enabled: USE_THRESHOLD }, 'enabled').name('enabled').onChange(v => {
  thresholdPass.enabled = v;
});
threshFolder.add(thresholdPass.uniforms.threshold, 'value', 0, 1, 0.001).name('threshold');
threshFolder.add(thresholdPass.uniforms.ditherStrength, 'value', 0, 0.5, 0.001).name('dither');

const aboveProxy = { color: ABOVE_CSS };
threshFolder.addColor(aboveProxy, 'color').name('above color').onChange(v => {
  const c = new THREE.Color(v);
  thresholdPass.uniforms.aboveColor.value.set(c.r, c.g, c.b, 1.0);
});

const belowProxy = { color: BELOW_CSS, alpha: BELOW_ALPHA };
threshFolder.addColor(belowProxy, 'color').name('below color').onChange(v => {
  const c = new THREE.Color(v);
  const a = thresholdPass.uniforms.belowColor.value.w;
  thresholdPass.uniforms.belowColor.value.set(c.r, c.g, c.b, a);
});
threshFolder.add(belowProxy, 'alpha', 0, 1, 0.01).name('below alpha').onChange(v => {
  thresholdPass.uniforms.belowColor.value.w = v;
});

// Scene / body
const BLEND_MODES = ['normal','multiply','screen','overlay','darken','lighten',
  'color-dodge','color-burn','hard-light','soft-light','difference','exclusion',
  'hue','saturation','color','luminosity'];

const sceneFolder = gui.addFolder('Scene');
const bodyProxy = { bg: BODY_BG_CSS, blend: BODY_BLEND };
sceneFolder.addColor(bodyProxy, 'bg').name('background').onChange(v => {
  document.body.style.backgroundColor = v;
});
sceneFolder.add(bodyProxy, 'blend', BLEND_MODES).name('blend mode').onChange(v => {
  renderer.domElement.style.mixBlendMode = v;
});

// Grid 3D
const gridFolder = gui.addFolder('Grid 3D');
const rebuildGrid = () => buildGrid(scene, aspect, clock.elapsedTime);
gridFolder.add(gridParams, 'dispAmp',  0, 0.5,  0.001).name('vertex displacement').onChange(rebuildGrid);
gridFolder.add(gridParams, 'tiltAmp',  0, 0.785, 0.001).name('tilt (rad)').onChange(rebuildGrid);
gridFolder.add(gridParams, 'depthAmp', 0, 2.0,  0.01).name('depth spread').onChange(rebuildGrid);

// Animation
const animFolder = gui.addFolder('Animation');
animFolder.add(state, 'animFps', 0.1, 30, 0.1).name('update FPS');

// Right-click to hide/show
window.addEventListener('contextmenu', e => {
  e.preventDefault();
  gui.domElement.style.display = gui.domElement.style.display === 'none' ? '' : 'none';
});

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
});
