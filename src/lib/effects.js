let audio;
export function playSound(kind, enabled) {
  if (!enabled) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const notes = kind === 'win' ? [392, 494, 587, 784] : kind === 'submit' ? [220, 330] : [420];
    notes.forEach((frequency, i) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const time = audio.currentTime + i * 0.09;
      oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.045, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(time); oscillator.stop(time + 0.14);
    });
  } catch { /* Sound is optional; unavailable audio must not stop a game. */ }
}
export function confetti(canvas, reducedMotion) {
  if (reducedMotion) return () => {};
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth, height = window.innerHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  context.scale(ratio, ratio);
  const colors = ['#b9ed62', '#e9b85f', '#f1eee3', '#74988b'];
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
