// admin.view.js — Vista del Administrador
import { renderGasfiteria } from "./gasfiteria.view.js";
import { renderElectricidad } from "./electricidad.view.js";
import { getMateriales, getCategorias, getResponsables, agregarMaterial, agregarResponsable, inicializarCatalogosBase } from "../services/catalogos.service.js";
import { getTodosMovimientos } from "../services/movimientos.service.js";
import { crearUsuario, getUsuarios, toggleActivoUsuario, cambiarRolUsuario } from "../services/users.service.js";
import { exportarCSV, exportarSaldosCSV } from "../utils/export.js";
import { mostrarToast } from "../app.js";

let rubroActivo = "GASFITERIA";
let seccionActiva = "movimientos";

export async function renderAdmin(container, usuario) {
  container.innerHTML = `
    <div style="margin-bottom:1rem">
      <h2 style="font-size:1.1rem;color:#475569;font-family:var(--font-heading)">
        Panel de Administración — <strong>${usuario.email}</strong>
        <span style="background:#fef3c7;color:#92400e;font-size:.75rem;padding:.2rem .6rem;border-radius:999px;margin-left:.5rem">ADMIN</span>
      </h2>
    </div>

    <!-- Menú de secciones -->
    <div class="rubro-tabs" style="margin-bottom:1rem">
      <button class="rubro-tab" id="tab-movimientos" onclick="window._adminTab('movimientos')">📋 Movimientos</button>
      <button class="rubro-tab" id="tab-catalogo" onclick="window._adminTab('catalogo')">📦 Catálogo</button>
      <button class="rubro-tab" id="tab-usuarios" onclick="window._adminTab('usuarios')">👥 Usuarios</button>
      <button class="rubro-tab" id="tab-reportes" onclick="window._adminTab('reportes')">📊 Reportes</button>
      <button class="rubro-tab" id="tab-setup" onclick="window._adminTab('setup')">⚙️ Configuración</button>
    </div>

    <div id="admin-content"></div>
  `;

  window._adminTab = async (tab) => {
    seccionActiva = tab;
    ["movimientos", "catalogo", "usuarios", "reportes", "setup"].forEach(t => {
      const el = document.getElementById(`tab-${t}`);
      if (el) el.className = `rubro-tab ${t === tab ? "active-gas" : ""}`;
    });
    const c = document.getElementById("admin-content");
    if (tab === "movimientos") await renderSeccionMovimientos(c);
    else if (tab === "catalogo") await renderSeccionCatalogo(c);
    else if (tab === "usuarios") await renderSeccionUsuarios(c);
    else if (tab === "reportes") await renderSeccionReportes(c);
    else if (tab === "setup") renderSeccionSetup(c);
  };

  await window._adminTab("movimientos");
}

/* ===== SECCIÓN: MOVIMIENTOS ===== */
async function renderSeccionMovimientos(container) {
  container.innerHTML = `
    <div class="rubro-tabs" style="margin-bottom:1rem">
      <button class="rubro-tab ${rubroActivo === 'GASFITERIA' ? 'active-gas' : ''}" id="tab-gas" onclick="window._adminRubro('GASFITERIA')">🔧 Gasfitería</button>
      <button class="rubro-tab ${rubroActivo === 'ELECTRICIDAD' ? 'active-elec' : ''}" id="tab-elec" onclick="window._adminRubro('ELECTRICIDAD')">⚡ Electricidad</button>
    </div>
    <div id="admin-rubro-content"></div>
  `;

  window._adminRubro = async (rubro) => {
    rubroActivo = rubro;
    document.getElementById("tab-gas").className = `rubro-tab ${rubro === "GASFITERIA" ? "active-gas" : ""}`;
    document.getElementById("tab-elec").className = `rubro-tab ${rubro === "ELECTRICIDAD" ? "active-elec" : ""}`;
    const rc = document.getElementById("admin-rubro-content");
    if (rubro === "GASFITERIA") await renderGasfiteria(rc);
    else await renderElectricidad(rc);
  };

  await window._adminRubro(rubroActivo);
}

