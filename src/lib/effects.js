/** Short, local Web Audio cues. No downloads, microphone access, or autoplay. */
export const SOUND_NOTES = Object.freeze({
  key: [560],
  erase: [310],
  submit: [330, 440],
  error: [180, 150],
  win: [392, 494, 587, 784],
  lose: [294, 247, 196],
});
let audio;
let lastKey = -Infinity;
let generation = 0;
const active = new Set();

export function stopSounds() {
  generation += 1;
  for (const oscillator of active) {
    try { oscillator.stop(); } catch { /* Already stopped. */ }
  }
  active.clear();
}

export function playSound(kind, enabled) {
  if (!enabled || !Object.hasOwn(SOUND_NOTES, kind)) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio ??= new Audio();
    // Called from user gestures, including the explicit sound toggle.
    // Resuming here also supports Safari returning from a background tab.
    const requestGeneration = generation;
    const schedule = () => {
      if (generation !== requestGeneration) return;
      if (audio.state !== 'running') return;
      if (kind === 'key' && audio.currentTime - lastKey < 0.025) return;
      if (kind === 'key') lastKey = audio.currentTime;
      const duration = ['key', 'erase'].includes(kind) ? 0.045 : 0.12;
      SOUND_NOTES[kind].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const time = audio.currentTime + index * 0.105;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(kind === 'key' ? 0.025 : 0.04, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        oscillator.connect(gain); gain.connect(audio.destination);
        active.add(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); active.delete(oscillator); };
        oscillator.start(time); oscillator.stop(time + duration + 0.015);
      });
    };
    if (audio.state === 'suspended' || audio.state === 'interrupted') audio.resume().then(schedule).catch(() => {});
    else schedule();
  } catch { /* Optional sound must never interrupt play. */ }
}
