# Third-party notices

## SCOWL / Hunspell English word data

The source files in `vendor/scowl/en_US.dic` and `vendor/scowl/en_US.aff`
were obtained from the locally available `hunspell-en-us` distribution.
Their complete accompanying copyright and license notice is retained in
[`licenses/SCOWL.txt`](licenses/SCOWL.txt).

SCOWL collective work: Copyright 2000-2011 Kevin Atkinson and the additional
contributors identified in that notice. The collection incorporates sources
with their own notices, including the following:

**Copyright (c) J Ross Beresford 1993-1999. All Rights Reserved.**

**WordNet 1.6 Copyright 1997 by Princeton University. All rights reserved.**

**Copyright 1993, Geoff Kuenning, Granada Hills, CA. All rights reserved.**

The complete notices, permission terms and disclaimers are included verbatim
in `licenses/SCOWL.txt`. These names are credits, not endorsements.

`public/dictionary/english.txt` is a **modified, generated derivative** of
those source word lists. `scripts/dictionary.mjs` expands the supplied
prefix/suffix rules, removes non-alphabetic and uppercase-name entries,
excludes compound-only and NOSUGGEST entries, and adds reviewed editorial
words. This project does not claim to supply an exhaustive or universally
authoritative dictionary. See `docs/CONTENT.md` for the acceptance policy.

The generator and this project's original application code are covered by
the root MIT license; the dictionary data keeps its original notices.

Source project: https://wordlist.aspell.net/
Historical SCOWL project: http://wordlist.sourceforge.net/

## Phrase references

`src/data/phrases.json` contains short explanatory paraphrases and reference
links. It does not reproduce dictionary articles, usage examples, or origin
essays. A phrase's `sourceUrl` is a further-reading link, sometimes a dictionary
search rather than a verified direct entry. Referenced sites are independent
and have not endorsed this project.

No external website is contacted during ordinary gameplay. References open
only when the player chooses the link after completing a round.

## Visuals, audio and fonts

The logo, icons, interface and CSS animations are original project assets.
Optional sounds are synthesized locally with Web Audio. Typography uses
system fonts; no font files, external font service, stock art, or sound files
are bundled. There are no third-party npm dependencies.
