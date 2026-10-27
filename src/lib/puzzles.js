export const DAY_MS = 86_400_000;
export const dateKey = (date = new Date()) => {
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date.');
  return date.toISOString().slice(0, 10);
};
export function dailyPuzzle(phrases, schedule, now = new Date()) {
  const start = Date.parse(schedule.startDate + 'T00:00:00Z');
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(start) || !schedule.phraseIds.length) throw new Error('Invalid daily schedule.');
  const day = Math.floor((now.getTime() - start) / DAY_MS);
  const index = ((day % schedule.phraseIds.length) + schedule.phraseIds.length) % schedule.phraseIds.length;
  const phrase = phrases.find((item) => item.id === schedule.phraseIds[index]);
  if (!phrase) throw new Error('Scheduled phrase is missing.');
  return { key: `daily:${dateKey(now)}`, date: dateKey(now), number: day + 1, phrase };
}
export function untilMidnight(now = new Date()) {
  const seconds = Math.max(0, Math.ceil((DAY_MS - (now.getTime() % DAY_MS)) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, '0')).join(':');
}
/** A shuffled bag: each eligible phrase is drawn once before a new cycle. */
export function drawFreeplay(phrases, bag = [], excluded = [], random = Math.random) {
  const allowed = phrases.map((p) => p.id).filter((id) => !excluded.includes(id));
  if (!allowed.length) throw new Error('No eligible freeplay phrases.');
  let remaining = [...new Set(bag)].filter((id) => allowed.includes(id));
  if (!remaining.length) {
    remaining = [...allowed];
    for (let i = remaining.length - 1; i > 0; i -= 1) {
      const value = random();
      if (!(value >= 0 && value < 1)) throw new Error('Random value must be in [0, 1).');
      const j = Math.floor(value * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
  }
  const chosenId = remaining.pop();
  const phrase = phrases.find((item) => item.id === chosenId);
  return { phrase, bag: remaining };
}
