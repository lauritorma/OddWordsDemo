import { DAY_MS, dateKey } from './puzzles.js';
export const STORAGE_KEY = 'odd-words:v1';
export function readSave(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    return saved?.version === 1 && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}
export function writeSave(storage, data) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1 })); return true; }
  catch { return false; }
}
/** Remove only this game's save, never other applications' storage. */
export function clearSave(storage) {
  try { storage.removeItem(STORAGE_KEY); return true; }
  catch { return false; }
}
export function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((r) => r && typeof r.key === 'string' && ['daily', 'free'].includes(r.mode) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && ['won', 'lost'].includes(r.status) && Number.isInteger(r.guesses) && r.guesses >= 1 && r.guesses <= 6).slice(-1000);
}
export function recordResult(history, round, date = dateKey()) {
  if (!['won', 'lost'].includes(round.status) || history.some((entry) => entry.key === round.key)) return history;
  return [...history, { key: round.key, mode: round.key.startsWith('daily:') ? 'daily' : 'free', date: round.key.startsWith('daily:') ? round.key.slice(6) : date, status: round.status, guesses: round.guesses.length }].slice(-1000);
}
export function statistics(history, now = new Date(), mode = 'daily') {
  const entries = history.filter((entry) => entry.mode === mode);
  const wins = entries.filter((entry) => entry.status === 'won');
  const distribution = Array(6).fill(0);
  wins.forEach((entry) => { distribution[entry.guesses - 1] += 1; });
  const wonDates = new Set(wins.map((entry) => entry.date));
  let day = Date.parse(dateKey(now) + 'T00:00:00Z');
  if (!wonDates.has(dateKey(new Date(day)))) day -= DAY_MS;
  let streak = 0;
  const lostToday = entries.some((entry) => entry.date === dateKey(now) && entry.status === 'lost');
  while (!lostToday && wonDates.has(dateKey(new Date(day)))) { streak += 1; day -= DAY_MS; }
  let best = 0, run = 0, previous = -Infinity;
  [...wonDates].sort().forEach((date) => {
    const value = Date.parse(date + 'T00:00:00Z');
    run = value - previous === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run); previous = value;
  });
  return { played: entries.length, wins: wins.length, rate: entries.length ? Math.round(wins.length / entries.length * 100) : 0, streak, best, distribution };
}
