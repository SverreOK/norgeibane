// HUD: header (title, UTC clock, satellite count), settings toggles and the
// language switcher. All text re-renders on language change.

import { t, getLanguage, setLanguage, onLanguageChange } from '../i18n.js';

export class Hud {
  constructor({
    onToggleOrbits, onToggleInactive, onToggleStations, onSpeed, onNow,
    getTime, initialOrbits, initialInactive, initialStations,
  }) {
    this.count = 0;
    this.statusKey = null;
    this.getTime = getTime ?? (() => new Date());
    this.warped = false;

    document.getElementById('toggle-orbits').checked = initialOrbits;
    document.getElementById('toggle-inactive').checked = initialInactive;
    document.getElementById('toggle-stations').checked = initialStations ?? true;
    document.getElementById('toggle-orbits')
      .addEventListener('change', (e) => onToggleOrbits(e.target.checked));
    document.getElementById('toggle-inactive')
      .addEventListener('change', (e) => onToggleInactive(e.target.checked));
    document.getElementById('toggle-stations')
      .addEventListener('change', (e) => onToggleStations?.(e.target.checked));

    for (const btn of document.querySelectorAll('.lang-btn')) {
      btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    }

    // Time-travel control: speed buttons + "now" re-sync.
    const speedBtns = document.querySelectorAll('.time-btn[data-speed]');
    const setActive = (speed) => {
      this.warped = speed !== 1;
      document.getElementById('utc-clock').classList.toggle('warped', this.warped);
      for (const b of speedBtns) b.classList.toggle('active', Number(b.dataset.speed) === speed);
    };
    for (const btn of speedBtns) {
      btn.addEventListener('click', () => {
        onSpeed?.(Number(btn.dataset.speed));
        setActive(Number(btn.dataset.speed));
      });
    }
    document.querySelector('[data-now]').addEventListener('click', () => {
      onNow?.();
      setActive(1);
    });

    onLanguageChange(() => this.renderText());
    this.renderText();
    this._clock();
    setInterval(() => this._clock(), 250);
  }

  renderText() {
    document.querySelector('.hud-subtitle').textContent = t('subtitle');
    document.querySelector('[for="toggle-orbits"] span').textContent = t('showOrbits');
    document.querySelector('[for="toggle-inactive"] span').textContent = t('showInactive');
    document.querySelector('[for="toggle-stations"] span').textContent = t('showStations');
    document.querySelector('.time-now').textContent = t('now');
    const coffeeText = document.querySelector('#coffee .coffee-text');
    if (coffeeText) coffeeText.textContent = t('coffee'); // button is removed when coffeeUrl is empty
    for (const btn of document.querySelectorAll('.lang-btn')) {
      btn.classList.toggle('active', btn.dataset.lang === getLanguage());
    }
    this.setCount(this.count);
    this._renderStatus();
  }

  setCount(n) {
    this.count = n;
    document.getElementById('sat-count').textContent = `${n} ${t('satellites')}`;
  }

  /** Show a persistent status notice (i18n key), or null to clear. */
  setStatus(key) {
    this.statusKey = key;
    this._renderStatus();
  }

  _renderStatus() {
    const el = document.getElementById('hud-status');
    el.textContent = this.statusKey ? t(this.statusKey) : '';
    el.style.display = this.statusKey ? '' : 'none';
  }

  _clock() {
    const now = this.getTime();
    const el = document.getElementById('utc-clock');
    // When time-warped, show the date too — the time alone looks "wrong".
    el.textContent = this.warped
      ? `${now.toISOString().slice(0, 19).replace('T', ' ')} ${t('utc')}`
      : `${now.toISOString().slice(11, 19)} ${t('utc')}`;
  }
}

/** Loading overlay control. */
export const loading = {
  setText(key) {
    const el = document.querySelector('#loading .loading-text');
    if (el) el.textContent = t(key);
  },
  hide() {
    const el = document.getElementById('loading');
    el.classList.add('done');
    setTimeout(() => el.remove(), 700);
  },
};
