// Satellite rendering: live positions, orbit paths, ground tracks, picking.
//
// Live position: a CallbackPositionProperty (FIXED frame) that runs SGP4 for
// the clock's current time on every frame — exact positions, no interpolation.
//
// Orbit path: satellites.js gives us the orbit in TEME (inertial). A true
// orbit is an ellipse in inertial space, so we sample ±half a period in ECI
// once a minute, and every second rotate those points into the fixed frame by
// the *current* GMST. (Sampling the path directly in ECEF would smear LEO
// orbits into helices and collapse GEO orbits into a dot.) The ground track —
// which genuinely does include Earth's rotation — is drawn from geodetic
// samples for the selected satellite.

/* global Cesium */

import { SatelliteOrbit } from '../orbit/propagator.js';
import { classify, CLASSES } from '../data/classify.js';

const COLOR_SELECTED = Cesium.Color.fromCssColorString('#ff3b3d'); // Norwegian flag red
const COLOR_ORBIT_SELECTED = COLOR_SELECTED.withAlpha(0.9);
const ORBIT_ALPHA = 0.3;
const LABEL_FONT = '13px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, sans-serif';

const PATH_RESAMPLE_MS = 60 * 1000; // re-run SGP4 path sampling
const PATH_ROTATE_MS = 1000; // re-rotate inertial path into fixed frame

export class SatelliteLayer {
  constructor(viewer, { onSelect } = {}) {
    this.viewer = viewer;
    this.onSelect = onSelect;
    this.sats = new Map(); // noradId → { record, orbit, entity, orbitEntity, path }
    this.selectedId = null;
    this.hoveredId = null;
    this.showAllOrbits = true;

    this._installPicking();
    this._pathTimer = setInterval(() => this._updatePaths(), PATH_ROTATE_MS);
  }

  get count() {
    return this.sats.size;
  }

  /** The globe's current (possibly time-warped) clock as a JS Date. */
  now() {
    return Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
  }

