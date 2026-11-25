// auth.service.js
import { auth, db } from "../firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Inicia sesión con correo y contraseña.
 * @returns {{ uid, email, rol }} datos del usuario autenticado.
 */
export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  const rol = await obtenerRol(uid);
  return { uid, email: credential.user.email, rol };
}

/** Cierra la sesión activa. */
export async function logout() {
  await signOut(auth);
}

/** Observa cambios de sesión y ejecuta el callback con { uid, email, rol } o null. */
export function observarSesion(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const rol = await obtenerRol(user.uid);
      callback({ uid: user.uid, email: user.email, rol });
    } else {
      callback(null);
    }
  });
}

/** Lee el rol desde Firestore: colección `usuarios/{uid}` campo `rol`. */
async function obtenerRol(uid) {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    return snap.exists() ? snap.data().rol : "OPERADOR";
  } catch {
    return "OPERADOR";
  }
}
