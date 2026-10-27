/** Expand the included SCOWL/Hunspell source. No downloads, native tools or Python. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
export async function buildDictionary() {
  const affixText = await readFile(new URL('vendor/scowl/en_US.aff', root), 'utf8');
  const dictionaryText = await readFile(new URL('vendor/scowl/en_US.dic', root), 'utf8');
  const rules = new Map();
  for (const line of affixText.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (!['PFX', 'SFX'].includes(parts[0])) continue;
    const [kind, flag] = parts;
    if (parts.length === 4) rules.set(kind + flag, { kind, cross: parts[2] === 'Y', items: [] });
    else if (parts.length >= 5) {
      rules.get(kind + flag)?.items.push({
        strip: parts[2] === '0' ? '' : parts[2],
        add: parts[3] === '0' ? '' : parts[3].split('/')[0],
        condition: new RegExp(kind === 'PFX' ? '^' + parts[4] : parts[4] + '$'),
      });
    }
  }
  function apply(word, rule) {
    return rule.items.flatMap(({ strip, add, condition }) => {
      if (!condition.test(word)) return [];
      if (rule.kind === 'PFX') return word.startsWith(strip) ? [add + word.slice(strip.length)] : [];
      return word.endsWith(strip) ? [word.slice(0, strip ? -strip.length : undefined) + add] : [];
    });
  }
  const words = new Set(['a', 'i']);
  const add = (word) => { if (/^[a-z]{2,}$/.test(word)) words.add(word); };
  for (const entry of dictionaryText.split(/\r?\n/).slice(1)) {
    const [base, flags = ''] = entry.trim().split('/');
    // Exclude proper names, punctuation, compound-only entries and NOSUGGEST words.
    if (!/^[a-z]+$/.test(base) || flags.includes('!') || flags.includes('c')) continue;
    add(base);
    const prefixes = [...flags].map((flag) => rules.get('PFX' + flag)).filter(Boolean);
    const suffixes = [...flags].map((flag) => rules.get('SFX' + flag)).filter(Boolean);
    for (const rule of [...prefixes, ...suffixes]) apply(base, rule).forEach(add);
    for (const prefix of prefixes.filter((r) => r.cross)) {
      for (const prefixed of apply(base, prefix)) {
        for (const suffix of suffixes.filter((r) => r.cross)) apply(prefixed, suffix).forEach(add);
      }
    }
  }
  const extras = await readFile(new URL('src/data/custom-words.txt', root), 'utf8');
  extras.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^[a-z]+$/.test(s)).forEach((s) => words.add(s));
  const phrases = JSON.parse(await readFile(new URL('src/data/phrases.json', root), 'utf8'));
  phrases.forEach((p) => p.text.split(' ').forEach((word) => words.add(word.toLowerCase())));
  await mkdir(new URL('public/dictionary/', root), { recursive: true });
  const output = [...words].sort().join('\n') + '\n';
  await writeFile(new URL('public/dictionary/english.txt', root), output);
  console.log(`Local dictionary: ${words.size.toLocaleString('en-US')} words. No network needed.`);
  return words;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildDictionary();
