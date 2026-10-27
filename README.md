# Odd Words

**Real words. Odd combinations. Six shots.**

A browser-based phrase puzzle with one shared daily challenge and unlimited
freeplay. Solve an expression, then discover what it means. The interface is
inspired by a compact game console: dark olive surfaces, lime controls,
physical-looking keys and restrained pixel-like effects.

![Odd Words desktop game](docs/images/desktop.png)

## Run locally

Use Node.js 24 LTS (Node.js 22.12+ is also supported). No accounts, API keys,
Python, database, or third-party npm packages are required.

```powershell
npm.cmd ci
npm.cmd run verify
npm.cmd run dev -- --open
```

Open **http://localhost:5173**. Keep the terminal open. Stop with **Ctrl+C**.
After changing source files, refresh the browser; this small development
server deliberately does not introduce a hot-reload framework.

On macOS or Linux, use `npm` instead of `npm.cmd`.

**This is a complete standalone project.** Do not copy its files over an old
React/Vite project. Extract or clone it into a fresh folder. See
[START-HERE-WINDOWS.md](START-HERE-WINDOWS.md) for exact Windows and Git commands.

## The game

- Six valid whole-phrase guesses. Every word must match its tile count and be
  in the local English word list; the complete phrase may be nonsensical.
- Green means the correct position. Yellow means elsewhere anywhere in the
  phrase, including another word. Gray means no matching occurrence remains.
  Exact matches are reserved before yellows, so repeated letters are counted
  correctly.
- Physical keyboard, on-screen keys, tile selection, cursor controls and
  whole-phrase paste. Invalid words and unfinished rows do not spend a guess.
- Tile reveals, a victory wave and confetti. Optional synthesized audio;
  reduced-motion preferences are respected. Feedback symbols are enabled by
  default, so information is not conveyed by colour alone.
- A definition and a further-reading link after a win, loss or freeplay reveal.
- Exactly **100 unique phrases** in `src/data/phrases.json` and a bundled local
  dictionary of **112,795 accepted words** in this release.
- Separate daily and freeplay saves, including unfinished guesses, settings,
  statistics, daily streaks and spoiler-free result sharing.

### Daily

A fixed schedule selects the same phrase for the same UTC date on every
installation with the same data. The reset is **00:00 UTC**. An open page
updates when the UTC date changes. The schedule starts on **2026-10-27** and
repeats after 100 days; it is a demo collection, not an infinite content feed.

The schedule contains explicit IDs, separate from the phrase collection.
Reordering `phrases.json` therefore does not change assignments. Changing the
schedule itself can change past and future puzzles.

### Freeplay

Freeplay uses a shuffled bag. It excludes the current daily answer when drawing
new phrases and does not repeat a phrase until the eligible bag is exhausted.
The immediately previous phrase is also excluded at a refill. Daily and
freeplay rounds stay separate. Revealing/skipping a freeplay round shows its
meaning and does not count as a loss.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev -- --open` | Start localhost:5173 and open the browser |
| `npm run dev -- --port 5174` | Use another local port |
| `npm run check` | Check JS syntax/imports, phrases, schedule and dictionary |
| `npm test` | Run 80 automated tests with Node's built-in runner |
| `npm run test:watch` | Re-run tests when files change |
| `npm run dictionary` | Rebuild the local dictionary from bundled sources |
| `npm run build` | Validate and create the static `dist/` site |
| `npm run verify` | Run checks, tests and the build |
| `npm run preview -- --open` | Preview `dist/` at localhost:4173 |

`npm ci` works without downloading packages because there are no dependency
entries. The lockfile is included to keep the repository and CI reproducible.

## Structure

```text
odd-words/
  index.html
  src/
    main.js                 Application controller, rendering and input
    styles.css              Responsive console-style interface
    data/
      phrases.json          Exactly 100 answer entries and meanings
      daily-schedule.json   Fixed date-to-ID rotation
      custom-words.txt       Reviewed dictionary additions
    lib/
      game.js               Pure scoring, editing and round rules
      puzzles.js            UTC selection and freeplay shuffle bag
      storage.js            Save recovery and statistics
      dictionary.js         Word-list parser
      effects.js            Victory particles and optional sound
  public/
    mark.svg                Original logo/favicon
    dictionary/english.txt  Ready-to-use local word list
  scripts/                  Cross-platform server, checks and build
  tests/                    Node unit and HTTP integration tests
  vendor/scowl/             Bundled dictionary source and affix rules
  licenses/                 Third-party notices
  .github/workflows/        Windows/Linux CI and optional Pages deployment
```

## Technical choices

Native browser ES modules and CSS; Node built-ins for the server, tests and
build. There is no transpiler, framework runtime, server-side database or
external gameplay request. This repository replaces, rather than extends,
the earlier React/Vite prototype. Pure rules remain separate from rendering
so the game can be moved into a framework later without changing its rules.

The build copies the validated browser files into `dist/`. It is deliberately
not a minifier, obfuscator, or anti-cheat system. All URLs are relative so the
same output works under a repository path on GitHub Pages.

## Content and customization

Edit `src/data/phrases.json` for phrases and meanings. See
[docs/CONTENT.md](docs/CONTENT.md) before changing scheduled IDs or vocabulary.
Run `npm run dictionary` after adding answer vocabulary or custom words, then
`npm run verify`. The release check intentionally enforces 100 unique phrases.

Adjust the CSS custom properties at the start of `src/styles.css` to change
the palette. The name is in `index.html`, `src/main.js`, `package.json`, and the
original `public/mark.svg` logo. The current name is a working project title;
no trademark clearance is implied.

## GitHub and deployment

The repository includes an MIT license for the original code, a `.gitignore`,
editor settings, source attribution, and GitHub Actions. CI verifies the project
on Windows and Linux after a push or pull request.

For a live site, choose **Settings > Pages > Source > GitHub Actions**, then run
**Actions > Deploy GitHub Pages > Run workflow**. Deployment is manual so a
first push does not fail simply because Pages has not been enabled. Re-run
that workflow after changes you want to publish.

For another static host, publish `dist/`. There is no production Node server
requirement. The supplied local server is a development/preview tool, not a
hardened Internet-facing application server.

## Verification and boundaries

`npm run verify` passed in the build environment: 80 tests plus data, syntax,
import and build checks. UI verification also exercised 42 scenarios in
Chromium and every eligible freeplay phrase at 320px and 393px widths.

The browser environment blocked all URL navigation, so UI checks loaded the
actual modules through an inline file-transport harness with in-memory
storage. That verifies rendering and interactions, not native localStorage or
a real Windows browser session. The local HTTP server was separately tested
through real Node HTTP requests. Details and remaining manual checks are in
[docs/VERIFICATION.md](docs/VERIFICATION.md).

The answers are public client-side data. Device clocks can be changed. Saves
are local to the browser and origin (including port); private browsing or
clearing site data can remove them. There is no account synchronization,
shared leaderboard, anti-cheat guarantee, service worker, or cross-tab conflict
resolution. The latest 1,000 completed rounds are kept. Use one active game tab
when preserving progress matters.

## License

Original project code and visuals: [MIT](LICENSE). Dictionary data retains its
own permissions and notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[licenses/SCOWL.txt](licenses/SCOWL.txt). Dictionary references do not imply
endorsement. No font files or external art are included.
