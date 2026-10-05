
// Motorcycle Engine Audio System

let engineAudio = null;
let audioReady = false;
let audioStarted = false;

const ENGINE_SOUND_PATH = '../sounds/engine/engine.mp3';

export function initAudio() {
    if (audioReady) return;

    engineAudio = new Audio(ENGINE_SOUND_PATH);

    engineAudio.loop = true;
    engineAudio.volume = 0.12;
    engineAudio.preload = 'auto';

    engineAudio.addEventListener('error', () => {
        console.warn('Engine sound file could not be loaded:', ENGINE_SOUND_PATH);
        audioReady = false;
    });

    audioReady = true;
}

export function startEngineSound() {
    if (!engineAudio || !audioReady || audioStarted) return;

    const playPromise = engineAudio.play();

    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                audioStarted = true;
            })
            .catch(() => {
                // Browser autoplay protection.
                // Sound will try again after another user interaction.
            });
    }
}

export function updateEngineSound(speed) {
    if (!engineAudio || !audioReady) return;

    const absoluteSpeed = Math.abs(speed);

    // Start the engine sound after movement begins.
    if (absoluteSpeed > 0.05 && !audioStarted) {
        startEngineSound();
    }

    if (!audioStarted) return;

    // Speed: 0 → 18
    const normalizedSpeed = Math.min(absoluteSpeed / 18, 1);

    // Engine pitch increases with speed.
    const targetPitch = 0.75 + normalizedSpeed * 0.95;

    engineAudio.playbackRate +=
        (targetPitch - engineAudio.playbackRate) * 0.08;

    // Engine volume also increases slightly with speed.
    const targetVolume = 0.10 + normalizedSpeed * 0.22;

    engineAudio.volume +=
        (targetVolume - engineAudio.volume) * 0.08;
}

export function stopEngineSound() {
    if (!engineAudio) return;

    engineAudio.pause();
    engineAudio.currentTime = 0;

    audioStarted = false;
}
