// ARIYAN BIKE GAME - main game file
// Includes: scene, camera, lights, renderer, large bounded ground with walls,
// one long road, roadside environment (loaded from environment.js) with
// collision, a temporary placeholder motorcycle, keyboard + touch controls,
// acceleration/braking, rotating wheels, visual lean, follow camera,
// speedometer and engine sound.

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

// ---------- Roadside environment (loaded from js/environment.js) ----------
// List of collision circles (trees, rocks, lamp posts). Filled when environment.js loads.
// If environment.js fails, the rest of the game still works.
let obstacles = [];

import('./environment.js')
  .then((module) => {
    obstacles = module.createRoadsideEnvironment(scene, ROAD_WIDTH);
  })
  .catch((error) => console.error('Roadside environment failed:', error));

// ---------- Temporary placeholder motorcycle ----------
// Built only from simple shapes. This is NOT the final motorcycle model.
// The bike faces the -Z direction (its front points away from the camera).
//
// Structure (hierarchy):
//   root          -> moved and turned by the game (position + direction)
//     visual      -> leans left/right (visual only)
//       wheel pivots (rotate around the axle) + all the other bike parts
const WHEEL_RADIUS = 0.4;

function createPlaceholderMotorcycle() {
  const root = new THREE.Group();   // movement / direction
  const visual = new THREE.Group(); // visual lean only
  root.add(visual);

  // Materials
  const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xd62828 });
  const greyMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
  const spokeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff3b0,
    emissive: 0xfff3b0,
    emissiveIntensity: 0.4
  });

  // --- Wheels ---
  // Each wheel sits inside a "pivot" group placed at the wheel's center.
  // Spinning the pivot around the X axis (the axle) rotates only that wheel.
  const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.18, 24);
  const spokeGeometryA = new THREE.BoxGeometry(0.2, WHEEL_RADIUS * 1.7, 0.06);
  const spokeGeometryB = new THREE.BoxGeometry(0.2, 0.06, WHEEL_RADIUS * 1.7);

  function createWheelPivot(zPosition) {
    const pivot = new THREE.Group();
    pivot.position.set(0, WHEEL_RADIUS, zPosition);

    // The tire (cylinder turned sideways so the axle runs along X)
    const tire = new THREE.Mesh(wheelGeometry, blackMaterial);
    tire.rotation.z = Math.PI / 2;
    pivot.add(tire);

    // Two light spokes (a cross) so the rotation is visible
    pivot.add(new THREE.Mesh(spokeGeometryA, spokeMaterial));
    pivot.add(new THREE.Mesh(spokeGeometryB, spokeMaterial));

    return pivot;
  }

  const frontWheelPivot = createWheelPivot(-0.9);
  visual.add(frontWheelPivot);

  const rearWheelPivot = createWheelPivot(0.9);
  visual.add(rearWheelPivot);

  // --- Main body / frame ---
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 1.5), greyMaterial);
  body.position.set(0, 0.65, 0.1);
  visual.add(body);

  // --- Engine block ---
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.5), blackMaterial);
  engine.position.set(0, 0.5, 0);
  visual.add(engine);

  // --- Fuel tank ---
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.6), redMaterial);
  tank.position.set(0, 0.95, -0.3);
  visual.add(tank);

  // --- Seat ---
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.7), blackMaterial);
  seat.position.set(0, 0.88, 0.4);
  visual.add(seat);

  // --- Front fork (tilted slightly backward at the top) ---
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), greyMaterial);
  fork.position.set(0, 0.78, -0.8);
  fork.rotation.x = 0.26;
  visual.add(fork);

  // --- Handlebar ---
  const handlebar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12),
    blackMaterial
  );
  handlebar.rotation.z = Math.PI / 2; // lay it sideways
  handlebar.position.set(0, 1.18, -0.7);
  visual.add(handlebar);

  // --- Headlight ---
  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), lightMaterial);
  headlight.position.set(0, 1.0, -0.98);
  visual.add(headlight);

  // --- Exhaust pipe ---
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12),
    greyMaterial
  );
  exhaust.rotation.x = Math.PI / 2; // lay it along the Z direction
  exhaust.position.set(0.25, 0.4, 0.6);
  visual.add(exhaust);

  return { root, visual, frontWheelPivot, rearWheelPivot };
}

const bikeParts = createPlaceholderMotorcycle();

