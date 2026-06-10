import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setReady(true);
  }), []);

  async function register({ name, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name, email, createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'predictions', cred.user.uid), {
      uid: cred.user.uid, displayName: name, picks: {}, updatedAt: serverTimestamp(),
    });
    setUser({ ...cred.user });
    return cred.user;
  }

  function login({ email, password }) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // Firebase emails a secure reset link and hosts the reset page itself.
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Update the display name everywhere it is read: the Auth profile, the
  // users doc, and the predictions doc (the leaderboard reads the latter).
  async function updateName(name) {
    const u = auth.currentUser;
    if (!u) throw new Error('Not signed in');
    const clean = name.trim();
    await updateProfile(u, { displayName: clean });
    await setDoc(doc(db, 'users', u.uid), { displayName: clean }, { merge: true });
    await setDoc(doc(db, 'predictions', u.uid), { uid: u.uid, displayName: clean }, { merge: true });
    setUser(Object.assign(Object.create(Object.getPrototypeOf(u)), u, { displayName: clean }));
  }

  return (
    <AuthCtx.Provider value={{ user, ready, register, login, logout, resetPassword, updateName }}>
      {children}
    </AuthCtx.Provider>
  );
}
