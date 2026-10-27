import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clearSave, STORAGE_KEY } from '../src/lib/storage.js';
import { operatorContact } from '../src/lib/privacy.js';

describe('privacy and local data deletion', () => {
  it('deletes only the game key', () => {
    const entries = new Map([[STORAGE_KEY, 'save'], ['unrelated', 'keep']]);
    assert.equal(clearSave({ removeItem: key => entries.delete(key) }), true);
    assert.equal(entries.has(STORAGE_KEY), false); assert.equal(entries.get('unrelated'), 'keep');
  });
  it('handles a blocked storage API', () => assert.equal(clearSave({ removeItem() { throw new Error('blocked'); } }), false));
  it('handles unavailable storage', () => assert.equal(clearSave(null), false));
  it('renders a configured operator and email', () => {
    const html = operatorContact({ operatorName: 'Example Operator', privacyEmail: 'privacy@example.org' });
    assert.match(html, /Example Operator/); assert.match(html, /mailto:privacy@example.org/);
  });
  it('does not invent operator details', () => assert.match(operatorContact({}), /not been configured/));
  it('escapes operator-supplied markup', () => assert.ok(!operatorContact({ operatorName: '<img src=x onerror=alert(1)>' }).includes('<img')));
  it('rejects header injection and unsafe email URLs', () => {
    for (const email of ['x@example.org?subject=x', 'x@example.org%0d%0a', '<script>@example.org']) assert.ok(!operatorContact({ privacyEmail: email }).includes('href='));
  });
  it('has an accessible privacy link in the game', async () => assert.match(await readFile(new URL('../index.html', import.meta.url), 'utf8'), /href="\.\/privacy.html">Privacy/));
  it('ships the privacy page through the build', async () => assert.match(await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'privacy.html'/));
  it('keeps analytics packages out of the application', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
    assert.ok(!JSON.stringify(pkg).includes('@vercel/analytics'));
  });
});
