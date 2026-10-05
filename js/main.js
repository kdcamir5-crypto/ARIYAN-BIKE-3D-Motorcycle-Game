// ARIYAN BIKE GAME - Step 8: Basic roadside environment
// This file sets up the scene, camera, lights, renderer, a large bounded
// ground with visible boundary walls, one long straight road with edge lines
// and a dashed center line, simple roadside objects (trees, bushes, grass,
// lamp posts, rocks, marker posts), a temporary placeholder motorcycle
// (made of simple shapes), keyboard controls with smooth acceleration/braking,
// rotating wheels, a small visual lean when turning, a smooth follow camera
// and the animation loop.

import * as THREE from 'three';

// ---------- Renderer (WebGL) ----------
const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Limit pixel ratio to 2 so mobile phones don't get too slow
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // light sky blue

// ---------- Camera (Perspective) ----------
const camera = new THREE.PerspectiveCamera(
  60,                                      // field of view
  window.innerWidth / window.innerHeight,  // aspect ratio
  0.1,                                     // near limit
  4000                                     // far limit (larger so the outer ground is visible)
);

// ---------- Lighting ----------
// Soft light from the sky and ground
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x556655, 0.8);
scene.add(hemisphereLight);

// Sun-like light with a direction
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(10, 20, 10);
scene.add(sunLight);

// ---------- Game area settings (easy to adjust later) ----------
const GROUND_SIZE = 600;                 // playable area is 600 x 600 units
const GROUND_HALF = GROUND_SIZE / 2;     // distance from the center to each edge
const WALL_HEIGHT = 3;                   // how tall the boundary walls are
const WALL_THICKNESS = 2;                // how thick the boundary walls are
const BIKE_MARGIN = 1.5;                 // how close the bike center may get to a wall
const CAMERA_MARGIN = 0.8;               // how close the camera may get to a wall

// The bike's center must stay inside this limit
const BIKE_LIMIT = GROUND_HALF - BIKE_MARGIN;
// The camera must stay inside this limit
const CAMERA_LIMIT = GROUND_HALF - CAMERA_MARGIN;

// ---------- Road settings (easy to adjust later) ----------
const ROAD_WIDTH = 12;                   // total road width (the bike is only about 0.5 wide)
const ROAD_LENGTH = GROUND_SIZE;         // runs from one boundary to the other, never beyond it
const EDGE_LINE_WIDTH = 0.3;             // width of the white line along each road edge
const EDGE_LINE_INSET = 0.5;             // distance of the edge line from the road's outer edge
const DASH_WIDTH = 0.3;                  // width of each center dash
const DASH_LENGTH = 4;                   // length of each center dash
const DASH_GAP = 6;                      // empty space between center dashes

// ---------- Playable ground ----------
const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a7d4f });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // lay it flat
scene.add(ground);

// ---------- Outer ground (outside the walls) ----------
// A very large, darker plane so no empty sky-colored gap is seen below the horizon
// when looking over or past the walls. The bike can never reach it.
const outerGroundGeometry = new THREE.PlaneGeometry(8000, 8000);
const outerGroundMaterial = new THREE.MeshStandardMaterial({ color: 0x3b5236 });
const outerGround = new THREE.Mesh(outerGroundGeometry, outerGroundMaterial);
outerGround.rotation.x = -Math.PI / 2;
outerGround.position.y = -0.05; // slightly below the playable ground
scene.add(outerGround);

// ---------- Boundary walls ----------
// Four simple red boxes around the playable ground.
function createBoundaryWalls() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xc0392b });
  const wallLength = GROUND_SIZE + WALL_THICKNESS * 2; // long enough to close the corners
  const wallOffset = GROUND_HALF + WALL_THICKNESS / 2; // wall center sits just outside the edge

  // Front and back walls (run along the X direction)
  const northSouthGeometry = new THREE.BoxGeometry(wallLength, WALL_HEIGHT, WALL_THICKNESS);
  const frontWall = new THREE.Mesh(northSouthGeometry, wallMaterial);
  frontWall.position.set(0, WALL_HEIGHT / 2, -wallOffset);
  scene.add(frontWall);

  const backWall = new THREE.Mesh(northSouthGeometry, wallMaterial);
  backWall.position.set(0, WALL_HEIGHT / 2, wallOffset);
  scene.add(backWall);

  // Left and right walls (run along the Z direction)
  const eastWestGeometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, wallLength);
  const leftWall = new THREE.Mesh(eastWestGeometry, wallMaterial);
  leftWall.position.set(-wallOffset, WALL_HEIGHT / 2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(eastWestGeometry, wallMaterial);
  rightWall.position.set(wallOffset, WALL_HEIGHT / 2, 0);
  scene.add(rightWall);
}
createBoundaryWalls();

