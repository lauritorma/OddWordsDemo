import { MAX_GUESSES, createRound, editRound, pasteRound, submitRound, restoreRound, scoreGuess, shapeOf, lettersOf, keyboardFeedback, shareText } from './lib/game.js';
import { dailyPuzzle, drawFreeplay, untilMidnight, dateKey } from './lib/puzzles.js';
import { parseDictionary } from './lib/dictionary.js';
import { readSave, writeSave, clearSave, STORAGE_KEY, cleanHistory, recordResult, statistics } from './lib/storage.js';
import { playSound, stopSounds, confetti } from './lib/effects.js';
import { bindNativeInput, cursorPosition, NATIVE_INPUT_QUERY } from './lib/native-input.js';

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const pad = (value) => String(value).padStart(2, '0');
const marks = { correct: '+', present: '~', absent: '-' };
const descriptions = { correct: 'correct position', present: 'elsewhere in the phrase', absent: 'no matching copy left' };
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
const nativeMedia = window.matchMedia(NATIVE_INPUT_QUERY);
let modalTrigger;
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let phrases, schedule, dictionary, daily, dailyRound, freeRound, bag = [], history = [];
let mode = 'daily', settings = { sound: false, symbols: true, reducedMotion: false };
let ready = false, revealing = false, celebrating = '', timer, celebrationTimer, stopConfetti = () => {};
let message = '', messageError = false, keyboardSignature = '', sideSignature = '';
const currentRound = () => mode === 'daily' ? dailyRound : freeRound;
const currentPhrase = () => mode === 'daily' ? daily.phrase : phrases.find((phrase) => phrase.id === freeRound.phraseId);
const reduced = () => media.matches || settings.reducedMotion;
const setRound = (round) => { if (mode === 'daily') dailyRound = round; else freeRound = round; };

