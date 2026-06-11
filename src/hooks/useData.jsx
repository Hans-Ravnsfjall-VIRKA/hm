import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  collection, onSnapshot, doc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { buildStages, computeGroupStandings } from '../lib/tournament';
import { foTeamObj } from '../lib/teams';
import { buildLeaderboard } from '../lib/scoring';
import { useAuth } from '../auth/AuthContext';

/** Live subscription to every match in the tournament. */
export function useMatches() {
  const [matches, setMatches] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => onSnapshot(collection(db, 'matches'), (snap) => {
    const rows = snap.docs.map((d) => {
      const m = d.data();
      return {
        ...m, id: d.id,
        kickoff: m.kickoff ?? (m.date ? Date.parse(m.date) : 0),
        homeTeam: foTeamObj(m.homeTeam),
        awayTeam: foTeamObj(m.awayTeam),
      };
    });
    rows.sort((a, b) => a.kickoff - b.kickoff);
    setMatches(rows);
    setLoaded(true);
  }, () => setLoaded(true)), []);

  return { matches, loaded };
}

/** Live subscription to every player's prediction doc. */
export function usePredictions() {
  const [docs, setDocs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => onSnapshot(collection(db, 'predictions'), (snap) => {
    setDocs(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    setLoaded(true);
  }, () => setLoaded(true)), []);

  return { predictionDocs: docs, loaded };
}

/** Save the current user's pick for a single match. */
export function useSavePick() {
  const { user } = useAuth();
  return useCallback(async (matchId, pick) => {
    if (!user) throw new Error('Not signed in');
    const ref = doc(db, 'predictions', user.uid);
    try {
      await updateDoc(ref, {
        [`picks.${matchId}`]: { h: pick.h, a: pick.a },
        updatedAt: serverTimestamp(),
        displayName: user.displayName || 'Player',
      });
    } catch {
      // Doc may not exist yet (e.g. legacy account) -> create it.
      await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName || 'Player',
        picks: { [matchId]: { h: pick.h, a: pick.a } },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }, [user]);
}

/** Save many picks at once (used by the Predict screen "save stage" action). */
export function useSavePicks() {
  const { user } = useAuth();
  return useCallback(async (picks) => {
    if (!user) throw new Error('Not signed in');
    const ref = doc(db, 'predictions', user.uid);
    const payload = { updatedAt: serverTimestamp(), displayName: user.displayName || 'Player' };
    for (const [matchId, p] of Object.entries(picks)) {
      payload[`picks.${matchId}`] = { h: p.h, a: p.a };
    }
    try {
      await updateDoc(ref, payload);
    } catch {
      await setDoc(ref, {
        uid: user.uid, displayName: user.displayName || 'Player', picks, updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }, [user]);
}

/** One hook that derives everything the UI needs from the two collections. */
export function useTournament() {
  const { matches, loaded: mLoaded } = useMatches();
  const { predictionDocs, loaded: pLoaded } = usePredictions();
  const [now, setNow] = useState(Date.now());

  // Tick once a minute so countdowns and lock state stay fresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stages = useMemo(() => buildStages(matches, now), [matches, now]);
  const leaderboard = useMemo(
    () => buildLeaderboard(predictionDocs, matches, { includeLive: true }), [predictionDocs, matches]);
  const standings = useMemo(() => computeGroupStandings(matches), [matches]);

  return {
    matches, predictionDocs, stages, leaderboard, standings,
    now, loaded: mLoaded && pLoaded,
  };
}

// --- Shared single-subscription context ------------------------------------
import { createContext, useContext } from 'react';
const TournamentCtx = createContext(null);
export const useTournamentCtx = () => useContext(TournamentCtx);
export function TournamentProvider({ children }) {
  const value = useTournament();
  return <TournamentCtx.Provider value={value}>{children}</TournamentCtx.Provider>;
}
