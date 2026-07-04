// Satellite classification: type, per-type color and icon.
//
// Known satellites are classified explicitly by NORAD ID; anything newly
// discovered falls back to an orbit-based heuristic so future launches get a
// sensible class without a code change.

export const CLASSES = {
  maritime: {
    color: '#59d7ff', // ice blue
    label: { no: 'Maritim overvåking', en: 'Maritime surveillance' },
    icon: 'ship',
  },
  science: {
    color: '#3dffa2', // aurora green
    label: { no: 'Jordobservasjon og vitenskap', en: 'Earth observation & science' },
    icon: 'lens',
  },
  geo: {
    color: '#ffc46b', // amber
    label: { no: 'Geostasjonær kommunikasjon', en: 'Geostationary comms' },
    icon: 'dish',
  },
  heo: {
    color: '#b18bff', // violet
    label: { no: 'Arktisk bredbånd (HEO)', en: 'Arctic broadband (HEO)' },
    icon: 'orbit',
  },
  other: {
    color: '#ff7ab8', // pink
    label: { no: 'Teknologi og annet', en: 'Technology & other' },
    icon: 'flask',
  },
};

const BY_ID = {
  // Thor GEO fleet
  32487: 'geo', 36033: 'geo', 40613: 'geo',
  // Space Norway ASBM pair
  60422: 'heo', 60423: 'heo',
  // Earth observation / science
  51053: 'science', 60531: 'science', 60543: 'science',
  // Maritime surveillance (AIS / radar detection / low-light imaging)
  42826: 'maritime', 42828: 'maritime', 48272: 'maritime', 62702: 'maritime',
  36797: 'maritime', 40075: 'maritime', 68454: 'maritime',
  63252: 'maritime', 64566: 'maritime', 64567: 'maritime',
  55015: 'maritime', 55093: 'maritime',
  // Tech demos & misc
  52161: 'other', 68490: 'other', 39445: 'other', 42849: 'other',
};

/**
 * @param {object} record satellite record (noradId, name)
 * @param {{periodMin:number, eccentricity:number}} elements from SatelliteOrbit
 * @returns {string} class key into CLASSES
 */
export function classify(record, elements) {
  const known = BY_ID[record.noradId];
  if (known) return known;
  if (elements.periodMin > 1300) return 'geo';
  if (elements.eccentricity > 0.25) return 'heo';
  if (/AIS|NORSAT|ARVAKER|MARITIM/i.test(record.name)) return 'maritime';
  return 'other';
}

/** Inline SVG icons, stroke = currentColor so they inherit the class color. */
const ICONS = {
  ship: '<path d="M2 10.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4.5 8.5 5 5h5l1.5 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.5 5V3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  lens: '<circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><path d="M8 1.2v2.2M8 12.6v2.2M1.2 8h2.2M12.6 8h2.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  dish: '<path d="M3.5 7.5a5 5 0 0 0 5 5 5 5 0 0 0-5-5Z" fill="currentColor" opacity=".35"/><path d="M2.2 5.2a7.6 7.6 0 0 0 8.6 8.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12.2" cy="3.8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  orbit: '<ellipse cx="8" cy="8" rx="6.4" ry="3.1" transform="rotate(-24 8 8)" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.7" fill="currentColor" opacity=".45"/><circle cx="12.9" cy="4.4" r="1.5" fill="currentColor"/>',
  flask: '<path d="M6.2 2.5h3.6M7 2.5v3.4l-3.3 5.6a1.6 1.6 0 0 0 1.4 2.4h5.8a1.6 1.6 0 0 0 1.4-2.4L9 5.9V2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M5.2 10.2h5.6" stroke="currentColor" stroke-width="1.4"/>',
};

export function iconSvg(classKey, size = 16) {
  const cls = CLASSES[classKey] ?? CLASSES.other;
  return `<svg class="type-icon" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">${ICONS[cls.icon]}</svg>`;
}
