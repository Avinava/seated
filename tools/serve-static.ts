/**
 * A tiny static server for the built app (or any folder), with no dependencies.
 *
 *   pnpm exec tsx tools/serve-static.ts [dir] [port]
 *
 * dir defaults to dist/seated/browser and port to $PORT or 4500. It serves
 * files as built, maps "/brand" to "brand/index.html" (prerendered routes),
 * and falls back to index.csr.html (the client-rendered shell) for any other
 * path without a file extension, so deep links work like they do on Pages.
 * Text is gzipped like a real host serves it, so Lighthouse measures what ships.
 * Playwright's webServer and Lighthouse both use it.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const root = resolve(process.argv[2] ?? 'dist/seated/browser');
const port = Number(process.argv[3] ?? process.env['PORT'] ?? 4500);
const host = process.env['HOST'] ?? '127.0.0.1';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.webmanifest', '.txt', '.svg']);

/** Hashed bundles never change; everything else (HTML, the service worker and its manifest) must revalidate. */
const HASHED = /[.-][A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?)$/;

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/** The file for a URL path, or null. Never escapes the root. */
async function resolveFile(urlPath: string): Promise<string | null> {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const file = join(root, rel);
  if (file !== root && !file.startsWith(root + sep)) return null;
  if (await isFile(file)) return file;
  const index = join(file, 'index.html');
  if (await isFile(index)) return index;
  return null;
}

function send(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer((req, res) => {
  void (async () => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
    let file: string | null;
    try {
      file = await resolveFile(urlPath);
    } catch {
      return send(res, 400, 'Bad request');
    }
    if (!file) {
      // A path with an extension is a missing file; anything else is a client route.
      if (extname(urlPath)) return send(res, 404, 'Not found');
      file = join(root, 'index.csr.html');
      if (!(await isFile(file))) file = join(root, 'index.html');
    }
    const info = await stat(file);
    const name = file.slice(root.length + 1);
    const ext = extname(file).toLowerCase();
    const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
    res.writeHead(200, {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : { 'Content-Length': info.size }),
      ...(COMPRESSIBLE.has(ext) ? { Vary: 'Accept-Encoding' } : {}),
      'Cache-Control': HASHED.test(name) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      // The service worker controls the whole origin from the root.
      ...(name === 'ngsw-worker.js' ? { 'Service-Worker-Allowed': '/' } : {}),
    });
    if (req.method === 'HEAD') return res.end();
    const body = createReadStream(file);
    if (gzip) body.pipe(createGzip()).pipe(res);
    else body.pipe(res);
  })().catch((err: unknown) => {
    if (!res.headersSent) send(res, 500, String(err));
    else res.destroy();
  });
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Keep-alive sockets from a browser would otherwise hold the close open.
    server.closeAllConnections();
  });
}
