// Application entry point. Boot order is chosen for resilience:
//   1. bundled snapshot → globe renders immediately, even offline
//   2. live CelesTrak refresh in the background (fresh TLEs + discovery of
//      newly launched Norwegian satellites)

import { config } from './config-loader.js';
import { initLanguage, t } from './i18n.js';
import { loadSnapshot, refreshLive, isOperational } from './data/catalog.js';
import { createViewer } from './globe/viewer.js';
import { SatelliteLayer, displayName } from './globe/satellites.js';
import { GroundStations } from './globe/stations.js';
import { InfoPanel } from './ui/panel.js';
import { SatelliteList } from './ui/list.js';
import { Hud, loading } from './ui/hud.js';

const TLE_REFRESH_MS = 30 * 60 * 1000; // re-check caches every 30 min

async function boot() {
  initLanguage(config.defaultLanguage);
  loading.setText('loading');

  let includeInactive = config.includeInactive;
  let sats = [];

  const viewer = await createViewer('globe');

  const layer = new SatelliteLayer(viewer, {
    onSelect: (noradId) => {
      if (noradId != null) panel.show(noradId);
      else panel.hide();
      list.setActive(noradId);
      stations.setTarget(noradId);
      syncHash(noradId);
    },
  });
  layer.setShowAllOrbits(config.showAllOrbits);

  const stations = new GroundStations(viewer, layer);

  const panel = new InfoPanel(layer, { onClose: () => layer.deselect() });

  const list = new SatelliteList(layer, {
    onPick: (noradId) => {
      layer.select(noradId);
      layer.flyTo(noradId);
    },
  });

  const coffee = document.getElementById('coffee');
  if (config.coffeeUrl) coffee.href = config.coffeeUrl;
  else coffee.remove();

  // Debug handle (console / tests): window.norgeibane.viewer etc.
  window.norgeibane = { viewer, layer, config, refresh: (...a) => refresh(...a) };

  const hud = new Hud({
    initialOrbits: config.showAllOrbits,
    initialInactive: includeInactive,
    initialStations: true,
    onToggleOrbits: (v) => layer.setShowAllOrbits(v),
    onToggleInactive: (v) => {
      includeInactive = v;
      if (v) {
        refresh(); // discovers and adds the inactive satellites
      } else {
        for (const { record } of layer.all()) {
          if (!isOperational(record)) layer.removeSatellite(record.noradId);
        }
        hud.setCount(layer.count);
        list.render();
      }
    },
    onToggleStations: (v) => stations.setVisible(v),
    onSpeed: (mult) => { viewer.clock.multiplier = mult; },
    onNow: () => {
      viewer.clock.multiplier = 1;
      viewer.clock.currentTime = Cesium.JulianDate.now();
    },
    getTime: () => layer.now(),
  });

  // ── Deep links: #hypso-1 (name slug) or #51053 (NORAD ID) ──────────────
  const slugOf = (record) => displayName(record.name).toLowerCase().replace(/\s+/g, '-');
  let applyingHash = false;

  function syncHash(noradId) {
    if (applyingHash) return;
    const record = noradId != null ? layer.getRecord(noradId) : null;
    history.replaceState(null, '', record
      ? `#${slugOf(record)}`
      : window.location.pathname + window.location.search);
  }

  function applyHash(fly) {
    const hash = decodeURIComponent(window.location.hash.slice(1)).toLowerCase();
    if (!hash) return;
    const sat = layer.all().find(
      (s) => slugOf(s.record) === hash || String(s.record.noradId) === hash,
    );
    if (!sat || layer.selectedId === sat.record.noradId) return;
    applyingHash = true;
    layer.select(sat.record.noradId);
    applyingHash = false;
    if (fly) layer.flyTo(sat.record.noradId);
  }
  window.addEventListener('hashchange', () => applyHash(true));

  loading.setText('loadingTle');
  try {
    sats = await loadSnapshot();
  } catch (err) {
    console.error('Snapshot failed, relying on live data only:', err);
  }
  addAll();
  loading.hide();
  applyHash(true); // honor a shared #satellite link on first load

  async function addAll() {
    let added = 0;
    for (const sat of sats) {
      if (!sat.tle1) continue;
      if (!includeInactive && !isOperational(sat)) continue;
      if (layer.addSatellite(sat)) added++;
    }
    if (added) {
      hud.setCount(layer.count);
      list.render();
    }
  }

  // Serialize refreshes: a toggle can fire while the boot refresh is still
  // running, and two concurrent refreshLive() calls over the same array
  // could discover (and push) the same satellite twice.
  let refreshChain = Promise.resolve();
  function refresh() {
    refreshChain = refreshChain.then(doRefresh, doRefresh);
    return refreshChain;
  }

  async function doRefresh() {
    const { ok } = await refreshLive(
      sats,
      includeInactive,
      (rec) => {
        if (includeInactive || isOperational(rec)) {
          layer.addSatellite(rec);
          hud.setCount(layer.count);
          list.render();
        }
      },
      (rec) => layer.updateTle(rec),
    );
    hud.setStatus(ok ? null : 'offline');
    // Satellites from the snapshot that were filtered out before the toggle
    // flipped may now be eligible.
    addAll();
  }

  await refresh();
  setInterval(refresh, TLE_REFRESH_MS);
}

boot().catch((err) => {
  console.error(err);
  const el = document.querySelector('#loading .loading-text');
  if (el) el.textContent = `${t('loading')} — ${err.message}`;
});
