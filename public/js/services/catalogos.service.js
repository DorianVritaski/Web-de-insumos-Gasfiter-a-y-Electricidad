// catalogos.service.js
import { db } from "../firebase-config.js";
import {
  doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COL = "catalogos";

/** Obtiene la lista de materiales de un rubro. rubro: "GASFITERIA" | "ELECTRICIDAD" */
export async function getMateriales(rubro) {
  const id = rubro === "GASFITERIA" ? "gasfiteria_materiales" : "electricidad_materiales";
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? snap.data().lista || [] : [];
}

/** Obtiene las categorías de Gasfitería. */
export async function getCategorias() {
  const snap = await getDoc(doc(db, COL, "gasfiteria_categorias"));
  return snap.exists() ? snap.data().lista || [] : [];
}

/** Obtiene la lista de responsables. */
export async function getResponsables() {
  const snap = await getDoc(doc(db, COL, "responsables"));
  return snap.exists() ? snap.data().lista || [] : [];
}

/** Agrega un material al catálogo del rubro indicado. */
export async function agregarMaterial(rubro, material) {
  const id = rubro === "GASFITERIA" ? "gasfiteria_materiales" : "electricidad_materiales";
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  const lista = snap.exists() ? snap.data().lista || [] : [];

  const existe = lista.find(m => m.nombre.toLowerCase() === material.nombre.toLowerCase());
  if (existe) throw new Error(`El material "${material.nombre}" ya existe en el catálogo.`);

  lista.push({ ...material, stock_actual: material.stock_actual || 0 });

  if (snap.exists()) {
    await updateDoc(ref, { lista });
  } else {
    await setDoc(ref, { lista });
  }
}

/** Agrega un responsable a la lista. */
export async function agregarResponsable(nombre) {
  const ref = doc(db, COL, "responsables");
  const snap = await getDoc(ref);
  const lista = snap.exists() ? snap.data().lista || [] : [];
  if (!lista.includes(nombre)) {
    lista.push(nombre);
    if (snap.exists()) {
      await updateDoc(ref, { lista });
    } else {
      await setDoc(ref, { lista });
    }
  }
}

/** Inicializa los catálogos base si no existen (uso solo en Fase 1). */
export async function inicializarCatalogosBase() {
  const gasRef = doc(db, COL, "gasfiteria_materiales");
  const elecRef = doc(db, COL, "electricidad_materiales");
  const catRef = doc(db, COL, "gasfiteria_categorias");
  const respRef = doc(db, COL, "responsables");

  const gasSnap = await getDoc(gasRef);
  if (!gasSnap.exists()) {
    await setDoc(gasRef, { lista: [] });
  }

  const elecSnap = await getDoc(elecRef);
  if (!elecSnap.exists()) {
    await setDoc(elecRef, { lista: [] });
  }

  const catSnap = await getDoc(catRef);
  if (!catSnap.exists()) {
    await setDoc(catRef, {
      lista: ["Conexiones", "Grifería y válvulas", "Tuberías", "Sanitarios y desagüe", "Otros"]
    });
  }

  const respSnap = await getDoc(respRef);
  if (!respSnap.exists()) {
    await setDoc(respRef, {
      lista: ["Fernando Sánchez", "Jean Paul Arrieta", "Fredy Barzola", "José Cárdenas"]
    });
  }

  console.log("[catalogos.service] Catálogos base inicializados.");
}
