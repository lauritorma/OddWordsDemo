import { MAX_GUESSES, createRound, editRound, pasteRound, submitRound, restoreRound, scoreGuess, shapeOf, lettersOf, keyboardFeedback, shareText } from './lib/game.js';
import { dailyPuzzle, drawFreeplay, untilMidnight, dateKey } from './lib/puzzles.js';
import { parseDictionary } from './lib/dictionary.js';
import { readSave, writeSave, cleanHistory, recordResult, statistics } from './lib/storage.js';
import { playSound, confetti } from './lib/effects.js';

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const pad = (value) => String(value).padStart(2, '0');
const marks = { correct: '+', present: '~', absent: '-' };
const descriptions = { correct: 'correct position', present: 'elsewhere in the phrase', absent: 'no matching copy left' };
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    $('#loading').innerHTML = `The vault could not open.<br><br><small>${escape(error.message)}</small><br><br><button class="outline-button" data-action="reload">TRY AGAIN</button>`;
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
  $('#save-state').innerHTML = saved ? '<span class="save-dot"></span> SAVED ON THIS DEVICE' : 'SESSION ONLY / STORAGE UNAVAILABLE';
}

function applySettings() {
  document.body.classList.toggle('no-symbols', !settings.symbols);
  document.body.classList.toggle('reduced-motion', reduced());
  if (reduced()) stopConfetti();
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
  $('#edition').textContent = mode === 'daily' ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(daily.date + 'T00:00:00Z')).toUpperCase() : '100 PHRASES / NO TIME LIMIT';
  $('#puzzle-mode').textContent = mode === 'daily' ? 'DAILY CHALLENGE' : 'FREEPLAY / RANDOM DRAW';
  $('#puzzle-label').textContent = mode === 'daily' ? `PUZZLE ${String(Math.max(1, daily.number)).padStart(3, '0')}` : 'THE PHRASE VAULT';
  $('#attempt-label').textContent = round.status === 'won' && !revealing ? `SOLVED ${pad(round.guesses.length)} / 06` : round.status !== 'playing' && !revealing ? 'ROUND COMPLETE' : `ATTEMPT ${pad(Math.min(round.guesses.length + (revealing ? 0 : 1), 6))} / 06`;
  $('#attempt-pips').innerHTML = Array.from({ length: MAX_GUESSES }, (_, i) => `<span class="pip ${round.status === 'won' && !revealing ? 'won' : round.status === 'lost' && !revealing ? 'lost' : i < round.guesses.length ? 'used' : i === round.guesses.length ? 'current' : ''}"></span>`).join('');
  $('#word-pattern').textContent = shape.join(' / ');
  $('#phrase-size').textContent = `${shape.length} WORDS / ${round.draft.length} LETTERS`;
  $('#daily-clock').hidden = mode !== 'daily'; $('#freeplay-note').hidden = mode !== 'freeplay';
  $('[data-action="skip"]').disabled = revealing;
  document.querySelectorAll('.entry-controls button').forEach((button) => { button.disabled = revealing || round.status !== 'playing'; });
  renderBoard(focus); renderKeyboard(); renderSide();
  const fallback = revealing ? 'Reading the letters...' : round.status === 'won' ? `Phrase unlocked in ${round.guesses.length} ${round.guesses.length === 1 ? 'guess' : 'guesses'}. Nicely done.` : round.status === 'lost' ? 'Six shots used. A new expression discovered.' : round.status === 'skipped' ? 'Phrase revealed. There is always another one.' : round.guesses.length ? 'New row. Keep the word lengths. Follow the colours.' : 'Type a word into each group of tiles.';
  $('#message').textContent = message || fallback;
  $('#message').className = `message${messageError ? ' error' : round.status === 'won' && !revealing ? ' success' : ''}`;
}

