import * as THREE from 'three';
import { drawCell } from './draw.js';
import {
  GRID_COLS, GRID_ROWS,
  CELL_GAP, MARGIN,
  CANVAS_PX, ORTHO_H,
} from './config.js';

/**
 * @typedef {{ canvas: HTMLCanvasElement, texture: THREE.CanvasTexture,
 *             mesh: THREE.Mesh, config: object }} Cell
 */

/** @type {Cell[]} */
export const cells = [];

// One PlaneGeometry reused for every mesh (same cell size within a build)
let planeGeo = null;

/**
 * Rebuild the full cell grid.
 *
 * @param {THREE.Scene}  scene
 * @param {number}       aspect  viewport width / height
 * @param {number}       time    current clock time (for initial draw)
 */
export function buildGrid(scene, aspect, time) {
  // Dispose and remove previous objects
  cells.forEach(({ mesh, texture }) => {
    scene.remove(mesh);
    mesh.material.dispose();
    texture.dispose();
  });
  cells.length = 0;

  if (planeGeo) {
    planeGeo.dispose();
    planeGeo = null;
  }

  const sceneH = ORTHO_H;
  const sceneW = sceneH * aspect;

  // Square cells fitted to available space (left-justified, no right margin)
  const availW = sceneW - MARGIN     - CELL_GAP * (GRID_COLS - 1);
  const availH = sceneH - MARGIN * 2 - CELL_GAP * (GRID_ROWS - 1);
  const cell   = Math.min(availW / GRID_COLS, availH / GRID_ROWS);

  planeGeo = new THREE.PlaneGeometry(cell, cell);

  // Top-left cell centre in world space (left-justified)
  const startX = -sceneW / 2 + MARGIN + cell / 2;
  const startY =  sceneH / 2 - MARGIN - cell / 2;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cx = startX + col * (cell + CELL_GAP);
      const cy = startY - row * (cell + CELL_GAP);

      const config = {
        type: Math.floor(Math.random() * 7),
        seed: Math.random() * 100,
        core: {
          x: 0.5 + (Math.random() - 0.5) * 0.30,
          y: 0.5 + (Math.random() - 0.5) * 0.30,
        },
        time,
      };

      const canvas      = document.createElement('canvas');
      canvas.width      = CANVAS_PX;
      canvas.height     = CANVAS_PX;

      // Draw immediately so the cell isn't blank on first frame
      drawCell(canvas, config);

      const texture = new THREE.CanvasTexture(canvas);
      texture.DEFAULT_ANISOTROPY = 16;
      texture.minFilter      = THREE.NearestMipmapLinearFilter;
      texture.generateMipmaps = true;

      const mat  = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.position.set(cx, cy, 0);
      scene.add(mesh);

      cells.push({ canvas, texture, config, mesh });
    }
  }
}
