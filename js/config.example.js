// norgeibane.no configuration.
//
// Copy this file to js/config.js (done automatically by `npm run setup`)
// and edit. js/config.js is gitignored so your token stays out of git.

export default {
  // Cesium Ion access token (free account: https://ion.cesium.com/tokens).
  // With a token: Bing Maps Aerial imagery + Cesium World Terrain + Ion night lights.
  // Without (empty string): EOX Sentinel-2 cloudless + NASA GIBS Black Marble,
  // no terrain elevation. The site works either way.
  ionToken: '',

  // 'no' or 'en'. The visitor can toggle in the UI (persisted in localStorage).
  defaultLanguage: 'no',

  // Show every satellite's orbit path (thin lines). The selected satellite's
  // orbit is always shown highlighted regardless of this setting.
  showAllOrbits: true,

  // Also load Norwegian satellites that are in orbit but no longer operational
  // (e.g. AISSat-1/2). Toggleable in the UI as well.
  includeInactive: false,

  // EOX Sentinel-2 cloudless mosaic year (no-token imagery). 2018+ mosaics are
  // CC BY-NC-SA (non-commercial); use 's2cloudless-2016'/'s2cloudless-2017'
  // (CC BY) if you need a permissive license.
  eoxLayer: 's2cloudless-2025',

  // Cache lifetimes (ms). CelesTrak asks clients not to re-fetch TLEs more
  // than every 2 hours; new Norwegian launches are rare, so discovery of the
  // satellite list itself is weekly.
  tleTtlMs: 2 * 3600 * 1000,
  discoveryTtlMs: 7 * 24 * 3600 * 1000,

  // Donation link for the ☕ button (Buy Me a Coffee, Ko-fi, Vipps link …).
  // Empty string hides the button. Set your real link here before deploying.
  coffeeUrl: '',

  // Optional CORS/cache proxy prefix (see proxy/proxy.mjs and README).
  // Example: 'https://norgeibane.no/celestrak?url='. Empty = direct requests
  // to celestrak.org (works: CelesTrak sends CORS headers).
  proxyBase: '',
};
