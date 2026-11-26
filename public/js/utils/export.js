// export.js — Exportación a CSV de movimientos Kardex

/**
 * Genera un archivo CSV y lo descarga en el navegador.
 * @param {object[]} movimientos - Array de registros de Firestore
 * @param {string} nombreArchivo - Nombre del archivo sin extensión
 */
export function exportarCSV(movimientos, nombreArchivo = "kardex_insumos") {
  const columnas = [
    "ID Movimiento", "Rubro", "Fecha", "Año", "Mes",
    "Material", "Categoría / Tipo", "Tipo Movimiento",
    "Cantidad", "Saldo Resultante", "Responsable", "Ubicación / Observación", "Registrado por"
  ];

  const filas = movimientos.map(m => [
    m.id_movimiento || "",
    m.rubro || "",
    m.fecha || "",
    m.anio || "",
    m.mes || "",
    m.material || "",
    m.categoria || "",
    m.tipo_movimiento || "",
    m.cantidad ?? "",
    m.saldo_resultante ?? "",
    m.responsable || "",
    m.ubicacion_observacion || "",
    m.operador_email || ""
  ]);

  const contenido = [columnas, ...filas]
    .map(fila => fila.map(celda => `"${String(celda).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nombreArchivo}_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Genera un resumen de saldos actuales por material.
 * @param {object[]} materiales - Lista del catálogo
 * @param {string} rubro
 */
export function exportarSaldosCSV(materiales, rubro) {
  const columnas = ["Código", "Material", "Categoría / Tipo", "Stock Actual"];
  const filas = materiales.map(m => [
    m.codigo || "",
    m.nombre || "",
    m.categoria || m.tipo || "",
    m.stock_actual ?? 0
  ]);

  const contenido = [columnas, ...filas]
    .map(fila => fila.map(celda => `"${String(celda).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `saldos_${rubro.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
