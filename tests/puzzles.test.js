import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dailyPuzzle, drawFreeplay, untilMidnight, dateKey } from '../src/lib/puzzles.js';
import { parseDictionary } from '../src/lib/dictionary.js';
const phrases = JSON.parse(await readFile(new URL('../src/data/phrases.json', import.meta.url), 'utf8'));
const schedule = JSON.parse(await readFile(new URL('../src/data/daily-schedule.json', import.meta.url), 'utf8'));
const dictionary = parseDictionary(await readFile(new URL('../public/dictionary/english.txt', import.meta.url), 'utf8'));

describe('release data and dictionary', () => {
  it('contains exactly 100 different phrases', () => { assert.equal(phrases.length, 100); assert.equal(new Set(phrases.map((p) => p.id)).size, 100); assert.equal(new Set(phrases.map((p) => p.text)).size, 100); });
  it('has a meaning and HTTPS reference for every phrase', () => phrases.forEach((p) => { assert.ok(p.meaning.length > 15); assert.equal(new URL(p.sourceUrl).protocol, 'https:'); }));
  it('accepts every word in every answer', () => phrases.forEach((p) => p.text.split(' ').forEach((word) => assert.ok(dictionary.has(word), word))));
  it('includes single-letter and selected British words', () => ['a','i','colour','colours','centre','theatre','milk','squid','warm'].forEach((word) => assert.ok(dictionary.has(word), word)));
  it('does not accept arbitrary invented words', () => ['tras','bolk','qzxq','zzzz'].forEach((word) => assert.equal(dictionary.has(word), false, word)));
  it('accepts Windows and Unix dictionary line endings', () => assert.deepEqual([...parseDictionary('milk\r\nis\nwarm\r\n')], ['milk', 'is', 'warm']));
  it('normalizes case, whitespace and duplicate dictionary entries', () => assert.deepEqual([...parseDictionary(' MILK \nmilk\nIs\n')], ['milk', 'is']));
  it('excludes comments, punctuation, digits and blank lines', () => assert.deepEqual([...parseDictionary("\n# comment\ncan't\nabc1\na\ni\n")], ['a', 'i']));
});

describe('shared daily schedule', () => {
  it('uses the first scheduled phrase at the epoch', () => assert.equal(dailyPuzzle(phrases, schedule, new Date('2026-10-27T00:00:00Z')).phrase.id, schedule.phraseIds[0]));
  it('does not change during the same UTC day', () => assert.equal(dailyPuzzle(phrases, schedule, new Date('2026-10-27T00:00:00Z')).key, dailyPuzzle(phrases, schedule, new Date('2026-10-27T23:59:59Z')).key));
  it('changes at UTC midnight', () => assert.notEqual(dailyPuzzle(phrases, schedule, new Date('2026-10-27T23:59:59Z')).phrase.id, dailyPuzzle(phrases, schedule, new Date('2026-10-28T00:00:00Z')).phrase.id));
  it('gives equivalent timezone representations the same puzzle', () => assert.equal(dailyPuzzle(phrases, schedule, new Date('2026-10-28T01:30:00+02:00')).key, dailyPuzzle(phrases, schedule, new Date('2026-10-27T23:30:00Z')).key));
  it('does not remap the schedule when phrases.json is reordered', () => assert.equal(dailyPuzzle([...phrases].reverse(), schedule, new Date('2026-10-29Z')).phrase.id, dailyPuzzle(phrases, schedule, new Date('2026-10-29Z')).phrase.id));
  it('cycles after 100 days', () => { const start = new Date('2026-10-27Z'); const later = new Date(start.getTime() + 100 * 86400000); assert.equal(dailyPuzzle(phrases, schedule, start).phrase.id, dailyPuzzle(phrases, schedule, later).phrase.id); });
  it('handles dates before the epoch', () => assert.equal(dailyPuzzle(phrases, schedule, new Date('2026-10-26Z')).phrase.id, schedule.phraseIds.at(-1)));
  it('rejects invalid dates', () => assert.throws(() => dateKey(new Date('bad'))));
  it('shows a correct midnight countdown', () => { assert.equal(untilMidnight(new Date('2026-10-27T23:59:59Z')), '00:00:01'); assert.equal(untilMidnight(new Date('2026-10-27T12:30:00Z')), '11:30:00'); });
});

describe('freeplay shuffle bag', () => {
  it('excludes the daily and previous phrase', () => { const excluded = [phrases[0].id, phrases[1].id]; const r = drawFreeplay(phrases, [], excluded, () => .5); assert.ok(!excluded.includes(r.phrase.id)); assert.ok(r.bag.every((id) => !excluded.includes(id))); });
  it('draws all eligible phrases without repeating before refill', () => { let bag = []; let previous; const seen = new Set(); for (let i = 0; i < 99; i++) { const result = drawFreeplay(phrases, bag, [phrases[0].id, previous], () => .3); assert.ok(!seen.has(result.phrase.id)); seen.add(result.phrase.id); previous = result.phrase.id; bag = result.bag; } assert.equal(seen.size, 99); });
  it('removes obsolete and duplicate saved bag entries', () => { const r = drawFreeplay(phrases, ['missing', phrases[2].id, phrases[2].id, phrases[3].id], [], () => .5); assert.equal(r.phrase.id, phrases[3].id); assert.deepEqual(r.bag, [phrases[2].id]); });
  it('fails clearly if every phrase is excluded', () => assert.throws(() => drawFreeplay(phrases, [], phrases.map((p) => p.id))));
  it('guards against invalid random sources', () => assert.throws(() => drawFreeplay(phrases, [], [], () => 1)));
});
