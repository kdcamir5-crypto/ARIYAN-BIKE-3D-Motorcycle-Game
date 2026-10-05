
// ARIYAN BIKE GAME - Step 1: Basic 3D foundation
// This file sets up the scene, camera, lights, renderer and animation loop.

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
camera.position.set(5, 4, 8);
camera.lookAt(0, 0.5, 0);

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

// ---------- Temporary reference cube (NOT the motorcycle) ----------
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff7a00 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0.5, 0); // sits on top of the ground
scene.add(cube);

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

  // Slowly rotate the cube so we can see the 3D scene is alive
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();
