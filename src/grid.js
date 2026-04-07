import * as THREE from 'three';
import { drawCell } from './draw.js';
import { fbm } from './noise.js';
import {
  GRID_COLS, GRID_ROWS,
  CELL_GAP, MARGIN,
  CANVAS_PX, ORTHO_H,
} from './config.js';

const SUBDIV   = 1;   // vertex subdivisions per plane side
const DISP_AMP = 0.05; // Z displacement as a fraction of cell size
const TILT_AMP = 0.15; // max per-axis tilt in radians (~3°)
const DEPTH_AMP = 0.25; // max Z offset (depth stratification)

export const cells = [];

export function buildGrid(scene, aspect, time) {
  cells.forEach(({ mesh, texture }) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    texture.dispose();
  });
  cells.length = 0;

  const sceneH = ORTHO_H;
  const sceneW = sceneH * aspect;
  const availW = sceneW - MARGIN     - CELL_GAP * (GRID_COLS - 1);
  const availH = sceneH - MARGIN * 2 - CELL_GAP * (GRID_ROWS - 1);
  const cell   = Math.min(availW / GRID_COLS, availH / GRID_ROWS);

  const startX = -sceneW / 2 + MARGIN + cell / 2;
  const startY =  sceneH / 2 - MARGIN - cell / 2;

  // Balanced type pool — exactly 2 of each of the 6 distinct phase behaviours,
  // shuffled so same-type cells are never adjacent by default.
  const total    = GRID_ROWS * GRID_COLS;
  const typePool = [];
  for (let t of [0, 2, 3, 4, 5, 6]) {
    for (let k = 0; k < Math.ceil(total / 6); k++) typePool.push(t);
  }
  typePool.length = total;
  for (let i = typePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
  }

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = row * GRID_COLS + col;
      const cx  = startX + col * (cell + CELL_GAP);
      const cy  = startY - row * (cell + CELL_GAP);

      const config = {
        type:      typePool[idx],
        seed:      (Math.random() * 2 - 1) * 150,
        core:      { x: 0.36 + Math.random() * 0.28, y: 0.36 + Math.random() * 0.28 },
        angle:     Math.random() * Math.PI * 2,
        warpFreq:  0.7  + Math.random() * 1.8,
        warpAmp:   0.02 + Math.random() * 0.08,
        coreScale: 0.55 + Math.random() * 1.0,
        time,
      };

      // Per-cell geometry with fbm-displaced vertices for heightmap distortion
      const geo = new THREE.PlaneGeometry(cell, cell, SUBDIV, SUBDIV);
      const pos = geo.attributes.position;
      const sf  = config.seed * 0.04;
      for (let vi = 0; vi < pos.count; vi++) {
        const vx = pos.getX(vi) / cell; // [-0.5, 0.5]
        const vy = pos.getY(vi) / cell;
        const z  = (fbm(vx * 2.2 + sf, vy * 2.2 + sf + 4.1) - 0.5) * DISP_AMP * cell;
        pos.setZ(vi, z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      const canvas      = document.createElement('canvas');
      canvas.width      = CANVAS_PX;
      canvas.height     = CANVAS_PX;
      drawCell(canvas, config);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter      = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      // texture.generateMipmaps = false;

      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture }));
      mesh.position.set(
        cx,
        cy,
        (Math.random() * 2 - 1) * DEPTH_AMP,
      );
      mesh.rotation.x = (Math.random() * 2 - 1) * TILT_AMP;
      mesh.rotation.y = (Math.random() * 2 - 1) * TILT_AMP;

      scene.add(mesh);
      cells.push({ canvas, texture, config, mesh });
    }
  }
}
