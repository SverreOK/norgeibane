// Builds and maintains the list of tracked satellites.
//
// Startup strategy (resilient + fast):
//   1. Load the bundled snapshot (data/fallback-satellites.json) — instant,
//      works offline, and survives CelesTrak outages.
//   2. In the background, refresh every TLE (2 h cache) and re-run dynamic
//      discovery against the live catalog (7 d cache) so newly launched
//      Norwegian satellites appear without a redeploy.
//
// A "satellite record" has the shape produced by scripts/snapshot.mjs:
//   { noradId, name, intlDes, owner, launchDate, launchSite, opsStatus, tle1, tle2 }

import { fetchOperationalNorwegian, fetchAllNorwegianInOrbit, fetchTle } from './celestrak.js';

function fromSatcatRecord(r) {
  return {
    noradId: r.NORAD_CAT_ID ? Number(r.NORAD_CAT_ID) : Number(r.noradId),
    name: r.OBJECT_NAME,
    intlDes: r.OBJECT_ID,
    owner: r.OWNER,
    launchDate: r.LAUNCH_DATE,
    launchSite: r.LAUNCH_SITE,
    opsStatus: r.OPS_STATUS_CODE,
    tle1: null,
    tle2: null,
  };
}

export async function loadSnapshot() {
  const res = await fetch('data/fallback-satellites.json');
  if (!res.ok) throw new Error('Bundled satellite snapshot missing');
  return (await res.json()).satellites;
}

/**
 * Refresh TLEs for the given records (mutates tle1/tle2 in place) and run
 * discovery for satellites not in the snapshot. Network failures are
 * swallowed — the caller keeps whatever data it already has.
 *
 * @param {Array} sats current records (mutated)
 * @param {boolean} includeInactive also discover non-operational satellites
 * @param {(sat: object) => void} onNew called for each newly discovered satellite
 * @param {(sat: object) => void} onTle called when a satellite's TLE was updated
 * @returns {{ok: boolean}} ok=false if the network appears down
 */
export async function refreshLive(sats, includeInactive, onNew, onTle) {
  let ok = true;

  // 1. Fresh TLEs for known satellites (cached 2 h; cheap, ~200 B each).
  await Promise.all(
    sats.map(async (sat) => {
      try {
        const tle = await fetchTle(sat.noradId);
        if (tle && tle.tle1 !== sat.tle1) {
          sat.tle1 = tle.tle1;
          sat.tle2 = tle.tle2;
          onTle?.(sat);
        }
      } catch {
        ok = false;
      }
    }),
  );

  // 2. Dynamic discovery: anything Norwegian we don't know about yet.
  try {
    const records = includeInactive
      ? await fetchAllNorwegianInOrbit()
      : await fetchOperationalNorwegian();
    const known = new Set(sats.map((s) => s.noradId));
    for (const raw of records) {
      const rec = fromSatcatRecord(raw);
      if (known.has(rec.noradId)) continue;
      try {
        const tle = await fetchTle(rec.noradId);
        if (!tle) continue; // in catalog but not trackable (no published TLE)
        rec.tle1 = tle.tle1;
        rec.tle2 = tle.tle2;
        sats.push(rec);
        known.add(rec.noradId);
        onNew?.(rec);
      } catch {
        ok = false;
      }
    }
  } catch {
    ok = false;
  }

  return { ok };
}

export function isOperational(sat) {
  // SATCAT ops codes: + operational, P partial, B backup, S spare, X extended
  // mission. '-' means non-operational (but still in orbit).
  return ['+', 'P', 'B', 'S', 'X'].includes(sat.opsStatus);
}
