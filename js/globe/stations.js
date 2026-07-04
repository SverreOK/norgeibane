// Norwegian ground infrastructure: KSAT's global ground-station network,
// Space Norway/Telenor teleports and Andøya Spaceport. When a satellite is
// selected, an aurora-green link line is drawn from every station that
// currently sees it above 5° elevation — KSAT's pole-to-pole network
// (SvalSat + TrollSat) is exactly why Norwegian satellites fly polar orbits:
// they get a download opportunity on nearly every revolution.

/* global Cesium, satellite */

const MIN_ELEVATION_DEG = 5;

// Categories drive marker styling:
//   norway   — KSAT/Norwegian sites on Norwegian soil (bright)
//   global   — KSAT network sites abroad (smaller, dimmer, labels fade first)
//   launch   — spaceport (red)
//   teleport — GEO/HEO teleports (amber)
const CATEGORY_STYLE = {
  norway: { accent: '#3dffa2', ring: '#eef6fc', scale: 1.0, labelAlpha: 0.85 },
  global: { accent: '#59d7ff', ring: '#9fb8cb', scale: 0.8, labelAlpha: 0.6 },
  launch: { accent: '#ff3b3d', ring: '#eef6fc', scale: 1.0, labelAlpha: 0.85 },
  teleport: { accent: '#ffc46b', ring: '#eef6fc', scale: 0.9, labelAlpha: 0.75 },
};

// Station list is data-only. Sources: ksat.no ground-network pages,
// Wikipedia (Kongsberg Satellite Services), eoPortal, spacenorway.com,
// andoyaspace.no — cross-verified July 2026. City-level coordinates.
const STATIONS = [
  // KSAT — Norwegian soil
  { name: 'SvalSat', lat: 78.23, lon: 15.39, altM: 450, cat: 'norway' },
  { name: 'Tromsø', lat: 69.66, lon: 18.94, altM: 100, cat: 'norway' },
  { name: 'Vardø', lat: 70.37, lon: 31.11, altM: 20, cat: 'norway' },
  { name: 'TrollSat', lat: -72.02, lon: 2.53, altM: 1270, cat: 'norway' },
  // KSAT — global network
  { name: 'Inuvik', lat: 68.36, lon: -133.72, altM: 60, cat: 'global' },
  { name: 'Nuuk', lat: 64.18, lon: -51.72, altM: 40, cat: 'global' },
  { name: 'Fairbanks', lat: 64.75, lon: -147.35, altM: 150, cat: 'global' },
  { name: 'Puertollano', lat: 38.69, lon: -4.11, altM: 700, cat: 'global' },
  { name: 'Nemea', lat: 37.82, lon: 22.66, altM: 300, cat: 'global' },
  { name: 'Panama', lat: 9.0, lon: -79.5, altM: 30, cat: 'global' },
  { name: 'Punta Arenas', lat: -53.16, lon: -70.92, altM: 40, cat: 'global' },
  { name: 'Hartebeesthoek', lat: -25.89, lon: 27.69, altM: 1540, cat: 'global' },
  { name: 'Mauritius', lat: -20.3, lon: 57.5, altM: 100, cat: 'global' },
  { name: 'Dubai', lat: 25.2, lon: 55.3, altM: 10, cat: 'global' },
  { name: 'Singapore', lat: 1.35, lon: 103.8, altM: 20, cat: 'global' },
  { name: 'Tokyo', lat: 35.68, lon: 139.7, altM: 40, cat: 'global' },
  { name: 'Awarua', lat: -46.53, lon: 168.4, altM: 10, cat: 'global' },
  { name: 'Hawaii (South Point)', lat: 19.02, lon: -155.68, altM: 300, cat: 'global' },
  { name: 'Los Angeles', lat: 33.8, lon: -118.2, altM: 20, cat: 'global' },
  // KSATlite partner-hosted sites
  { name: 'Jeju', lat: 33.4, lon: 126.5, altM: 100, cat: 'global' },
  { name: 'Bangalore', lat: 12.97, lon: 77.6, altM: 900, cat: 'global' },
  { name: 'Azorene', lat: 37.74, lon: -25.68, altM: 100, cat: 'global' },
  { name: 'Córdoba', lat: -31.4, lon: -64.2, altM: 400, cat: 'global' },
  { name: 'Tolhuin', lat: -54.5, lon: -67.2, altM: 100, cat: 'global' },
  // Other Norwegian-owned infrastructure
  { name: 'Andøya Spaceport', lat: 69.29, lon: 16.02, altM: 10, cat: 'launch' },
  { name: 'Nittedal teleport', lat: 60.05, lon: 10.87, altM: 200, cat: 'teleport' },
  { name: 'Eik teleport', lat: 58.77, lon: 5.56, altM: 60, cat: 'teleport' },
];

