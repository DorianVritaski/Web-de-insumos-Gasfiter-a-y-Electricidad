// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB9JLoGNzIjXkaDXKM4QTUijRf0Db1Vz18",
  authDomain: "control-de-insumos-web-v2.firebaseapp.com",
  projectId: "control-de-insumos-web-v2",
  storageBucket: "control-de-insumos-web-v2.firebasestorage.app",
  messagingSenderId: "710002884468",
  appId: "1:710002884468:web:6aa571ed3fbb16f266b621"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
