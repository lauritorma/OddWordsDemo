import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readSave, writeSave, cleanHistory, recordResult, statistics } from '../src/lib/storage.js';
const event = (date, status = 'won', guesses = 3) => ({ key: 'daily:' + date, mode: 'daily', date, status, guesses });
describe('storage and statistics', () => {
  it('returns a blank save for malformed JSON', () => assert.deepEqual(readSave({ getItem: () => '{broken' }), {}));
  it('survives inaccessible browser storage', () => { assert.deepEqual(readSave(null), {}); assert.equal(writeSave(null, {}), false); });
  it('returns false if saving exceeds browser quota', () => assert.equal(writeSave({ setItem() { throw new Error('quota'); } }, {}), false));
  it('writes a versioned save', () => { let saved; assert.equal(writeSave({ setItem(_key, value) { saved = JSON.parse(value); } }, { mode: 'daily' }), true); assert.equal(saved.version, 1); });
  it('drops invalid history entries', () => assert.deepEqual(cleanHistory([null, {}, event('2026-10-27'), { ...event('bad'), guesses: 7 }]), [event('2026-10-27')]));
  it('records a round only once, even after reload', () => { const round = { key: 'daily:2026-10-27', status: 'won', guesses: ['one'] }; const once = recordResult([], round); assert.equal(recordResult(once, round).length, 1); });
  it('does not count skipped freeplay rounds', () => assert.equal(recordResult([], { key: 'free:abc', status: 'skipped', guesses: [] }).length, 0));
  it('keeps yesterday\'s streak while today is unplayed', () => assert.equal(statistics([event('2026-10-25'), event('2026-10-26')], new Date('2026-10-27Z')).streak, 2));
  it('breaks the streak when today is lost', () => assert.equal(statistics([event('2026-10-25'), event('2026-10-26'), event('2026-10-27', 'lost', 6)], new Date('2026-10-27Z')).streak, 0));
  it('breaks the streak after a missed day', () => assert.equal(statistics([event('2026-10-24'), event('2026-10-25')], new Date('2026-10-27Z')).streak, 0));
  it('computes wins, best streak and distribution', () => { const stats = statistics([event('2026-10-25'), event('2026-10-26'), event('2026-10-27', 'lost', 6)], new Date('2026-10-27Z')); assert.equal(stats.wins, 2); assert.equal(stats.best, 2); assert.equal(stats.rate, 67); assert.equal(stats.distribution[2], 2); });
  it('keeps daily and freeplay records separate', () => { const records = [event('2026-10-27'), { ...event('2026-10-27'), key: 'free:xyz', mode: 'free' }]; assert.equal(statistics(records).played, 1); assert.equal(statistics(records, new Date(), 'free').played, 1); });
});
