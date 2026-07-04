// CelesTrak access with polite caching.
//
// CelesTrak is a free community service and asks clients to cache: TLEs are
// only regenerated a few times a day, and the SATCAT catalog rarely changes.
// Raw catalog responses are >5 MB (too big for localStorage), so we always
// cache the *transformed* (filtered) result, never the raw payload.

import { config } from '../config-loader.js';

const BASE = 'https://celestrak.org';

function url(path) {
  const full = `${BASE}${path}`;
  return config.proxyBase ? `${config.proxyBase}${encodeURIComponent(full)}` : full;
}

function cacheGet(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw);
    if (Date.now() - at > ttlMs) return null;
    return value;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Quota exceeded / private mode — caching is best-effort only.
  }
}

async function fetchText(path) {
  const res = await fetch(url(path));
  if (!res.ok) throw new Error(`CelesTrak ${res.status} for ${path}`);
  return res.text();
}

/**
 * Fetch, transform, and cache. The transform runs on the raw response text
 * and its (small) result is what gets cached and returned.
 */
async function cached(key, ttlMs, path, transform) {
  const hit = cacheGet(key, ttlMs);
  if (hit !== null) return hit;
  const text = await fetchText(path);
  const value = transform(text);
  cacheSet(key, value);
  return value;
}

/** All operational satellites owned by Norway, from the active SATCAT. */
export function fetchOperationalNorwegian() {
  return cached(
    'norgeibane.discovery',
    config.discoveryTtlMs,
    '/satcat/records.php?GROUP=active&FORMAT=JSON',
    (text) =>
      JSON.parse(text).filter((r) => r.OWNER === 'NOR' && r.OBJECT_TYPE === 'PAY'),
  );
}

/**
 * All Norwegian payloads still in orbit — including non-operational ones —
 * from the full catalog CSV (the active-only JSON excludes them).
 */
export function fetchAllNorwegianInOrbit() {
  return cached(
    'norgeibane.discovery-all',
    config.discoveryTtlMs,
    '/pub/satcat.csv',
    (csv) => parseCsv(csv).filter(
      (r) => r.OWNER === 'NOR' && r.OBJECT_TYPE === 'PAY' && !r.DECAY_DATE,
    ),
  );
}

/** Latest TLE for one NORAD ID → { tle1, tle2 } (or null if none published). */
export async function fetchTle(noradId) {
  return cached(
    `norgeibane.tle.${noradId}`,
    config.tleTtlMs,
    `/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`,
    (text) => {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 3 || !lines[1]?.startsWith('1 ')) return null;
      return { tle1: lines[1].trimEnd(), tle2: lines[2].trimEnd() };
    },
  );
}

/** Minimal CSV parser (handles quoted fields); returns array of objects. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