// "motorcycle" is the main object: it controls position and facing direction.
// The camera follows this object.
const motorcycle = bikeParts.root;
// "bikeVisual" is only used for the visual lean.
const bikeVisual = bikeParts.visual;
const frontWheelPivot = bikeParts.frontWheelPivot;
const rearWheelPivot = bikeParts.rearWheelPivot;

// The bike starts at the center of the road, facing along it (-Z direction)
motorcycle.position.set(0, 0, 0);
scene.add(motorcycle);

// ---------- Keyboard input ----------
// Remembers which control keys are being held down right now.
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false
};

// Connects keyboard keys to the controls above
function getControlFromKey(code) {
  switch (code) {
    case 'KeyW':
    case 'ArrowUp':
      return 'forward';
    case 'KeyS':
    case 'ArrowDown':
      return 'backward';
    case 'KeyA':
    case 'ArrowLeft':
      return 'left';
    case 'KeyD':
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

window.addEventListener('keydown', (event) => {
  const control = getControlFromKey(event.code);
  if (control) {
    keys[control] = true;
    event.preventDefault(); // stop arrow keys from scrolling the page
  }
});

window.addEventListener('keyup', (event) => {
  const control = getControlFromKey(event.code);
  if (control) {
    keys[control] = false;
    event.preventDefault();
  }
});

// If the browser tab loses focus, release all keys so the bike doesn't keep moving
window.addEventListener('blur', () => {
  keys.forward = false;
  keys.backward = false;
  keys.left = false;
  keys.right = false;
  keys.brake = false;
});

// ---------- Touch buttons (reverse and brake) ----------
// The buttons simply set the same "keys" values as the keyboard,
// so the existing movement system is not changed at all.

// Show the buttons on devices that support touch
if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) {
  document.body.classList.add('touch-device');
}

const touchButtons = document.querySelectorAll('#touch-controls [data-control]');

function releaseAllTouchButtons() {
  touchButtons.forEach((button) => {
    keys[button.dataset.control] = false;
    button.classList.remove('active');
  });
}

touchButtons.forEach((button) => {
  const control = button.dataset.control; // backward (reverse) or brake
  let activePointerId = null;             // the finger/mouse currently holding this button

  function press(event) {
    event.preventDefault();
    activePointerId = event.pointerId;
    keys[control] = true;
    button.classList.add('active');
  }

  function release(event) {
    // Ignore other fingers that are not holding this button
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    activePointerId = null;
    keys[control] = false;
    button.classList.remove('active');
  }

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('lostpointercapture', release);

  // Stop the long-press menu and text selection
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  button.addEventListener('selectstart', (event) => event.preventDefault());
});

// Safety: if the page loses focus, release every touch button
window.addEventListener('blur', releaseAllTouchButtons);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) releaseAllTouchButtons();
});

// ---------- Touch drive (finger on the screen) ----------
// Finger down = bike starts and accelerates.
// Finger moves right/left = bike turns right/left.
// Finger up = bike slows down.
// Touches that start on a button (brake, reverse, sound) are ignored here.
// Uses classic touch events, which work on every mobile browser.
const STEER_DEADZONE = 35;          // pixels the finger must move sideways before the bike turns
const STEER_FULL_RANGE = 130;       // extra pixels of finger movement to reach the strongest turn
const TOUCH_MAX_TURN = 0.6;         // strongest touch turn = 60% of TURN_SPEED (lower = gentler)
let steerStrength = 1;              // 1 = keyboard (full speed), touch changes this while steering
let driveTouchId = null;            // the finger that is driving
let driveStartX = 0;                // where that finger first touched

function stopDriveTouch() {
  driveTouchId = null;
  keys.forward = false;
  keys.left = false;
  keys.right = false;
  steerStrength = 1;
}

function findTouch(touchList, id) {
  for (let i = 0; i < touchList.length; i++) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}

document.addEventListener('touchstart', (event) => {
  if (driveTouchId !== null) return;                        // a finger is already driving
  const target = event.target;
  if (target && target.closest && target.closest('button')) return; // buttons work on their own
  const touch = event.changedTouches[0];
  driveTouchId = touch.identifier;
  driveStartX = touch.clientX;
  keys.forward = true;
  keys.left = false;
  keys.right = false;
  event.preventDefault();                                   // no scrolling or zooming
}, { passive: false });

