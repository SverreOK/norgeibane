// Satellite list sidebar: satellites grouped by class, click to select and
// fly to. Collapsible; starts collapsed on small screens.

import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { CLASSES, iconSvg } from '../data/classify.js';
import { displayName } from '../globe/satellites.js';

const CLASS_ORDER = ['maritime', 'science', 'geo', 'heo', 'other'];

export class SatelliteList {
  constructor(layer, { onPick } = {}) {
    this.layer = layer;
    this.onPick = onPick;
    this.el = document.getElementById('sat-list');
    this.bodyEl = this.el.querySelector('.list-body');
    this.toggleBtn = document.getElementById('list-toggle');

    this.toggleBtn.addEventListener('click', () => {
      this.el.classList.toggle('open');
      this.toggleBtn.classList.toggle('active', this.el.classList.contains('open'));
    });
    if (window.matchMedia('(min-width: 900px)').matches) {
      this.el.classList.add('open');
      this.toggleBtn.classList.add('active');
    }

    this.bodyEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-norad]');
      if (row) this.onPick?.(Number(row.dataset.norad));
    });

    onLanguageChange(() => this.render());
  }

  render() {
    const lang = getLanguage();
    const groups = new Map(CLASS_ORDER.map((k) => [k, []]));
    for (const sat of this.layer.all()) {
      (groups.get(sat.classKey) ?? groups.get('other')).push(sat);
    }

    let html = '';
    for (const [key, sats] of groups) {
      if (!sats.length) continue;
      sats.sort((a, b) => a.record.name.localeCompare(b.record.name));
      const cls = CLASSES[key];
      html += `
        <div class="list-group" style="--type-color: ${cls.color}">
          <div class="list-group-header">${iconSvg(key, 14)}<span>${cls.label[lang]}</span><em>${sats.length}</em></div>
          ${sats.map(({ record }) => `
            <button class="list-row ${record.noradId === this.layer.selectedId ? 'active' : ''}"
                    data-norad="${record.noradId}">
              <span class="list-dot"></span>
              <span class="list-name">${displayName(record.name)}</span>
              <span class="list-id">${record.noradId}</span>
            </button>`).join('')}
        </div>`;
    }
    this.bodyEl.innerHTML = html;
    this.el.querySelector('.list-title').textContent = t('satListTitle');
  }

  setActive(noradId) {
    for (const row of this.bodyEl.querySelectorAll('.list-row')) {
      row.classList.toggle('active', Number(row.dataset.norad) === noradId);
    }
  }
}
