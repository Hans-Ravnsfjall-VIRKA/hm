// Read-only backup of predictions + users to a local timestamped JSON file.
// Run: npm run backup   (uses .env.local -> GOOGLE_APPLICATION_CREDENTIALS)
import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS in .env.local'); process.exit(1); }
const json = JSON.parse(readFileSync(path, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(json), projectId: json.project_id });
const db = admin.firestore();

const out = { exportedAt: new Date().toISOString(), predictions: {}, users: {} };
for (const col of ['predictions', 'users']) {
  const snap = await db.collection(col).get();
  snap.forEach((d) => { out[col][d.id] = d.data(); });
  console.log(`read ${snap.size} ${col}`);
}
const file = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(out, null, 2));
console.log('wrote', file);
process.exit(0);
