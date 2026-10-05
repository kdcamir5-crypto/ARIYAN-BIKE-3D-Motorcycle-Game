// ARIYAN BIKE GAME - mobile controls
// Touch and hold the screen = throttle. Phone tilt = steering.
// This file only reads touch and sensor input. main.js decides how the bike moves.

// ---------- Settings (easy to adjust later) ----------
const DEAD_ZONE = 5;          // degrees: tilt smaller than this does nothing
const MAX_TILT_ANGLE = 30;    // degrees: tilt that gives the strongest steering
const STEER_SMOOTHING = 6;    // higher = steering follows the phone faster, lower = smoother

const PERMISSION_MESSAGE = 'Tilt control চালু করতে motion permission দিন';
const NO_SENSOR_MESSAGE = 'এই ডিভাইসে টিল্ট সেন্সর পাওয়া যায়নি, বাইক শুধু টাচে চলবে';

const DEG = Math.PI / 180;

export function initMobileControls() {
  const zone = document.getElementById('throttle-zone');
  const messageBox = document.getElementById('tilt-message');
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

  // State that main.js reads every frame
  const state = {
    throttle: false,   // finger is down on the throttle zone
    started: false,    // true after the first touch (bike keeps rolling after the finger is lifted)
    steering: 0,       // smoothed steering from -1 to 1 (positive = left, negative = right)
    update: updateSteering
  };

  // ---------- Small on-screen message ----------
  let messageTimer = null;
  function showMessage(text) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { messageBox.hidden = true; }, 5000);
  }

  // ---------- Touch throttle ----------
  let throttleTouchId = null;

  function findTouch(touchList, id) {
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === id) return touchList[i];
    }
    return null;
  }

  function releaseThrottle() {
    throttleTouchId = null;
    state.throttle = false;
  }

  if (zone) {
    zone.addEventListener('touchstart', (event) => {
      event.preventDefault(); // no scrolling, zooming or text selection
      if (throttleTouchId === null) {
        throttleTouchId = event.changedTouches[0].identifier;
        state.throttle = true;
        state.started = true;
      }
    }, { passive: false });

    ['touchend', 'touchcancel'].forEach((eventName) => {
      zone.addEventListener(eventName, (event) => {
        if (throttleTouchId !== null && findTouch(event.changedTouches, throttleTouchId)) {
          releaseThrottle();
        }
      }, { passive: true });
    });
  }

  // Safety: never leave the throttle stuck
  window.addEventListener('blur', releaseThrottle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseThrottle();
  });

  // ---------- Tilt (device orientation) ----------
  let rollDegrees = 0;       // tilt as the player sees it: positive = left edge down
  let hasTiltData = false;
  let listening = false;

  function getScreenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') return window.orientation;
    return 0;
  }

  function onDeviceOrientation(event) {
    if (event.beta === null || event.beta === undefined ||
        event.gamma === null || event.gamma === undefined) return;

    // Which way "up" points inside the phone (works in portrait and landscape,
    // phone held upright like a steering wheel or held flat)
    const beta = event.beta * DEG;
    const gamma = event.gamma * DEG;
    const upX = -Math.cos(beta) * Math.sin(gamma);
    const upY = Math.sin(beta);

    // Turn it into "toward the player's right" for the current screen rotation
    const angle = getScreenAngle() * DEG;
    const upRight = upX * Math.cos(angle) - upY * Math.sin(angle);

    rollDegrees = Math.asin(Math.max(-1, Math.min(1, upRight))) / DEG;
    hasTiltData = true;
  }

  function startListening() {
    if (listening) return;
    listening = true;
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    // If no sensor data arrives, tell the player
    setTimeout(() => {
      if (!hasTiltData) showMessage(NO_SENSOR_MESSAGE);
    }, 2500);
  }

  // iPhone/iPad (and some browsers) ask for permission. It must be requested
  // after a tap, so this runs on the first finger-up or click.
  let permissionRequested = false;

  function requestTiltPermission() {
    if (permissionRequested || !isTouchDevice) return;

    if (typeof window.DeviceOrientationEvent === 'undefined') {
      permissionRequested = true;
      showMessage(NO_SENSOR_MESSAGE);
      return;
    }

    const OrientationEvent = window.DeviceOrientationEvent;
    permissionRequested = true;

    if (typeof OrientationEvent.requestPermission === 'function') {
      try {
        OrientationEvent.requestPermission()
          .then((result) => {
            if (result === 'granted') {
              startListening();
            } else {
              showMessage(PERMISSION_MESSAGE);
            }
          })
          .catch(() => {
            permissionRequested = false; // allow another try on the next tap
            showMessage(PERMISSION_MESSAGE);
          });
      } catch (error) {
        permissionRequested = false;
        showMessage(PERMISSION_MESSAGE);
      }
    } else {
      startListening(); // Android and others: no permission prompt needed
    }
  }

  window.addEventListener('touchend', requestTiltPermission, { passive: true });
  window.addEventListener('click', requestTiltPermission, { passive: true });

  // ---------- Steering (called every frame by main.js) ----------
  function updateSteering(delta) {
    let target = 0;

    if (hasTiltData) {
      const size = Math.abs(rollDegrees);
      if (size > DEAD_ZONE) {
        // 0 at the dead zone edge, 1 at MAX_TILT_ANGLE
        const amount = Math.min((size - DEAD_ZONE) / (MAX_TILT_ANGLE - DEAD_ZONE), 1);
        target = Math.sign(rollDegrees) * amount;
      }
    }

    // currentSteering moves smoothly toward targetSteering (no jitter, any frame rate)
    const blend = 1 - Math.exp(-STEER_SMOOTHING * delta);
    state.steering += (target - state.steering) * blend;
    if (Math.abs(state.steering) < 0.001) state.steering = 0;
  }

  return state;
}
