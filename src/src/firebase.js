import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDHMoqoDYToaxP6qiF2K7YqZGrWOlVg58g",
  authDomain: "monday-cup.firebaseapp.com",
  projectId: "monday-cup",
  storageBucket: "monday-cup.firebasestorage.app",
  messagingSenderId: "993864599788",
  appId: "1:993864599788:web:c8b959b525f5a58712fdc9",
  measurementId: "G-4T932721E7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const analytics = getAnalytics(app);

export default app;