import * as THREE from 'three';
import { drawCell } from './draw.js';
import { fbm } from './noise.js';
import { cfg } from './config.js';

const SUBDIV = 1;

export const cells = [];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function gridMetrics(aspect) {
  const sceneH   = cfg.ORTHO_H;
  const sceneW   = sceneH * aspect;
  const availW   = sceneW - cfg.MARGIN - cfg.CELL_GAP * (cfg.GRID_COLS - 1);
  const availH   = sceneH - cfg.MARGIN * 2 - cfg.CELL_GAP * (cfg.GRID_ROWS - 1);
  const cellSize = Math.min(availW / cfg.GRID_COLS, availH / cfg.GRID_ROWS);
  const startX   = -sceneW / 2 + cfg.MARGIN + cellSize / 2;
  const startY   =  sceneH / 2 - cfg.MARGIN - cellSize / 2;
  return { cellSize, startX, startY };
}

function randomConfig(type, time) {
  return {
    type,
    seed:      (Math.random() * 2 - 1) * 300,
    core:      { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6 },
    angle:     Math.random() * Math.PI * 2,
    warpFreq:  0.5 + Math.random() * 2.5,
    warpAmp:   0.01 + Math.random() * 0.18,
    coreScale: 0.25 + Math.random() * 2.0,
    time,
  };
}

function makeCell(cx, cy, cellSize, type, time) {
  const config = randomConfig(type, time);

  const geo = new THREE.PlaneGeometry(cellSize, cellSize, SUBDIV, SUBDIV);
  const pos = geo.attributes.position;
  const sf  = config.seed * 0.04;
  for (let vi = 0; vi < pos.count; vi++) {
    const vx = pos.getX(vi) / cellSize;
    const vy = pos.getY(vi) / cellSize;
    const z  = (fbm(vx * 2.2 + sf, vy * 2.2 + sf + 4.1) - 0.5) * cfg.DISP_AMP * cellSize;
    pos.setZ(vi, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const canvas      = document.createElement('canvas');
  canvas.width      = cfg.CANVAS_PX;
  canvas.height     = cfg.CANVAS_PX;
  drawCell(canvas, config);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter       = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;

  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(cx, cy, (Math.random() * 2 - 1) * cfg.DEPTH_AMP);
  mesh.rotation.x = (Math.random() * 2 - 1) * cfg.TILT_AMP;
  mesh.rotation.y = (Math.random() * 2 - 1) * cfg.TILT_AMP;

  return { canvas, texture, config, mesh };
}

function disposeCell(cell, scene) {
  scene.remove(cell.mesh);
  cell.mesh.geometry.dispose();
  cell.mesh.material.dispose();
  cell.texture.dispose();
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function buildGrid(scene, aspect, time) {
  cells.forEach(c => disposeCell(c, scene));
  cells.length = 0;

  const { cellSize, startX, startY } = gridMetrics(aspect);
  const total    = cfg.GRID_ROWS * cfg.GRID_COLS;

  // Balanced type pool — equal share of each of the 6 archetypes, shuffled.
  const types    = [0, 2, 3, 4, 5, 6];
  const typePool = [];
  for (const t of types) {
    for (let k = 0; k < Math.ceil(total / types.length); k++) typePool.push(t);
  }
  typePool.length = total;
  for (let i = typePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
  }

  for (let row = 0; row < cfg.GRID_ROWS; row++) {
    for (let col = 0; col < cfg.GRID_COLS; col++) {
      const idx  = row * cfg.GRID_COLS + col;
      const cx   = startX + col * (cellSize + cfg.CELL_GAP);
      const cy   = startY - row * (cellSize + cfg.CELL_GAP);
      const cell = makeCell(cx, cy, cellSize, typePool[idx], time);
      scene.add(cell.mesh);
      cells.push(cell);
    }
  }
}

// Replace a single cell in-place; all others are untouched.
export function rebuildCell(scene, index, type, aspect, time) {
  const { cellSize, startX, startY } = gridMetrics(aspect);
  const col = index % cfg.GRID_COLS;
  const row = Math.floor(index / cfg.GRID_COLS);
  const cx  = startX + col * (cellSize + cfg.CELL_GAP);
  const cy  = startY - row * (cellSize + cfg.CELL_GAP);

  disposeCell(cells[index], scene);
  const cell = makeCell(cx, cy, cellSize, type, time);
  scene.add(cell.mesh);
  cells[index] = cell;
}