function renderBoard(focus = false) {
  const round = currentRound(), phrase = currentPhrase(), shape = shapeOf(phrase.text);
  const board = $('#board');
  const mobile = window.innerWidth <= 720;
  const available = board.clientWidth - (mobile ? 26 + 23 : window.innerWidth <= 950 ? 26 + 31 : 40 + 31);
  const gaps = (round.draft.length - shape.length) * 3 + (shape.length - 1) * (mobile ? 10 : 12);
  const fit = Math.floor((available - gaps) / round.draft.length);
  const compact = mobile && fit < 24;
  const longest = Math.max(...shape);
  const maximumWordTile = Math.floor((available - (longest - 1) * 3) / longest);
  const tile = Math.min(maximumWordTile, fit >= 24 ? Math.min(mobile ? 38 : 42, fit) : (mobile ? 28 : 36));
  board.classList.toggle('compact-board', compact);
  board.setAttribute('aria-label', compact ? 'Phrase guesses. Scroll within the board to review earlier guesses.' : 'Phrase guesses');
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
      const tiles = Array.from({ length }, (_, position) => {
        const index = offset + position, letter = letters[index], mark = feedback[index];
        const className = `tile ${mark ?? ''}${active && letter ? ' filled' : ''}${active && index === round.cursor ? ' cursor' : ''}`;
        const label = `Word ${word + 1}, letter ${position + 1}: ${letter || 'empty'}${mark ? ', ' + descriptions[mark] : ''}`;
        const content = `<span aria-hidden="true">${escape(letter)}</span>${mark ? `<span class="tile-mark" aria-hidden="true">${marks[mark]}</span>` : ''}`;
        return active ? `<button class="${className}" data-index="${index}" tabindex="${index === round.cursor ? '0' : '-1'}" aria-label="${label}" type="button">${content}</button>` : `<span class="${className}" style="--i:${index}" ${guess ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${content}</span>`;
      }).join('');
      offset += length;
      return `<div class="word-group">${tiles}</div>`;
    }).join('');
    return `<div class="guess-row ${active ? 'active' : guess ? 'submitted' : 'future'}${reveal ? ' revealing' : ''}${celebrate ? ' celebrate' : ''}" role="group" aria-label="Guess ${attempt + 1}${guess ? ': ' + escape(guess) : active ? ', current entry' : ', empty'}"><span class="row-number" aria-hidden="true">${pad(attempt + 1)}</span><div class="word-groups">${words}</div></div>`;
  }).join('');
  if (compact && focus) {
    const active = board.querySelector('.guess-row.active') ?? board.querySelector('.guess-row.submitted:last-of-type');
    if (active) {
      const bottom = active.offsetTop + active.offsetHeight;
      if (bottom > board.scrollTop + board.clientHeight - 10) board.scrollTop = bottom - board.clientHeight + 10;
      else if (active.offsetTop < board.scrollTop) board.scrollTop = Math.max(0, active.offsetTop - 10);
    }
  }
  if (focus && !$('#modal').open) board.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
}

function renderKeyboard() {
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
  $('#result').innerHTML = `<div class="panel-label"><span>FIELD NOTES / UNLOCKED</span><span>${mode === 'daily' ? 'DAILY' : 'FREEPLAY'}</span></div><div class="result-badge" aria-hidden="true">${won ? '+' : '?'}</div><div class="result-label">${won ? 'PHRASE COMPLETE' : skipped ? 'CURIOSITY WINS' : 'A GOOD ONE TO KNOW'}</div><h2>${won ? 'You cracked it.' : skipped ? 'Mystery solved.' : 'Not this time.'}</h2><p class="micro">${won ? `SOLVED IN ${round.guesses.length} OF 6 GUESSES` : skipped ? 'REVEALED / NOT SCORED' : 'THE ANSWER WAS'}</p><hr class="result-divider"><p class="result-phrase">${escape(phrase.text)}</p><p class="result-definition">${escape(phrase.meaning)}</p><a class="result-source" href="${escape(phrase.sourceUrl)}" target="_blank" rel="noopener noreferrer">EXPLORE THE EXPRESSION &nearr;</a>${!skipped ? '<button class="outline-button full" data-action="share">COPY YOUR RESULT <span aria-hidden="true">+</span></button>' : ''}<button class="submit-button full" data-action="${mode === 'daily' ? 'freeplay' : 'next'}"><span>${mode === 'daily' ? 'KEEP PLAYING / FREEPLAY' : 'NEXT RANDOM PHRASE'}</span><span aria-hidden="true">&rarr;</span></button><p class="result-foot">${mode === 'daily' ? 'NEXT DAILY PUZZLE IN <span class="countdown">' + untilMidnight() + '</span>' : 'New round. Fresh letters. No pressure.'}</p>`;
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
  persist(); render(true);
}

