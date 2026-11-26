// gasfiteria.view.js — Módulo completo Gasfitería
import { getMateriales, getResponsables } from "../services/catalogos.service.js";
import { registrarMovimientoKardex, getMovimientos } from "../services/movimientos.service.js";
import { validarMovimiento, mostrarErrores } from "../utils/validators.js";
import { exportarCSV } from "../utils/export.js";
import { mostrarToast, usuarioActual } from "../app.js";

const RUBRO = "GASFITERIA";

export async function renderGasfiteria(container) {
  container.innerHTML = `
    <div class="card">
      <div class="flex items-center gap-2" style="margin-bottom:1.25rem">
        <span style="font-size:1.5rem">🔧</span>
        <h2 style="font-size:1.3rem;color:#c2410c">Gasfitería — Registro de Movimiento</h2>
      </div>

      <div id="form-gas-errors" class="error-box hidden"><ul></ul></div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem">
        <div class="form-group">
          <label>Tipo de Movimiento *</label>
          <select id="gas-tipo">
            <option value="">— Selecciona —</option>
            <option value="Ingreso">📦 Ingreso</option>
            <option value="Salida">📤 Salida</option>
          </select>
        </div>
        <div class="form-group">
          <label>Fecha *</label>
          <input type="date" id="gas-fecha" />
        </div>
        <div class="form-group">
          <label>Material *</label>
          <select id="gas-material"><option value="">— Cargando... —</option></select>
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <input type="text" id="gas-categoria" readonly placeholder="Se autocompleta" />
        </div>
        <div class="form-group">
          <label>Stock disponible</label>
          <input type="text" id="gas-stock" readonly placeholder="—" />
        </div>
        <div class="form-group">
          <label>Cantidad *</label>
          <input type="number" id="gas-cantidad" min="1" step="1" placeholder="Ej: 3" />
        </div>
        <div class="form-group" id="gas-responsable-group">
          <label>Responsable * <span style="color:#94a3b8;font-weight:400">(solo Salida)</span></label>
          <select id="gas-responsable"><option value="">— Selecciona —</option></select>
        </div>
        <div class="form-group" id="gas-ubicacion-group" style="grid-column:1/-1">
          <label>Ubicación / Destino * <span style="color:#94a3b8;font-weight:400">(solo Salida)</span></label>
          <input type="text" id="gas-ubicacion" placeholder='Ej: "H - sshh damas 6to piso"' />
        </div>
      </div>

      <button class="btn btn-success" id="btn-gas-registrar">✅ Registrar Movimiento</button>
    </div>

    <!-- Filtros y Kardex -->
    <div class="card">
      <div class="flex items-center gap-2" style="margin-bottom:1rem">
        <h3 style="font-size:1.1rem;font-family:var(--font-heading)">📋 Historial Kardex — Gasfitería</h3>
        <button class="btn btn-outline btn-sm" id="btn-gas-export" style="margin-left:auto">📥 Exportar CSV</button>
        <button class="btn btn-primary btn-sm" id="btn-gas-filtrar">🔍 Filtrar</button>
      </div>
      <div class="filtros-bar">
        <div class="form-group">
          <label>Tipo</label>
          <select id="gas-f-tipo">
            <option value="">Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Salida">Salida</option>
          </select>
        </div>
        <div class="form-group">
          <label>Desde</label>
          <input type="date" id="gas-f-desde" />
        </div>
        <div class="form-group">
          <label>Hasta</label>
          <input type="date" id="gas-f-hasta" />
        </div>
        <div class="form-group">
          <label>Buscar material</label>
          <input type="text" id="gas-f-material" placeholder="Nombre..." />
        </div>
        <div class="form-group">
          <label>Responsable</label>
          <input type="text" id="gas-f-responsable" placeholder="Nombre..." />
        </div>
      </div>
      <div class="table-wrapper">
        <table class="kardex">
          <thead>
            <tr>
              <th>ID Mov.</th><th>Fecha</th><th>Material</th><th>Categoría</th>
              <th>Movimiento</th><th>Cant.</th><th>Saldo</th><th>Responsable</th><th>Ubicación / Obs.</th><th>Registrado por</th>
            </tr>
          </thead>
          <tbody id="gas-kardex-body">
            <tr><td colspan="9" class="text-muted text-center" style="padding:2rem">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
      <p id="gas-kardex-count" class="text-muted" style="margin-top:.5rem;font-size:.8rem"></p>
    </div>
  `;

  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById("gas-fecha").value = hoy;

  await Promise.all([cargarMateriales(), cargarResponsables(), cargarKardex()]);
  registrarEventos();
}

let _materiales = [];

async function cargarMateriales() {
  _materiales = await getMateriales(RUBRO);
  const sel = document.getElementById("gas-material");
  sel.innerHTML = `<option value="">— Selecciona un material —</option>`;
  _materiales.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.nombre;
    opt.dataset.categoria = m.categoria || "";
    opt.dataset.stock = m.stock_actual ?? 0;
    opt.textContent = m.nombre;
    sel.appendChild(opt);
  });
}

async function cargarResponsables() {
  const lista = await getResponsables();
  const sel = document.getElementById("gas-responsable");
  sel.innerHTML = `<option value="">— Selecciona —</option>`;
  lista.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
}

