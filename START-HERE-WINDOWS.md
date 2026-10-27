# Start here - Windows 11

This is a new, complete project. Keep the previous `daily-phrase` folder as a
backup. Do not merge the two folders, and do not run `create-vite` for this one.

## 1. Check your tools

Open PowerShell in Windows Terminal or VS Code:

```powershell
node --version
npm.cmd --version
git --version
```

Use Node.js 24 LTS, or at least Node.js 22.12. Node includes npm. Git is needed
only for version control. Official installers:

- Node: https://nodejs.org/en/download
- Git: https://git-scm.com/install/windows
- VS Code: https://code.visualstudio.com/

Close and reopen the terminal after installation. `npm.cmd` avoids selecting
PowerShell's `npm.ps1` wrapper; you do not need to relax execution policy.

## 2. Extract into a fresh folder

Save `odd-words-complete.zip` in Downloads. The archive already contains the
`odd-words` root directory.

```powershell
$projects = "$HOME\Projects"
$zip = "$HOME\Downloads\odd-words-complete.zip"

New-Item -ItemType Directory -Force -Path $projects | Out-Null

if (Test-Path "$projects\odd-words") {
    throw "An odd-words folder already exists. Rename or back it up before extracting."
}

Expand-Archive -LiteralPath $zip -DestinationPath $projects
Set-Location "$projects\odd-words"
code .
```

The correct folder contains `package.json`, `index.html`, `src`, and `scripts`.
Always run npm commands there, not in `src` or the old project directory.

## 3. Install, verify, and start

Run each command separately and check for errors before continuing:

```powershell
npm.cmd ci
npm.cmd run verify
npm.cmd run dev -- --open
```

There are no third-party npm dependencies to download. `npm ci` uses the
included lockfile; the dictionary is already included, so no API key,
dictionary package or additional generator step is needed to begin playing.

Open http://localhost:5173. Keep the server terminal open while playing.
Stop it with Ctrl+C. Use a second terminal for Git commands.

## 4. Check the game

1. Enter letters with your keyboard or the screen keys. Every word must be real.
2. Select **Submit guess** or press Enter. Incomplete/unknown words keep the
   current attempt; valid words reveal feedback and advance.
3. Switch to Freeplay, enter a few letters, then return to Daily. Both drafts
   should remain intact. Refresh and confirm your progress is still there.
4. Finish a round to reveal its meaning. Freeplay also has **Reveal & skip**
   with a confirmation step, followed by **Next random phrase**.
5. Help and Settings are in the header. Audio is off by default. Feedback
   symbols are on by default. Your system's reduced-motion setting is respected.

No special demo route or secret answer is required. For developer-only
verification of victory, inspect your current daily entry in the local JSON
schedule. The answers are intentionally available in this client-side demo.

## 5. Initialize Git

In the project root:

```powershell
git init -b main
git config user.name "Your Name"
git config user.email "your-email@example.com"
git status --short
git add .
git commit -m "Initial Odd Words game"
```

Replace the name and email first. These identity settings apply to this local
repository. The ZIP intentionally contains no `.git` directory or previous
history. `.gitignore` excludes generated builds and machine-local files.

## 6. Push to GitHub

Create an EMPTY GitHub repository. Do not initialize it with a README, license,
or `.gitignore`; this project supplies those files. Copy its HTTPS or SSH URL.

Replace the URL below with your repository's real URL:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/odd-words.git
git remote -v
git push -u origin main
```

Follow Git's authentication prompt when necessary. A GitHub account password
is not used as a Git HTTPS password; use the credential-manager/browser flow
or your configured SSH authentication. Never put a token into project files.

For an EXISTING non-empty remote, do not force-push these instructions over
its history. Clone it into a separate directory, copy the new project files
into the clone (preserving the clone's `.git` folder), review the replacement,
then commit and push normally. Remove obsolete files carefully rather than
mixing old and new application code.

## 7. Publish a playable GitHub Pages site (optional)

After pushing:

1. In the repository, open Settings > Pages.
2. Under Build and deployment, select GitHub Actions as the Source.
3. Open Actions > Deploy GitHub Pages > Run workflow, selecting main.
4. After the workflow succeeds, use the URL shown by the deployment.

The workflow builds `dist/` and publishes it. No repository-name setting is
needed: the application uses relative asset and data paths. Deployments are
manual; re-run the workflow after later changes you want to publish.

## Everyday development

```powershell
Set-Location "$HOME\Projects\odd-words"
npm.cmd run dev -- --open
```

You do not need `npm ci` each time. Refresh the browser after editing source
files. Before committing:

```powershell
npm.cmd run verify
git status
git add .
git commit -m "Describe your change"
git push
```

## Troubleshooting

**Port 5173 is occupied:** stop the old project's terminal with Ctrl+C. Or use:

```powershell
npm.cmd run dev -- --port 5174 --open
```

**The browser shows an old game:** verify the terminal's project path and port.
Old and new projects must not share a running server on the same port.

**npm cannot find package.json:** navigate to the `odd-words` project root.

**The page is blank after double-clicking index.html:** use the HTTP server.
Browser modules and local JSON fetches are not designed to run from `file://`.

**A real word is rejected:** dictionary membership is deliberately bounded.
Review it, add it to `src/data/custom-words.txt`, then run:

```powershell
npm.cmd run dictionary
npm.cmd run verify
```

Refresh the game afterward. Never add nonsense words simply to bypass validation.

**Progress is missing on a new port or browser:** saves belong to one browser
origin. localhost:5173 and localhost:4173 are separate stores. Saved data is
not uploaded or synchronized.
