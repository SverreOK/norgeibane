// Cesium viewer setup: imagery, terrain, atmosphere and day/night lighting.
//
// Two imagery paths, chosen by whether an Ion token is configured:
//   Ion token   → Bing Maps Aerial (createWorldImageryAsync) + Cesium World
//                 Terrain + Ion "Earth at Night" (asset 3812).
//   No token    → EOX Sentinel-2 cloudless WMTS + NASA GIBS VIIRS Black
//                 Marble WMTS, smooth ellipsoid (no terrain). No keys needed.
//
// Day/night: the night-lights layer sits on top with dayAlpha = 0, and
// globe.enableLighting = true makes Cesium light the globe from the real sun
// position for the clock's current UTC time — dayAlpha/nightAlpha only take
// effect when enableLighting is on. The terminator therefore sits exactly
// where it is in reality right now.

/* global Cesium */

import { config } from '../config-loader.js';

export async function createViewer(containerId) {
  const hasToken = Boolean(config.ionToken);
  if (hasToken) {
    Cesium.Ion.defaultAccessToken = config.ionToken;
  }

  const viewer = new Cesium.Viewer(containerId, {
    baseLayer: false, // imagery added explicitly below
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false, // we render our own panel
    selectionIndicator: false,
    requestRenderMode: false, // satellites move every frame
  });

  // Real-time clock with time-travel support: advances with real seconds ×
  // multiplier (1 = live). The "now" button in the HUD re-syncs to UTC.
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;

  const globe = viewer.scene.globe;
  globe.enableLighting = true;
  globe.dynamicAtmosphereLighting = true;
  globe.dynamicAtmosphereLightingFromSun = true;
  globe.showGroundAtmosphere = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.sun.show = true;
  viewer.scene.moon.show = true;

  const layers = viewer.imageryLayers;

  if (hasToken) {
    // Day: Bing Maps Aerial via Ion. Terrain: Cesium World Terrain.
    layers.addImageryProvider(
      await Cesium.createWorldImageryAsync({
        style: Cesium.IonWorldImageryStyle.AERIAL,
      }),
    );
    viewer.scene.setTerrain(
      new Cesium.Terrain(Cesium.createWorldTerrainAsync()),
    );
    // Night: NASA Black Marble hosted on Ion (asset 3812).
    const night = layers.addImageryProvider(
      await Cesium.IonImageryProvider.fromAssetId(3812),
    );
    tuneNightLayer(night);
  } else {
    // Day: EOX Sentinel-2 cloudless (10 m global mosaic, no key).
    layers.addImageryProvider(
      new Cesium.WebMapTileServiceImageryProvider({
        url: `https://tiles.maps.eox.at/wmts/1.0.0/${config.eoxLayer}/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg`,
        layer: config.eoxLayer,
        style: 'default',
        format: 'image/jpeg',
        tileMatrixSetID: 'WGS84',
        tilingScheme: new Cesium.GeographicTilingScheme(),
        maximumLevel: 17,
        credit: new Cesium.Credit(
          'Sentinel-2 cloudless by <a href="https://s2maps.eu">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data)',
          true,
        ),
      }),
    );
    // Night: NASA Black Marble city lights, served by EOX on the SAME
    // standard WGS84 pyramid as the day layer, so both align pixel-perfect.
    // (NASA GIBS's own WMTS was tried first, but its "500m" matrix set is a
    // non-power-of-two pyramid — 2×1, 3×2, 5×3, 10×5 … — which Cesium's
    // GeographicTilingScheme cannot represent: tiles land at wrong
    // longitudes beyond level 0, shifting continents.)
    const night = layers.addImageryProvider(
      new Cesium.WebMapTileServiceImageryProvider({
        url: 'https://tiles.maps.eox.at/wmts/1.0.0/blackmarble/default/WGS84/{TileMatrix}/{TileRow}/{TileCol}.jpg',
        layer: 'blackmarble',
        style: 'default',
        format: 'image/jpeg',
        tileMatrixSetID: 'WGS84',
        tilingScheme: new Cesium.GeographicTilingScheme(),
        maximumLevel: 8, // Black Marble is ~500 m native — deeper adds nothing
        credit: new Cesium.Credit('Black Marble © NASA Earth Observatory, served by EOX', false),
      }),
    );
    tuneNightLayer(night);
  }

  // Start over the North Atlantic with Norway in view.
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(10.0, 55.0, 2.6e7),
  });

  return viewer;
}

function tuneNightLayer(layer) {
  // Plain day/night blending: the night layer fades in where the globe is
  // unlit. Do NOT try colorToAlpha keying here — Black Marble JPEGs are dark
  // navy with compression noise rather than pure black, so a key threshold
  // leaves patchy holes where the day imagery bleeds through at close zoom.
  layer.dayAlpha = 0.0;
  layer.nightAlpha = 1.0;
  layer.brightness = 1.3; // lift the city lights slightly
}