async function cargarKardex(filtros = {}) {
  const tbody = document.getElementById("gas-kardex-body");
  tbody.innerHTML = `<tr><td colspan="10" class="text-muted text-center" style="padding:2rem"><span class="spinner"></span> Cargando...</td></tr>`;

  try {
    const movs = await getMovimientos({ rubro: RUBRO, ...filtros });
    if (movs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-muted text-center" style="padding:2rem">Sin movimientos registrados.</td></tr>`;
      document.getElementById("gas-kardex-count").textContent = "";
      return;
    }
    tbody.innerHTML = movs.map(renderFila).join("");
    document.getElementById("gas-kardex-count").textContent = `${movs.length} registro(s) encontrado(s).`;
    window._gasMovimientos = movs;
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10" style="color:red;padding:1rem">Error al cargar: ${err.message}</td></tr>`;
  }
}

function renderFila(m) {
  const esSalida = m.tipo_movimiento === "Salida";
  const cantClass = esSalida ? "cant-neg" : "cant-pos";
  const badge = esSalida
    ? `<span class="badge-salida">Salida</span>`
    : `<span class="badge-ingreso">Ingreso</span>`;
  const cant = m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad;
  return `
    <tr>
      <td><code style="font-size:.78rem">${m.id_movimiento || "—"}</code></td>
      <td>${m.fecha || "—"}</td>
      <td style="max-width:200px">${m.material || "—"}</td>
      <td>${m.categoria || "—"}</td>
      <td>${badge}</td>
      <td class="${cantClass}">${cant}</td>
      <td><span class="saldo-chip">${m.saldo_resultante ?? "—"}</span></td>
      <td>${m.responsable || "—"}</td>
      <td style="max-width:200px;font-size:.82rem">${m.ubicacion_observacion || "—"}</td>
      <td style="font-size:.78rem;color:#64748b">${m.operador_email || "—"}</td>
    </tr>`;
}

function registrarEventos() {
  // Autocompletar categoría y stock al seleccionar material
  document.getElementById("gas-material").addEventListener("change", function () {
    const opt = this.options[this.selectedIndex];
    document.getElementById("gas-categoria").value = opt.dataset.categoria || "";
    document.getElementById("gas-stock").value = opt.value ? (opt.dataset.stock ?? "0") : "";
  });

  // Mostrar/ocultar campos de salida
  document.getElementById("gas-tipo").addEventListener("change", function () {
    const esSalida = this.value === "Salida";
    document.getElementById("gas-responsable-group").style.opacity = esSalida ? "1" : ".5";
    document.getElementById("gas-ubicacion-group").style.opacity = esSalida ? "1" : ".5";
  });

  // Registrar movimiento
  document.getElementById("btn-gas-registrar").addEventListener("click", handleRegistrar);

  // Filtrar kardex
  document.getElementById("btn-gas-filtrar").addEventListener("click", () => {
    cargarKardex({
      tipoMovimiento: document.getElementById("gas-f-tipo").value || undefined,
      fechaDesde: document.getElementById("gas-f-desde").value || undefined,
      fechaHasta: document.getElementById("gas-f-hasta").value || undefined,
      material: document.getElementById("gas-f-material").value || undefined,
      responsable: document.getElementById("gas-f-responsable").value || undefined,
    });
  });

  // Exportar CSV
  document.getElementById("btn-gas-export").addEventListener("click", () => {
    const movs = window._gasMovimientos || [];
    if (movs.length === 0) return mostrarToast("No hay datos para exportar.", "error");
    exportarCSV(movs, "kardex_gasfiteria");
    mostrarToast("CSV exportado.", "success");
  });
}

async function handleRegistrar() {
  const btn = document.getElementById("btn-gas-registrar");
  const datos = {
    rubro: RUBRO,
    fecha: document.getElementById("gas-fecha").value,
    material: document.getElementById("gas-material").value,
    categoria: document.getElementById("gas-categoria").value || null,
    tipoMovimiento: document.getElementById("gas-tipo").value,
    cantidad: parseInt(document.getElementById("gas-cantidad").value),
    responsable: document.getElementById("gas-responsable").value || null,
    ubicacionObservacion: document.getElementById("gas-ubicacion").value.trim() || null,
    operadorUid: usuarioActual?.uid || "desconocido",
    operadorEmail: usuarioActual?.email || null
  };

  const errores = validarMovimiento(datos);
  if (errores.length > 0) {
    const ul = document.querySelector("#form-gas-errors ul");
    ul.innerHTML = errores.map(e => `<li>${e}</li>`).join("");
    document.getElementById("form-gas-errors").classList.remove("hidden");
    return;
  }
  document.getElementById("form-gas-errors").classList.add("hidden");

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Registrando...`;

  try {
    await registrarMovimientoKardex(datos);
    mostrarToast(`✅ Movimiento registrado correctamente.`, "success");
    // Limpiar form
    document.getElementById("gas-cantidad").value = "";
    document.getElementById("gas-ubicacion").value = "";
    document.getElementById("gas-responsable").value = "";
    // Recargar materiales y kardex
    await Promise.all([cargarMateriales(), cargarKardex()]);
  } catch (err) {
    mostrarToast(`❌ ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "✅ Registrar Movimiento";
  }
}
