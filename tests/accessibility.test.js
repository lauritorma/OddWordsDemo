import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(m => [m[1], m[2]]));
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
describe('accessible palette and redundant feedback', () => {
  for (const foreground of ['text', 'muted', 'dim', 'accent', 'error']) {
    for (const background of ['bg', 'panel', 'raised']) {
      it(`${foreground} text has at least 4.5:1 contrast on ${background}`, () => assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5));
    }
  }
  for (const background of ['green', 'amber', 'accent']) {
    it(`dark letters have at least 4.5:1 contrast on ${background}`, () => assert.ok(contrast(tokens.ink, tokens[background]) >= 4.5));
  }
  it('absent letters remain readable', () => assert.ok(contrast(tokens.text, tokens.absent) >= 4.5));
  it('active input borders exceed 3:1 against the panel', () => assert.ok(contrast(tokens.line, tokens.panel) >= 3));
  it('keeps focus indicators and feedback in forced-colour mode', () => { assert.match(css, /forced-colors: active/); assert.match(css, /\.tile-mark, \.example-tile small \{ display: block !important/); });
  it('does not remove reduced-motion support', () => assert.match(css, /prefers-reduced-motion: reduce/));
});
