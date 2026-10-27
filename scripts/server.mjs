import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp' };
export function staticServer(root, base = '/') {
  const absoluteRoot = path.resolve(root);
  if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('Base must start and end with /.');
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    response.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(base)) { response.writeHead(404); response.end('Not found'); return; }
      let relative = pathname.slice(base.length);
      if (!relative) relative = 'index.html';
      const allowed = relative === 'index.html' || /^(src|public|licenses)\//.test(relative);
      const filename = path.resolve(absoluteRoot, relative);
      if (!allowed || !filename.startsWith(absoluteRoot + path.sep) || relative.includes('\\') || relative.includes('\0')) { response.writeHead(404); response.end('Not found'); return; }
      const info = await stat(filename);
      if (!info.isFile()) throw new Error('Not a file');
      const data = request.method === 'HEAD' ? null : await readFile(filename);
      response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Content-Length': info.size });
      response.end(data);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
}