document.addEventListener('touchmove', (event) => {
  if (driveTouchId === null) return;
  const touch = findTouch(event.changedTouches, driveTouchId);
  if (!touch) return;
  const dx = touch.clientX - driveStartX;
  keys.left = dx < -STEER_DEADZONE;
  keys.right = dx > STEER_DEADZONE;
  // The further the finger moves, the stronger (but still gentle) the turn
  const t = THREE.MathUtils.clamp((Math.abs(dx) - STEER_DEADZONE) / STEER_FULL_RANGE, 0, 1);
  steerStrength = TOUCH_MAX_TURN * t;
  event.preventDefault();
}, { passive: false });
['touchend', 'touchcancel'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    if (driveTouchId === null) return;
    if (findTouch(event.changedTouches, driveTouchId)) stopDriveTouch();
  }, { passive: true });
});

// Safety: release the driving finger if the page loses focus
window.addEventListener('blur', stopDriveTouch);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopDriveTouch();
});

// ---------- TEMP DEBUG BOX (touch test) ----------
// Shows touch info on the screen. After the touch controls work,
// change true to false (or delete this block).
const SHOW_TOUCH_DEBUG = true;

if (SHOW_TOUCH_DEBUG) {
  const dbg = document.createElement('div');
  dbg.style.cssText = 'position:fixed;left:8px;top:96px;z-index:50;background:rgba(0,0,0,.65);color:#0f0;font:12px monospace;padding:4px 8px;pointer-events:none;white-space:pre';
  document.body.appendChild(dbg);
  let touchCount = 0;
  document.addEventListener('touchstart', () => { touchCount++; }, { passive: true });
  setInterval(() => {
    dbg.textContent = 'touches: ' + touchCount +
      '\nF:' + keys.forward + ' L:' + keys.left + ' R:' + keys.right + ' B:' + keys.brake +
      '\nspeed: ' + currentSpeed.toFixed(1);
  }, 100);
}

// ---------- Movement settings (easy to adjust later) ----------
// All speeds are in "units per second".
// All accelerations are in "units per second, every second".
const MAX_FORWARD_SPEED = 18;       // top speed going forward
const MAX_REVERSE_SPEED = 5;        // top speed going backward (much slower)
const ACCELERATION = 6;             // how fast speed builds up when W or S is held
const BRAKING_DECELERATION = 14;    // how fast speed drops when the opposite key is pressed
const COASTING_DECELERATION = 5;    // how fast the bike slows down when no key is pressed
const TURN_SPEED = 1.2;             // radians per second
const WALL_BRAKING = 40;            // how fast the bike loses speed while pressed against a wall

// ---------- Obstacle collision settings (easy to adjust later) ----------
const BIKE_COLLISION_RADIUS = 0.4;  // size of each collision circle on the bike
const BIKE_COLLISION_OFFSET = 0.8;  // front and rear circles are this far from the bike center
const OBSTACLE_BRAKING = 40;        // how fast the bike loses speed while pressed against an obstacle

// ---------- Visual lean settings (easy to adjust later) ----------
const MAX_LEAN_ANGLE = 0.2;         // maximum lean in radians (about 11.5 degrees)
const LEAN_SMOOTHING = 8;           // higher = leans and returns upright faster

// The bike's current speed.
// Positive = moving forward, negative = moving backward, 0 = stopped.
let currentSpeed = 0;

// The bike's current visual lean (radians).
// Positive = leaning left, negative = leaning right, 0 = upright.
let currentLean = 0;

// Reused each frame so we don't create new objects constantly
const moveDirection = new THREE.Vector3();

