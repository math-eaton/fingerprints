import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { drawCell } from './draw.js';
import { buildGrid, cells } from './grid.js';
import { ORTHO_H, PAPER_HEX, UPDATES_PF } from './config.js';

// ─── RENDERER ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer(
  { 
  antialias: false, 
  alpha: true,
  }
);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(PAPER_HEX);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ─── CAMERA (orthographic) ───────────────────────────────────────────────────
let aspect = window.innerWidth / window.innerHeight;

function updateCameraFrustum() {
  const hw = (ORTHO_H * aspect) / 2;
  const hh = ORTHO_H / 2;
  camera.left   = -hw;
  camera.right  =  hw;
  camera.top    =  hh;
  camera.bottom = -hh;
  camera.updateProjectionMatrix();
}

// const camera = new THREE.OrthographicCamera(
//   -(ORTHO_H * aspect) / 2,
//    (ORTHO_H * aspect) / 2,
//    ORTHO_H / 2,
//   -ORTHO_H / 2,
//   0.1, 100,
// );
// camera.position.set(0, 0, 5);

const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
camera.position.set(0, 0, 20);
updateCameraFrustum();

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

// ─── INIT GRID ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
buildGrid(scene, aspect, clock.getElapsedTime());

// ─── ANIMATION ───────────────────────────────────────────────────────────────
let updateIdx = 0;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Round-robin: refresh UPDATES_PF cells per frame
  for (let i = 0; i < UPDATES_PF; i++) {
    const cell = cells[updateIdx % cells.length];
    cell.config.time      = t;
    drawCell(cell.canvas, cell.config);
    cell.texture.needsUpdate = true;
    updateIdx++;
  }

  controls.update();
  // console.log(camera.position);
  renderer.render(scene, camera);
}

animate();

// ─── RESIZE ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  aspect = window.innerWidth / window.innerHeight;
  updateCameraFrustum();
  controls.update();
  renderer.setSize(window.innerWidth, window.innerHeight);
  buildGrid(scene, aspect, clock.getElapsedTime());
});
