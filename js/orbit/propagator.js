// SGP4 propagation via satellite.js (v6 UMD, global `satellite`).
//
// Frames — the part that must be right for positions to be geographically
// correct: satellite.js propagates TLEs in TEME (true equator, mean equinox).
// CesiumJS renders entity positions in the Earth-FIXED frame (ECEF), and its
// INERTIAL frame is ICRF — *not* TEME — so we never hand ECI to Cesium.
// Instead: TEME --(rotate by GMST via eciToEcf)--> ECEF. That conversion
// ignores polar motion/nutation refinements, which amounts to tens of meters
// — far below anything visible at globe scale, and well inside the inherent
// ~1 km accuracy of TLEs themselves.

/* global satellite */

const MU = 398600.4418; // km^3/s^2
const EARTH_RADIUS = 6378.137; // km (WGS-84 equatorial)

// Norway bounding boxes (mainland + Svalbard + Jan Mayen), degrees.
const NORWAY_BOXES = [
  { latMin: 57.5, latMax: 72.5, lonMin: 4, lonMax: 31.5 },
  { latMin: 74, latMax: 81, lonMin: 10, lonMax: 35 },
  { latMin: 70.5, latMax: 71.3, lonMin: -9.5, lonMax: -7.5 },
];
const NEAR_MARGIN = 6; // degrees

export class SatelliteOrbit {
  constructor(record) {
    this.record = record;
    this.setTle(record.tle1, record.tle2);
  }

  setTle(tle1, tle2) {
    this.satrec = satellite.twoline2satrec(tle1, tle2);
    if (this.satrec.error !== 0) {
      throw new Error(`Bad TLE for ${this.record.name} (error ${this.satrec.error})`);
    }
  }

  /** ECEF position in meters at the given JS Date, or null if SGP4 fails. */
  positionEcf(date) {
    const pv = satellite.propagate(this.satrec, date);
    if (!pv?.position) return null;
    const ecf = satellite.eciToEcf(pv.position, satellite.gstime(date));
    return { x: ecf.x * 1000, y: ecf.y * 1000, z: ecf.z * 1000 };
  }

  /** Full live state: geodetic position, velocity, Norway proximity. */
  state(date) {
    const pv = satellite.propagate(this.satrec, date);
    if (!pv?.position) return null;
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const lat = satellite.degreesLat(geo.latitude);
    const lon = satellite.degreesLong(geo.longitude);
    const v = pv.velocity;
    return {
      latitude: lat,
      longitude: lon,
      altitudeKm: geo.height,
      velocityKmS: Math.hypot(v.x, v.y, v.z),
      norway: norwayProximity(lat, lon),
    };
  }

  /** Orbital elements derived from the TLE itself (not time-varying). */
  elements() {
    const s = this.satrec;
    const nRadS = s.no / 60; // mean motion: rad/min → rad/s
    const a = Math.cbrt(MU / (nRadS * nRadS)); // semi-major axis, km
    return {
      inclinationDeg: (s.inclo * 180) / Math.PI,
      eccentricity: s.ecco,
      periodMin: (2 * Math.PI) / s.no,
      apogeeKm: a * (1 + s.ecco) - EARTH_RADIUS,
      perigeeKm: a * (1 - s.ecco) - EARTH_RADIUS,
      epoch: sgp4EpochToDate(s),
    };
  }

  /**
   * Sample the orbit for path rendering: exactly one period around `now`,
   * returned as { eci: [{x,y,z} m, ...] } — a closed inertial ring the
   * caller rotates into the fixed frame by GMST at display time.
   *
   * Because of J2, the SGP4 trajectory over one period does not quite close
   * (~tens of km). Viewed edge-on, that gap renders as an ugly fork/teardrop
   * where the two line strands nearly coincide on screen, so we feather the
   * closure error around the loop — a per-point shift of well under a pixel
   * at globe scale — to get an exactly closed, artifact-free ring.
   */
  samplePath(now, samples = 240) {
    const periodMs = ((2 * Math.PI) / this.satrec.no) * 60 * 1000;
    const eci = [];
    for (let i = 0; i <= samples; i++) {
      const date = new Date(now.getTime() + (i / samples - 0.5) * periodMs);
      const pv = satellite.propagate(this.satrec, date);
      if (!pv?.position) continue;
      const p = pv.position;
      eci.push({ x: p.x * 1000, y: p.y * 1000, z: p.z * 1000 });
    }
    if (eci.length > 2) {
      const n = eci.length - 1;
      const gap = {
        x: eci[0].x - eci[n].x,
        y: eci[0].y - eci[n].y,
        z: eci[0].z - eci[n].z,
      };
      for (let i = 1; i <= n; i++) {
        const w = i / n;
        eci[i].x += gap.x * w;
        eci[i].y += gap.y * w;
        eci[i].z += gap.z * w;
      }
    }

    return { eci };
  }
}

function inBox(lat, lon, box, margin = 0) {
  return (
    lat >= box.latMin - margin && lat <= box.latMax + margin &&
    lon >= box.lonMin - margin && lon <= box.lonMax + margin
  );
}

/** 'over' | 'near' | 'no' relative to Norwegian territory. */
export function norwayProximity(lat, lon) {
  if (NORWAY_BOXES.some((b) => inBox(lat, lon, b))) return 'over';
  if (NORWAY_BOXES.some((b) => inBox(lat, lon, b, NEAR_MARGIN))) return 'near';
  return 'no';
}

function sgp4EpochToDate(satrec) {
  // jdsatepoch(+F) is the TLE epoch as a Julian date (UTC).
  const jd = satrec.jdsatepoch + (satrec.jdsatepochF ?? 0);
  return new Date((jd - 2440587.5) * 86400 * 1000);
}