function submit() {
  const result = submitRound(currentRound(), currentPhrase(), dictionary);
  setRound(result.round);
  if (result.error) {
    message = result.error; messageError = true; persist(); render(true); return;
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
    } else render(true);
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

function openModal(title, content, eyebrow = 'ODD WORDS / FIELD MANUAL') {
  $('#modal').innerHTML = `<div class="modal-inner"><div class="modal-top"><div><div class="eyebrow">${eyebrow}</div><h2 id="modal-title" tabindex="-1">${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close dialog">&#215;</button></div>${content}</div>`;
  if (!$('#modal').open) $('#modal').showModal();
  $('#modal-title').focus({ preventScroll: true });
}

function showHelp() {
  const example = ['S', 'I', 'L', 'K', ' ', 'I', 'F', ' ', 'C', 'O', 'R', 'N'];
  const feedback = scoreGuess('silk if corn', 'milk is warm'); let i = 0;
  const tiles = example.map((letter) => letter === ' ' ? '<span class="word-gap"></span>' : `<span class="example-tile ${feedback[i++]}" aria-hidden="true">${letter}</span>`).join('');
  openModal('Real words. Odd guesses.', `<p>Uncover an English phrase in <strong>six valid guesses</strong>. The spaces give you the word lengths.</p><ol class="rules-list"><li><strong>Every word must be in the dictionary.</strong> The whole guess does not have to make sense. Invalid entries never cost an attempt.</li><li><strong>Green:</strong> the letter is in the correct tile. <strong>Yellow:</strong> it appears elsewhere, including in another word. <strong>Gray:</strong> no matching copy remains.</li><li><strong>Duplicates are counted.</strong> Greens are assigned first. Extra copies can turn gray even when another copy is green.</li></ol><h3>AN EXAMPLE, NOT TODAY'S ANSWER</h3><p>For the answer <strong>MILK IS WARM</strong>, try <strong>SILK IF CORN</strong>:</p><div class="modal-example" aria-label="S yellow, I L K green, I green, F gray, C O gray, R green, N gray">${tiles}</div><p>The S is yellow because it belongs in a different word.</p><h3>YOUR CONTROLS</h3><p>Type or tap the on-screen keys. Enter submits; arrows move; Backspace deletes. Tap any active tile to replace it. Space jumps to the next word. Paste a complete phrase with matching word lengths.</p><h3>TWO WAYS TO PLAY</h3><p><strong>Daily:</strong> the same puzzle for everyone, changing at 00:00 UTC. <strong>Freeplay:</strong> random phrases, as many rounds as you like. Both save separately on this browser.</p><p class="settings-note">Dictionary policy: mostly US English, plus selected UK spellings and the answer vocabulary. Some rare or regional words may be missing. Answers use letters and spaces only.</p>`);
}

function showSettings() {
  openModal('Make yourself at home.', `<label class="setting-row"><span><strong>Arcade audio</strong><small>Soft key sounds and a small victory fanfare.</small></span><input type="checkbox" data-setting="sound" ${settings.sound ? 'checked' : ''}></label><label class="setting-row"><span><strong>Feedback symbols</strong><small>+ correct, ~ elsewhere, - no match. More than colour.</small></span><input type="checkbox" data-setting="symbols" ${settings.symbols ? 'checked' : ''}></label><label class="setting-row"><span><strong>Reduce motion</strong><small>Skip tile flips, victory waves and confetti. Your system preference is always respected.</small></span><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? 'checked' : ''}></label><p class="settings-note">Saved on this device. No account, tracking scripts or external services. The reference link after a round opens a separate website only when you select it.</p>`, 'ODD WORDS / SETTINGS');
}

function showStats() {
  const stats = statistics(history), free = statistics(history, new Date(), 'free');
  const maximum = Math.max(1, ...stats.distribution);
  openModal('Your record.', `<h3>DAILY CHALLENGE</h3><div class="stats-grid">${[[stats.played, 'PLAYED'], [stats.rate + '%', 'WIN RATE'], [stats.streak, 'STREAK'], [stats.best, 'BEST STREAK']].map(([value, label]) => `<div class="stat"><strong>${value}</strong><small>${label}</small></div>`).join('')}</div><h3>WINNING GUESSES</h3><div class="distribution">${stats.distribution.map((count, index) => `<div><span>${index + 1}</span><span class="bar" style="width:${Math.max(7, count / maximum * 90)}%">${count}</span></div>`).join('')}</div><h3>FREEPLAY</h3><p>${free.wins} phrases solved across ${free.played} completed rounds. Skipped rounds do not count against you.</p><p class="settings-note">Daily streaks use UTC dates. Records belong to this browser; clearing site data removes them. The latest 1,000 completed rounds are retained.</p>`, 'ODD WORDS / PERSONAL BEST');
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
    openModal('Take your result with you.', '<p>Clipboard access is unavailable here. Select and copy the result below.</p><textarea id="share-copy" readonly aria-label="Shareable game result"></textarea>', 'ODD WORDS / SHARE');
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
      revealing = false; celebrating = ''; message = 'A new day, a new phrase. The daily puzzle has refreshed.'; messageError = false;
    }
    sideSignature = ''; persist(); render();
  }
  $('#countdown').textContent = untilMidnight(now);
  document.querySelectorAll('.countdown').forEach((element) => { element.textContent = untilMidnight(now); });
}

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
    if (key === 'sound' && settings.sound) playSound('submit', true);
  }
});

$('#modal').addEventListener('click', (event) => {
  if (event.target !== $('#modal')) return;
  const rect = $('#modal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#modal').close();
});
media.addEventListener('change', applySettings);
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { if (ready) renderBoard(); }, 80); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
initialize();
