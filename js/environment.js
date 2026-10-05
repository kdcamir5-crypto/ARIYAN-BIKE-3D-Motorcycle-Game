
// ARIYAN BIKE GAME - Step 8: Basic roadside environment
// Simple, lightweight scenery on both sides of the road:
// trees, bushes, grass tufts, ground patches, rocks, lamp posts, marker posts.
// Visual only: there is NO collision, the bike can pass through everything.
//
// Performance: each kind of object is drawn with an InstancedMesh, which draws
// many copies of one shape in a single draw call.
//
// Placement is deterministic: a seeded random generator always gives the
// same numbers, so the world looks identical every time the page opens.

import * as THREE from 'three';

// ---------- Settings (easy to adjust later) ----------
const ENV_EDGE = 285;               // objects are placed between -285 and +285 along the road
const TREES_PER_SIDE = 50;
const BUSHES_PER_SIDE = 60;
const GRASS_TUFTS = 260;
const GROUND_PATCHES = 50;
const ROCKS_PER_SIDE = 20;
const LAMP_SPACING = 40;            // distance between lamp posts
const LAMP_HEIGHT = 6;
const MARKER_SPACING = 25;          // distance between road-edge marker posts

// Small seeded random number generator (mulberry32)
function createSeededRandom(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRoadsideEnvironment(scene, roadWidth) {
  const roadHalfWidth = roadWidth / 2;
  const random = createSeededRandom(20240607);
  const sides = [-1, 1]; // -1 = left of the road, +1 = right of the road

  // Helpers for placing many copies of one shape
  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  function makeInstanced(geometry, material, capacity) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.frustumCulled = false; // cheap enough, avoids objects popping out at screen edges
    scene.add(mesh);
    mesh.userData.used = 0;     // how many instances were added so far
    return mesh;
  }

  function addInstance(mesh, x, y, z, sx, sy, sz, rotY, colorHex) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    const index = mesh.userData.used;
    mesh.setMatrixAt(index, dummy.matrix);
    if (colorHex !== undefined) {
      mesh.setColorAt(index, tempColor.setHex(colorHex));
    }
    mesh.userData.used = index + 1;
  }

  // Draw only the instances that were really added
  function finishInstances(mesh) {
    mesh.count = mesh.userData.used;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Shared materials (white base so each instance can have its own color)
  const colorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4423, flatShading: true });

  // ----- Trees -----
  // Trunk (brown cylinder) + foliage (green cone "pine" or green sphere "round").
  const treeCapacity = TREES_PER_SIDE * 2;
  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.32, 1, 8);
  trunkGeometry.translate(0, 0.5, 0); // base of the trunk sits at y = 0
  const coneGeometry = new THREE.ConeGeometry(1, 1, 8);
  coneGeometry.translate(0, 0.5, 0);  // base of the cone sits at y = 0
  const sphereGeometry = new THREE.SphereGeometry(1, 8, 6);

  const trunks = makeInstanced(trunkGeometry, trunkMaterial, treeCapacity);
  const pineFoliage = makeInstanced(coneGeometry, colorMaterial, treeCapacity);
  const roundFoliage = makeInstanced(sphereGeometry, colorMaterial, treeCapacity);

  const pineColors = [0x2d6a3e, 0x1f5a33, 0x356f45];
  const roundColors = [0x3f8f3a, 0x4a9a44, 0x2f7d32];
  const slotLength = (ENV_EDGE * 2) / TREES_PER_SIDE;

  sides.forEach((side) => {
    for (let i = 0; i < TREES_PER_SIDE; i++) {
      const z = -ENV_EDGE + (i + random()) * slotLength;
      const x = side * (10 + random() * 35);   // at least 10 from the center = beside the road
      const size = 0.8 + random() * 0.9;       // different sizes
      const rotY = random() * Math.PI * 2;
      const isPine = random() < 0.5;
      const trunkHeight = 2 * size;

      addInstance(trunks, x, 0, z, size, trunkHeight, size, rotY);

      if (isPine) {
        const color = pineColors[Math.floor(random() * pineColors.length)];
        addInstance(pineFoliage, x, trunkHeight * 0.6, z, 1.5 * size, 4 * size, 1.5 * size, rotY, color);
      } else {
        const color = roundColors[Math.floor(random() * roundColors.length)];
        addInstance(roundFoliage, x, trunkHeight + size, z, 1.4 * size, 1.3 * size, 1.4 * size, rotY, color);
      }
    }
  });
  finishInstances(trunks);
  finishInstances(pineFoliage);
  finishInstances(roundFoliage);

  // ----- Bushes (low, flattened green spheres) -----
  const bushes = makeInstanced(sphereGeometry, colorMaterial, BUSHES_PER_SIDE * 2);
  const bushColors = [0x3c7a35, 0x4d8c3f, 0x2f6b30, 0x5a9a48];
  const bushSlot = (ENV_EDGE * 2) / BUSHES_PER_SIDE;

  sides.forEach((side) => {
    for (let i = 0; i < BUSHES_PER_SIDE; i++) {
      const z = -ENV_EDGE + (i + random()) * bushSlot;
      const x = side * (9 + random() * 14);
      const size = 0.5 + random() * 0.55;
      const color = bushColors[Math.floor(random() * bushColors.length)];
      addInstance(bushes, x, size * 0.5, z, size, size * 0.7, size, random() * Math.PI * 2, color);
    }
  });
  finishInstances(bushes);

  // ----- Ground patches (flat circles of slightly different green) -----
  const patchGeometry = new THREE.CircleGeometry(1, 12);
  patchGeometry.rotateX(-Math.PI / 2); // lay it flat
  const patchMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -0.5,
    polygonOffsetUnits: -0.5
  });
  const patches = makeInstanced(patchGeometry, patchMaterial, GROUND_PATCHES);
  const patchColors = [0x4f7045, 0x66905a, 0x5d8a50, 0x486a40];

  for (let i = 0; i < GROUND_PATCHES; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const radius = 3 + random() * 5;
    // Placed so the patch never reaches onto the road
    const x = side * (roadHalfWidth + 0.5 + radius + random() * 40);
    const z = -ENV_EDGE + random() * ENV_EDGE * 2;
    const color = patchColors[Math.floor(random() * patchColors.length)];
    addInstance(patches, x, 0.012, z, radius, 1, radius, 0, color);
  }
  finishInstances(patches);

  // ----- Grass tufts (tiny thin cones) -----
  const tuftGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
  tuftGeometry.translate(0, 0.25, 0);
  const tufts = makeInstanced(tuftGeometry, colorMaterial, GRASS_TUFTS);
  const tuftColors = [0x6f9a5a, 0x4e7a3f, 0x7fa862];

  for (let i = 0; i < GRASS_TUFTS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (7 + random() * 33);
    const z = -ENV_EDGE + random() * ENV_EDGE * 2;
    const height = 0.6 + random() * 1.0;
    const color = tuftColors[Math.floor(random() * tuftColors.length)];
    addInstance(tufts, x, 0, z, 1.2, height, 1.2, random() * Math.PI * 2, color);
  }
  finishInstances(tufts);

  // ----- Rocks (grey low-poly shapes) -----
  const rocks = makeInstanced(new THREE.DodecahedronGeometry(1, 0), colorMaterial, ROCKS_PER_SIDE * 2);
  const rockColors = [0x7d7d7d, 0x8c8c8c, 0x6a6a6a];

  sides.forEach((side) => {
    for (let i = 0; i < ROCKS_PER_SIDE; i++) {
      const z = -ENV_EDGE + (i + random()) * ((ENV_EDGE * 2) / ROCKS_PER_SIDE);
      const x = side * (9 + random() * 30);
      const size = 0.4 + random() * 0.8;
      const color = rockColors[Math.floor(random() * rockColors.length)];
      addInstance(rocks, x, size * 0.3, z, size, size * 0.6, size, random() * Math.PI * 2, color);
    }
  });
  finishInstances(rocks);

  // ----- Lamp posts (pole + light head), evenly spaced beside the road -----
  const lampCapacity = (Math.floor((ENV_EDGE * 2) / LAMP_SPACING) + 2) * 2;
  const poleGeometry = new THREE.CylinderGeometry(0.08, 0.11, 1, 8);
  poleGeometry.translate(0, 0.5, 0);
  const poles = makeInstanced(
    poleGeometry,
    new THREE.MeshStandardMaterial({ color: 0x555a60, flatShading: true }),
    lampCapacity
  );
  const lampHeads = makeInstanced(
    new THREE.BoxGeometry(1.0, 0.15, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xfff3b0, emissiveIntensity: 0.5 }),
    lampCapacity
  );

  sides.forEach((side) => {
    for (let z = -ENV_EDGE + 5; z <= ENV_EDGE; z += LAMP_SPACING) {
      addInstance(poles, side * 7.5, 0, z, 1, LAMP_HEIGHT, 1, 0);
      // The light head reaches over toward the road
      addInstance(lampHeads, side * 7.0, LAMP_HEIGHT, z, 1, 1, 1, 0);
    }
  });
  finishInstances(poles);
  finishInstances(lampHeads);

  // ----- Road-edge marker posts (small white posts just outside the road) -----
  const markerCapacity = (Math.floor((ENV_EDGE * 2) / MARKER_SPACING) + 2) * 2;
  const markerGeometry = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  markerGeometry.translate(0, 0.4, 0);
  const markers = makeInstanced(
    markerGeometry,
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, flatShading: true }),
    markerCapacity
  );

  sides.forEach((side) => {
    for (let z = -ENV_EDGE + 10; z <= ENV_EDGE; z += MARKER_SPACING) {
      addInstance(markers, side * (roadHalfWidth + 0.6), 0, z, 1, 1, 1, 0);
    }
  });
  finishInstances(markers);
}
