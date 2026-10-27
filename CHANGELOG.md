# Changelog

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
