# Odd Words - Windows setup

This updates the Odd Words project you already have. Do not run `create-vite`
or install a framework. The project uses Node's built-in tools.

## Update the repository

Back up or commit your existing work. Extract `odd-words-updated.zip` to a
separate folder, then copy the contents of its `odd-words` directory into your
existing repository. Keep the repository's `.git` directory and remote settings.
The ZIP intentionally does not include `.git`.

Open PowerShell in the folder containing `package.json`, `index.html`, `src`
and `scripts`. Check that Node is version 22.12 or newer:

```powershell
node --version
npm.cmd --version
```

## Run and verify

```powershell
npm.cmd ci
npm.cmd run verify
npm.cmd run dev -- --open
```

`npm.cmd` avoids PowerShell's script-execution restriction without changing
execution policy. There are no third-party npm dependencies. The dictionary
and phrases are already included.

Open `http://localhost:5173`. Keep that terminal open while playing. Refresh
after changing files; stop the server with Ctrl+C. When the port is in use:

```powershell
npm.cmd run dev -- --port 5174 --open
```

Do not double-click `index.html`; ES modules and dictionary requests need the
HTTP server.

## Privacy details before deployment

Open `src/site-config.js` and fill in your public operator name and privacy
contact email. Read `docs/PRIVACY.md` and check your Vercel dashboard settings.
Do not enter API tokens or other secrets. Then rebuild:

```powershell
npm.cmd run verify
npm.cmd run preview -- --open
```

Preview uses port 4173. Browser saves are separate between ports and domains.

## Commit and deploy

From your existing repository, review changes before staging:

```powershell
git status
git diff
```

Then commit and push through your usual branch workflow:

```powershell
git add .
git commit -m "Improve mobile input, accessibility, privacy and audio"
git push
```

Your existing Vercel Git integration can rebuild the deployment. The included
configuration uses `npm run build` and publishes `dist`. There is no backend
or external dictionary dependency. The build copies the dictionary, phrases,
schedule, privacy page, scripts, stylesheet and licenses automatically.

## Device checks

On desktop, use your physical keyboard or the on-screen keys. On a phone, tap a
tile or Keyboard. Confirm that the native keyboard opens and that the
outlined cell advances as you type. Test deletion, selecting an earlier cell,
rotating the device, and submission. Check sound on your device after enabling
it; it starts off. Confirm that Settings > Clear saved data asks for confirmation
and clears only this game's progress.

## Dictionary updates

Add reviewed words to `src/data/custom-words.txt`, then run:

```powershell
npm.cmd run dictionary
npm.cmd run verify
```

The existing 100 phrases and scheduled IDs are unchanged. See `docs/CONTENT.md`
for the content rules.
