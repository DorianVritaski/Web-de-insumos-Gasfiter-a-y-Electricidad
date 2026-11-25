// movimientos.service.js
import { db } from "../firebase-config.js";
import {
  collection, doc, runTransaction, serverTimestamp,
  query, where, getDocs, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

/**
 * Registra un movimiento de Kardex de forma atómica.
 * Actualiza el stock_actual en el catálogo y crea el documento en registros_movimientos.
 */
export async function registrarMovimientoKardex({
  rubro,              // "GASFITERIA" | "ELECTRICIDAD"
  fecha,              // "YYYY-MM-DD"
  material,           // nombre exacto
  categoria = null,
  tipoMovimiento,     // "Ingreso" | "Salida"
  cantidad,           // número entero positivo
  responsable = null,
  ubicacionObservacion = null,
  operadorUid
}) {
  const catalogDocId = rubro === "GASFITERIA" ? "gasfiteria_materiales" : "electricidad_materiales";
  const catalogRef = doc(db, "catalogos", catalogDocId);
  const movCollectionRef = collection(db, "registros_movimientos");

  return await runTransaction(db, async (transaction) => {
    const catalogSnap = await transaction.get(catalogRef);
    if (!catalogSnap.exists()) throw new Error(`El catálogo ${rubro} no existe.`);

    const materialesList = catalogSnap.data().lista || [];
    const matIndex = materialesList.findIndex(m => m.nombre === material);
    if (matIndex === -1) throw new Error(`El material "${material}" no está registrado en el catálogo.`);

    const stockActual = materialesList[matIndex].stock_actual || 0;
    let nuevoSaldo, cantidadSigno;

    if (tipoMovimiento === "Salida") {
      if (stockActual < cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${stockActual}, solicitado: ${cantidad}.`);
      }
      nuevoSaldo = stockActual - cantidad;
      cantidadSigno = -Math.abs(cantidad);
    } else {
      nuevoSaldo = stockActual + Math.abs(cantidad);
      cantidadSigno = Math.abs(cantidad);
    }

    // Actualizar saldo en catálogo
    materialesList[matIndex].stock_actual = nuevoSaldo;
    transaction.update(catalogRef, { lista: materialesList });

    // Crear documento de movimiento
    const dateObj = new Date(fecha + "T12:00:00");
    const autoId = doc(movCollectionRef).id;
    const idCorrelativo = `MOV-${Date.now().toString().slice(-6)}`;

    const nuevoMovimiento = {
      id_movimiento: idCorrelativo,
      rubro,
      fecha,
      anio: dateObj.getFullYear(),
      mes: MESES[dateObj.getMonth()],
      material,
      categoria: categoria || null,
      tipo_movimiento: tipoMovimiento,
      cantidad: cantidadSigno,
      saldo_resultante: nuevoSaldo,
      responsable: tipoMovimiento === "Salida" ? responsable : null,
      ubicacion_observacion: tipoMovimiento === "Salida" ? ubicacionObservacion : null,
      operador_uid: operadorUid,
      timestamp: serverTimestamp()
    };

    transaction.set(doc(db, "registros_movimientos", autoId), nuevoMovimiento);
    return { ...nuevoMovimiento, _docId: autoId };
  });
}

/**
 * Obtiene movimientos con filtros opcionales.
 * @param {object} filtros - { rubro, tipoMovimiento, fechaDesde, fechaHasta, material, responsable }
 */
export async function getMovimientos(filtros = {}) {
  let q = query(
    collection(db, "registros_movimientos"),
    orderBy("fecha", "desc"),
    orderBy("timestamp", "desc"),
    limit(500)
  );

  const condiciones = [];
  if (filtros.rubro) condiciones.push(where("rubro", "==", filtros.rubro));
  if (filtros.tipoMovimiento) condiciones.push(where("tipo_movimiento", "==", filtros.tipoMovimiento));
  if (filtros.fechaDesde) condiciones.push(where("fecha", ">=", filtros.fechaDesde));
  if (filtros.fechaHasta) condiciones.push(where("fecha", "<=", filtros.fechaHasta));

  q = query(
    collection(db, "registros_movimientos"),
    ...condiciones,
    orderBy("fecha", "desc"),
    limit(500)
  );

  const snap = await getDocs(q);
  let docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

  // Filtros adicionales en cliente (no admiten índice compuesto simple)
  if (filtros.material) {
    const term = filtros.material.toLowerCase();
    docs = docs.filter(d => d.material?.toLowerCase().includes(term));
  }
  if (filtros.responsable) {
    const term = filtros.responsable.toLowerCase();
    docs = docs.filter(d => d.responsable?.toLowerCase().includes(term));
  }

  return docs;
}

/**
 * Obtiene todos los movimientos sin filtros para exportación completa.
 */
export async function getTodosMovimientos() {
  const snap = await getDocs(
    query(collection(db, "registros_movimientos"), orderBy("fecha", "desc"))
  );
  return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
}
