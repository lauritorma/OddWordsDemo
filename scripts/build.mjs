import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { checkProject } from './check.mjs';
const root = new URL('../', import.meta.url);
try {
  await checkProject();
  await rm(new URL('dist/', root), { recursive: true, force: true });
  await mkdir(new URL('dist/', root), { recursive: true });
  for (const name of ['index.html', 'src', 'public', 'licenses']) {
    await cp(new URL(name, root), new URL('dist/' + name, root), { recursive: true });
  }
  await cp(new URL('LICENSE', root), new URL('dist/licenses/PROJECT.txt', root));
  await cp(new URL('THIRD_PARTY_NOTICES.md', root), new URL('dist/licenses/THIRD_PARTY_NOTICES.md', root));
  await writeFile(new URL('dist/.nojekyll', root), '');
  console.log('Built dist/. Deploy this directory to any static host. Relative paths also support GitHub project Pages.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
