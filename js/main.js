// ARIYAN BIKE GAME - Step 5: Wheel rotation and basic visual lean
// This file sets up the scene, camera, lights, renderer, a temporary
// placeholder motorcycle (made of simple shapes), keyboard controls with
// smooth acceleration/braking, rotating wheels, a small visual lean when
// turning, a smooth follow camera and the animation loop.

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
  1000                                     // far limit
);

// ---------- Lighting ----------
// Soft light from the sky and ground
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x556655, 0.8);
scene.add(hemisphereLight);

// Sun-like light with a direction
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(10, 20, 10);
scene.add(sunLight);

// ---------- Temporary ground plane ----------
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a7d4f });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // lay it flat
scene.add(ground);

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

motorcycle.position.set(0, 0, 0);
scene.add(motorcycle);

// ---------- Keyboard input ----------
// Remembers which control keys are being held down right now.
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false
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
});

// ---------- Movement settings (easy to adjust later) ----------
// All speeds are in "units per second".
// All accelerations are in "units per second, every second".
const MAX_FORWARD_SPEED = 18;       // top speed going forward
const MAX_REVERSE_SPEED = 5;        // top speed going backward (much slower)
const ACCELERATION = 6;             // how fast speed builds up when W or S is held
const BRAKING_DECELERATION = 14;    // how fast speed drops when the opposite key is pressed
const COASTING_DECELERATION = 5;    // how fast the bike slows down when no key is pressed
const TURN_SPEED = 1.2;             // radians per second

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
  if (keys.forward && !keys.backward) {
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

  renderer.render(scene, camera);
}
animate();