// Moves a number toward a target value by at most "amount" (never overshoots)
function moveToward(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function updateMotorcycle(delta) {
  // ----- Turning: rotate around the vertical (Y) axis -----
  // Allowed while stopped and while moving.
  if (keys.left) {
    motorcycle.rotation.y += TURN_SPEED * delta;
  }
  if (keys.right) {
    motorcycle.rotation.y -= TURN_SPEED * delta;
  }

  // ----- Speed: acceleration, braking and slowing down -----
  if (keys.brake) {
    // Brake button: slow down to a stop (never reverses)
    currentSpeed = moveToward(currentSpeed, 0, BRAKING_DECELERATION * delta);
  } else if (keys.forward && !keys.backward) {
    if (currentSpeed < 0) {
      // Moving backward but W is pressed: brake first
      currentSpeed += BRAKING_DECELERATION * delta;
    } else {
      // Normal forward acceleration
      currentSpeed += ACCELERATION * delta;
    }
  } else if (keys.backward && !keys.forward) {
    if (currentSpeed > 0) {
      // Moving forward but S is pressed: brake first
      currentSpeed -= BRAKING_DECELERATION * delta;
    } else {
      // Normal reverse acceleration
      currentSpeed -= ACCELERATION * delta;
    }
  } else {
    // No key (or both keys): slowly roll to a stop
    currentSpeed = moveToward(currentSpeed, 0, COASTING_DECELERATION * delta);
  }

  // Never go faster than the allowed top speeds
  currentSpeed = Math.max(-MAX_REVERSE_SPEED, Math.min(MAX_FORWARD_SPEED, currentSpeed));

  // ----- Moving: go along the direction the bike is currently facing -----
  // The bike's front points to -Z in its own space.
  if (currentSpeed !== 0) {
    moveDirection.set(0, 0, -1).applyQuaternion(motorcycle.quaternion);
    motorcycle.position.addScaledVector(moveDirection, currentSpeed * delta);
  }

  // ----- Obstacle collision: trees, rocks and lamp posts -----
  // The bike is covered by 3 small circles (front, center, rear).
  // If a circle enters an obstacle circle, the bike is pushed back out.
  // This gives a simple stop-and-slide, with no bouncing.
  if (obstacles.length > 0) {
    let hitObstacle = false;
    const forwardX = -Math.sin(motorcycle.rotation.y);
    const forwardZ = -Math.cos(motorcycle.rotation.y);

    // Two passes so pushing away from one object cannot push into the next
    for (let pass = 0; pass < 2; pass++) {
      for (let p = -1; p <= 1; p++) {
        const pointX = motorcycle.position.x + forwardX * p * BIKE_COLLISION_OFFSET;
        const pointZ = motorcycle.position.z + forwardZ * p * BIKE_COLLISION_OFFSET;

        for (let i = 0; i < obstacles.length; i++) {
          const obstacle = obstacles[i];
          const minDistance = obstacle.r + BIKE_COLLISION_RADIUS;
          const dx = pointX - obstacle.x;
          const dz = pointZ - obstacle.z;

          // Quick rejection: skip objects that are clearly far away
          if (Math.abs(dx) > minDistance || Math.abs(dz) > minDistance) continue;

          const distSq = dx * dx + dz * dz;
          if (distSq < minDistance * minDistance) {
            const dist = Math.sqrt(distSq);
            // Push the bike straight out of the obstacle
            const pushX = dist > 0.0001 ? dx / dist : forwardX;
            const pushZ = dist > 0.0001 ? dz / dist : forwardZ;
            const overlap = minDistance - dist;
            motorcycle.position.x += pushX * overlap;
            motorcycle.position.z += pushZ * overlap;
            hitObstacle = true;
          }
        }
      }
    }

    // Quickly (but smoothly) take away speed while touching an obstacle
    if (hitObstacle) {
      currentSpeed = moveToward(currentSpeed, 0, OBSTACLE_BRAKING * delta);
    }
  }

  // ----- Boundary: keep the bike inside the playable area -----
  // If the bike went past a limit, put it back on the limit and
  // quickly (but smoothly) take away its speed.
  const clampedX = THREE.MathUtils.clamp(motorcycle.position.x, -BIKE_LIMIT, BIKE_LIMIT);
  const clampedZ = THREE.MathUtils.clamp(motorcycle.position.z, -BIKE_LIMIT, BIKE_LIMIT);
  const hitBoundary =
    clampedX !== motorcycle.position.x || clampedZ !== motorcycle.position.z;

  motorcycle.position.x = clampedX;
  motorcycle.position.z = clampedZ;

  if (hitBoundary) {
    currentSpeed = moveToward(currentSpeed, 0, WALL_BRAKING * delta);
  }

  // The bike stays on the ground (height is never changed)
  motorcycle.position.y = 0;
}

// ---------- Visual effects: wheel rotation and lean ----------
// These only change how the bike LOOKS. They never change its movement.
function updateMotorcycleVisuals(delta) {
  // ----- Wheel rotation -----
  // Distance travelled this frame divided by the wheel radius gives the
  // exact angle a rolling wheel turns. Negative because the bike faces -Z:
  // rolling forward means the top of the wheel moves toward -Z.
  const wheelAngle = -(currentSpeed * delta) / WHEEL_RADIUS;
  frontWheelPivot.rotation.x += wheelAngle;
  rearWheelPivot.rotation.x += wheelAngle;

  // ----- Visual lean -----
  // Left key = lean left (positive), right key = lean right (negative).
  // If both or neither are pressed, the target is upright (0).
  let targetLean = 0;
  if (keys.left && !keys.right) targetLean = MAX_LEAN_ANGLE;
  if (keys.right && !keys.left) targetLean = -MAX_LEAN_ANGLE;

  // Smoothly move the current lean toward the target (works at any frame rate)
  const leanBlend = 1 - Math.exp(-LEAN_SMOOTHING * delta);
  currentLean += (targetLean - currentLean) * leanBlend;

  // Safety: the lean can never go beyond the limit
  currentLean = Math.max(-MAX_LEAN_ANGLE, Math.min(MAX_LEAN_ANGLE, currentLean));

  // Apply the lean only to the visual group (not to the main motorcycle object)
  bikeVisual.rotation.z = currentLean;
}

// ---------- Follow camera ----------
// The camera sits behind and slightly above the motorcycle.
// Offset is measured from the motorcycle: (x = side, y = up, z = behind)
const cameraOffset = new THREE.Vector3(0, 2.2, 5);
const cameraLookOffset = new THREE.Vector3(0, 0.9, 0); // point on the bike to look at

const desiredCameraPosition = new THREE.Vector3();
const desiredLookTarget = new THREE.Vector3();
const currentLookTarget = new THREE.Vector3();

const CAMERA_FOLLOW_SPEED = 5; // higher = camera follows more tightly

function computeCameraTargets() {
  // Make sure the bike's world position/rotation is up to date
  motorcycle.updateMatrixWorld(true);

  desiredCameraPosition.copy(cameraOffset);
  motorcycle.localToWorld(desiredCameraPosition);

  // Keep the camera inside the walls so it never ends up outside the game area
  desiredCameraPosition.x = THREE.MathUtils.clamp(desiredCameraPosition.x, -CAMERA_LIMIT, CAMERA_LIMIT);
  desiredCameraPosition.z = THREE.MathUtils.clamp(desiredCameraPosition.z, -CAMERA_LIMIT, CAMERA_LIMIT);

  desiredLookTarget.copy(cameraLookOffset);
  motorcycle.localToWorld(desiredLookTarget);
}

// Place the camera instantly at the start (no sliding)
computeCameraTargets();
camera.position.copy(desiredCameraPosition);
currentLookTarget.copy(desiredLookTarget);
camera.lookAt(currentLookTarget);

function updateFollowCamera(delta) {
  computeCameraTargets();

  // Move smoothly toward the wanted position
  const smoothing = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * delta);
  camera.position.lerp(desiredCameraPosition, smoothing);
  currentLookTarget.lerp(desiredLookTarget, smoothing);
  camera.lookAt(currentLookTarget);
}

