/** Pure game rules. No browser APIs; also used by the Node test suite. */
export const MAX_GUESSES = 6;
export const normalize = (text) => text.trim().replace(/\s+/g, ' ').toUpperCase();
export const shapeOf = (text) => normalize(text).split(' ').map((word) => word.length);
export const lettersOf = (text) => [...normalize(text).replaceAll(' ', '')];

export function splitLetters(letters, shape) {
  let offset = 0;
  return shape.map((length) => {
    const word = letters.slice(offset, offset + length).join('');
    offset += length;
    return word;
  });
}

export function scoreGuess(guess, answer) {
  const normalizedGuess = normalize(guess);
  const normalizedAnswer = normalize(answer);
  if (!/^[A-Z]+(?: [A-Z]+)*$/.test(normalizedGuess) || !/^[A-Z]+(?: [A-Z]+)*$/.test(normalizedAnswer)) {
    throw new Error('Phrases must contain only English letters and spaces.');
  }
  if (shapeOf(normalizedGuess).join(',') !== shapeOf(normalizedAnswer).join(',')) {
    throw new Error('The guess must match every word length.');
  }
  const target = lettersOf(normalizedAnswer);
  const entered = lettersOf(normalizedGuess);
  const feedback = Array(entered.length).fill('absent');
  const remaining = new Map();
  // Reserve ALL exact matches before distributing yellows, including across words.
  target.forEach((letter, index) => {
    if (entered[index] === letter) feedback[index] = 'correct';
    else remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
  });
  entered.forEach((letter, index) => {
    if (feedback[index] !== 'correct' && (remaining.get(letter) ?? 0) > 0) {
      feedback[index] = 'present';
      remaining.set(letter, remaining.get(letter) - 1);
    }
  });
  return feedback;
}

export function validateDraft(draft, answer, dictionary) {
  const shape = shapeOf(answer);
  if (draft.length !== lettersOf(answer).length || draft.some((letter) => !/^[A-Z]$/.test(letter))) {
    return { ok: false, message: 'Fill every tile before submitting.', index: Math.max(0, draft.findIndex((letter) => !letter)) };
  }
  const words = splitLetters(draft, shape);
  let index = 0;
  for (const word of words) {
    if (!dictionary.has(word.toLowerCase())) {
      return { ok: false, message: `\u201c${word}\u201d is not in this dictionary. Try another word.`, index };
    }
    index += word.length;
  }
  return { ok: true, phrase: words.join(' ') };
}

export function createRound(key, phrase) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(phrase.text)) throw new Error('Invalid answer format.');
  return { key, phraseId: phrase.id, guesses: [], draft: Array(lettersOf(phrase.text).length).fill(''), cursor: 0, status: 'playing' };
}

export function editRound(round, action) {
  if (round.status !== 'playing') return round;
  const draft = [...round.draft];
  let cursor = round.cursor;
  if (action.type === 'letter' && /^[a-z]$/i.test(action.value)) {
    draft[cursor] = action.value.toUpperCase();
    cursor = Math.min(cursor + 1, draft.length - 1);
  } else if (action.type === 'backspace') {
    if (!draft[cursor]) cursor = Math.max(0, cursor - 1);
    draft[cursor] = '';
  } else if (action.type === 'delete') draft[cursor] = '';
  else if (action.type === 'clear') { draft.fill(''); cursor = 0; }
  else if (action.type === 'cursor') cursor = Math.max(0, Math.min(draft.length - 1, action.index));
  else if (action.type === 'move') cursor = Math.max(0, Math.min(draft.length - 1, cursor + action.delta));
  else return round;
  return { ...round, draft, cursor };
}

export function pasteRound(round, text, phrase) {
  if (round.status !== 'playing') return { round };
  const normalized = normalize(text);
  if (!/^[A-Z]+(?: [A-Z]+)*$/.test(normalized) || shapeOf(normalized).join(',') !== shapeOf(phrase.text).join(',')) {
    return { round, error: 'Paste a complete phrase with the same word lengths.' };
  }
  return { round: { ...round, draft: lettersOf(normalized), cursor: round.draft.length - 1 } };
}

export function submitRound(round, phrase, dictionary) {
  if (round.status !== 'playing') return { round };
  const validation = validateDraft(round.draft, phrase.text, dictionary);
  if (!validation.ok) return { round: { ...round, cursor: validation.index }, error: validation.message };
  const guesses = [...round.guesses, validation.phrase];
  const status = validation.phrase === normalize(phrase.text) ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return { round: { ...round, guesses, draft: Array(round.draft.length).fill(''), cursor: 0, status } };
}

export function keyboardFeedback(guesses, answer) {
  const result = {};
  const rank = { absent: 0, present: 1, correct: 2 };
  for (const guess of guesses) {
    const feedback = scoreGuess(guess, answer);
    lettersOf(guess).forEach((letter, index) => {
      if (result[letter] === undefined || rank[feedback[index]] > rank[result[letter]]) result[letter] = feedback[index];
    });
  }
  return result;
}

/** Reconstruct from untrusted localStorage; never trust persisted feedback/status. */
export function restoreRound(saved, key, phrase, dictionary) {
  const blank = createRound(key, phrase);
  if (!saved || saved.key !== key || saved.phraseId !== phrase.id || !Array.isArray(saved.guesses) || saved.guesses.length > MAX_GUESSES) return blank;
  let round = blank;
  for (const guess of saved.guesses) {
    if (typeof guess !== 'string' || round.status !== 'playing') return blank;
    const pasted = pasteRound(round, guess, phrase);
    if (pasted.error) return blank;
    const submitted = submitRound(pasted.round, phrase, dictionary);
    if (submitted.error) return blank;
    round = submitted.round;
  }
  if (saved.status === 'skipped' && key.startsWith('free:') && round.status === 'playing') round.status = 'skipped';
  if (round.status === 'playing' && Array.isArray(saved.draft) && saved.draft.length === blank.draft.length && saved.draft.every((letter) => typeof letter === 'string' && /^(?:[A-Z])?$/.test(letter))) {
    round.draft = [...saved.draft];
    round.cursor = Number.isInteger(saved.cursor) ? Math.min(round.draft.length - 1, Math.max(0, saved.cursor)) : 0;
  }
  return round;
}

export function shareText(round, phrase, label) {
  const symbols = { correct: '\u{1F7E9}', present: '\u{1F7E8}', absent: '\u2B1B' };
  const shape = shapeOf(phrase.text);
  const rows = round.guesses.map((guess) => splitLetters(scoreGuess(guess, phrase.text).map((mark) => symbols[mark]), shape).join(' '));
  const result = round.status === 'won' ? `${round.guesses.length}/${MAX_GUESSES}` : 'X/6';
  return `ODD WORDS / ${label}\n${result}\n\n${rows.join('\n')}`;
}
