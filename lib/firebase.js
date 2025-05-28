// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBpK__Vuf5usJsVBovw9Q9TLWXSovtvsTQ",
  authDomain: "show-folio.firebaseapp.com",
  projectId: "show-folio",
  storageBucket: "show-folio.firebasestorage.app",
  messagingSenderId: "198136383362",
  appId: "1:198136383362:web:ba408919278fbcaf6bb19b",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