async function load(url, type = 'json') {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Cannot load ${url.pathname} (HTTP ${response.status}).`);
  return response[type]();
}

async function initialize() {
  try {
    const [phraseData, scheduleData, wordData] = await Promise.all([
      load(new URL('./data/phrases.json', import.meta.url)),
      load(new URL('./data/daily-schedule.json', import.meta.url)),
      load(new URL('../public/dictionary/english.txt', import.meta.url), 'text'),
    ]);
    phrases = phraseData; schedule = scheduleData; dictionary = parseDictionary(wordData);
    if (!Array.isArray(phrases) || phrases.length === 0 || dictionary.size < 1000) throw new Error('Phrase or dictionary data is incomplete.');
    const saved = readSave(storage);
    settings = {
      sound: saved.settings?.sound === true,
      symbols: saved.settings?.symbols !== false,
      reducedMotion: saved.settings?.reducedMotion === true,
    };
    history = cleanHistory(saved.history);
    bag = Array.isArray(saved.bag) ? saved.bag.filter((id) => typeof id === 'string') : [];
    daily = dailyPuzzle(phrases, schedule);
    dailyRound = restoreRound(saved.daily, daily.key, daily.phrase, dictionary);
    const freePhrase = phrases.find((phrase) => phrase.id === saved.freeplay?.phraseId);
    if (freePhrase && typeof saved.freeplay?.key === 'string' && /^free:[a-zA-Z0-9-]{1,80}$/.test(saved.freeplay.key)) {
      freeRound = restoreRound(saved.freeplay, saved.freeplay.key, freePhrase, dictionary);
    }
    mode = saved.mode === 'freeplay' ? 'freeplay' : 'daily';
    if (mode === 'freeplay' && !freeRound) makeFreeRound();
    history = recordResult(history, dailyRound);
    if (freeRound) history = recordResult(history, freeRound);
    ready = true;
    $('#loading').hidden = true; $('#play-layout').hidden = false;
    render(); persist(); tick();
    window.setInterval(tick, 1000);
  } catch (error) {
    $('#loading').innerHTML = `The puzzle could not load.<br><br><small>${escape(error.message)}</small><br><br><button class="outline-button" data-action="reload">TRY AGAIN</button>`;
    console.error(error);
  }
}

function makeFreeRound() {
  const drawn = drawFreeplay(phrases, bag, [daily.phrase.id, freeRound?.phraseId].filter(Boolean));
  bag = drawn.bag;
  const id = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  freeRound = createRound(`free:${id}`, drawn.phrase);
}

function persist() {
  const saved = writeSave(storage, { daily: dailyRound, freeplay: freeRound, bag, history, mode, settings });
  $('#save-state').innerHTML = saved ? '<span class="save-dot"></span>Saved on this device' : 'Session only: storage unavailable';
}

function applySettings() {
  document.body.classList.toggle('no-symbols', !settings.symbols);
  document.body.classList.toggle('reduced-motion', reduced());
  if (reduced()) stopConfetti();
  const soundButton = $('[data-action="sound"]');
  soundButton.setAttribute('aria-pressed', String(settings.sound));
  soundButton.setAttribute('aria-label', settings.sound ? 'Turn sound off' : 'Turn sound on');
  soundButton.title = settings.sound ? 'Sound on' : 'Sound off';
}

function render(focus = false) {
  if (!ready) return;
  applySettings();
  const round = currentRound();
  const phrase = currentPhrase();
  const shape = shapeOf(phrase.text);
  for (const button of document.querySelectorAll('[data-mode]')) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    button.disabled = revealing;
  }
  const dailyStats = statistics(history);
  $('#streak').textContent = pad(dailyStats.streak);
  $('#total-wins').textContent = pad(history.filter((entry) => entry.status === 'won').length);
  $('#edition').textContent = mode === 'daily' ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(daily.date + 'T00:00:00Z')).toUpperCase() : `${phrases.length} PHRASES`;
  $('#puzzle-mode').textContent = mode === 'daily' ? 'DAILY' : 'FREEPLAY';
  $('#puzzle-label').textContent = mode === 'daily' ? `Puzzle ${String(Math.max(1, daily.number)).padStart(3, '0')}` : 'Random phrase';
  $('#attempt-label').textContent = round.status === 'won' && !revealing ? `SOLVED ${pad(round.guesses.length)} / 06` : round.status !== 'playing' && !revealing ? 'ROUND COMPLETE' : `GUESS ${pad(Math.min(round.guesses.length + (revealing ? 0 : 1), 6))} / 06`;
  $('#attempt-pips').innerHTML = Array.from({ length: MAX_GUESSES }, (_, i) => `<span class="pip ${round.status === 'won' && !revealing ? 'won' : round.status === 'lost' && !revealing ? 'lost' : i < round.guesses.length ? 'used' : i === round.guesses.length ? 'current' : ''}"></span>`).join('');
  $('#word-pattern').textContent = shape.join(' / ');
  $('#phrase-size').textContent = `${shape.length} WORDS / ${round.draft.length} LETTERS`;
  $('#daily-clock').hidden = mode !== 'daily'; $('#freeplay-note').hidden = mode !== 'freeplay';
  $('[data-action="skip"]').disabled = revealing;
  document.querySelectorAll('.entry-controls button').forEach((button) => { button.disabled = revealing || round.status !== 'playing'; });
  renderBoard(focus); renderKeyboard(); renderSide();
  const fallback = revealing ? 'Checking guess...' : round.status === 'won' ? `Solved in ${round.guesses.length} ${round.guesses.length === 1 ? 'guess' : 'guesses'}.` : round.status === 'lost' ? 'No guesses left. The answer is shown below.' : round.status === 'skipped' ? 'Phrase revealed. This round is not scored.' : nativeMedia.matches ? 'Tap a tile to type. Submit when the row is complete.' : 'Type a word into each group of tiles.';
  $('#message').textContent = message || fallback;
  $('#message').className = `message${messageError ? ' error' : round.status === 'won' && !revealing ? ' success' : ''}`;
}

function renderBoard(focus = false) {
  const round = currentRound(), phrase = currentPhrase(), shape = shapeOf(phrase.text);
  const board = $('#board'), native = nativeMedia.matches;
  const style = getComputedStyle(board);
  const available = board.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - (native ? 25 : 31);
  const gaps = (round.draft.length - shape.length) * 3 + (shape.length - 1) * 12;
  const fit = Math.floor((available - gaps) / round.draft.length);
  const longest = Math.max(...shape);
  const maximumWordTile = Math.floor((available - (longest - 1) * 3) / longest);
  const tile = Math.max(16, Math.min(maximumWordTile, fit >= 30 ? Math.min(native ? 40 : 42, fit) : (native ? 38 : 36)));
  const scroll = board.scrollTop;
  const hadTileFocus = document.activeElement?.hasAttribute('data-index');
  board.setAttribute('aria-label', native ? 'Phrase guesses. Scroll to review earlier guesses.' : 'Phrase guesses');
  board.style.setProperty('--tile', `${tile}px`);
  board.style.setProperty('--delay', `${Math.min(30, 270 / round.draft.length)}ms`);
  board.innerHTML = Array.from({ length: MAX_GUESSES }, (_, attempt) => {
    const guess = round.guesses[attempt];
    const active = !revealing && round.status === 'playing' && attempt === round.guesses.length;
    const letters = guess ? lettersOf(guess) : active ? round.draft : Array(round.draft.length).fill('');
    const feedback = guess ? scoreGuess(guess, phrase.text) : [];
    const reveal = revealing && attempt === round.guesses.length - 1;
    const celebrate = !revealing && celebrating === round.key && round.status === 'won' && attempt === round.guesses.length - 1;
    let offset = 0;
    const words = shape.map((length, word) => {
      const currentWord = active && round.cursor >= offset && round.cursor < offset + length;
      const tiles = Array.from({ length }, (_, position) => {
        const index = offset + position, letter = letters[index], mark = feedback[index];
        const selected = active && index === round.cursor;
        const className = `tile ${mark ?? ''}${active && letter ? ' filled' : ''}${selected ? ' cursor' : ''}`;
        const label = `Word ${word + 1}, letter ${position + 1}: ${letter || 'empty'}${mark ? ', ' + descriptions[mark] : ''}`;
        const content = `<span aria-hidden="true">${escape(letter)}</span>${mark ? `<span class="tile-mark" aria-hidden="true">${marks[mark]}</span>` : ''}`;
        return active ? `<button class="${className}" data-index="${index}" tabindex="${selected && !native ? '0' : '-1'}" ${selected ? 'aria-current="true"' : ''} aria-label="${label}" type="button">${content}</button>` : `<span class="${className}" style="--i:${index}" ${guess ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${content}</span>`;
      }).join('');
      offset += length;
      return `<div class="word-group${currentWord ? ' current-word' : ''}">${tiles}</div>`;
    }).join('');
    return `<div class="guess-row ${active ? 'active' : guess ? 'submitted' : 'future'}${reveal ? ' revealing' : ''}${celebrate ? ' celebrate' : ''}" role="group" aria-label="Guess ${attempt + 1}${guess ? ': ' + escape(guess) : active ? ', current entry' : ', empty'}"><span class="row-number" aria-hidden="true">${pad(attempt + 1)}</span><div class="word-groups">${words}</div></div>`;
  }).join('');
  board.scrollTop = scroll;
  if (focus && native) scrollSelectedTile();
  syncInputPosition();
  if ((focus || hadTileFocus) && !$('#modal').open) {
    if (native && focus) focusNativeInput();
    else if (!native) board.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
  }
}

function scrollSelectedTile() {
  const board = $('#board'), tile = board.querySelector('.tile.cursor');
  if (!tile) return;
  const b = board.getBoundingClientRect(), t = tile.getBoundingClientRect();
  if (t.bottom > b.bottom - 12) board.scrollTop += t.bottom - b.bottom + 12;
  else if (t.top < b.top + 12) board.scrollTop -= b.top + 12 - t.top;
}

function syncInputPosition() {
  if (!ready) return;
  const input = $('#native-input'), round = currentRound();
  const active = round.status === 'playing';
  const position = cursorPosition(shapeOf(currentPhrase().text), round.cursor);
  const label = `Word ${position.word} of ${position.words}, letter ${position.letter} of ${position.length}`;
  $('#input-position').textContent = revealing ? 'Checking guess...' : active ? label : 'Round complete';
  $('#type-button').hidden = !active;
  $('#type-button').disabled = revealing;
  input.disabled = !nativeMedia.matches || !active;
  input.tabIndex = nativeMedia.matches && active ? 0 : -1;
  input.setAttribute('aria-label', `Guess ${round.guesses.length + 1}. ${label}. Type a letter.`);
  const tile = $('#board .tile.cursor');
  if (tile && nativeMedia.matches) {
    const t = tile.getBoundingClientRect(), shell = $('.board-shell').getBoundingClientRect();
    Object.assign(input.style, { top: `${t.top - shell.top}px`, left: `${t.left - shell.left}px`, width: `${t.width}px`, height: `${t.height}px` });
  }
}

function focusNativeInput() {
  if (!ready || revealing || !nativeMedia.matches || currentRound().status !== 'playing' || $('#modal').open) return;
  scrollSelectedTile(); syncInputPosition();
  // Focus synchronously inside the user's tap; do not defer to a timer.
  $('#native-input').focus({ preventScroll: true });
}

function renderKeyboard() {
  $('#keyboard').hidden = nativeMedia.matches;
  const round = currentRound();
  const feedback = keyboardFeedback(revealing ? round.guesses.slice(0, -1) : round.guesses, currentPhrase().text);
  const disabled = revealing || round.status !== 'playing';
  const signature = JSON.stringify(feedback) + disabled;
  if (signature === keyboardSignature) return;
  keyboardSignature = signature;
  const focusedKey = document.activeElement?.closest('#keyboard [data-key]')?.dataset.key;
  const rows = [[...'QWERTYUIOP'], [...'ASDFGHJKL'], ['Enter', ...'ZXCVBNM', 'Backspace']];
  $('#keyboard').innerHTML = rows.map((row) => `<div class="key-row">${row.map((key) => {
    const status = feedback[key]; const wide = key.length > 1;
    return `<button class="key ${wide ? 'wide' : ''} ${status ?? ''}" data-key="${key}" type="button" ${disabled ? 'disabled' : ''} aria-label="${key === 'Enter' ? 'Submit guess' : key === 'Backspace' ? 'Backspace' : key}${status ? ', ' + descriptions[status] : ''}">${key === 'Enter' ? 'ENTER' : key === 'Backspace' ? '&#9003;' : key}${status ? `<span class="tile-mark" aria-hidden="true">${marks[status]}</span>` : ''}</button>`;
  }).join('')}</div>`).join('');
  if (focusedKey && !disabled) $('#keyboard').querySelector(`[data-key="${focusedKey}"]`)?.focus({ preventScroll: true });
}

function renderSide() {
  const round = currentRound(), phrase = currentPhrase();
  const finished = round.status !== 'playing' && !revealing;
  $('#briefing').hidden = finished; $('#result').hidden = !finished;
  const signature = round.key + round.status + finished;
  if (!finished || signature === sideSignature) return;
  sideSignature = signature;
  const won = round.status === 'won', skipped = round.status === 'skipped';
  $('#result').className = `result ${round.status}`;
  $('#result').innerHTML = `<div class="panel-label"><span>ROUND RESULT</span><span>${mode === 'daily' ? 'DAILY' : 'FREEPLAY'}</span></div><div class="result-badge" aria-hidden="true">${won ? '+' : '?'}</div><div class="result-label">${won ? 'SOLVED' : skipped ? 'REVEALED' : 'ROUND COMPLETE'}</div><h2>${won ? 'Phrase solved' : skipped ? 'Phrase revealed' : 'No guesses left'}</h2><p class="micro">${won ? `SOLVED IN ${round.guesses.length} OF 6 GUESSES` : skipped ? 'REVEALED / NOT SCORED' : 'THE ANSWER WAS'}</p><hr class="result-divider"><p class="result-phrase">${escape(phrase.text)}</p><p class="result-definition">${escape(phrase.meaning)}</p><a class="result-source" href="${escape(phrase.sourceUrl)}" target="_blank" rel="noopener noreferrer">Read the definition &nearr;</a>${!skipped ? '<button class="outline-button full" data-action="share">Copy result <span aria-hidden="true">+</span></button>' : ''}<button class="submit-button full" data-action="${mode === 'daily' ? 'freeplay' : 'next'}"><span>${mode === 'daily' ? 'Play freeplay' : 'Next phrase'}</span><span aria-hidden="true">&rarr;</span></button><p class="result-foot">${mode === 'daily' ? 'Next daily puzzle in <span class="countdown">' + untilMidnight() + '</span>' : 'Choose Next phrase to play again.'}</p>`;
}

function handleKey(key) {
  if (!ready || revealing || currentRound().status !== 'playing' || $('#modal').open) return;
  message = ''; messageError = false;
  if (key === 'Enter') { submit(); return; }
  let action;
  if (/^[a-z]$/i.test(key)) action = { type: 'letter', value: key };
  else if (key === 'Backspace') action = { type: 'backspace' };
  else if (key === 'Delete') action = { type: 'delete' };
  else if (key === 'Clear') action = { type: 'clear' };
  else if (key === 'ArrowLeft' || key === 'ArrowRight') action = { type: 'move', delta: key === 'ArrowLeft' ? -1 : 1 };
  else if (key === 'Home') action = { type: 'cursor', index: 0 };
  else if (key === 'End') action = { type: 'cursor', index: currentRound().draft.length - 1 };
  else if (key === ' ') {
    // Auto-advance has already crossed a word boundary. A typed space must
    // not skip the next empty word when entering a phrase naturally.
    const starts = [0];
    for (const length of shapeOf(currentPhrase().text)) starts.push(starts.at(-1) + length);
    if (starts.includes(currentRound().cursor) && !currentRound().draft[currentRound().cursor]) return;
    let boundary = 0;
    for (const length of shapeOf(currentPhrase().text)) { boundary += length; if (boundary > currentRound().cursor) break; }
    action = { type: 'cursor', index: Math.min(boundary, currentRound().draft.length - 1) };
  }
  if (!action) return;
  setRound(editRound(currentRound(), action));
  if (action.type === 'letter') playSound('key', settings.sound);
  if (['backspace', 'delete', 'clear'].includes(action.type)) playSound('erase', settings.sound);
  persist(); render(true);
}

function submit() {
  const result = submitRound(currentRound(), currentPhrase(), dictionary);
  setRound(result.round);
  if (result.error) {
    message = result.error; messageError = true; playSound('error', settings.sound); persist(); render(true); return;
  }
  revealing = true;
  const key = currentRound().key;
  history = recordResult(history, currentRound());
  persist(); render(); playSound('submit', settings.sound);
  const delay = reduced() ? 20 : 390 + Math.min(270, currentRound().draft.length * 30);
  timer = window.setTimeout(() => {
    revealing = false;
    if (currentRound().key !== key) return;
    if (currentRound().status === 'won') {
      celebrating = key; render();
      playSound('win', settings.sound);
      stopConfetti = confetti($('#confetti'), reduced());
      celebrationTimer = window.setTimeout(() => { celebrating = ''; if (ready) renderBoard(); }, 1400);
    } else {
      if (currentRound().status === 'lost') playSound('lose', settings.sound);
      render(true);
    }
    if (currentRound().status !== 'playing' && !$('#modal').open) {
      $('#result').focus({ preventScroll: true });
      $('#result').scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'nearest' });
    }
  }, delay);
}

function switchMode(next) {
  if (!ready || revealing || next === mode) return;
  stopConfetti(); celebrating = ''; clearTimeout(celebrationTimer);
  mode = next;
  if (mode === 'freeplay' && !freeRound) makeFreeRound();
  message = ''; messageError = false; sideSignature = ''; persist(); render();
}

function nextPhrase() {
  if (!ready || revealing) return;
  stopConfetti(); celebrating = ''; clearTimeout(celebrationTimer);
  mode = 'freeplay'; makeFreeRound(); message = ''; messageError = false;
  sideSignature = ''; persist(); render(true);
  $('#game').scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
}

function openModal(title, content, eyebrow = 'ODD WORDS') {
  if (!$('#modal').open) modalTrigger = document.activeElement;
  $('#modal').innerHTML = `<div class="modal-inner"><div class="modal-top"><div><div class="eyebrow">${eyebrow}</div><h2 id="modal-title" tabindex="-1">${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close dialog">&#215;</button></div>${content}</div>`;
  if (!$('#modal').open) $('#modal').showModal();
  $('#modal-title').focus({ preventScroll: true });
}

function showHelp() {
  const example = ['S', 'I', 'L', 'K', ' ', 'I', 'F', ' ', 'C', 'O', 'R', 'N'];
  const feedback = scoreGuess('silk if corn', 'milk is warm'); let i = 0;
  const tiles = example.map((letter) => letter === ' ' ? '<span class="word-gap"></span>' : `<span class="example-tile ${feedback[i++]}" aria-hidden="true">${letter}</span>`).join('');
  openModal('How to play', `<p>Uncover an English phrase in <strong>six valid guesses</strong>. The spaces give you the word lengths.</p><ol class="rules-list"><li><strong>Every word must be in the dictionary.</strong> The whole guess does not have to make sense. Invalid entries never cost an attempt.</li><li><strong>Green:</strong> the letter is in the correct tile. <strong>Yellow:</strong> it appears elsewhere, including in another word. <strong>Gray:</strong> no matching copy remains.</li><li><strong>Duplicates are counted.</strong> Greens are assigned first. Extra copies can turn gray even when another copy is green.</li></ol><h3>AN EXAMPLE, NOT TODAY'S ANSWER</h3><p>For the answer <strong>MILK IS WARM</strong>, try <strong>SILK IF CORN</strong>:</p><div class="modal-example" aria-label="S yellow, I L K green, I green, F gray, C O gray, R green, N gray">${tiles}</div><p>The S is yellow because it belongs in a different word.</p><h3>YOUR CONTROLS</h3><p>On a phone or tablet, tap a tile or Open keyboard to use your device keyboard. The outlined tile and position label show where you are typing. On desktop, use your keyboard or the on-screen keys. Enter submits; arrows move; Backspace deletes. Tap any active tile to replace it. Space moves to the next word. Paste a complete phrase with matching word lengths.</p><h3>TWO WAYS TO PLAY</h3><p><strong>Daily:</strong> the same puzzle for everyone, changing at 00:00 UTC. <strong>Freeplay:</strong> random phrases, as many rounds as you like. Both save separately on this browser.</p><p class="settings-note">Dictionary policy: mostly US English, plus selected UK spellings and the answer vocabulary. Some rare or regional words may be missing. Answers use letters and spaces only.</p>`);
}

function showSettings() {
  openModal('Settings', `<label class="setting-row"><span><strong>Sound effects</strong><small>Quiet sounds for typing, deleting, submitting, errors and results. Off by default.</small></span><input type="checkbox" data-setting="sound" ${settings.sound ? 'checked' : ''}></label><label class="setting-row"><span><strong>Feedback symbols</strong><small>+ correct, ~ elsewhere, - no match. More than colour.</small></span><input type="checkbox" data-setting="symbols" ${settings.symbols ? 'checked' : ''}></label><label class="setting-row"><span><strong>Reduce motion</strong><small>Skip tile flips, victory waves and confetti. Your system preference is always respected.</small></span><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? 'checked' : ''}></label><p class="settings-note">Progress and preferences are stored on this device. Hosting requests are processed by Vercel. <a href="./privacy.html">Read the privacy notice</a>.</p><button class="outline-button danger-button" data-action="clear-data">Clear saved data</button><p class="settings-note">This removes your progress, statistics and settings from this browser.</p>`, 'ODD WORDS / SETTINGS');
}

function showStats() {
  const stats = statistics(history), free = statistics(history, new Date(), 'free');
  const maximum = Math.max(1, ...stats.distribution);
  openModal('Statistics', `<h3>DAILY CHALLENGE</h3><div class="stats-grid">${[[stats.played, 'PLAYED'], [stats.rate + '%', 'WIN RATE'], [stats.streak, 'STREAK'], [stats.best, 'BEST STREAK']].map(([value, label]) => `<div class="stat"><strong>${value}</strong><small>${label}</small></div>`).join('')}</div><h3>WINNING GUESSES</h3><div class="distribution">${stats.distribution.map((count, index) => `<div><span>${index + 1}</span><span class="bar" style="width:${Math.max(7, count / maximum * 90)}%">${count}</span></div>`).join('')}</div><h3>FREEPLAY</h3><p>${free.wins} phrases solved across ${free.played} completed rounds. Skipped rounds do not count against you.</p><p class="settings-note">Daily streaks use UTC dates. Records belong to this browser; clearing site data removes them. The latest 1,000 completed rounds are retained.</p>`, 'ODD WORDS / STATISTICS');
}

async function share() {
  const round = currentRound();
  const label = mode === 'daily' ? daily.date : 'FREEPLAY';
  const url = new URL('./', document.baseURI).href;
  const text = shareText(round, currentPhrase(), label) + '\n\n' + url;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    message = 'Result copied. No answer spoilers.'; messageError = false; render();
  } catch {
    openModal('Copy result', '<p>Clipboard access is unavailable here. Select and copy the result below.</p><textarea id="share-copy" readonly aria-label="Shareable game result"></textarea>', 'ODD WORDS / SHARE');
    $('#share-copy').value = text; $('#share-copy').focus(); $('#share-copy').select();
  }
}

function tick() {
  if (!ready) return;
  const now = new Date();
  if (dateKey(now) !== daily.date) {
    daily = dailyPuzzle(phrases, schedule, now);
    dailyRound = createRound(daily.key, daily.phrase);
    if (mode === 'daily') {
      clearTimeout(timer); clearTimeout(celebrationTimer); stopConfetti();
      revealing = false; celebrating = ''; message = 'The daily puzzle has refreshed.'; messageError = false;
    }
    sideSignature = ''; persist(); render();
  }
  $('#countdown').textContent = untilMidnight(now);
  document.querySelectorAll('.countdown').forEach((element) => { element.textContent = untilMidnight(now); });
}

function toggleSound() {
  settings.sound = !settings.sound;
  if (!settings.sound) stopSounds();
  persist(); applySettings();
  if (settings.sound) playSound('submit', true);
}

function resetLocalState(notice) {
  clearTimeout(timer); clearTimeout(celebrationTimer); stopConfetti(); stopSounds();
  revealing = false; celebrating = ''; mode = 'daily';
  history = []; bag = []; freeRound = undefined;
  settings = { sound: false, symbols: true, reducedMotion: false };
  daily = dailyPuzzle(phrases, schedule);
  dailyRound = createRound(daily.key, daily.phrase);
  message = notice; messageError = false; sideSignature = ''; keyboardSignature = '';
  render();
  $('#save-state').textContent = 'Saved data cleared';
}

function confirmClearData() {
  openModal('Clear saved data?', '<p>This deletes your daily and freeplay progress, statistics and settings from this browser. It cannot be undone. New activity will be saved again. Hosting logs are not affected.</p><div class="modal-buttons"><button class="outline-button" data-action="close">Cancel</button><button class="submit-button" data-action="confirm-clear">Clear saved data</button></div>', 'ODD WORDS / PRIVACY');
}

// Prevent the focused native input from losing the phone keyboard when an
// editing control is tapped. These buttons still receive their click event.
document.addEventListener('pointerdown', (event) => {
  if (nativeMedia.matches && document.activeElement === $('#native-input') && event.target.closest('.entry-controls button, [data-index]')) event.preventDefault();
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.index !== undefined && ready && !revealing) {
    setRound(editRound(currentRound(), { type: 'cursor', index: Number(button.dataset.index) }));
    message = ''; messageError = false; persist(); render(true); return;
  }
  if (button.dataset.key) { handleKey(button.dataset.key); return; }
  if (button.dataset.mode) { switchMode(button.dataset.mode); return; }
  const action = button.dataset.action;
  if (action === 'reload') { location.reload(); return; }
  if (action === 'close') { $('#modal').close(); return; }
  if (action === 'help') { showHelp(); return; }
  if (!ready) return;
  if (action === 'type') focusNativeInput();
  if (action === 'sound') toggleSound();
  if (action === 'clear-data') confirmClearData();
  if (action === 'confirm-clear') {
    if (clearSave(storage)) {
      $('#modal').close();
      resetLocalState('Saved data cleared. New activity will be saved on this device.');
    } else openModal('Storage unavailable', '<p>Your browser blocked access to saved data. Use your browser settings to clear this site&#39;s data.</p>');
  }
  if (action === 'settings') showSettings();
  if (action === 'stats') showStats();
  if (action === 'share') share();
  if (action === 'freeplay') switchMode('freeplay');
  if (action === 'next') nextPhrase();
  if (action === 'skip' && !revealing && mode === 'freeplay' && freeRound.status === 'playing') {
    openModal('Reveal this phrase?', '<p>This ends the current freeplay round and shows its meaning. It will not count as a loss. Your daily puzzle stays untouched.</p><div class="modal-buttons"><button class="outline-button" data-action="close">KEEP GUESSING</button><button class="submit-button" data-action="confirm-skip"><span>REVEAL PHRASE</span><span>&rarr;</span></button></div>', 'ODD WORDS / FREEPLAY');
  }
  if (action === 'confirm-skip' && mode === 'freeplay' && freeRound.status === 'playing') {
    $('#modal').close(); freeRound = { ...freeRound, status: 'skipped' };
    message = ''; messageError = false; persist(); render();
    $('#result').scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'nearest' });
  }
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || $('#modal').open) return;
  if (event.key === '?') { event.preventDefault(); showHelp(); return; }
  if (!ready || revealing || currentRound().status !== 'playing') return;
  if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  const interactive = event.target.closest('button,a');
  if (interactive && !interactive.hasAttribute('data-index') && ['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  if (/^[a-z]$/i.test(event.key) || ['Enter', ' ', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); handleKey(event.key);
  }
});

