// validators.js

/**
 * Valida el formulario de registro de movimiento.
 * @returns {string[]} Array de mensajes de error. Vacío si es válido.
 */
export function validarMovimiento({ rubro, fecha, material, tipoMovimiento, cantidad, responsable, ubicacionObservacion }) {
  const errores = [];

  if (!rubro) errores.push("Debes seleccionar un Rubro (Gasfitería o Electricidad).");
  if (!fecha) errores.push("La fecha es obligatoria.");
  if (!material || material.trim() === "") errores.push("Debes seleccionar un Material.");
  if (!tipoMovimiento) errores.push("El tipo de movimiento es obligatorio.");

  const cant = Number(cantidad);
  if (!cantidad || isNaN(cant) || cant <= 0 || !Number.isInteger(cant)) {
    errores.push("La cantidad debe ser un número entero mayor a 0.");
  }

  if (tipoMovimiento === "Salida") {
    if (!responsable || responsable.trim() === "") {
      errores.push("El Responsable es obligatorio para registrar una Salida.");
    }
    if (!ubicacionObservacion || ubicacionObservacion.trim() === "") {
      errores.push("La Ubicación / Destino es obligatoria para registrar una Salida.");
    }
  }

  return errores;
}

/**
 * Muestra los errores de validación en el elemento con id dado.
 */
export function mostrarErrores(containerId, errores) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (errores.length === 0) {
    el.innerHTML = "";
    el.classList.add("hidden");
    return;
  }
  el.innerHTML = errores.map(e => `<li>${e}</li>`).join("");
  el.classList.remove("hidden");
}
