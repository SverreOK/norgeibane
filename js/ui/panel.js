// Info panel for the selected satellite. Static facts render once on
// selection; the live block (position, velocity, Norway status) refreshes at
// 1 Hz while the panel is open.

import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { missionFor } from '../data/missions.js';
import { CLASSES, iconSvg } from '../data/classify.js';
import { displayName } from '../globe/satellites.js';

export class InfoPanel {
  constructor(layer, { onClose } = {}) {
    this.layer = layer;
    this.onClose = onClose;
    this.noradId = null;
    this.el = document.getElementById('info-panel');
    this.el.querySelector('.panel-close').addEventListener('click', () => {
      this.onClose?.();
    });
    this._timer = null;
    onLanguageChange(() => {
      if (this.noradId != null) this.show(this.noradId);
    });
  }

  show(noradId) {
    const record = this.layer.getRecord(noradId);
    const orbit = this.layer.getOrbit(noradId);
    if (!record || !orbit) return this.hide();
    this.noradId = noradId;

    const lang = getLanguage();
    const mission = missionFor(noradId, lang);
    const el = orbit.elements();
    const classKey = this.layer.getClass(noradId);
    const cls = CLASSES[classKey];
    const operational = ['+', 'P', 'B', 'S', 'X'].includes(record.opsStatus);

    // Does this orbit ever pass over Norwegian latitudes (57–81°N)?
    const covers = classKey === 'geo' ? false : el.inclinationDeg > 57;

    this.el.style.setProperty('--type-color', cls.color);
    this.el.querySelector('.panel-type').innerHTML =
      `${iconSvg(classKey, 13)}<span>${cls.label[lang]}</span>`;
    this.el.querySelector('.panel-title').textContent = displayName(record.name);
    this.el.querySelector('.panel-subtitle').textContent =
      `${t('noradId')} ${record.noradId} · ${record.intlDes}`;

    this.el.querySelector('.panel-static').innerHTML = `
      <div class="fact-grid">
        ${fact(t('operator'), esc(mission?.operator ?? record.owner))}
        ${fact(t('launchDate'), esc(record.launchDate || '—'))}
        ${fact(t('status'), `<span class="badge ${operational ? 'badge-active' : 'badge-inactive'}">${operational ? t('active') : t('inactive')}</span>`)}
        ${fact(t('dataUpdated'), esc(el.epoch.toISOString().slice(0, 16).replace('T', ' ')) + ' UTC')}
      </div>
      <p class="mission">${esc(mission?.description ?? t('unknownMission'))}</p>
      <h3>${t('liveOrbit')}<span class="live-dot" aria-hidden="true"></span></h3>
      <div class="hero-grid">
        <div class="hero"><span class="hero-value" data-hero="alt">—</span><span class="hero-label">${t('altitude')}</span></div>
        <div class="hero"><span class="hero-value" data-hero="vel">—</span><span class="hero-label">${t('velocity')}</span></div>
      </div>
      <div class="norway-row">
        <span class="norway-coords" data-hero="coords">—</span>
        <span class="badge" data-hero="norway">—</span>
      </div>
      <div class="fact-grid coverage-grid">
        ${fact(t('coverage'), covers
          ? `<span class="cover-yes">${t('coversYes')}</span>`
          : `<span class="cover-no">${t('coversNo')}</span>`, 'fact-wide')}
      </div>
      <h3>${t('elements')}</h3>
      <div class="fact-grid">
        ${fact(t('inclination'), fmt(el.inclinationDeg, 2) + '°')}
        ${fact(t('period'), fmt(el.periodMin, 1) + ' ' + t('minutes'))}
        ${fact(t('apogee'), fmt(el.apogeeKm, 0) + ' km')}
        ${fact(t('perigee'), fmt(el.perigeeKm, 0) + ' km')}
        ${fact(t('eccentricity'), el.eccentricity.toFixed(5))}
      </div>
      <h3>${t('rawTle')}</h3>
      <pre class="tle">${esc(record.name)}\n${esc(record.tle1)}\n${esc(record.tle2)}</pre>
    `;

    this.el.classList.add('open');
    this._tickLive();
    clearInterval(this._timer);
    this._timer = setInterval(() => this._tickLive(), 1000);
  }

  hide() {
    this.noradId = null;
    clearInterval(this._timer);
    this._timer = null;
    this.el.classList.remove('open');
  }

  _tickLive() {
    if (this.noradId == null) return;
    const orbit = this.layer.getOrbit(this.noradId);
    if (!orbit) return;
    const s = orbit.state(this.layer.now());
    if (!s) return;

    const q = (name) => this.el.querySelector(`[data-hero="${name}"]`);
    q('alt').textContent = `${fmt(s.altitudeKm, 1)} km`;
    q('vel').textContent = `${fmt(s.velocityKmS, 2)} km/s`;
    q('coords').textContent = `${fmtLat(s.latitude)}  ·  ${fmtLon(s.longitude)}`;

    const badge = q('norway');
    const key = s.norway === 'over' ? 'overNorway' : s.norway === 'near' ? 'nearNorway' : 'notOverNorway';
    badge.textContent = t(key);
    badge.className = `badge ${s.norway === 'over' ? 'badge-norway' : s.norway === 'near' ? 'badge-near' : 'badge-plain'}`;
  }
}

function fact(label, valueHtml, extraClass = '') {
  return `<div class="fact ${extraClass}"><span class="fact-label">${label}</span><span class="fact-value">${valueHtml}</span></div>`;
}

function fmt(n, digits) {
  return Number(n).toLocaleString(getLanguage() === 'no' ? 'nb-NO' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtLat(lat) {
  return `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
}

function fmtLon(lon) {
  return `${Math.abs(lon).toFixed(3)}°${lon >= 0 ? 'E' : 'W'}`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
