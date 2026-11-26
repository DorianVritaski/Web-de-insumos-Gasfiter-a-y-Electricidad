// users.service.js — Gestión de usuarios del sistema
import { auth, db } from "../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, getDocs, updateDoc,
  collection, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ─── App secundaria para crear usuarios sin cerrar sesión del admin ───────────
const firebaseConfig = {
  apiKey: "AIzaSyB9JLoGNzIjXkaDXKM4QTUijRf0Db1Vz18",
  authDomain: "control-de-insumos-web-v2.firebaseapp.com",
  projectId: "control-de-insumos-web-v2",
  storageBucket: "control-de-insumos-web-v2.firebasestorage.app",
  messagingSenderId: "710002884468",
  appId: "1:710002884468:web:6aa571ed3fbb16f266b621"
};

function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === "secondary");
  const secondaryApp = existing || initializeApp(firebaseConfig, "secondary");
  return getAuth(secondaryApp);
}

/**
 * Crea un nuevo usuario en Firebase Auth y guarda su perfil en Firestore.
 * Usa una instancia secundaria para no cerrar la sesión del admin.
 */
export async function crearUsuario({ email, password, nombre, rol }) {
  const secondaryAuth = getSecondaryAuth();

  // Crear en Firebase Auth (instancia secundaria)
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = credential.user.uid;

  // Cerrar sesión en la instancia secundaria inmediatamente
  await secondaryAuth.signOut();

  // Guardar perfil en Firestore
  await setDoc(doc(db, "usuarios", uid), {
    uid,
    correo: email,
    nombre_completo: nombre,
    rol,          // "ADMIN" | "OPERADOR"
    activo: true,
    created_at: serverTimestamp()
  });

  return { uid, email, nombre, rol };
}

/**
 * Obtiene la lista de todos los usuarios registrados en Firestore.
 */
export async function getUsuarios() {
  const snap = await getDocs(
    query(collection(db, "usuarios"), orderBy("created_at", "desc"))
  );
  return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
}

/**
 * Activa o desactiva un usuario (campo `activo` en Firestore).
 * Nota: esto solo controla acceso a nivel UI; para revocar completamente
 * se requiere Firebase Admin SDK (Cloud Functions).
 */
export async function toggleActivoUsuario(uid, activo) {
  await updateDoc(doc(db, "usuarios", uid), { activo });
}

/**
 * Cambia el rol de un usuario.
 */
export async function cambiarRolUsuario(uid, nuevoRol) {
  await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
}
