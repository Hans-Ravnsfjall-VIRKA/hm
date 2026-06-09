# VIRKA Tippi

In-house **FIFA World Cup 2026** prediction league for VIRKA. React + Firebase, hosted on GitHub Pages. Players register, predict every match of a stage before that stage kicks off, and watch a live leaderboard as results come in. Everyone can see everyone else's predictions.

---

## How it works

- **Register / sign in** with email + password (Firebase Auth).
- **Predict** a whole stage at once. The group stage locks the moment the first match kicks off (11 June 2026); each knockout round locks at its own first kickoff.
- **Knockout rounds appear automatically.** As the group stage finishes, the data sync writes the real knockout fixtures, and they open for prediction with no admin action.
- **Live scores + standings** update from the data sync. Group tables are computed from results, so they always match what you see.
- **Everyone is transparent.** Each player's picks for a locked match are visible to all.

### Scoring

| Outcome | Points |
| --- | --- |
| Wrong winner / wrong draw | 0 |
| Correct outcome (right winner, or correctly a draw) | 3 |
| Correct outcome + one team's exact goals | 4 |
| Exact scoreline | 6 |
| Exact scoreline, total goals above 4 | 6 **+1 per goal over 4** |

So an exact `3-2` (total 5) scores 7; an exact `4-2` (total 6) scores 8; an exact `2-2` scores 6. The bonus only applies when the scoreline is exact.

Knockout matches are scored on the **fulltime (90-minute / regulation)** scoreline, not the penalty shootout. This is set in `scripts/sync.mjs` (`pickResult`) and can be changed if you prefer to score the after-extra-time result.

---

## Tech

- **React 18 + Vite**, `react-router-dom` (HashRouter, GitHub Pages friendly).
- **Firebase**: Authentication (Email/Password) + Cloud Firestore.
- **Data sync**: a Node script (`scripts/sync.mjs`) using `firebase-admin` + [API-Football](https://www.api-football.com/), run on a schedule by GitHub Actions. Clients only ever **read** Firestore, so the API key and service account never reach the browser.

### Data model (Firestore)

- `users/{uid}` — `{ displayName, email, createdAt }`
- `predictions/{uid}` — `{ uid, displayName, picks: { [matchId]: { h, a } }, updatedAt }` (one doc per player)
- `matches/{id}` — normalized fixture written by the sync (teams, kickoff, status, result, group)
- `meta/state` — `{ lastSync, matchCount, ... }`

Scores, totals and the leaderboard are computed **in the browser** from picks + results, so nothing to tamper with and the board is always live.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config
npm run dev
```

### 1. Create a Firebase project

1. [console.firebase.google.com](https://console.firebase.google.com/) → add project.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create (production mode).
4. Project settings → **Your apps** → register a Web app → copy the config values into `.env.local` (the `VITE_FIREBASE_*` keys).

These `VITE_` values are public by design (they identify the project). Real protection comes from the security rules below.

### 2. Publish the security rules

Copy `firestore.rules` into your project (Firestore → Rules → paste → Publish), or use the Firebase CLI:

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 3. Seed the match data

1. Get an [API-Football](https://www.api-football.com/) key.
2. Firebase → Project settings → **Service accounts** → Generate new private key → save as `service-account.json` in the project root (gitignored).
3. Put the API key and credentials path in `.env.local`:
   ```
   APIFOOTBALL_KEY=your_key
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   ```
4. Run the sync:
   ```bash
   npm run sync
   ```

Confirm the World Cup `league` id / `season` for your API plan (defaults are `1` / `2026`; override with `LEAGUE_ID` / `SEASON`). Re-run `npm run sync` any time to refresh.

---

## Deploy to GitHub Pages

1. Push the repo to GitHub. Settings → **Pages** → Source: **GitHub Actions**.
2. Add repository **Secrets** (Settings → Secrets and variables → Actions). The Firebase web config is already baked into `src/firebase.js`, so the build needs no secrets. You only need the two for the data sync:
   - `APIFOOTBALL_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` = your service-account JSON, base64-encoded:
     ```bash
     base64 -i service-account.json | tr -d '\n'   # macOS/Linux; paste the output as the secret
     ```
3. Push to `main`. The **Deploy** workflow builds and publishes; the **Sync** workflow runs every 10 minutes (and on demand from the Actions tab) to keep scores fresh.

Add your GitHub Pages domain to Firebase Auth → Settings → **Authorized domains** so sign-in works in production.

---

## Branding & assets

The trophy glyph (`public/virka-mark.svg` and `src/components/Brand.jsx`) is an **original geometric mark**, deliberately not the FIFA logo, which is trademarked. For an in-house competition you can drop the official **VIRKA** brand asset in at `public/virka-mark.svg` and point the lockup at it. Avoid shipping official FIFA / World Cup marks unless you have the rights.

## Language

The UI is in **English** for now (so it could ship before the 11 June kickoff). It is built to localise to **Faroese** cleanly. Tell me if you'd like that pass — strings live in the page components and a small set of labels, and I'd run them through the Faroese review rather than translate blind.

## Notes on trust

Locking and the everyone-sees-everyone transparency are the anti-cheat for an in-house league: inputs disable at lock, and picks become public, so a late edit would be visible. If you ever want hard server-side enforcement (reject writes after lock), the path is a Cloud Function or a Firestore rule that checks a synced lock timestamp; not included here to keep the project on free Firebase tiers.