/* ===== SECCIÓN: CATÁLOGO ===== */
async function renderSeccionCatalogo(container) {
  const [gasmat, elecmat, categorias, responsables] = await Promise.all([
    getMateriales("GASFITERIA"),
    getMateriales("ELECTRICIDAD"),
    getCategorias(),
    getResponsables()
  ]);

  container.innerHTML = `
    <div class="card">
      <h3 style="font-family:var(--font-heading);margin-bottom:1rem">📦 Agregar Material</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">
        <div class="form-group">
          <label>Rubro *</label>
          <select id="cat-rubro">
            <option value="GASFITERIA">🔧 Gasfitería</option>
            <option value="ELECTRICIDAD">⚡ Electricidad</option>
          </select>
        </div>
        <div class="form-group">
          <label>Código</label>
          <input type="text" id="cat-codigo" placeholder="Ej: GAS-001" />
        </div>
        <div class="form-group">
          <label>Nombre del material *</label>
          <input type="text" id="cat-nombre" placeholder="Ej: CAÑO GALVANIZADO 1/2\"" />
        </div>
        <div class="form-group">
          <label>Categoría / Tipo</label>
          <input type="text" id="cat-categoria" placeholder="Ej: Tuberías" list="cat-lista" />
          <datalist id="cat-lista">
            ${categorias.map(c => `<option value="${c}">`).join("")}
          </datalist>
        </div>
        <div class="form-group">
          <label>Stock inicial</label>
          <input type="number" id="cat-stock" min="0" value="0" />
        </div>
      </div>
      <button class="btn btn-primary" id="btn-cat-agregar">➕ Agregar al Catálogo</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="card">
        <h3 style="font-family:var(--font-heading);margin-bottom:.75rem">🔧 Gasfitería (${gasmat.length} materiales)</h3>
        <div class="table-wrapper">
          <table class="kardex">
            <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Stock</th></tr></thead>
            <tbody>
              ${gasmat.length === 0
      ? `<tr><td colspan="4" class="text-muted text-center" style="padding:1rem">Sin materiales</td></tr>`
      : gasmat.map(m => `<tr>
                    <td><code style="font-size:.78rem">${m.codigo || "—"}</code></td>
                    <td>${m.nombre}</td>
                    <td>${m.categoria || "—"}</td>
                    <td><span class="saldo-chip">${m.stock_actual ?? 0}</span></td>
                  </tr>`).join("")
    }
            </tbody>
          </table>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:.75rem" id="btn-export-saldos-gas">📥 Exportar Saldos</button>
      </div>
      <div class="card">
        <h3 style="font-family:var(--font-heading);margin-bottom:.75rem">⚡ Electricidad (${elecmat.length} materiales)</h3>
        <div class="table-wrapper">
          <table class="kardex">
            <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Stock</th></tr></thead>
            <tbody>
              ${elecmat.length === 0
      ? `<tr><td colspan="4" class="text-muted text-center" style="padding:1rem">Sin materiales</td></tr>`
      : elecmat.map(m => `<tr>
                    <td><code style="font-size:.78rem">${m.codigo || "—"}</code></td>
                    <td>${m.nombre}</td>
                    <td>${m.tipo || "—"}</td>
                    <td><span class="saldo-chip">${m.stock_actual ?? 0}</span></td>
                  </tr>`).join("")
    }
            </tbody>
          </table>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:.75rem" id="btn-export-saldos-elec">📥 Exportar Saldos</button>
      </div>
    </div>

    <div class="card">
      <h3 style="font-family:var(--font-heading);margin-bottom:.75rem">👷 Responsables (${responsables.length})</h3>
      <div class="flex gap-2" style="margin-bottom:.75rem">
        <input type="text" id="new-responsable" placeholder="Nombre completo del técnico" style="flex:1;padding:.5rem .9rem;border:1px solid #e2e8f0;border-radius:.5rem" />
        <button class="btn btn-primary btn-sm" id="btn-add-responsable">➕ Agregar</button>
      </div>
      <p style="font-size:.88rem;color:#475569">${responsables.join(" · ") || "Sin responsables registrados."}</p>
    </div>
  `;

  document.getElementById("btn-cat-agregar").addEventListener("click", async () => {
    const rubro = document.getElementById("cat-rubro").value;
    const nombre = document.getElementById("cat-nombre").value.trim().toUpperCase();
    const codigo = document.getElementById("cat-codigo").value.trim().toUpperCase();
    const categoria = document.getElementById("cat-categoria").value.trim();
    const stock = parseInt(document.getElementById("cat-stock").value) || 0;

    if (!nombre) return mostrarToast("El nombre del material es obligatorio.", "error");

    const campo = rubro === "GASFITERIA" ? { codigo, nombre, categoria, stock_actual: stock } : { codigo, nombre, tipo: categoria, stock_actual: stock };
    try {
      await agregarMaterial(rubro, campo);
      mostrarToast(`✅ Material "${nombre}" agregado.`, "success");
      await renderSeccionCatalogo(container);
    } catch (err) {
      mostrarToast(`❌ ${err.message}`, "error");
    }
  });

  document.getElementById("btn-add-responsable").addEventListener("click", async () => {
    const nombre = document.getElementById("new-responsable").value.trim();
    if (!nombre) return mostrarToast("Ingresa el nombre del responsable.", "error");
    try {
      await agregarResponsable(nombre);
      mostrarToast(`✅ Responsable "${nombre}" agregado.`, "success");
      await renderSeccionCatalogo(container);
    } catch (err) {
      mostrarToast(`❌ ${err.message}`, "error");
    }
  });

  document.getElementById("btn-export-saldos-gas").addEventListener("click", () => {
    exportarSaldosCSV(gasmat, "GASFITERIA");
    mostrarToast("CSV exportado.", "success");
  });
  document.getElementById("btn-export-saldos-elec").addEventListener("click", () => {
    exportarSaldosCSV(elecmat, "ELECTRICIDAD");
    mostrarToast("CSV exportado.", "success");
  });
}

