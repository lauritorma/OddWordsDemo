import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const effects = readFileSync(new URL('../src/lib/effects.js', import.meta.url), 'utf8');
describe('minimal mobile design and motion budget', () => {
  it('has one compact menu for less-used controls', () => {
    assert.match(html, /data-action="menu"/);
    assert.match(main, /function showMenu\(/);
  });
  it('marks words explicitly for accessibility', () => assert.ok(main.includes('aria-label="Word ${word + 1}, ${length} letters"')));
  it('offers earlier guesses without keeping future rows on mobile', () => {
    assert.match(html, /id="history-toggle"[^>]+aria-expanded="false"/);
    assert.match(main, /const rowCount = native/);
    assert.match(main, /historyToggle\.setAttribute\('aria-expanded'/);
    assert.match(css, /\.guess-row\.older \{ display: none; \}/);
  });
  it('keeps the keyboard native on compact screens', () => {
    assert.match(css, /\.keyboard, \.console-foot \{ display: none; \}/);
    assert.match(html, /id="native-input"/);
  });
  it('uses no canvas particles or repeated animation frames', () => {
    assert.doesNotMatch(html, /<canvas/);
    assert.doesNotMatch(effects + main, /requestAnimationFrame|cancelAnimationFrame|setInterval\([^)]*animate/);
    assert.doesNotMatch(css, /animation\s*:[^;\n]*\binfinite\s*(?:;|,)/);
  });
  it('keeps all animations short and disabled when reduced motion is requested', () => {
    assert.match(css, /@keyframes letter-pop/);
    assert.match(css, /@keyframes star-pop/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /\.reduced-motion \*/);
  });
});
