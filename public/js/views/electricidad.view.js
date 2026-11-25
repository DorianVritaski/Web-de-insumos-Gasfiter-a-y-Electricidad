// electricidad.view.js — Módulo completo Electricidad
import { getMateriales, getResponsables } from "../services/catalogos.service.js";
import { registrarMovimientoKardex, getMovimientos } from "../services/movimientos.service.js";
import { validarMovimiento } from "../utils/validators.js";
import { exportarCSV } from "../utils/export.js";
import { mostrarToast, usuarioActual } from "../app.js";

const RUBRO = "ELECTRICIDAD";

export async function renderElectricidad(container) {
  container.innerHTML = `
    <div class="card">
      <div class="flex items-center gap-2" style="margin-bottom:1.25rem">
        <span style="font-size:1.5rem">⚡</span>
        <h2 style="font-size:1.3rem;color:#a16207">Electricidad — Registro de Movimiento</h2>
      </div>

      <div id="form-elec-errors" class="error-box hidden"><ul></ul></div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem">
        <div class="form-group">
          <label>Tipo de Movimiento *</label>
          <select id="elec-tipo">
            <option value="">— Selecciona —</option>
            <option value="Ingreso">📦 Ingreso</option>
            <option value="Salida">📤 Salida</option>
          </select>
        </div>
        <div class="form-group">
          <label>Fecha *</label>
          <input type="date" id="elec-fecha" />
        </div>
        <div class="form-group">
          <label>Material *</label>
          <select id="elec-material"><option value="">— Cargando... —</option></select>
        </div>
        <div class="form-group">
          <label>Tipo / Clasificación</label>
          <input type="text" id="elec-tipo-mat" readonly placeholder="Se autocompleta" />
        </div>
        <div class="form-group">
          <label>Stock disponible</label>
          <input type="text" id="elec-stock" readonly placeholder="—" />
        </div>
        <div class="form-group">
          <label>Cantidad *</label>
          <input type="number" id="elec-cantidad" min="1" step="1" placeholder="Ej: 2" />
        </div>
        <div class="form-group" id="elec-responsable-group">
          <label>Responsable * <span style="color:#94a3b8;font-weight:400">(solo Salida)</span></label>
          <select id="elec-responsable"><option value="">— Selecciona —</option></select>
        </div>
        <div class="form-group" id="elec-ubicacion-group" style="grid-column:1/-1">
          <label>Ubicación / Destino * <span style="color:#94a3b8;font-weight:400">(solo Salida)</span></label>
          <input type="text" id="elec-ubicacion" placeholder='Ej: "J - 103 Minas"' />
        </div>
      </div>

      <button class="btn btn-success" id="btn-elec-registrar">✅ Registrar Movimiento</button>
    </div>

    <!-- Filtros y Kardex -->
    <div class="card">
      <div class="flex items-center gap-2" style="margin-bottom:1rem">
        <h3 style="font-size:1.1rem;font-family:var(--font-heading)">📋 Historial Kardex — Electricidad</h3>
        <button class="btn btn-outline btn-sm" id="btn-elec-export" style="margin-left:auto">📥 Exportar CSV</button>
        <button class="btn btn-primary btn-sm" id="btn-elec-filtrar">🔍 Filtrar</button>
      </div>
      <div class="filtros-bar">
        <div class="form-group">
          <label>Tipo</label>
          <select id="elec-f-tipo">
            <option value="">Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Salida">Salida</option>
          </select>
        </div>
        <div class="form-group">
          <label>Desde</label>
          <input type="date" id="elec-f-desde" />
        </div>
        <div class="form-group">
          <label>Hasta</label>
          <input type="date" id="elec-f-hasta" />
        </div>
        <div class="form-group">
          <label>Buscar material</label>
          <input type="text" id="elec-f-material" placeholder="Nombre..." />
        </div>
        <div class="form-group">
          <label>Responsable</label>
          <input type="text" id="elec-f-responsable" placeholder="Nombre..." />
        </div>
      </div>
      <div class="table-wrapper">
        <table class="kardex">
          <thead>
            <tr>
              <th>ID Mov.</th><th>Fecha</th><th>Material</th><th>Tipo</th>
              <th>Movimiento</th><th>Cant.</th><th>Saldo</th><th>Responsable</th><th>Ubicación / Obs.</th>
            </tr>
          </thead>
          <tbody id="elec-kardex-body">
            <tr><td colspan="9" class="text-muted text-center" style="padding:2rem">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
      <p id="elec-kardex-count" class="text-muted" style="margin-top:.5rem;font-size:.8rem"></p>
    </div>
  `;

  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById("elec-fecha").value = hoy;

  await Promise.all([cargarMateriales(), cargarResponsables(), cargarKardex()]);
  registrarEventos();
}

