// ARIYAN BIKE GAME - Step 2: Placeholder motorcycle + follow camera
// This file sets up the scene, camera, lights, renderer, a temporary
// placeholder motorcycle (made of simple shapes) and the animation loop.

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
function createPlaceholderMotorcycle() {
  const bike = new THREE.Group();

  // Materials
  const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xd62828 });
  const greyMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff3b0,
    emissive: 0xfff3b0,
    emissiveIntensity: 0.4
  });

  const wheelRadius = 0.4;

  // --- Wheels (cylinders turned sideways) ---
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.18, 24);

  const frontWheel = new THREE.Mesh(wheelGeometry, blackMaterial);
  frontWheel.rotation.z = Math.PI / 2; // axle along the X direction
  frontWheel.position.set(0, wheelRadius, -0.9);
  bike.add(frontWheel);

  const rearWheel = new THREE.Mesh(wheelGeometry, blackMaterial);
  rearWheel.rotation.z = Math.PI / 2;
  rearWheel.position.set(0, wheelRadius, 0.9);
  bike.add(rearWheel);

  // --- Main body / frame ---
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 1.5), greyMaterial);
  body.position.set(0, 0.65, 0.1);
  bike.add(body);

  // --- Engine block ---
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.5), blackMaterial);
  engine.position.set(0, 0.5, 0);
  bike.add(engine);

  // --- Fuel tank ---
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.6), redMaterial);
  tank.position.set(0, 0.95, -0.3);
  bike.add(tank);

  // --- Seat ---
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.7), blackMaterial);
  seat.position.set(0, 0.88, 0.4);
  bike.add(seat);

  // --- Front fork (tilted slightly backward at the top) ---
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), greyMaterial);
  fork.position.set(0, 0.78, -0.8);
  fork.rotation.x = 0.26;
  bike.add(fork);

  // --- Handlebar ---
  const handlebar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12),
    blackMaterial
  );
  handlebar.rotation.z = Math.PI / 2; // lay it sideways
  handlebar.position.set(0, 1.18, -0.7);
  bike.add(handlebar);

  // --- Headlight ---
  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), lightMaterial);
  headlight.position.set(0, 1.0, -0.98);
  bike.add(headlight);

  // --- Exhaust pipe ---
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12),
    greyMaterial
  );
  exhaust.rotation.x = Math.PI / 2; // lay it along the Z direction
  exhaust.position.set(0.25, 0.4, 0.6);
  bike.add(exhaust);

  return bike;
}

const motorcycle = createPlaceholderMotorcycle();
motorcycle.position.set(0, 0, 0);
scene.add(motorcycle);

// ---------- Follow camera ----------
// The camera sits behind and slightly above the motorcycle.
// Offset is measured from the motorcycle: (x = side, y = up, z = behind)
const cameraOffset = new THREE.Vector3(0, 2.2, 5);
const cameraLookOffset = new THREE.Vector3(0, 0.9, 0); // point on the bike to look at

function updateFollowCamera() {
  // Turn the offset into a real world position using the bike's position and direction
  const cameraPosition = cameraOffset.clone();
  motorcycle.localToWorld(cameraPosition);
  camera.position.copy(cameraPosition);

  const lookTarget = cameraLookOffset.clone();
  motorcycle.localToWorld(lookTarget);
  camera.lookAt(lookTarget);
}

// Place the camera once at the start
updateFollowCamera();

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
function animate() {
  requestAnimationFrame(animate);

  // Keep the camera attached behind the motorcycle
  // (the motorcycle is stationary for now, so the view will not change)
  updateFollowCamera();

  renderer.render(scene, camera);
}
animate();