const LINK_COLOR = Cesium.Color.fromCssColorString('#3dffa2');

function stationBillboard(style) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
    <circle cx="11" cy="11" r="9" fill="none" stroke="${style.ring}" stroke-width="1.3" opacity="0.55"/>
    <circle cx="11" cy="11" r="3.2" fill="${style.accent}"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class GroundStations {
  constructor(viewer, layer) {
    this.viewer = viewer;
    this.layer = layer;
    this.targetId = null;
    this.visible = true;
    this.entities = [];

    for (const st of STATIONS) this._addStation(st);
  }

  _addStation(st) {
    const style = CATEGORY_STYLE[st.cat] ?? CATEGORY_STYLE.global;
    const position = Cesium.Cartesian3.fromDegrees(st.lon, st.lat, st.altM);
    // Observer in the geodetic form satellite.js expects (radians / km).
    const observerGd = {
      longitude: (st.lon * Math.PI) / 180,
      latitude: (st.lat * Math.PI) / 180,
      height: st.altM / 1000,
    };

    const marker = this.viewer.entities.add({
      position,
      billboard: {
        image: stationBillboard(style),
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        scaleByDistance: new Cesium.NearFarScalar(2e6, style.scale, 4e7, 0.5 * style.scale),
      },
      label: {
        text: st.name,
        font: '11px ui-monospace, "SF Mono", Menlo, monospace',
        fillColor: Cesium.Color.fromCssColorString('#c6d8e6').withAlpha(style.labelAlpha),
        outlineColor: Cesium.Color.fromCssColorString('#04070d'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, 16),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        scaleByDistance: new Cesium.NearFarScalar(2e6, 1.0, 4e7, 0.65),
        // Global-network labels disappear when zoomed far out to avoid clutter.
        distanceDisplayCondition: st.cat === 'global'
          ? new Cesium.DistanceDisplayCondition(0, 2.5e7)
          : undefined,
      },
    });

    // Station → selected-satellite sight line, evaluated per frame so it
    // stays glued to the moving satellite (empty = hidden).
    const link = this.viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(
          () => this._linkPositions(observerGd, position),
          false,
        ),
        width: 5,
        material: new Cesium.PolylineGlowMaterialProperty({
          color: LINK_COLOR.withAlpha(0.75),
          glowPower: 0.28,
        }),
        arcType: Cesium.ArcType.NONE,
      },
    });

    this.entities.push({ marker, link });
  }

  /** noradId or null — which satellite the sight lines point at. */
  setTarget(noradId) {
    this.targetId = noradId;
  }

  setVisible(visible) {
    this.visible = visible;
    for (const { marker } of this.entities) marker.show = visible;
    // Links hide themselves via _linkPositions when not visible.
  }

  _linkPositions(observerGd, stationPos) {
    if (!this.visible || this.targetId == null) return [];
    const orbit = this.layer.getOrbit(this.targetId);
    if (!orbit) return [];
    const p = orbit.positionEcf(this.layer.now());
    if (!p) return [];
    const look = satellite.ecfToLookAngles(observerGd, {
      x: p.x / 1000, y: p.y / 1000, z: p.z / 1000,
    });
    if ((look.elevation * 180) / Math.PI < MIN_ELEVATION_DEG) return [];
    return [stationPos, new Cesium.Cartesian3(p.x, p.y, p.z)];
  }
}
