import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { checkProject } from './check.mjs';
import { readFile } from 'node:fs/promises';
import { siteConfig } from '../src/site-config.js';
import { operatorContact } from '../src/lib/privacy.js';
const root = new URL('../', import.meta.url);
try {
  await checkProject();
  await rm(new URL('dist/', root), { recursive: true, force: true });
  await mkdir(new URL('dist/', root), { recursive: true });
  for (const name of ['index.html', 'privacy.html', 'src', 'public', 'licenses']) {
    await cp(new URL(name, root), new URL('dist/' + name, root), { recursive: true });
  }
  const privacy = await readFile(new URL('privacy.html', root), 'utf8');
  await writeFile(new URL('dist/privacy.html', root), privacy.replace(/(<div id="operator-contact">)[\s\S]*?(<\/div>)/, (_, open, close) => open + operatorContact(siteConfig) + close));
  if (!siteConfig.operatorName || !siteConfig.privacyEmail) console.warn('Before publishing: add operatorName and privacyEmail in src/site-config.js and review docs/PRIVACY.md.');
  await cp(new URL('LICENSE', root), new URL('dist/licenses/PROJECT.txt', root));
  await cp(new URL('THIRD_PARTY_NOTICES.md', root), new URL('dist/licenses/THIRD_PARTY_NOTICES.md', root));
  await writeFile(new URL('dist/.nojekyll', root), '');
  console.log('Built dist/. Deploy this directory to any static host. Relative paths also support GitHub project Pages.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
