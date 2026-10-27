import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { staticServer } from './server.mjs';
const args = process.argv.slice(2);
const value = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const port = Number(value('--port', '5173'));
const host = value('--host', '127.0.0.1');
const base = value('--base', '/');
const root = fileURLToPath(new URL(args.includes('--dist') ? '../dist/' : '../', import.meta.url));
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('Use a port between 1 and 65535.'); process.exit(1); }
if (!existsSync(root + '/index.html')) { console.error('Build output is missing. Run npm run build first.'); process.exit(1); }
const server = staticServer(root, base);
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other server, or run npm run dev -- --port 5174.` : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  const url = `http://${host === '127.0.0.1' ? 'localhost' : host}:${port}${base}`;
  console.log(`\n  ODD WORDS\n  ${args.includes('--dist') ? 'Production preview' : 'Development server'}: ${url}\n  Ctrl+C to stop. Refresh your browser after editing files.\n`);
  if (args.includes('--open')) {
    const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const openArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(command, openArgs, { detached: true, stdio: 'ignore' });
    child.on('error', () => console.log(`Open ${url} in your browser.`)); child.unref();
  }
});
process.on('SIGINT', () => { server.close(); process.exit(0); });
