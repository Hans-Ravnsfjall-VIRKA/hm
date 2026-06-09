// ---------------------------------------------------------------------------
// VIRKA Tippi - data sync (ESPN public feed)
//
// Pulls World Cup 2026 fixtures + live scores from ESPN's public scoreboard.
// No API key required. Clients only ever READ Firestore; this script is the
// only writer. Knockout fixtures appear automatically as ESPN publishes them,
// which is what drives the "next stage opens on its own" behaviour.
//
// Run locally to seed:  npm run sync
// Credentials: GOOGLE_APPLICATION_CREDENTIALS (local) or
//              FIREBASE_SERVICE_ACCOUNT (base64, for CI).
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const LEAGUE = process.env.ESPN_LEAGUE || 'fifa.world';

// The tournament window, fetched in chunks so ESPN never caps a single range.
const RANGES = (process.env.WC_RANGES || '20260611-20260620,20260620-20260630,20260630-20260710,20260710-20260721')
  .split(',')
  .map((r) => r.trim());

function scoreboardUrl(range) {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard?dates=${range}&limit=1000`;
}

// --- Firebase admin init ---------------------------------------------------
function initFirebase() {
  if (admin.apps.length) return admin.app();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(json), projectId: json.project_id });
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(json), projectId: json.project_id });
  }

  console.error('No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

// --- Stage mapping ---------------------------------------------------------
// Map ESPN's season slug to our stage ids. Order matters: quarter/semi finals
// contain the word "final", so they are checked before the final itself.
function stageFromSlug(slug = '') {
  const s = slug.toLowerCase();
  if (s.includes('group')) return 'group';
  if (s.includes('32')) return 'r32';
  if (s.includes('16')) return 'r16';
  if (s.includes('quarter')) return 'qf';
  if (s.includes('semi')) return 'sf';
  if (s.includes('third') || s.includes('3rd')) return 'third';
  if (s.includes('final')) return 'final';
  return 'group';
}

// --- Normalize one ESPN event into our match document ----------------------
function normalizeEvent(ev) {
  const comp = ev.competitions?.[0] || {};
  const stype = comp.status?.type || {};
  const state = stype.state;          // 'pre' | 'in' | 'post'
  const live = state === 'in';
  const finished = state === 'post' && !!stype.completed;
  const kickoff = ev.date ? Date.parse(ev.date) : null;
  const slug = ev.season?.slug || '';
  const stageId = stageFromSlug(slug);

  const sideBy = (which) =>
    comp.competitors?.find((c) => c.homeAway === which)
    || comp.competitors?.[which === 'home' ? 0 : 1];
  const home = sideBy('home');
  const away = sideBy('away');

  const team = (c) => ({
    id: c?.team?.id ?? null,
    name: c?.team?.displayName ?? 'TBD',
    code: c?.team?.abbreviation ?? null,
    flag: c?.team?.logo ?? null,
  });

  const num = (c) => {
    const n = parseInt(c?.score, 10);
    return Number.isFinite(n) ? n : null;
  };
  const result = (live || finished) && num(home) != null && num(away) != null
    ? { h: num(home), a: num(away) }
    : null;

  let status = 'NS';
  if (finished) status = 'FT';
  else if (live) status = 'LIVE';

  return {
    id: String(ev.id),
    stageId,
    round: slug,
    matchday: slug,
    group: null, // ESPN scoreboard does not tag group letters
    kickoff,
    date: ev.date || null,
    venue: comp.venue?.fullName || null,
    city: comp.venue?.address?.city || null,
    homeTeam: team(home),
    awayTeam: team(away),
    status,
    live,
    finished,
    elapsed: comp.status?.clock ? Math.round(comp.status.clock / 60) : null,
    result,
  };
}

async function fetchRange(range) {
  const res = await fetch(scoreboardUrl(range), { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`ESPN ${range} -> ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.events || [];
}

// --- Main ------------------------------------------------------------------
async function main() {
  initFirebase();
  const db = admin.firestore();
  console.log(`Writing to Firestore project: ${admin.app().options.projectId || '(default)'}`);

  // Fetch each window and dedupe by event id.
  const byId = new Map();
  for (const range of RANGES) {
    console.log(`Fetching ESPN scoreboard ${range} ...`);
    const events = await fetchRange(range);
    for (const ev of events) byId.set(String(ev.id), ev);
  }
  const events = [...byId.values()];
  console.log(`Got ${events.length} matches.`);
  if (!events.length) console.warn('No events returned. Check the date range / league slug.');

  let written = 0;
  const list = events.map(normalizeEvent);
  for (let i = 0; i < list.length; i += 400) {
    const batch = db.batch();
    for (const m of list.slice(i, i + 400)) {
      batch.set(db.collection('matches').doc(m.id), m, { merge: true });
      written += 1;
    }
    await batch.commit();
  }

  await db.collection('meta').doc('state').set({
    lastSync: Date.now(),
    source: 'espn',
    matchCount: written,
    version: 2,
  }, { merge: true });

  console.log(`Synced ${written} matches. Done.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
