# Content and editorial policy

## Phrase schema

`src/data/phrases.json` contains exactly 100 objects:

```json
{
  "id": "a-damp-squib",
  "text": "a damp squib",
  "meaning": "Something that disappoints after promising to be exciting.",
  "sourceUrl": "https://dictionary.cambridge.org/dictionary/english/damp-squib"
}
```

`id` must be unique and stable. `text` must contain lowercase English letters
and single spaces only. Do not insert apostrophes, hyphens, numerals or accented
letters: punctuation needs its own explicit game rules before it is supported.

Keep a mix of familiar and less familiar established expressions. Obscure
vocabulary can provide the discovery, but arbitrary invented sentences are
not the editorial goal. Use short original explanations; do not paste
copyrighted dictionary articles or invent an expression's origin.

References are provided for further reading. Most inherited entries use a
Wiktionary search URL; a search URL is not a claim that its exact target page
or historical origin has been checked. No origin claims are included.

The full collection was checked for unique text/IDs, syntax, definitions,
HTTPS references, and dictionary coverage. It has not been independently
lexicographically reviewed or difficulty-calibrated with players.

## Daily scheduling

`daily-schedule.json` stores a start date and 100 explicit phrase IDs. The
selection uses elapsed UTC days, modulo the schedule length. A shared data
version and accurate device clock are assumed. The rotation repeats every
100 days. It is deliberately local, not a live editorial service.

Reordering `phrases.json` is safe. Renaming/removing an ID used by the schedule
is not. Changing the schedule's start date, length or order changes date
assignments. Freeze this file during a public playtest. A future production
version should use an explicit append-only date schedule and server-authoritative
answers if tamper resistance matters.

## Dictionary policy

`public/dictionary/english.txt` is ready to use and contains 112,795 entries
in this release. It is generated locally from the included SCOWL/Hunspell
US English roots and affix rules, with selected British variants and reviewed
answer vocabulary added. It is not an exhaustive dictionary of every dialect.

The generator removes non-alphabetic entries, capitalized proper names,
compound-only roots and entries carrying the source's NOSUGGEST flag. The
result still reflects the broad vocabulary and occasional abbreviations of
a spellchecker dictionary. It is not a guaranteed family-safety filter.

A and I are accepted. Inflected forms are expanded using the bundled source
rules. Complete guesses do not need to be meaningful phrases; every submitted
word does need to be accepted. Repeated letters are scored globally across
the phrase, not separately for each word.

Add editorial exceptions to `src/data/custom-words.txt`, one lowercase word
per line. Every answer word is automatically included when rebuilding, so
review phrase spelling carefully rather than relying on that inclusion to
prove that an entry is a legitimate word.

```powershell
npm.cmd run dictionary
npm.cmd run verify
```

The builder uses only Node built-ins. It is a targeted implementation for the
bundled English affix file, not a general implementation of every Hunspell
feature. Do not substitute an arbitrary language dictionary without adapting
and testing the expansion rules. Retain the accompanying third-party notices.