/* ===== SECCIÓN: USUARIOS ===== */
async function renderSeccionUsuarios(container) {
  container.innerHTML = `<div class="card"><p class="text-muted text-center"><span class="spinner"></span> Cargando usuarios...</p></div>`;

  let usuarios = [];
  try {
    usuarios = await getUsuarios();
  } catch (e) { /* colección vacía */ }

  container.innerHTML = `
    <!-- Formulario registro nuevo usuario -->
    <div class="card">
      <h3 style="font-family:var(--font-heading);margin-bottom:1rem">➕ Registrar Nuevo Usuario</h3>
      <div id="form-user-errors" class="error-box hidden"><ul></ul></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" id="new-user-nombre" placeholder="Ej: Juan Pérez" />
        </div>
        <div class="form-group">
          <label>Correo electrónico *</label>
          <input type="email" id="new-user-email" placeholder="usuario@empresa.cl" />
        </div>
        <div class="form-group">
          <label>Contraseña temporal *</label>
          <input type="password" id="new-user-pwd" placeholder="Mínimo 6 caracteres" />
        </div>
        <div class="form-group">
          <label>Rol *</label>
          <select id="new-user-rol">
            <option value="OPERADOR">👷 Operador</option>
            <option value="ADMIN">🔑 Administrador</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" id="btn-crear-usuario">➕ Crear Usuario</button>
    </div>

    <!-- Lista de usuarios -->
    <div class="card">
      <h3 style="font-family:var(--font-heading);margin-bottom:1rem">👥 Usuarios registrados (${usuarios.length})</h3>
      <div class="table-wrapper">
        <table class="kardex">
          <thead>
            <tr>
              <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody id="usuarios-tbody">
            ${usuarios.length === 0
      ? `<tr><td colspan="5" class="text-muted text-center" style="padding:1.5rem">Sin usuarios registrados aún.</td></tr>`
      : usuarios.map(u => `
                <tr id="user-row-${u.uid}">
                  <td>${u.nombre_completo || "—"}</td>
                  <td style="font-size:.85rem">${u.correo || "—"}</td>
                  <td>
                    <select class="rol-select" data-uid="${u.uid}" style="padding:.25rem .5rem;border:1px solid #e2e8f0;border-radius:.375rem;font-size:.85rem">
                      <option value="OPERADOR" ${u.rol === "OPERADOR" ? "selected" : ""}>👷 Operador</option>
                      <option value="ADMIN" ${u.rol === "ADMIN" ? "selected" : ""}>🔑 Admin</option>
                    </select>
                  </td>
                  <td>
                    <span style="
                      background:${u.activo ? '#dcfce7' : '#fee2e2'};
                      color:${u.activo ? '#15803d' : '#b91c1c'};
                      padding:.2rem .6rem;border-radius:999px;font-size:.78rem;font-weight:600
                    ">${u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'} toggle-activo"
                      data-uid="${u.uid}" data-activo="${u.activo}">
                      ${u.activo ? '🚫 Desactivar' : '✅ Activar'}
                    </button>
                  </td>
                </tr>`).join("")
    }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ── Crear usuario ──
  document.getElementById("btn-crear-usuario").addEventListener("click", async () => {
    const btn = document.getElementById("btn-crear-usuario");
    const nombre = document.getElementById("new-user-nombre").value.trim();
    const email = document.getElementById("new-user-email").value.trim();
    const pwd = document.getElementById("new-user-pwd").value;
    const rol = document.getElementById("new-user-rol").value;
    const errEl = document.getElementById("form-user-errors");

    const errores = [];
    if (!nombre) errores.push("El nombre es obligatorio.");
    if (!email || !email.includes("@")) errores.push("Ingresa un correo válido.");
    if (!pwd || pwd.length < 6) errores.push("La contraseña debe tener al menos 6 caracteres.");

    if (errores.length > 0) {
      errEl.querySelector("ul").innerHTML = errores.map(e => `<li>${e}</li>`).join("");
      errEl.classList.remove("hidden");
      return;
    }
    errEl.classList.add("hidden");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Creando...`;

    try {
      await crearUsuario({ email, password: pwd, nombre, rol });
      mostrarToast(`✅ Usuario "${nombre}" creado correctamente.`, "success");
      await renderSeccionUsuarios(container);
    } catch (err) {
      const msg = traducirErrorCreacion(err.code);
      errEl.querySelector("ul").innerHTML = `<li>${msg}</li>`;
      errEl.classList.remove("hidden");
      btn.disabled = false;
      btn.innerHTML = "➕ Crear Usuario";
    }
  });

  // ── Toggle activo/inactivo ──
  document.querySelectorAll(".toggle-activo").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      const activo = btn.dataset.activo === "true";
      btn.disabled = true;
      try {
        await toggleActivoUsuario(uid, !activo);
        mostrarToast(`Usuario ${!activo ? "activado" : "desactivado"}.`, "success");
        await renderSeccionUsuarios(container);
      } catch (err) {
        mostrarToast(`❌ ${err.message}`, "error");
        btn.disabled = false;
      }
    });
  });

  // ── Cambiar rol ──
  document.querySelectorAll(".rol-select").forEach(sel => {
    sel.addEventListener("change", async function () {
      const uid = this.dataset.uid;
      const nuevoRol = this.value;
      try {
        await cambiarRolUsuario(uid, nuevoRol);
        mostrarToast(`Rol actualizado a ${nuevoRol}.`, "success");
      } catch (err) {
        mostrarToast(`❌ ${err.message}`, "error");
      }
    });
  });
}

