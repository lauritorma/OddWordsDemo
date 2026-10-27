import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { staticServer } from '../scripts/server.mjs';
let server, base;
before(async () => {
  server = staticServer(fileURLToPath(new URL('../', import.meta.url)), '/odd-words/');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
describe('static server and repository-subpath hosting', () => {
  it('serves the page below a project subpath', async () => { const r = await fetch(base + '/odd-words/'); assert.equal(r.status, 200); assert.ok((await r.text()).includes('Odd Words')); });
  it('serves JavaScript with the right MIME type', async () => { const r = await fetch(base + '/odd-words/src/main.js'); assert.ok(r.headers.get('content-type').startsWith('text/javascript')); });
  it('serves all 100 phrases locally', async () => { const r = await fetch(base + '/odd-words/src/data/phrases.json'); assert.equal((await r.json()).length, 100); });
  it('does not expose package, Git or build scripts', async () => { for (const p of ['package.json', '.git/config', 'scripts/serve.mjs']) assert.equal((await fetch(base + '/odd-words/' + p)).status, 404); });
  it('rejects traversal paths', async () => assert.equal((await fetch(base + '/odd-words/src/%2e%2e%2f%2e%2e%2fpackage.json')).status, 404));
  it('does not support writes', async () => assert.equal((await fetch(base + '/odd-words/', { method: 'POST' })).status, 405));
});
