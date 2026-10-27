# Architecture

## Browser application

`main.js` coordinates data loading, input, rendering, animation and persistence.
It delegates scoring and state changes to pure functions in `lib/game.js`.
All source modules use explicit relative `.js` imports. There is no alias
resolver or compile-time configuration to go missing after a file copy.

A round stores its key, phrase ID, prior guess strings, fixed-length draft
array, cursor index and status. The statuses are `playing`, `won`, `lost` and
`skipped`. A valid submit changes the round immediately. A separate transient
`revealing` flag blocks duplicate inputs and mode changes during the animation.
Reloading during a reveal restores the committed result rather than losing it.

The browser does not trust persisted feedback or victory flags. Restore
replays valid guesses against the current phrase and dictionary. Corrupt,
stale, mismatched or impossible saves revert to a blank round. Storage access
and quota failures leave a playable session and a visible session-only notice.

## Input and rendering

The current row has a roving tab stop. Physical letters and the on-screen
keys use the same input path. Tile selection changes the cursor. Typing
replaces a tile and advances automatically; typed spaces do not skip words
already reached by auto-advance. The standard Tab key is not trapped by the
board. Native dialogs trap focus while open and can be closed with Escape.

Whole-phrase paste is normalized and checked for the required word shape.
Dictionary validation occurs on submit. Short or unknown-word guesses do
not spend attempts. Input locks after completion and during tile reveals.

At narrow widths, whole words wrap without splitting. Long mobile puzzles use
a vertically scrollable board and compact future-row placeholders; the active
row scrolls into view as play advances. Very long words scale their tiles to
fit the available width. The keyboard remains separate from the scrolling
board. Desktop and mobile share the same rules and components.

## Feedback

1. Flatten letters, retaining word lengths for rendering.
2. Mark all exact-position matches green.
3. Count the answer letters not already consumed by those greens.
4. Allocate yellow matches from the remaining counts, left to right.
5. Mark all other occurrences gray.

Keyboard feedback preserves the strongest known state: correct > present >
absent. Sharing reconstructs the same colours without exposing answer text.

## Daily, freeplay and statistics

The daily schedule is independent of array order and uses a fixed UTC epoch.
A one-second timer updates the countdown and detects the next UTC date.
Returning to a visible tab also checks the date. A daily rollover resets the
daily round but does not reset the current freeplay round.

Freeplay draws from a saved shuffled bag, excluding today's daily answer and
the immediately previous phrase. A new cycle is created only when eligible
saved entries are exhausted. Invalid/deleted IDs are removed from restored
bags. The immediately previous exclusion also applies at cycle boundaries.

Results are keyed by daily date or freeplay round ID and recorded once.
Skipped rounds are not results. Streaks use UTC dates, tolerate an unplayed
current day, and break on a missed day or a loss. Statistics retain the most
recent 1,000 completed rounds. They are not account-level or tamper-resistant.

## Build and serving

The Node server binds to loopback by default. It serves only the public browser
file paths and rejects write requests and traversal attempts. It is a local
development utility, not an Internet-facing production server.

`check` validates JavaScript syntax, relative imports, phrase uniqueness,
references, schedule IDs and dictionary coverage. `test` uses Node's built-in
test runner. `build` validates, then copies the browser files and notices into
`dist/`. The browser requires no build-time environment variables.

The source archive excludes `dist/`, `.git`, `node_modules` and machine-local
files. GitHub Actions rebuilds on demand. The live site is plain static files
with relative paths, including on GitHub project Pages.

## Explicit limits

Client-side answers are inspectable. The date follows the device clock. There
are no accounts, cloud saves, cross-tab conflict resolution, server-side answer
validation, analytics, anti-cheat measures or service worker. Browser data may
be unavailable or cleared. Reference links are external and only open after
explicit player action. Sound is opt-in and system reduced motion wins over
the animation preference.