// ---------- Road ----------
// One long straight road along the Z direction, through the middle of the ground.
// Everything is flat plane geometry lying just above the ground.
// The layers sit at slightly different heights (and use polygonOffset) so
// they do not flicker against each other.
function createRoad() {
  const roadGroup = new THREE.Group();

  // Dark asphalt-like surface
  const asphaltMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b2b2e,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const roadSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
    asphaltMaterial
  );
  roadSurface.rotation.x = -Math.PI / 2;
  roadSurface.position.set(0, 0.03, 0);
  roadGroup.add(roadSurface);

  // White lines (used for both the road edges and the center dashes)
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  // Edge lines: one along each side of the road
  const edgeLineGeometry = new THREE.PlaneGeometry(EDGE_LINE_WIDTH, ROAD_LENGTH);
  const edgeX = ROAD_WIDTH / 2 - EDGE_LINE_INSET;

  const leftEdgeLine = new THREE.Mesh(edgeLineGeometry, lineMaterial);
  leftEdgeLine.rotation.x = -Math.PI / 2;
  leftEdgeLine.position.set(-edgeX, 0.06, 0);
  roadGroup.add(leftEdgeLine);

  const rightEdgeLine = new THREE.Mesh(edgeLineGeometry, lineMaterial);
  rightEdgeLine.rotation.x = -Math.PI / 2;
  rightEdgeLine.position.set(edgeX, 0.06, 0);
  roadGroup.add(rightEdgeLine);

  // Center lane marking: repeated white rectangles (all share one geometry)
  const dashGeometry = new THREE.PlaneGeometry(DASH_WIDTH, DASH_LENGTH);
  const dashPeriod = DASH_LENGTH + DASH_GAP;
  const dashCount = Math.floor((ROAD_LENGTH + DASH_GAP) / dashPeriod);
  // Total length used by all dashes, so we can center the pattern on the road
  const patternLength = dashCount * dashPeriod - DASH_GAP;
  const firstDashZ = -patternLength / 2 + DASH_LENGTH / 2;

  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(dashGeometry, lineMaterial);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.06, firstDashZ + i * dashPeriod);
    roadGroup.add(dash);
  }

  scene.add(roadGroup);
}
createRoad();

// ---------- Roadside environment ----------
// Simple, lightweight scenery on both sides of the road.
// Visual only: there is NO collision, the bike can pass through everything.
//
// Performance: each kind of object is drawn with an InstancedMesh, which draws
// many copies of one shape in a single draw call. The whole environment is
// only about 20 draw calls.
//
// Placement is deterministic: a seeded random generator always gives the
// same numbers, so the world looks identical every time the page opens.

// Environment settings (easy to adjust later)
const ENV_EDGE = 285;               // objects are placed between -285 and +285 along the road
const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
const TREES_PER_SIDE = 50;
const BUSHES_PER_SIDE = 60;
const GRASS_TUFTS = 260;
const GROUND_PATCHES = 50;
const ROCKS_PER_SIDE = 20;
const LAMP_SPACING = 40;            // distance between lamp posts
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

// Helpers for placing many copies of one shape
const envDummy = new THREE.Object3D();
const envColor = new THREE.Color();

function makeInstanced(geometry, material, capacity) {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0; // grows as instances are added
  mesh.frustumCulled = false; // cheap enough, avoids objects popping out at screen edges
  scene.add(mesh);
  return mesh;
}

function addInstance(mesh, x, y, z, sx, sy, sz, rotY, colorHex) {
  envDummy.position.set(x, y, z);
  envDummy.rotation.set(0, rotY, 0);
  envDummy.scale.set(sx, sy, sz);
  envDummy.updateMatrix();
  const index = mesh.count;
  mesh.setMatrixAt(index, envDummy.matrix);
  if (colorHex !== undefined) {
    mesh.setColorAt(index, envColor.setHex(colorHex));
  }
  mesh.count = index + 1;
}

function finishInstances(mesh) {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function createRoadsideEnvironment() {
  const random = createSeededRandom(20240607);
  const sides = [-1, 1]; // -1 = left of the road, +1 = right of the road

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
      const x = side * (10 + random() * 35);   // always at least 10 from the center = beside the road
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

  // ----- Bushes -----
  // Low, flattened green spheres closer to the road.
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
    const x = side * (ROAD_HALF_WIDTH + 0.5 + radius + random() * 40);
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
    const color = tuftColors[Math.floor(random() *
