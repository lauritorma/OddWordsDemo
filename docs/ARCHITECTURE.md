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

Desktop uses roving tile focus, a physical keyboard and the on-screen keyboard.
Narrow screens and primary coarse-pointer devices instead use a single native
text input, mounted outside the board markup. Repainting tiles never replaces
that input, so it can retain focus and the operating-system keyboard. The
media query is shared conceptually between `lib/native-input.js` and the CSS.

The persistent input is positioned over the active tile, with a transparent
caret and explicit accessible label. Its tiny sentinel buffer allows Backspace
to emit an input event even on an empty tile. Printable text is handled through
`input`, with `beforeinput` for deletions and composition handling for keyboard
input methods. Physical control keys use keydown; printable keys are not handled
twice. All paths feed the same pure game editing functions.

A selected tile has an outline and underline, its word is shaded, and a visible
word/letter-position label describes the cursor. The browser's Tab key is not
trapped by the board. Modal dialogs have native focus trapping and restore the
trigger where possible. Whole-phrase paste validates the required word shape;
dictionary validation still happens only on submission.

On mobile, words wrap as units, future rows use compact placeholders, and the
board scrolls to the selected tile. A visual-viewport height change can compact
the board while the device keyboard is open. The input stays mounted through
these layout updates. The desktop keyboard is both hidden and excluded from
interaction on mobile, not merely covered up.

## Privacy and optional audio

`privacy.html` is a standalone static notice. `site-config.js` stores public
operator/contact details; the build safely embeds them into the static page.
`privacy.js` adds the confirmed local-data deletion control. `clearSave` removes
only `odd-words:v1`. Game tabs handle deletion storage events; ordinary simultaneous
save conflicts are still not resolved.

Sound is synthesized locally after opt-in and a user gesture. Cues are short
sine-wave envelopes; voices disconnect when finished. Muting cancels existing
voices and invalidates pending resume callbacks. Unsupported or suspended audio
never blocks the game. No audio files or microphone permissions are requested.

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
`dist/`, including `privacy.html` and static operator details. The browser
requires no build-time environment variables.

The source archive excludes `.git`, `node_modules` and machine-local files.
A freshly built `dist/` is included for convenience but remains Git-ignored. GitHub Actions rebuilds on demand. The live site is plain static files
with relative paths, including on GitHub project Pages.

## Explicit limits

Client-side answers are inspectable. The date follows the device clock. There
are no accounts, cloud saves, cross-tab conflict resolution, server-side answer
validation, analytics, anti-cheat measures or service worker. Browser data may
be unavailable or cleared. Reference links are external and only open after
explicit player action. Sound is opt-in and system reduced motion wins over
the animation preference.
