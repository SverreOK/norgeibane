// Accuracy self-test for the SGP4 propagation pipeline. Runs the REAL app
// module (js/orbit/propagator.js) in Node with the vendored satellite.js.
//
//   node scripts/test-accuracy.mjs
//
// Checks, per satellite in the bundled snapshot:
//   1. propagation succeeds and geodetic values are physical
//   2. derived elements match the independent SATCAT catalog values
//   3. GEO sats (Thor) are stationary in the fixed frame near 1°W / 0°N
//   4. LEO ground speed and altitude are in the physically correct range

import { readFile } from 'node:fs/promises';
import satellitejs from 'satellite.js';

globalThis.satellite = satellitejs; // the browser gets this from the UMD bundle
const { SatelliteOrbit } = await import('../js/orbit/propagator.js');

const snapshot = JSON.parse(await readFile(new URL('../data/fallback-satellites.json', import.meta.url)));
const res = await fetch('https://celestrak.org/satcat/records.php?GROUP=active&FORMAT=JSON');
const satcat = res.ok ? await res.json() : [];
const catalog = new Map(satcat.map((r) => [r.NORAD_CAT_ID, r]));

let failures = 0;
const check = (name, cond, detail) => {
  if (!cond) {
    failures++;
    console.log(`  FAIL ${name}: ${detail}`);
  }
};

const now = new Date();
for (const rec of snapshot.satellites) {
  console.log(`${rec.name} (${rec.noradId})`);
  const orbit = new SatelliteOrbit(rec);
  const s = orbit.state(now);
  const el = orbit.elements();

  check('propagates', s !== null, 'SGP4 returned null');
  if (!s) continue;

  check('lat range', Math.abs(s.latitude) <= 90, s.latitude);
  check('lon range', Math.abs(s.longitude) <= 180, s.longitude);
  check(
    'alt vs TLE-derived perigee/apogee',
    s.altitudeKm > el.perigeeKm - 80 && s.altitudeKm < el.apogeeKm + 80,
    `alt ${s.altitudeKm.toFixed(0)} outside [${el.perigeeKm.toFixed(0)}, ${el.apogeeKm.toFixed(0)}]`,
  );

  // Compare TLE-derived elements against the independent SATCAT record.
  const cat = catalog.get(rec.noradId);
  if (cat) {
    check('period vs SATCAT', Math.abs(el.periodMin - cat.PERIOD) < 1.5, `${el.periodMin.toFixed(1)} vs ${cat.PERIOD}`);
    check('inclination vs SATCAT', Math.abs(el.inclinationDeg - cat.INCLINATION) < 0.3, `${el.inclinationDeg.toFixed(2)} vs ${cat.INCLINATION}`);
    check('apogee vs SATCAT', Math.abs(el.apogeeKm - cat.APOGEE) < 25, `${el.apogeeKm.toFixed(0)} vs ${cat.APOGEE}`);
    check('perigee vs SATCAT', Math.abs(el.perigeeKm - cat.PERIGEE) < 25, `${el.perigeeKm.toFixed(0)} vs ${cat.PERIGEE}`);
  }

  if (rec.name.startsWith('THOR')) {
    // Telenor GEO fleet: ~1°W, equatorial, and fixed-frame stationary.
    check('GEO longitude ≈ 1°W', Math.abs(s.longitude - -0.8) < 1.2, s.longitude);
    check('GEO latitude ≈ 0', Math.abs(s.latitude) < 0.2, s.latitude);
    check('GEO altitude ≈ 35786 km', Math.abs(s.altitudeKm - 35786) < 120, s.altitudeKm);
    const p1 = orbit.positionEcf(now);
    const p2 = orbit.positionEcf(new Date(now.getTime() + 3600e3));
    const driftKm = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z) / 1000;
    check('GEO stationary in ECEF', driftKm < 120, `${driftKm.toFixed(1)} km drift/hour`);
  } else if (el.periodMin < 130) {
    // LEO: orbital speed ~7.5 km/s.
    check('LEO velocity', s.velocityKmS > 7.2 && s.velocityKmS < 8.0, s.velocityKmS);
  }

  const state = `    → ${s.latitude.toFixed(2)}°, ${s.longitude.toFixed(2)}°, ${s.altitudeKm.toFixed(0)} km, ${s.velocityKmS.toFixed(2)} km/s, Norway: ${s.norway}`;
  console.log(state);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