document.addEventListener('paste', (event) => {
  if (!ready || revealing || $('#modal').open || currentRound().status !== 'playing') return;
  if (event.target.closest('input,textarea,select,[contenteditable="true"]') && event.target.id !== 'native-input') return;
  const text = event.clipboardData?.getData('text/plain');
  if (!text) return;
  event.preventDefault();
  const result = pasteRound(currentRound(), text, currentPhrase());
  setRound(result.round); message = result.error || ''; messageError = Boolean(result.error);
  persist(); render(true);
});

document.addEventListener('change', (event) => {
  const key = event.target.dataset.setting;
  if (key && Object.hasOwn(settings, key)) {
    settings[key] = event.target.checked;
    persist(); applySettings();
    if (key === 'sound') {
      if (settings.sound) playSound('submit', true);
      else stopSounds();
    }
    if (ready) renderBoard();
  }
});

$('#modal').addEventListener('click', (event) => {
  if (event.target !== $('#modal')) return;
  const rect = $('#modal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#modal').close();
});
$('#modal').addEventListener('close', () => {
  if (modalTrigger?.isConnected && modalTrigger !== document.body) modalTrigger.focus({ preventScroll: true });
  else if (ready) $('#game').focus({ preventScroll: true });
});

bindNativeInput($('#native-input'), {
  canEdit: () => ready && nativeMedia.matches && !revealing && !$('#modal').open && currentRound().status === 'playing',
  onKey: handleKey,
  onText: (keys) => {
    for (const key of keys) {
      const last = currentRound().cursor === currentRound().draft.length - 1;
      handleKey(key);
      if (last && /^[a-z]$/i.test(key)) break;
    }
  },
});
$('#board').addEventListener('scroll', syncInputPosition, { passive: true });
media.addEventListener('change', applySettings);
nativeMedia.addEventListener('change', () => { if (ready) render(); });
let resizeTimer;
let viewportBaseline = window.visualViewport?.height ?? window.innerHeight;
let keyboardOpen = false;
function updateViewport() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  viewportBaseline = Math.max(viewportBaseline, height);
  document.documentElement.style.setProperty('--viewport-height', `${height}px`);
  const open = nativeMedia.matches && document.activeElement === $('#native-input') && height < viewportBaseline - 120;
  document.body.classList.toggle('keyboard-open', open);
  if (ready && nativeMedia.matches) {
    scrollSelectedTile(); syncInputPosition();
    if (open && !keyboardOpen) $('#game').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  keyboardOpen = open;
}
window.addEventListener('resize', () => {
  updateViewport(); clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => { if (ready) { renderBoard(); renderKeyboard(); } }, 80);
});
window.visualViewport?.addEventListener('resize', updateViewport);
$('#native-input').addEventListener('blur', () => { document.body.classList.remove('keyboard-open'); keyboardOpen = false; });
window.addEventListener('storage', (event) => {
  if (ready && event.storageArea === storage && (event.key === STORAGE_KEY || event.key === null) && event.newValue === null) {
    if ($('#modal').open) $('#modal').close();
    resetLocalState('Saved data was cleared in another tab.');
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); else stopSounds(); });
updateViewport();
initialize();
