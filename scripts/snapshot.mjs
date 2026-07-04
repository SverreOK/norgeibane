// Regenerates data/fallback-satellites.json — a bundled snapshot of all
// Norwegian-owned operational satellites (catalog record + latest TLE).
//
// The site loads this file for an instant first paint and as a fallback if
// CelesTrak is unreachable; fresh data is fetched live in the browser.
// Re-run occasionally (e.g. before deploys):  npm run snapshot

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(root, 'data', 'fallback-satellites.json');

const SATCAT_URL = 'https://celestrak.org/satcat/records.php?GROUP=active&FORMAT=JSON';
const TLE_URL = (id) => `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=tle`;

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'norgeibane.no snapshot script' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

console.log('Fetching active satellite catalog (~5 MB) …');
const catalog = JSON.parse(await fetchText(SATCAT_URL));
const norwegian = catalog.filter((r) => r.OWNER === 'NOR' && r.OBJECT_TYPE === 'PAY');
console.log(`${norwegian.length} operational Norwegian satellites found.`);

const satellites = [];
for (const rec of norwegian) {
  process.stdout.write(`  TLE for ${rec.OBJECT_NAME} (${rec.NORAD_CAT_ID}) … `);
  const tle = await fetchText(TLE_URL(rec.NORAD_CAT_ID));
  const lines = tle.trim().split(/\r?\n/);
  if (lines.length < 3 || !lines[1].startsWith('1 ')) {
    console.log('MISSING — skipped');
    continue;
  }
  satellites.push({
    noradId: rec.NORAD_CAT_ID,
    name: rec.OBJECT_NAME,
    intlDes: rec.OBJECT_ID,
    owner: rec.OWNER,
    launchDate: rec.LAUNCH_DATE,
    launchSite: rec.LAUNCH_SITE,
    opsStatus: rec.OPS_STATUS_CODE,
    tle1: lines[1].trimEnd(),
    tle2: lines[2].trimEnd(),
  });
  console.log('ok');
  await new Promise((r) => setTimeout(r, 500)); // be polite to CelesTrak
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ generated: new Date().toISOString(), satellites }, null, 2));
console.log(`Wrote ${satellites.length} satellites to ${path.relative(root, OUT)}`);