function traducirErrorCreacion(code) {
  const mapa = {
    "auth/email-already-in-use": "Ese correo ya está registrado en el sistema.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/weak-password": "La contraseña es demasiado débil (mínimo 6 caracteres).",
    "auth/operation-not-allowed": "El registro de usuarios no está habilitado en Firebase."
  };
  return mapa[code] || "Error al crear el usuario. Verifica los datos.";
}

/* ===== SECCIÓN: REPORTES ===== */
async function renderSeccionReportes(container) {
  container.innerHTML = `
    <div class="card">
      <h3 style="font-family:var(--font-heading);margin-bottom:1rem">📊 Exportar Reportes Completos</h3>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-outline" id="btn-rep-gas">📥 Kardex Gasfitería (CSV)</button>
        <button class="btn btn-outline" id="btn-rep-elec">📥 Kardex Electricidad (CSV)</button>
        <button class="btn btn-outline" id="btn-rep-todo">📥 Todos los Movimientos (CSV)</button>
      </div>
      <p class="text-muted" style="margin-top:1rem;font-size:.85rem">Los reportes incluyen: ID, rubro, fecha, material, categoría, tipo, cantidad, saldo, responsable y ubicación.</p>
    </div>
  `;

  document.getElementById("btn-rep-gas").addEventListener("click", async () => {
    const movs = await getTodosMovimientos();
    exportarCSV(movs.filter(m => m.rubro === "GASFITERIA"), "kardex_gasfiteria_completo");
    mostrarToast("CSV exportado.", "success");
  });
  document.getElementById("btn-rep-elec").addEventListener("click", async () => {
    const movs = await getTodosMovimientos();
    exportarCSV(movs.filter(m => m.rubro === "ELECTRICIDAD"), "kardex_electricidad_completo");
    mostrarToast("CSV exportado.", "success");
  });
  document.getElementById("btn-rep-todo").addEventListener("click", async () => {
    const movs = await getTodosMovimientos();
    exportarCSV(movs, "kardex_todos_los_movimientos");
    mostrarToast("CSV exportado.", "success");
  });
}

/* ===== SECCIÓN: CONFIGURACIÓN ===== */
function renderSeccionSetup(container) {
  container.innerHTML = `
    <div class="card">
      <h3 style="font-family:var(--font-heading);margin-bottom:.5rem">⚙️ Inicialización de Catálogos</h3>
      <p class="text-muted" style="margin-bottom:1rem">
        Ejecuta esto <strong>una sola vez</strong> para crear los documentos base en Firestore
        (gasfiteria_materiales, electricidad_materiales, gasfiteria_categorias, responsables).
        Si ya existen, no se sobreescriben.
      </p>
      <button class="btn btn-danger" id="btn-init-catalogos">🚀 Inicializar Catálogos Base</button>
    </div>
  `;

  document.getElementById("btn-init-catalogos").addEventListener("click", async () => {
    const btn = document.getElementById("btn-init-catalogos");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Inicializando...`;
    try {
      await inicializarCatalogosBase();
      mostrarToast("✅ Catálogos inicializados correctamente.", "success");
    } catch (err) {
      mostrarToast(`❌ ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = "🚀 Inicializar Catálogos Base";
    }
  });
}
