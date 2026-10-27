/** Must stay in sync with the native-keyboard media query in styles.css. */
export const NATIVE_INPUT_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)';
export const INPUT_SENTINEL = '\u200b';

/** Human-readable position for visual and screen-reader feedback. */
export function cursorPosition(shape, cursor) {
  let offset = 0;
  for (let word = 0; word < shape.length; word += 1) {
    if (cursor < offset + shape[word]) {
      return { word: word + 1, letter: cursor - offset + 1, length: shape[word], words: shape.length };
    }
    offset += shape[word];
  }
  return { word: shape.length, letter: shape.at(-1), length: shape.at(-1), words: shape.length };
}

/** Mobile keyboards may send entire strings, not physical keydown events. */
export function nativeKeys(inputType, data, value = '') {
  if (inputType?.startsWith('delete')) return [inputType.includes('Forward') ? 'Delete' : 'Backspace'];
  if (['insertLineBreak', 'insertParagraph'].includes(inputType)) return ['Enter'];
  if (inputType?.startsWith('history')) return [];
  const text = typeof data === 'string' ? data : value.replaceAll(INPUT_SENTINEL, '');
  return [...text].filter((character) => /^[a-z ]$/i.test(character));
}

/**
 * Keep one native text input mounted for the entire session. A sentinel gives
 * mobile Backspace something to delete, even when the selected tile is empty.
 * Printable text comes from `input`, not `keydown`, avoiding double letters.
 */
export function bindNativeInput(input, { onKey, onText, canEdit }) {
  let composing = false;
  let committed = null;
  let commitTimer;
  const reset = () => {
    if (composing) return;
    input.value = INPUT_SENTINEL;
    input.setSelectionRange(1, 1);
  };
  const consume = (type, data, value) => {
    if (canEdit()) {
      const keys = nativeKeys(type, data, value);
      if (keys.length === 1) onKey(keys[0]);
      else if (keys.length) onText(keys);
    }
    reset();
  };
  input.addEventListener('focus', reset);
  input.addEventListener('compositionstart', () => { composing = true; committed = null; });
  input.addEventListener('compositionend', (event) => {
    composing = false;
    committed = event.data;
    consume('insertText', event.data, input.value);
    clearTimeout(commitTimer);
    commitTimer = setTimeout(() => { committed = null; }, 0);
  });
  input.addEventListener('beforeinput', (event) => {
    if (composing || event.isComposing || !event.cancelable) return;
    if (event.inputType?.startsWith('delete') || ['insertLineBreak', 'insertParagraph'].includes(event.inputType)) {
      event.preventDefault();
      consume(event.inputType, event.data, input.value);
    }
  });
  input.addEventListener('input', (event) => {
    if (composing || event.isComposing) return;
    if (committed !== null && event.data === committed) { committed = null; reset(); return; }
    consume(event.inputType, event.data, input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing || composing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (canEdit()) onKey(event.key);
      reset();
    }
  });
  reset();
  return { reset };
}