  addSatellite(record) {
    if (this.sats.has(record.noradId)) return false;
    let orbit;
    try {
      orbit = new SatelliteOrbit(record);
    } catch (err) {
      console.warn('Skipping satellite with unusable TLE:', record.name, err);
      return false;
    }

    const classKey = classify(record, orbit.elements());
    const classColor = Cesium.Color.fromCssColorString(CLASSES[classKey].color);

    const position = new Cesium.CallbackPositionProperty(
      (time) => {
        const p = orbit.positionEcf(Cesium.JulianDate.toDate(time));
        return p ? new Cesium.Cartesian3(p.x, p.y, p.z) : undefined;
      },
      false,
      Cesium.ReferenceFrame.FIXED,
    );

    const entity = this.viewer.entities.add({
      id: `sat-${record.noradId}`,
      position,
      point: {
        pixelSize: 9,
        color: classColor,
        outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
        outlineWidth: 1.5,
      },
      label: {
        text: displayName(record.name),
        font: LABEL_FONT,
        fillColor: Cesium.Color.fromCssColorString('#f2f7fb'),
        outlineColor: Cesium.Color.fromCssColorString('#0b1524'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(12, -12),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        show: false, // shown on hover / selection
      },
    });
    entity._noradId = record.noradId;

    const orbitEntity = this.viewer.entities.add({
      id: `orbit-${record.noradId}`,
      show: this.showAllOrbits,
      polyline: {
        positions: [],
        width: 1.2,
        material: classColor.withAlpha(ORBIT_ALPHA),
        arcType: Cesium.ArcType.NONE,
      },
    });
    orbitEntity._noradId = record.noradId;

    const sat = {
      record, orbit, entity, orbitEntity, classKey, classColor,
      path: null, sampledAt: 0,
    };
    this.sats.set(record.noradId, sat);
    this._resample(sat);
    return true;
  }

  removeSatellite(noradId) {
    const sat = this.sats.get(noradId);
    if (!sat) return;
    if (this.selectedId === noradId) this.select(null);
    if (this.hoveredId === noradId) this._setHovered(null);
    this.viewer.entities.remove(sat.entity);
    this.viewer.entities.remove(sat.orbitEntity);
    this.sats.delete(noradId);
  }

  /** Hot-swap a satellite's TLE after a live refresh. */
  updateTle(record) {
    const sat = this.sats.get(record.noradId);
    if (!sat) return;
    try {
      sat.orbit.setTle(record.tle1, record.tle2);
      sat.sampledAt = 0; // force path resample on next tick
    } catch (err) {
      console.warn('Rejected refreshed TLE for', record.name, err);
    }
  }

  getOrbit(noradId) {
    return this.sats.get(noradId)?.orbit ?? null;
  }

  getRecord(noradId) {
    return this.sats.get(noradId)?.record ?? null;
  }

  getClass(noradId) {
    return this.sats.get(noradId)?.classKey ?? 'other';
  }

  /** All tracked satellites, for the list UI. */
  all() {
    return [...this.sats.values()].map((s) => ({
      record: s.record,
      classKey: s.classKey,
      orbit: s.orbit,
    }));
  }

  setShowAllOrbits(show) {
    this.showAllOrbits = show;
    for (const sat of this.sats.values()) {
      sat.orbitEntity.show = show || sat.record.noradId === this.selectedId;
    }
  }

  select(noradId) {
    if (this.selectedId === noradId) return;
    const prev = this.sats.get(this.selectedId);
    if (prev) this._styleSat(prev, false);
    this.selectedId = noradId;
    const sat = this.sats.get(noradId);
    if (sat) this._styleSat(sat, true);
    this.onSelect?.(noradId ?? null);
  }

  deselect() {
    this.select(null);
  }

  flyTo(noradId) {
    const sat = this.sats.get(noradId);
    if (!sat) return;
    const p = sat.orbit.positionEcf(this.now());
    if (!p) return;
    const carto = Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3(p.x, p.y, p.z));
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        carto.longitude,
        carto.latitude,
        Math.max(carto.height * 3.2, 2.2e6),
      ),
      duration: 1.6,
    });
  }

  _styleSat(sat, selected) {
    sat.entity.point.color = selected ? COLOR_SELECTED : sat.classColor;
    sat.entity.point.pixelSize = selected ? 12 : 9;
    sat.entity.label.show = selected || sat.record.noradId === this.hoveredId;
    sat.orbitEntity.polyline.material = selected
      ? COLOR_ORBIT_SELECTED
      : sat.classColor.withAlpha(ORBIT_ALPHA);
    sat.orbitEntity.polyline.width = selected ? 2.2 : 1.2;
    sat.orbitEntity.show = this.showAllOrbits || selected;
  }

  _setHovered(noradId) {
    if (this.hoveredId === noradId) return;
    const prev = this.sats.get(this.hoveredId);
    if (prev) prev.entity.label.show = prev.record.noradId === this.selectedId;
    this.hoveredId = noradId;
    const sat = this.sats.get(noradId);
    if (sat) sat.entity.label.show = true;
    this.viewer.container.style.cursor = sat ? 'pointer' : 'default';
  }

  _installPicking() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction(({ position }) => {
      const picked = this.viewer.scene.pick(position);
      const id = picked?.id?._noradId;
      // Clicking a satellite (or its orbit) selects it; empty space deselects.
      this.select(id ?? null);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(({ endPosition }) => {
      const picked = this.viewer.scene.pick(endPosition);
      const id = picked?.id?._noradId;
      this._setHovered(this.sats.has(id) ? id : null);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /** Once a second: rotate every inertial path into the fixed frame at current GMST. */
  _updatePaths() {
    // Clock time, not wall time — orbit rings must follow time travel.
    const now = this.now();
    for (const sat of this.sats.values()) {
      if (!sat.path || now.getTime() - sat.sampledAt > PATH_RESAMPLE_MS) {
        this._resample(sat, now);
      }
      if (!sat.path || !(sat.orbitEntity.show ?? true)) continue;
      /* global satellite */
      const gmst = satellite.gstime(now);
      const cos = Math.cos(gmst);
      const sin = Math.sin(gmst);
      const fixed = sat.path.eci.map(
        (p) => new Cesium.Cartesian3(
          p.x * cos + p.y * sin,
          -p.x * sin + p.y * cos,
          p.z,
        ),
      );
      sat.orbitEntity.polyline.positions = fixed;
    }
  }

  _resample(sat, now = new Date()) {
    try {
      sat.path = sat.orbit.samplePath(now);
      sat.sampledAt = now.getTime();
    } catch {
      sat.path = null;
    }
  }

}

/** "ARCTIC WEATHER SATELLITE" → "Arctic Weather Satellite" for labels. */
export function displayName(name) {
  return name
    .toLowerCase()
    .replace(/(^|[\s-])\S/g, (c) => c.toUpperCase())
    .replace(/\bAissat\b/g, 'AISSat')
    .replace(/\bNorsat\b/g, 'NorSat')
    .replace(/\bArcsat\b/g, 'ArcSat')
    .replace(/\bHincube\b/g, 'HiNCube')
    .replace(/\bAsbm\b/g, 'ASBM')
    .replace(/\bHypso\b/g, 'HYPSO')
    .replace(/\bMimir\b/g, 'MIMIR')
    .replace(/\bCicero\b/g, 'CICERO');
}