let _materiales = [];

async function cargarMateriales() {
  _materiales = await getMateriales(RUBRO);
  const sel = document.getElementById("elec-material");
  sel.innerHTML = `<option value="">— Selecciona un material —</option>`;
  _materiales.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.nombre;
    opt.dataset.tipo = m.tipo || "";
    opt.dataset.stock = m.stock_actual ?? 0;
    opt.textContent = m.nombre;
    sel.appendChild(opt);
  });
}

async function cargarResponsables() {
  const lista = await getResponsables();
  const sel = document.getElementById("elec-responsable");
  sel.innerHTML = `<option value="">— Selecciona —</option>`;
  lista.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
}

async function cargarKardex(filtros = {}) {
  const tbody = document.getElementById("elec-kardex-body");
  tbody.innerHTML = `<tr><td colspan="9" class="text-muted text-center" style="padding:2rem"><span class="spinner"></span> Cargando...</td></tr>`;

  try {
    const movs = await getMovimientos({ rubro: RUBRO, ...filtros });
    if (movs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-muted text-center" style="padding:2rem">Sin movimientos registrados.</td></tr>`;
      document.getElementById("elec-kardex-count").textContent = "";
      return;
    }
    tbody.innerHTML = movs.map(renderFila).join("");
    document.getElementById("elec-kardex-count").textContent = `${movs.length} registro(s) encontrado(s).`;
    window._elecMovimientos = movs;
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="9" style="color:red;padding:1rem">Error al cargar: ${err.message}</td></tr>`;
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
    </tr>`;
}

function registrarEventos() {
  document.getElementById("elec-material").addEventListener("change", function () {
    const opt = this.options[this.selectedIndex];
    document.getElementById("elec-tipo-mat").value = opt.dataset.tipo || "";
    document.getElementById("elec-stock").value = opt.value ? (opt.dataset.stock ?? "0") : "";
  });

  document.getElementById("elec-tipo").addEventListener("change", function () {
    const esSalida = this.value === "Salida";
    document.getElementById("elec-responsable-group").style.opacity = esSalida ? "1" : ".5";
    document.getElementById("elec-ubicacion-group").style.opacity = esSalida ? "1" : ".5";
  });

  document.getElementById("btn-elec-registrar").addEventListener("click", handleRegistrar);

  document.getElementById("btn-elec-filtrar").addEventListener("click", () => {
    cargarKardex({
      tipoMovimiento: document.getElementById("elec-f-tipo").value || undefined,
      fechaDesde: document.getElementById("elec-f-desde").value || undefined,
      fechaHasta: document.getElementById("elec-f-hasta").value || undefined,
      material: document.getElementById("elec-f-material").value || undefined,
      responsable: document.getElementById("elec-f-responsable").value || undefined,
    });
  });

  document.getElementById("btn-elec-export").addEventListener("click", () => {
    const movs = window._elecMovimientos || [];
    if (movs.length === 0) return mostrarToast("No hay datos para exportar.", "error");
    exportarCSV(movs, "kardex_electricidad");
    mostrarToast("CSV exportado.", "success");
  });
}

async function handleRegistrar() {
  const btn = document.getElementById("btn-elec-registrar");
  const datos = {
    rubro: RUBRO,
    fecha: document.getElementById("elec-fecha").value,
    material: document.getElementById("elec-material").value,
    categoria: document.getElementById("elec-tipo-mat").value || null,
    tipoMovimiento: document.getElementById("elec-tipo").value,
    cantidad: parseInt(document.getElementById("elec-cantidad").value),
    responsable: document.getElementById("elec-responsable").value || null,
    ubicacionObservacion: document.getElementById("elec-ubicacion").value.trim() || null,
    operadorUid: usuarioActual?.uid || "desconocido"
  };

  const errores = validarMovimiento(datos);
  if (errores.length > 0) {
    const ul = document.querySelector("#form-elec-errors ul");
    ul.innerHTML = errores.map(e => `<li>${e}</li>`).join("");
    document.getElementById("form-elec-errors").classList.remove("hidden");
    return;
  }
  document.getElementById("form-elec-errors").classList.add("hidden");

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Registrando...`;

  try {
    await registrarMovimientoKardex(datos);
    mostrarToast(`✅ Movimiento registrado correctamente.`, "success");
    document.getElementById("elec-cantidad").value = "";
    document.getElementById("elec-ubicacion").value = "";
    document.getElementById("elec-responsable").value = "";
    await Promise.all([cargarMateriales(), cargarKardex()]);
  } catch (err) {
    mostrarToast(`❌ ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "✅ Registrar Movimiento";
  }
}
