# Changelog

## 1.2.0 - 2026-10-27

### Mobile layout

- Replace the four-button header with one accessible menu for help, stats,
  settings and the freeplay reveal action. Keep Privacy reachable in the footer.
- Remove the oversized mobile intro, streak block, rule card, secondary keyboard
  controls and future-guess placeholders from the mobile play area.
- Show the current row and most recent submitted row by default. Place earlier
  guesses behind an expandable, screen-reader-labelled button.
- Give **each word its own bordered capsule**, preserving its letter group as a
  single wrapping unit. Increase tile sizes when words can wrap, and visibly
  outline the word and tile currently being edited.
- Compact the word/letter position label and keep only Clear, Submit guess and
  an optional native-keyboard shortcut in the phone interface.
- Retain the full desktop interface and original game rules, phrase data,
  dictionary, daily schedule, saves, privacy notice and optional sound.

### One-shot animation

- Add a brief letter pop, tiny validation nudge and a three-star victory flourish.
- Keep existing short reveal and celebration effects, respect the Reduce motion
  setting and system preference, and remove the canvas particle loop entirely.
- Skip the once-per-second countdown update while the browser tab is hidden.

### Verification

- Add compact-mobile regression tests, including expanded/collapsed history,
  word boundaries and one-shot motion checks. Test all 100 phrases at 280px,
  320px and 393px. Refresh browser screenshots.


## 1.1.0 - 2026-10-27

### Changed

- Replace promotional copy with plain instructions and labels.
- Replace the olive/lime palette with charcoal, warm white and muted gold.
- Increase text contrast, visible focus treatment, symbol legibility and
  control sizes. Preserve reduced motion and add forced-colour support.
- Hide the game keyboard on narrow screens and primary touch devices.
- Keep future mobile guess rows compact and make long-word layouts scrollable.

### Added

- Persistent native mobile text input with input-event, deletion and composition
  handling; device keyboards do not depend on physical keydown events.
- Active word/letter position, current-word shading and strong selected-cell cue.
- Compact board behavior when the visual viewport shrinks for a device keyboard.
- Standalone privacy notice, footer/settings links and configurable operator
  details embedded into the static production page.
- Confirmed game-data deletion in the game and privacy page, including handling
  deletion notifications in other tabs.
- Header sound toggle and separate local typing, deletion, submit, error,
  win and loss cues. Audio remains off by default.
- Privacy/security response headers for Vercel and an updated build that includes
  the privacy page and all required assets.
- Tests for native input, palette contrast, privacy, deletion and optional audio.
- Updated setup, privacy and verification documentation and browser QA scripts.

### Preserved

- All 100 phrases, meanings, daily schedule IDs and dictionary content.
- Existing local-save format and key, daily/freeplay modes and game rules.
- Zero third-party npm dependencies and static Vercel deployment.
