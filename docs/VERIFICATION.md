# Verification record

Release **1.2.0**, checked on **27 October 2026**.

## Executed successfully

- `npm ci` with the included zero-dependency npm lockfile.
- JavaScript syntax and relative import checks.
- Exactly 100 unique phrases, 100 scheduled IDs, definitions, HTTPS references
  and dictionary coverage of every answer word; 112,795 accepted words.
- **143 Node tests**, including all 80 original tests plus native input,
  composition, deletion, privacy contact escaping, palette contrast, optional
  audio, privacy-page serving and response headers.
- A fresh production build including the privacy page, data and dictionary.
- **92 Chromium interaction checks**, including desktop and emulated phone
  typing, selection, deletion, word boundaries, incomplete/invalid guesses,
  valid wrong guesses, win/loss, results, dialog focus, clear-data confirmations,
  privacy, device-keyboard-sized viewports, landscape touch behavior and audio
  opt-in, the single mobile menu, distinct word capsules, collapsed/expanded
  earlier guesses and one-shot letter motion. See `browser-check-results.json`
  for individual assertions.
- **All 100 phrases at 280px, 320px and 393px widths**, checked for document/board
  horizontal overflow and selected-cell visibility with the new word capsules. Each collection traversal
  visited 100 distinct phrases. See `layout-check-320.json` and
  `layout-check-393.json`.
- Screenshots of the desktop, compact mobile, long-word 320px, privacy,
  result and keyboard-sized viewport layouts were generated; the mobile and
  long-word layouts were visually inspected.
- No unhandled application JavaScript errors in those browser checks. Browser
  requests during those checks were limited to the supplied application files.

## Exact boundaries

Node 22.16.0 and Chromium were available in the build environment. Browser
enterprise policy blocked URL navigation, including localhost. The browser
checks therefore use `page.set_content`, a local base URL and Playwright routes
that serve the actual, unmodified application modules, styles and data from
this repository. No game rules or rendering implementation are substituted.
A small in-memory Storage adapter substitutes for native localStorage because
an about:blank document has no normal site origin.

This verifies UI behavior under that transport, not native persistent browser
storage or a complete browser-to-host network path. Real HTTP serving and
subpath routes are covered separately by Node's integration tests. Storage
restoration/validation is also covered by the original Node tests.

Mobile viewport and touch emulation **do not display a real iOS or Android
keyboard**. Input, beforeinput, composition and key events were exercised, and
a reduced visual viewport was tested. Physical phone/OS keyboard behavior,
autocorrection edge cases, Safari, Firefox, assistive technology and actual
browser storage should still be checked on devices. Contrast tests cover the
specified palette combinations; they are not a full WCAG audit.

The game does not run a canvas particle animation or continuous animation
frames. Letter/feedback/result CSS animations are finite and respect reduced
motion preferences. The motion budget was checked by source assertions and
Chromium interaction tests, not by a physical-device power profiler.

Audio tests verify that audio is opt-in, browser audio contexts/oscillators are
created after enabling it, and unsupported audio does not break the game.
The sounds were not evaluated by listening in this environment.

A user's Vercel project, live site and remote GitHub Actions were not accessed.
The configuration/build are included, but no live deployment is claimed.

## Reproduce Node checks

```sh
npm ci
npm run verify
```

Use `npm.cmd` on Windows PowerShell when needed.

## Optional browser regression harness

Python and Playwright are needed **only** for these checks, not for the game.
From the project root:

```sh
python -m pip install -r qa/requirements.txt
python -m playwright install chromium
python qa/browser_interactions.py
python qa/phrase_layout.py 280
python qa/phrase_layout.py 320
python qa/phrase_layout.py 393
```

The harness intentionally uses the file transport and simulated storage
described above. It produces the JSON verification files and screenshots in
`docs/`. It uses an installed `chromium` binary when available, otherwise the
Playwright-installed browser; `CHROMIUM_EXECUTABLE` can specify a binary.

## Physical-device and deployment checklist

On the actual HTTPS deployment, check that the Menu gives access to Settings,
Statistics, Help and freeplay reveal, and that the Earlier guesses toggle can
expand/collapse old feedback. Check that tapping a tile opens the phone
keyboard; typing advances once, backspace works, selecting another word keeps
the keyboard open, and Submit remains reachable. Test rotation, keyboard
show/hide, paste and a long phrase. Confirm the virtual game keyboard stays
hidden on the phone and remains available on desktop.

Check sound levels with the mute control, refresh to verify real saved-game
recovery, and clear saved data while another game tab is open. Verify the
privacy/contact details without JavaScript. Inspect Network and Storage for
host-added integrations, cookies or unexpected external requests. Confirm
Vercel's actual logging settings and retention before finalizing the notice.
