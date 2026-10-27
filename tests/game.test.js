import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, editRound, pasteRound, submitRound, restoreRound, scoreGuess, shapeOf, lettersOf, splitLetters, validateDraft, keyboardFeedback, shareText } from '../src/lib/game.js';
const phrase = { id: 'milk', text: 'milk is warm' };
const dictionary = new Set(['milk', 'is', 'warm', 'silk', 'if', 'corn', 'frog', 'at', 'home']);
const start = () => createRound('daily:2026-10-27', phrase);
const play = (round, text) => submitRound(pasteRound(round, text, phrase).round, phrase, dictionary).round;
const example = ['present', 'correct', 'correct', 'correct', 'correct', 'absent', 'absent', 'absent', 'correct', 'absent'];

describe('phrase-wide scoring', () => {
  it('scores the original SILK IF CORN example', () => assert.deepEqual(scoreGuess('silk if corn', phrase.text), example));
  it('awards all greens for an exact answer', () => assert.ok(scoreGuess(phrase.text, phrase.text).every((mark) => mark === 'correct')));
  it('matches yellows across word boundaries', () => assert.deepEqual(scoreGuess('ab cd', 'cd ab'), Array(4).fill('present')));
  it('does not over-allocate repeats', () => assert.deepEqual(scoreGuess('aaaa', 'aabc'), ['correct', 'correct', 'absent', 'absent']));
  it('reserves later greens before earlier yellows', () => assert.deepEqual(scoreGuess('aa aa', 'ab ca'), ['correct', 'absent', 'absent', 'correct']));
  it('combines duplicate greens and yellows', () => assert.deepEqual(scoreGuess('aaab', 'baaa'), ['present', 'correct', 'correct', 'present']));
  it('rejects the wrong word shape', () => assert.throws(() => scoreGuess('mi lkis warm', phrase.text)));
  it('rejects punctuation and digits', () => assert.throws(() => scoreGuess('m1lk is warm', phrase.text)));
  it('normalizes whitespace and case', () => assert.deepEqual(scoreGuess(' SILK  IF\nCORN ', phrase.text), example));
  it('preserves exact-match and count invariants for 1000 generated cases', () => {
    let seed = 131;
    const letter = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return 'ABCDE'[seed % 5]; };
    const shape = (value) => `${value.slice(0, 4)} ${value.slice(4, 6)} ${value.slice(6)}`;
    for (let run = 0; run < 1000; run += 1) {
      const answer = Array.from({ length: 10 }, letter).join('');
      const guess = Array.from({ length: 10 }, letter).join('');
      const marks = scoreGuess(shape(guess), shape(answer));
      marks.forEach((mark, index) => assert.equal(mark === 'correct', guess[index] === answer[index]));
      for (const value of 'ABCDE') {
        const credited = [...guess].filter((x, index) => x === value && marks[index] !== 'absent').length;
        assert.equal(credited, Math.min([...answer].filter((x) => x === value).length, [...guess].filter((x) => x === value).length));
      }
    }
  });
});

describe('validation and editing', () => {
  it('starts with ten empty tiles and zero guesses', () => { const r = start(); assert.equal(r.guesses.length, 0); assert.deepEqual(r.draft, Array(10).fill('')); });
  it('accepts nonsense combinations of dictionary words', () => assert.equal(validateDraft(lettersOf('silk if corn'), phrase.text, dictionary).ok, true));
  it('rejects invented words', () => assert.equal(validateDraft(lettersOf('tras en bolk'), phrase.text, dictionary).ok, false));
  it('rejects an incomplete row without spending a guess', () => { const result = submitRound(start(), phrase, dictionary); assert.ok(result.error); assert.equal(result.round.guesses.length, 0); });
  it('rejects a non-dictionary row without spending a guess', () => { const result = submitRound(pasteRound(start(), 'xxxx is warm', phrase).round, phrase, dictionary); assert.ok(result.error); assert.equal(result.round.guesses.length, 0); });
  it('uppercases input and does not mutate the previous state', () => { const before = start(); const after = editRound(before, { type: 'letter', value: 's' }); assert.equal(after.draft[0], 'S'); assert.equal(before.draft[0], ''); assert.equal(after.cursor, 1); });
  it('advances through word boundaries', () => { let r = start(); for (const value of 'silki') r = editRound(r, { type: 'letter', value }); assert.equal(r.cursor, 5); assert.equal(r.draft.slice(0, 5).join(''), 'SILKI'); });
  it('clamps cursor movement to the board', () => { assert.equal(editRound(start(), { type: 'move', delta: -1 }).cursor, 0); assert.equal(editRound(start(), { type: 'cursor', index: 999 }).cursor, 9); });
  it('backspace clears the previous tile when the cursor is empty', () => { const r = editRound(editRound(start(), { type: 'letter', value: 's' }), { type: 'backspace' }); assert.equal(r.cursor, 0); assert.equal(r.draft[0], ''); });
  it('can replace a letter at any cursor position', () => { let r = pasteRound(start(), 'silk if corn', phrase).round; r = editRound(r, { type: 'cursor', index: 0 }); r = editRound(r, { type: 'letter', value: 'm' }); assert.equal(r.draft.slice(0, 4).join(''), 'MILK'); });
  it('clears the current row, not previous guesses', () => { let r = play(start(), 'silk if corn'); r = editRound(r, { type: 'letter', value: 'x' }); r = editRound(r, { type: 'clear' }); assert.equal(r.guesses.length, 1); assert.ok(r.draft.every((x) => x === '')); });
  it('normalizes pasted phrases without automatically submitting', () => { const r = pasteRound(start(), ' silk  if\ncorn ', phrase).round; assert.deepEqual(splitLetters(r.draft, shapeOf(phrase.text)), ['SILK', 'IF', 'CORN']); assert.equal(r.guesses.length, 0); });
  it('rejects a paste with the wrong shape', () => assert.ok(pasteRound(start(), 'a damp squib', phrase).error));
  it('rejects a paste containing punctuation', () => assert.ok(pasteRound(start(), 'milk is warm!', phrase).error));
});

