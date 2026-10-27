import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { playSound, stopSounds, SOUND_NOTES } from '../src/lib/effects.js';
afterEach(() => { delete globalThis.window; });
describe('optional audio', () => {
  it('does not touch browser APIs when disabled', () => assert.doesNotThrow(() => playSound('key', false)));
  it('degrades safely without an AudioContext', () => { globalThis.window = {}; assert.doesNotThrow(() => playSound('key', true)); });
  it('ignores unsupported cues', () => assert.doesNotThrow(() => playSound('unknown', true)));
  it('provides distinct cues for editing, validation and results', () => assert.deepEqual(Object.keys(SOUND_NOTES), ['key', 'erase', 'submit', 'error', 'win', 'lose']));
  it('can stop before audio has been started', () => assert.doesNotThrow(stopSounds));
});
