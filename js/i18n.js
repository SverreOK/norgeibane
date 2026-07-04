// Tiny i18n: NO/EN string tables, a t() lookup, and a change event so UI
// modules can re-render when the visitor toggles language.

const STRINGS = {
  no: {
    title: 'NORGE I BANE',
    subtitle: 'Norske satellitter i sanntid',
    loading: 'Laster jordkloden …',
    loadingTle: 'Henter banedata …',
    satellites: 'satellitter',
    utc: 'UTC',
    name: 'Navn',
    noradId: 'NORAD-ID',
    intlDes: 'Internasjonal betegnelse',
    operator: 'Operatør / eier',
    launchDate: 'Skutt opp',
    mission: 'Oppdrag',
    status: 'Status',
    active: 'Aktiv',
    inactive: 'Ikke operativ',
    altitude: 'Høyde',
    velocity: 'Hastighet',
    latitude: 'Breddegrad',
    longitude: 'Lengdegrad',
    inclination: 'Inklinasjon',
    period: 'Omløpstid',
    apogee: 'Apogeum',
    perigee: 'Perigeum',
    eccentricity: 'Eksentrisitet',
    groundPosition: 'Bakkeposisjon',
    overNorway: 'Over Norge nå',
    nearNorway: 'Nær Norge',
    notOverNorway: 'Ikke over Norge',
    rawTle: 'Rå TLE',
    liveOrbit: 'Banedata (sanntid)',
    elements: 'Baneelementer',
    coverage: 'Norgesdekning',
    coversYes: 'Passerer over Norge',
    coversNo: 'Står over ekvator — ser Norge fra sør',
    satListTitle: 'Satellitter',
    coffee: 'Spander en kaffe',
    minutes: 'min',
    close: 'Lukk',
    showOrbits: 'Vis alle baner',
    showInactive: 'Inkluder inaktive',
    showStations: 'Bakkestasjoner',
    now: 'NÅ',
    dataUpdated: 'TLE-epoke',
    unknownMission:
      'Norsk satellitt. Detaljert oppdragsbeskrivelse er ikke registrert ennå — banedata er live fra CelesTrak.',
    offline: 'Frakoblet — viser lagrede banedata',
    tleAge: 'Banedata kan være foreldet',
  },
  en: {
    title: 'NORGE I BANE',
    subtitle: 'Norwegian satellites in real time',
    loading: 'Loading the globe …',
    loadingTle: 'Fetching orbital data …',
    satellites: 'satellites',
    utc: 'UTC',
    name: 'Name',
    noradId: 'NORAD ID',
    intlDes: 'International designator',
    operator: 'Operator / owner',
    launchDate: 'Launched',
    mission: 'Mission',
    status: 'Status',
    active: 'Active',
    inactive: 'Non-operational',
    altitude: 'Altitude',
    velocity: 'Velocity',
    latitude: 'Latitude',
    longitude: 'Longitude',
    inclination: 'Inclination',
    period: 'Orbital period',
    apogee: 'Apogee',
    perigee: 'Perigee',
    eccentricity: 'Eccentricity',
    groundPosition: 'Ground position',
    overNorway: 'Over Norway now',
    nearNorway: 'Near Norway',
    notOverNorway: 'Not over Norway',
    rawTle: 'Raw TLE',
    liveOrbit: 'Orbital data (live)',
    elements: 'Orbital elements',
    coverage: 'Norway coverage',
    coversYes: 'Passes over Norway',
    coversNo: 'Sits over the equator — sees Norway from the south',
    satListTitle: 'Satellites',
    coffee: 'Buy me a coffee',
    minutes: 'min',
    close: 'Close',
    showOrbits: 'Show all orbits',
    showInactive: 'Include inactive',
    showStations: 'Ground stations',
    now: 'NOW',
    dataUpdated: 'TLE epoch',
    unknownMission:
      'Norwegian satellite. No detailed mission description registered yet — orbital data is live from CelesTrak.',
    offline: 'Offline — showing cached orbital data',
    tleAge: 'Orbital data may be stale',
  },
};

const LANG_KEY = 'norgeibane.lang';
let current = 'no';
const listeners = new Set();

export function initLanguage(defaultLanguage) {
  const saved = localStorage.getItem(LANG_KEY);
  current = saved === 'no' || saved === 'en' ? saved : defaultLanguage;
  document.documentElement.lang = current;
}

export function getLanguage() {
  return current;
}

export function setLanguage(lang) {
  if (lang === current || !STRINGS[lang]) return;
  current = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn(lang));
}

export function onLanguageChange(fn) {
  listeners.add(fn);
}

export function t(key) {
  return STRINGS[current][key] ?? STRINGS.en[key] ?? key;
}
