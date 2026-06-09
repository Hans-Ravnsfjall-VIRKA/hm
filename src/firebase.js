import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC84YLCP5XgDAK0aT6mVIiAigbuBnxS66Y',
  authDomain: 'virka-hm26.firebaseapp.com',
  projectId: 'virka-hm26',
  storageBucket: 'virka-hm26.firebasestorage.app',
  messagingSenderId: '676157659307',
  appId: '1:676157659307:web:6131c15fea358434e27fee',
  measurementId: 'G-9CVS142FJH',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