describe('round progression and persistence', () => {
  it('opens a fresh row after an incorrect guess', () => { const r = play(start(), 'silk if corn'); assert.equal(r.status, 'playing'); assert.equal(r.guesses.length, 1); assert.ok(r.draft.every((x) => x === '')); });
  it('wins on an exact phrase', () => assert.equal(play(start(), phrase.text).status, 'won'));
  it('loses after six valid incorrect guesses', () => { let r = start(); for (let i = 0; i < 6; i++) r = play(r, 'silk if corn'); assert.equal(r.status, 'lost'); assert.equal(r.guesses.length, 6); });
  it('still wins on the sixth guess', () => { let r = start(); for (let i = 0; i < 5; i++) r = play(r, 'silk if corn'); r = play(r, phrase.text); assert.equal(r.status, 'won'); assert.equal(r.guesses.length, 6); });
  it('ignores edits after victory', () => { const r = play(start(), phrase.text); assert.equal(editRound(r, { type: 'letter', value: 'x' }), r); });
  it('ignores submissions after defeat', () => { let r = start(); for (let i = 0; i < 6; i++) r = play(r, 'silk if corn'); assert.equal(submitRound(r, phrase, dictionary).round, r); });
  it('restores guesses and an unfinished draft', () => { let r = play(start(), 'silk if corn'); r = editRound(r, { type: 'letter', value: 'm' }); assert.deepEqual(restoreRound(r, r.key, phrase, dictionary), r); });
  it('reconstructs victory from guesses, not a persisted status', () => { const r = play(start(), phrase.text); assert.equal(restoreRound({ ...r, status: 'playing' }, r.key, phrase, dictionary).status, 'won'); });
  it('does not trust a forged victory flag', () => assert.equal(restoreRound({ ...start(), status: 'won' }, start().key, phrase, dictionary).status, 'playing'));
  it('discards saves belonging to a different day', () => assert.deepEqual(restoreRound(play(start(), phrase.text), 'daily:2026-10-28', phrase, dictionary).guesses, []));
  it('discards malformed guess data', () => assert.deepEqual(restoreRound({ ...start(), guesses: ['not right'] }, start().key, phrase, dictionary).guesses, []));
  it('discards extra guesses after a win', () => assert.deepEqual(restoreRound({ ...start(), guesses: ['MILK IS WARM', 'SILK IF CORN'] }, start().key, phrase, dictionary).guesses, []));
  it('restores a skipped freeplay round but never a skipped daily round', () => { const free = createRound('free:abc', phrase); assert.equal(restoreRound({ ...free, status: 'skipped' }, free.key, phrase, dictionary).status, 'skipped'); assert.equal(restoreRound({ ...start(), status: 'skipped' }, start().key, phrase, dictionary).status, 'playing'); });
});

describe('keyboard and sharing', () => {
  it('never downgrades a green key', () => assert.equal(keyboardFeedback(['AB', 'BB'], 'AB').B, 'correct'));
  it('keeps a yellow rather than a later gray occurrence', () => assert.equal(keyboardFeedback(['BAAA'], 'ABCD').A, 'present'));
  it('shares feedback without exposing the answer', () => { const text = shareText(play(start(), phrase.text), phrase, '2026-10-27'); assert.ok(text.includes('1/6')); assert.ok(!text.toLowerCase().includes(phrase.text)); assert.equal(text.split('\n')[3].split(' ').length, 3); });
});
