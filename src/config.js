// ---------------------------------------------------------------------------
// VIRKA Tippi — configuration
// ---------------------------------------------------------------------------

export const APP = {
  name: 'VIRKA Tippi',
  tagline: 'HM 2026 prediction league',
  // Used only for display; the real tournament data comes from the sync.
  edition: 'FIFA World Cup 2026',
  hosts: 'USA · Canada · Mexico',
};

// API-Football identifiers for the 2026 World Cup.
// league 1 = "World Cup", season 2026. See scripts/sync.mjs.
export const TOURNAMENT = {
  leagueId: 1,
  season: 2026,
};

// Locale used for date formatting in the UI.
export const LOCALE = 'en-GB';
export const TZ = undefined; // undefined = use the viewer's local timezone

export default APP;
