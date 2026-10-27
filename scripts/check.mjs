import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseDictionary } from '../src/lib/dictionary.js';
const root = new URL('../', import.meta.url);
export async function checkProject() {
  const phrases = JSON.parse(await readFile(new URL('src/data/phrases.json', root), 'utf8'));
  const schedule = JSON.parse(await readFile(new URL('src/data/daily-schedule.json', root), 'utf8'));
  const words = parseDictionary(await readFile(new URL('public/dictionary/english.txt', root), 'utf8'));
  const assert = (value, message) => { if (!value) throw new Error(message); };
  assert(phrases.length === 100, 'The release must contain exactly 100 phrases.');
  assert(new Set(phrases.map((p) => p.id)).size === 100, 'Phrase IDs must be unique.');
  assert(new Set(phrases.map((p) => p.text)).size === 100, 'Phrase text must be unique.');
  assert(words.size > 50_000 && words.has('a') && words.has('i'), 'English dictionary is incomplete.');
  for (const phrase of phrases) {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(phrase.id), `Invalid ID: ${phrase.id}`);
    assert(/^[a-z]+(?: [a-z]+)*$/.test(phrase.text), `Use lowercase letters and single spaces: ${phrase.id}`);
    assert(typeof phrase.meaning === 'string' && phrase.meaning.trim().length > 15, `Missing meaning: ${phrase.id}`);
    assert(new URL(phrase.sourceUrl).protocol === 'https:', `Use HTTPS references: ${phrase.id}`);
    for (const word of phrase.text.split(' ')) assert(words.has(word), `Dictionary is missing '${word}'. Run npm run dictionary.`);
  }
  assert(schedule.version === 1 && /^\d{4}-\d{2}-\d{2}$/.test(schedule.startDate), 'Invalid schedule metadata.');
  assert(schedule.phraseIds.length === 100 && new Set(schedule.phraseIds).size === 100, 'Schedule must contain each phrase once.');
  for (const id of schedule.phraseIds) assert(phrases.some((p) => p.id === id), `Schedule references missing phrase ${id}.`);
  let count = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await walk(url);
      else if (/\.(?:mjs|js)$/.test(entry.name)) {
        const result = spawnSync(process.execPath, ['--check', fileURLToPath(url)], { encoding: 'utf8' });
        assert(result.status === 0, result.stderr || `Syntax error in ${entry.name}`);
        const code = await readFile(url, 'utf8');
        for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          if (match[1].startsWith('.')) await access(new URL(match[1], url));
        }
        count += 1;
      }
    }
  }
  for (const folder of ['src/', 'scripts/', 'tests/']) await walk(new URL(folder, root));
  await access(new URL('licenses/SCOWL.txt', root));
  console.log(`Checked ${count} JavaScript files, 100 unique phrases, 100 scheduled entries, ${words.size.toLocaleString('en-US')} dictionary words.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await checkProject(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
