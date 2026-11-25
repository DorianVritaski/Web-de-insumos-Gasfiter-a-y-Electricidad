// operador.view.js — Vista principal del Operador con pestañas de rubro
import { renderGasfiteria } from "./gasfiteria.view.js";
import { renderElectricidad } from "./electricidad.view.js";

let rubroActivo = "GASFITERIA";

export async function renderOperador(container, usuario) {
  container.innerHTML = `
    <div style="margin-bottom:1rem">
      <h2 style="font-size:1.1rem;color:#475569;font-family:var(--font-heading)">
        Bienvenido, <strong>${usuario.email}</strong>
        <span style="background:#eff6ff;color:#1e40af;font-size:.75rem;padding:.2rem .6rem;border-radius:999px;margin-left:.5rem">OPERADOR</span>
      </h2>
    </div>

    <!-- Tabs de rubro -->
    <div class="rubro-tabs">
      <button class="rubro-tab ${rubroActivo === 'GASFITERIA' ? 'active-gas' : ''}" id="tab-gas">
        🔧 Gasfitería
      </button>
      <button class="rubro-tab ${rubroActivo === 'ELECTRICIDAD' ? 'active-elec' : ''}" id="tab-elec">
        ⚡ Electricidad
      </button>
    </div>

    <!-- Contenedor del módulo activo -->
    <div id="rubro-content"></div>
  `;

  const rubroContent = document.getElementById("rubro-content");

  async function activarRubro(rubro) {
    rubroActivo = rubro;
    document.getElementById("tab-gas").className = `rubro-tab ${rubro === "GASFITERIA" ? "active-gas" : ""}`;
    document.getElementById("tab-elec").className = `rubro-tab ${rubro === "ELECTRICIDAD" ? "active-elec" : ""}`;

    if (rubro === "GASFITERIA") {
      await renderGasfiteria(rubroContent);
    } else {
      await renderElectricidad(rubroContent);
    }
  }

  document.getElementById("tab-gas").addEventListener("click", () => activarRubro("GASFITERIA"));
  document.getElementById("tab-elec").addEventListener("click", () => activarRubro("ELECTRICIDAD"));

  // Cargar rubro inicial
  await activarRubro(rubroActivo);
}
