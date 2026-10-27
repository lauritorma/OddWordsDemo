import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nativeKeys, cursorPosition, bindNativeInput, INPUT_SENTINEL } from '../src/lib/native-input.js';

describe('native phone keyboard input', () => {
  it('maps single letters without relying on keydown', () => assert.deepEqual(nativeKeys('insertText', 'a'), ['a']));
  it('accepts multi-letter input from a phone keyboard', () => assert.deepEqual(nativeKeys('insertText', 'DAMP'), [...'DAMP']));
  it('keeps word boundaries and ignores unsupported characters', () => assert.deepEqual(nativeKeys('insertText', 'a 12 cat!'), [...'a  cat']));
  it('uses the input value when the browser omits event data', () => assert.deepEqual(nativeKeys('insertText', null, INPUT_SENTINEL + 'ab'), ['a', 'b']));
  it('maps backward deletion even without inserted text', () => assert.deepEqual(nativeKeys('deleteContentBackward', null), ['Backspace']));
  it('maps forward deletion', () => assert.deepEqual(nativeKeys('deleteContentForward', null), ['Delete']));
  it('maps the phone go/return action', () => assert.deepEqual(nativeKeys('insertLineBreak', null), ['Enter']));
  it('ignores browser undo events in the transient input buffer', () => assert.deepEqual(nativeKeys('historyUndo', null, 'old'), []));
  it('labels the first tile', () => assert.deepEqual(cursorPosition([1, 4, 5], 0), { word: 1, letter: 1, length: 1, words: 3 }));
  it('labels a word boundary', () => assert.deepEqual(cursorPosition([1, 4, 5], 5), { word: 3, letter: 1, length: 5, words: 3 }));
  it('labels the last tile', () => assert.deepEqual(cursorPosition([1, 4, 5], 9), { word: 3, letter: 5, length: 5, words: 3 }));

  function fixture(canEdit = () => true) {
    const listeners = {};
    const input = { value: '', setSelectionRange() {}, addEventListener: (type, callback) => { listeners[type] = callback; } };
    const keys = [];
    bindNativeInput(input, { onKey: key => keys.push(key), onText: text => keys.push(...text), canEdit });
    return { input, keys, fire: (type, values = {}) => listeners[type]?.({ preventDefault() {}, stopPropagation() {}, ...values }) };
  }
  it('does not process printable keydown twice', () => {
    const f = fixture(); f.fire('keydown', { key: 'a' }); f.fire('input', { inputType: 'insertText', data: 'a' });
    assert.deepEqual(f.keys, ['a']); assert.equal(f.input.value, INPUT_SENTINEL);
  });
  it('handles empty-tile backspace through beforeinput', () => {
    const f = fixture(); let prevented = false;
    f.fire('beforeinput', { inputType: 'deleteContentBackward', cancelable: true, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true); assert.deepEqual(f.keys, ['Backspace']);
  });
  it('handles noncancelable deletion through input', () => {
    const f = fixture(); f.fire('beforeinput', { inputType: 'deleteContentBackward', cancelable: false });
    f.fire('input', { inputType: 'deleteContentBackward' }); assert.deepEqual(f.keys, ['Backspace']);
  });
  it('commits a composition once, including a duplicate final input event', () => {
    const f = fixture(); f.fire('compositionstart'); f.fire('input', { data: 'ab', inputType: 'insertCompositionText', isComposing: true });
    assert.deepEqual(f.keys, []); f.fire('compositionend', { data: 'ab' }); f.fire('input', { data: 'ab', inputType: 'insertText' });
    assert.deepEqual(f.keys, ['a', 'b']);
  });
  it('blocks edits during reveal, modal dialogs and completed games', () => {
    const f = fixture(() => false); f.fire('input', { inputType: 'insertText', data: 'a' });
    f.fire('keydown', { key: 'Backspace' }); assert.deepEqual(f.keys, []);
  });
  it('leaves browser shortcuts and Tab alone', () => {
    const f = fixture(); f.fire('keydown', { key: 'Tab' }); f.fire('keydown', { key: 'a', ctrlKey: true });
    assert.deepEqual(f.keys, []);
  });
});
