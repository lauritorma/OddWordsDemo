# Verification record

Release: 1.0.0. Checked on 2026-10-27.

## Executed successfully

- Clean npm installation using the committed zero-dependency lockfile.
- Syntax/import checks for every project JavaScript file.
- 100 unique phrase IDs, 100 unique answers, 100 scheduled entries, definitions,
  HTTPS references and full answer-word coverage in the local dictionary.
- **80 Node tests** covering global scoring, 1,000 generated scoring cases,
  duplicate letters, editing, validation, sixth-guess outcomes, save recovery,
  UTC dates, fixed scheduling, shuffle-bag behavior, statistics and real local
  HTTP requests including subpath hosting and path/write restrictions.
- Static build into `dist/`.
- **42 browser scenario checks**: empty/unknown submissions, natural typing
  with spaces, duplicate submission lock, next-row activation, feedback,
  separate modes, serialized-save recovery, freeplay skip/next, win/loss,
  sixth-guess win, sharing fallback, statistics deduplication, motion/symbol
  settings, on-screen input, and layouts at 320/360/393/768/1024/1440px.
- All **99 eligible freeplay phrases** traversed without repetition or horizontal
  overflow at **320px** and **393px**, in addition to the current daily layout.
- Desktop and mobile screenshots inspected. Long mobile layouts were revised
  to avoid pushing the keyboard below six full-size multiline rows.
- No unhandled application JavaScript exceptions in those browser scenarios.

## Exact testing boundary

The execution environment had Node 22.16.0 and Chromium. Its browser enterprise
policy blocked *all URL navigation*, including localhost. Browser scenarios
therefore used the actual application modules/styles in an inline local-file
transport harness, with import URLs rewritten to local blobs, fetch responses
provided from the project files, and a small in-memory Storage adapter.

No game rules, rendering code, animation library or framework were substituted
(the application has no framework dependency). The adapter does mean that
native browser storage behavior, network delivery and the complete Windows
localhost path were **not** tested end to end. Restoration tests passed by
serializing a save and loading it into a fresh browser page. The HTTP server
was separately tested against real Node requests. This is not a claim of
full cross-browser, Windows, accessibility or GitHub deployment certification.

The repo includes CI for Windows and Linux, but those GitHub-hosted jobs have
not run on a user's remote repository yet. Optional sound synthesis was
implemented; audio quality was not judged by listening in this environment.

## Reproduce the automated project checks

```powershell
npm.cmd ci
npm.cmd run verify
```

This runs the 80 Node tests and real project checks/build without browser test
packages. The environment-specific inline browser harness is not a runtime
or build dependency of the repository.

## Final checks on your Windows machine

1. Start `npm.cmd run dev -- --open`; confirm the game loads at localhost:5173.
2. Submit an incomplete row and invented words. Neither should spend a guess.
3. Submit a valid mismatching phrase and verify feedback/next-row progression.
4. Enter part of a new row, refresh, and confirm native storage preserves it.
5. Switch modes and return; check both drafts. Complete and skip freeplay rounds.
6. Solve a phrase on attempt six; check the victory animation and definition.
7. Enable Windows reduced motion, then check the result appears without motion.
8. Toggle audio only after a user action; check sound is comfortable and optional.
9. Check keyboard-only navigation and the dialogs with your preferred screen reader.
10. Run `npm.cmd run build`, then `npm.cmd run preview -- --open` to check the
    static build on its separate origin. Its save history is intentionally separate.
11. After enabling GitHub Pages, run the deployment workflow and check the actual
    project URL, dictionary fetch and refresh behavior there.
