// Curated mission metadata for known Norwegian satellites, keyed by NORAD ID.
// Mission descriptions are not available from any live catalog API, so this
// is the one hand-maintained table in the project. Satellites discovered
// dynamically that are missing here still work — they get a generic
// description (see i18n key 'unknownMission') while orbits stay live.

export const MISSIONS = {
  // ── GEO communications (Telenor) ──────────────────────────────────────
  32487: {
    operator: 'Telenor Satellite',
    no: 'Geostasjonær kommunikasjonssatellitt ved ca. 1°V. Kringkasting og datatjenester for Norden og Europa.',
    en: 'Geostationary communications satellite at ~1°W. Broadcast and data services for the Nordics and Europe.',
  },
  36033: {
    operator: 'Telenor Satellite',
    no: 'Geostasjonær kringkastingssatellitt ved ca. 1°V, hoveddistribusjon av TV for Norden og Sentral-Europa.',
    en: 'Geostationary broadcast satellite at ~1°W, primary TV distribution for the Nordics and Central Europe.',
  },
  40613: {
    operator: 'Telenor Satellite',
    no: 'Geostasjonær satellitt ved ca. 1°V med Ka-bånd HTS-kapasitet, bl.a. maritimt bredbånd i Nordsjøen og Nord-Atlanteren.',
    en: 'Geostationary satellite at ~1°W with Ka-band HTS capacity, incl. maritime broadband over the North Sea and North Atlantic.',
  },

  // ── NorSat series (Norwegian Space Agency / FFI) ──────────────────────
  42826: {
    operator: 'Norsk Romsenter / UTIAS-SFL',
    no: 'Vitenskaps- og AIS-satellitt: måler solinnstråling og plasma (Langmuir-prober) og sporer skipstrafikk.',
    en: 'Science and AIS microsatellite: measures total solar irradiance and plasma (Langmuir probes) and tracks ship traffic.',
  },
  42828: {
    operator: 'Norsk Romsenter / Space Norway',
    no: 'AIS-skipssporing og demonstrasjon av VDES (VHF Data Exchange System) for toveis maritim kommunikasjon.',
    en: 'AIS ship tracking and demonstration of VDES (VHF Data Exchange System) for two-way maritime communication.',
  },
  48272: {
    operator: 'Norsk Romsenter / FFI',
    no: 'Maritim overvåking: AIS-mottaker og eksperimentell deteksjon av navigasjonsradar for å avdekke fartøy som ikke sender AIS.',
    en: 'Maritime surveillance: AIS receiver plus an experimental navigation-radar detector to reveal vessels not transmitting AIS.',
  },
  62702: {
    operator: 'Norsk Romsenter / FFI',
    no: 'Maritim overvåking med AIS-mottaker og lavlys-kamera for deteksjon av fartøy i mørke og polarnatt.',
    en: 'Maritime surveillance with an AIS receiver and a low-light camera for detecting vessels in darkness and polar night.',
  },

  // ── HYPSO (NTNU SmallSat Lab) ─────────────────────────────────────────
  51053: {
    operator: 'NTNU SmallSat Lab',
    no: 'Hyperspektral avbildning av havfarge for å overvåke algeoppblomstring langs kysten. NTNUs første satellitt.',
    en: 'Hyperspectral ocean-colour imaging to monitor algal blooms along the coast. NTNU’s first satellite.',
  },
  60531: {
    operator: 'NTNU SmallSat Lab',
    no: 'Oppfølgeren til HYPSO-1: hyperspektral havovervåking med forbedret kamera og programvaredefinert radio.',
    en: 'Successor to HYPSO-1: hyperspectral ocean monitoring with an improved imager and a software-defined radio.',
  },

  // ── FFI / military experiments ────────────────────────────────────────
  52161: {
    operator: 'FFI',
    no: 'Eksperimentell militær kommunikasjonssatellitt (UHF) for testing av samband i nordområdene.',
    en: 'Experimental military communications cubesat (UHF) testing connectivity in the High North.',
  },
  55015: {
    operator: 'FFI / NLR (Norge–Nederland)',
    no: 'Militær maritim overvåkingssatellitt i norsk-nederlandsk samarbeid, navngitt etter Kristian Birkeland.',
    en: 'Military maritime-surveillance smallsat in a Norwegian–Dutch cooperation, named after Kristian Birkeland.',
  },
  55093: {
    operator: 'FFI / NLR (Norge–Nederland)',
    no: 'Tvillingsatellitten til Birkeland i det norsk-nederlandske overvåkingsparet, navngitt etter Christiaan Huygens.',
    en: 'Twin of Birkeland in the Norwegian–Dutch surveillance pair, named after Christiaan Huygens.',
  },

  // ── Space Norway HEO broadband ────────────────────────────────────────
  60422: {
    operator: 'Space Norway',
    no: 'Arctic Satellite Broadband Mission: bredbånd til Arktis fra høyelliptisk bane (tre-apogeum), med nyttelaster for Viasat og det amerikanske romforsvaret.',
    en: 'Arctic Satellite Broadband Mission: broadband for the Arctic from a highly elliptical orbit, carrying payloads for Viasat and the US Space Force.',
  },
  60423: {
    operator: 'Space Norway',
    no: 'Andre satellitt i ASBM-paret — sammen gir de kontinuerlig bredbåndsdekning over polområdene.',
    en: 'Second satellite of the ASBM pair — together they provide continuous broadband coverage over the polar regions.',
  },

  // ── Other ─────────────────────────────────────────────────────────────
  60543: {
    operator: 'ESA (norskregistrert)',
    no: 'Arctic Weather Satellite: prototype for mikrobølgesondering av atmosfæren, for bedre værvarsling i Arktis.',
    en: 'Arctic Weather Satellite: prototype microwave sounder for improved weather forecasting in the Arctic.',
  },
  63252: {
    operator: 'Kongsberg Defence & Aerospace',
    no: 'Del av Kongsbergs mikrosatellitt-konstellasjon for maritim overvåking av norske havområder.',
    en: 'Part of Kongsberg’s microsatellite constellation for maritime surveillance of Norwegian waters.',
  },
  64566: {
    operator: 'Kongsberg Defence & Aerospace',
    no: 'Del av Kongsbergs mikrosatellitt-konstellasjon for maritim overvåking av norske havområder.',
    en: 'Part of Kongsberg’s microsatellite constellation for maritime surveillance of Norwegian waters.',
  },
  64567: {
    operator: 'Kongsberg Defence & Aerospace',
    no: 'Del av Kongsbergs mikrosatellitt-konstellasjon for maritim overvåking av norske havområder.',
    en: 'Part of Kongsberg’s microsatellite constellation for maritime surveillance of Norwegian waters.',
  },
  68454: {
    operator: 'FFI / Kystverket',
    no: 'Videreføring av AISSat-serien for sporing av skipstrafikk i norske farvann.',
    en: 'Continuation of the AISSat series for tracking ship traffic in Norwegian waters.',
  },

  // ── Non-operational (shown with the "include inactive" toggle) ────────
  36797: {
    operator: 'FFI / Kystverket',
    no: 'Norges første nasjonale satellitt (2010): AIS-skipssporing i nordområdene. Ikke lenger operativ.',
    en: 'Norway’s first national satellite (2010): AIS ship tracking in the High North. No longer operational.',
  },
  40075: {
    operator: 'FFI / Kystverket',
    no: 'Oppfølgeren til AISSat-1 for AIS-skipssporing. Ikke lenger operativ.',
    en: 'Successor to AISSat-1 for AIS ship tracking. No longer operational.',
  },
};

export function missionFor(noradId, lang) {
  const m = MISSIONS[noradId];
  if (!m) return null;
  return { operator: m.operator, description: m[lang] ?? m.en };
}
