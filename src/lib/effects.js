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
export function confetti(canvas, reducedMotion) {
  if (reducedMotion) return () => {};
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth, height = window.innerHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  context.scale(ratio, ratio);
  const colors = ['#87bca3', '#e5bb73', '#f3f0e9', '#bdc2c8'];
  const particles = Array.from({ length: 70 }, (_, i) => ({
    x: width * 0.5, y: height * 0.35, vx: (Math.random() - 0.5) * 12,
    vy: -5 - Math.random() * 10, angle: Math.random() * 6.28,
    spin: (Math.random() - 0.5) * 0.2, size: 3 + Math.random() * 5, color: colors[i % colors.length],
  }));
  const start = performance.now(); let previous = start; let frame;
  function draw(now) {
    const step = Math.min((now - previous) / 16.67, 2); previous = now;
    context.clearRect(0, 0, width, height);
    if (now - start > 2200) return;
    context.globalAlpha = Math.min(1, (2200 - (now - start)) / 650);
    particles.forEach((p) => {
      p.x += p.vx * step; p.y += p.vy * step; p.vy += 0.19 * step; p.angle += p.spin * step;
      context.save(); context.translate(p.x, p.y); context.rotate(p.angle); context.fillStyle = p.color;
      context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65); context.restore();
    });
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(frame); context.clearRect(0, 0, width, height); };
}