// ---------- Speedometer (display only) ----------
// Reads the bike's existing currentSpeed. It never changes the movement.
const KMH_PER_UNIT = 6.5;   // 1 world unit per second shown as 6.5 km/h (top speed 18 -> about 117 km/h)

const speedometerValue = document.getElementById('speedometer-value');
let displayedSpeed = -1;    // the number currently shown (-1 forces the first update)

function updateSpeedometer() {
  if (!speedometerValue) return;

  // Absolute value: the number is the speed, not the direction
  const kmh = Math.round(Math.abs(currentSpeed) * KMH_PER_UNIT);

  // Only touch the page when the shown number really changes
  if (kmh !== displayedSpeed) {
    displayedSpeed = kmh;
    speedometerValue.textContent = String(kmh);
  }
}

// ---------- Engine sound ----------
// Uses the Web Audio API so the engine loop is seamless and the pitch/volume
// can change smoothly. It only READS the bike's speed and key state.
const ENGINE_SOUND_PATH = './sound/engine.mp3'; // relative path (GitHub Pages)

const ENGINE_IDLE_RATE = 0.8;       // pitch when the bike is standing still
const ENGINE_MAX_RATE = 1.8;        // pitch at top speed
const ENGINE_IDLE_VOLUME = 0.25;    // volume when standing still (0 = silent when stopped)
const ENGINE_MAX_VOLUME = 0.9;      // volume at top speed
const ENGINE_THROTTLE_BOOST = 0.1;  // small extra revs/volume while W or S is held
const ENGINE_SMOOTH_TIME = 0.15;    // higher = slower, smoother changes (seconds)

const soundButton = document.getElementById('sound-toggle');

let soundEnabled = true;            // controlled by the Sound ON/OFF button
let audioContext = null;
let engineGain = null;              // volume control
let engineSource = null;            // the looping engine sound
let engineReady = false;            // true once engine.mp3 is loaded and playing

