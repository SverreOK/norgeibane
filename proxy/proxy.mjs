// Optional CelesTrak proxy — NOT needed by default.
//
// CelesTrak currently sends `Access-Control-Allow-Origin: *`, so the browser
// can fetch it directly. Run this proxy only if that ever changes, or if you
// want server-side caching so many visitors don't each hit CelesTrak.
//
//   node proxy/proxy.mjs            # listens on 127.0.0.1:8021
//
// Then set in js/config.js:
//   proxyBase: 'https://your-domain/celestrak?url='
// and add the nginx location block from nginx.example.conf.

import http from 'node:http';

const PORT = Number(process.env.PORT ?? 8021);
const ALLOWED_HOSTS = new Set(['celestrak.org']);
const CACHE_MS = 2 * 60 * 60 * 1000; // mirror the client's 2 h TLE cadence

const cache = new Map(); // url → { at, status, contentType, body }

http.createServer(async (req, res) => {
  const target = new URL(req.url, 'http://localhost').searchParams.get('url');
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    res.writeHead(400).end('Missing or invalid ?url=');
    return;
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    res.writeHead(403).end('Host not allowed');
    return;
  }

  const hit = cache.get(parsed.href);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    res.writeHead(hit.status, corsHeaders(hit.contentType)).end(hit.body);
    return;
  }

  try {
    const upstream = await fetch(parsed.href, {
      headers: { 'User-Agent': 'norgeibane.no proxy' },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    const entry = {
      at: Date.now(),
      status: upstream.status,
      contentType: upstream.headers.get('content-type') ?? 'text/plain',
      body,
    };
    if (upstream.ok) cache.set(parsed.href, entry);
    res.writeHead(entry.status, corsHeaders(entry.contentType)).end(body);
  } catch (err) {
    // Serve stale cache on upstream failure rather than nothing.
    if (hit) {
      res.writeHead(hit.status, corsHeaders(hit.contentType)).end(hit.body);
      return;
    }
    res.writeHead(502).end(`Upstream error: ${err.message}`);
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`CelesTrak proxy on http://127.0.0.1:${PORT}/?url=…`);
});

function corsHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  };
}
