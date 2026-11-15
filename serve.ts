// EMBER & ANVIL — serve.ts
// A tiny static file server for play-testing game/ in a desktop browser.
// Run: node serve.ts [port]  (default 8080), then open
// http://localhost:8080/ — add ?shot=title|play|shop|win for the
// screenshot states. Standard library only, no dependencies.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const port = Number(process.argv[2] || 8080);
const root = new URL('./game', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => {
  console.log(`ember-and-anvil: serving game/ at http://localhost:${port}/`);
});