function updateSoundButton() {
  if (!soundButton) return;
  soundButton.textContent = soundEnabled ? '\u{1F50A} ON' : '\u{1F507} OFF';
  soundButton.classList.toggle('off', !soundEnabled);
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
}
updateSoundButton();

// Creates the audio system and loads engine.mp3 (runs after the first user interaction)
function startEngineSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  engineGain = audioContext.createGain();
  engineGain.gain.value = 0;
  engineGain.connect(audioContext.destination);

  // If sound was already switched off before it loaded, stay suspended
  if (!soundEnabled) audioContext.suspend();

  fetch(ENGINE_SOUND_PATH)
    .then((response) => {
      if (!response.ok) throw new Error('Could not load ' + ENGINE_SOUND_PATH + ' (HTTP ' + response.status + ')');
      return response.arrayBuffer();
    })
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      engineSource = audioContext.createBufferSource();
      engineSource.buffer = buffer;
      engineSource.loop = true;
      engineSource.playbackRate.value = ENGINE_IDLE_RATE;
      engineSource.connect(engineGain);
      engineSource.start(0);
      engineReady = true;
    })
    .catch((error) => {
      console.error('Engine sound failed:', error);
      // Allow another try on the next interaction
      try { audioContext.close(); } catch (e) { /* ignore */ }
      audioContext = null;
      engineGain = null;
    });
}

// Called when the finger is lifted / click / key press.
// Phones only allow sound after these events (not on finger-down).
function unlockAudio() {
  if (!audioContext) {
    startEngineSound();
  }
  // If the sound system is paused by the browser, wake it up
  if (audioContext && soundEnabled && !document.hidden && audioContext.state !== 'running') {
    audioContext.resume().catch(() => {});
  }
}
['pointerup', 'touchend', 'click', 'keydown'].forEach((eventName) => {
  window.addEventListener(eventName, unlockAudio, { passive: true });
});

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  updateSoundButton();
  if (!audioContext) return;

  if (enabled) {
    audioContext.resume();                     // continues from the bike's current state
  } else {
    engineGain.gain.cancelScheduledValues(audioContext.currentTime);
    engineGain.gain.value = 0;                 // completely silent
    audioContext.suspend();
  }
}

if (soundButton) {
  soundButton.addEventListener('click', () => {
    setSoundEnabled(!soundEnabled);
    soundButton.blur(); // so Space/Enter does not toggle it again
  });
}

// Stop the sound while the tab is hidden, continue when it comes back
document.addEventListener('visibilitychange', () => {
  if (!audioContext) return;
  if (document.hidden) {
    audioContext.suspend();
  } else if (soundEnabled) {
    audioContext.resume();
  }
});

// Runs every frame: matches pitch and volume to the bike's speed
function updateEngineSound() {
  if (!engineReady || !soundEnabled || audioContext.state !== 'running') return;

  const speedRatio = Math.min(Math.abs(currentSpeed) / MAX_FORWARD_SPEED, 1);
  const throttle = (keys.forward || keys.backward) ? 1 : 0;

  const targetRate =
    ENGINE_IDLE_RATE + (ENGINE_MAX_RATE - ENGINE_IDLE_RATE) * speedRatio + throttle * ENGINE_THROTTLE_BOOST;
  const targetVolume = Math.min(
    ENGINE_IDLE_VOLUME + (ENGINE_MAX_VOLUME - ENGINE_IDLE_VOLUME) * speedRatio + throttle * ENGINE_THROTTLE_BOOST,
    1
  );

  // Smooth change (no sudden jumps)
  const now = audioContext.currentTime;
  engineSource.playbackRate.setTargetAtTime(targetRate, now, ENGINE_SMOOTH_TIME);
  engineGain.gain.setTargetAtTime(targetVolume, now, ENGINE_SMOOTH_TIME);
}

// ---------- Resize handling (desktop + mobile) ----------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onWindowResize);
window.addEventListener('orientationchange', onWindowResize);

// ---------- Animation / render loop ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  // Time since the last frame (limited so the bike never jumps after a pause)
  const delta = Math.min(clock.getDelta(), 0.1);

  updateMotorcycle(delta);
  updateMotorcycleVisuals(delta);
  updateFollowCamera(delta);
  updateSpeedometer();
  updateEngineSound();

  renderer.render(scene, camera);
}
animate();
