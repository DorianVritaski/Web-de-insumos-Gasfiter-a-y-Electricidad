// app.js — Orquestador principal SPA PAB-IN v2.0
import { observarSesion, logout } from "./services/auth.service.js";
import { renderLogin } from "./views/login.view.js";
import { renderOperador } from "./views/operador.view.js";
import { renderAdmin } from "./views/admin.view.js";

// Estado global del usuario actual (exportado para uso en vistas)
export let usuarioActual = null;

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const navbar    = document.getElementById("navbar");
const navUser   = document.getElementById("nav-user");
const btnLogout = document.getElementById("btn-logout");
const appRoot   = document.getElementById("app");
const pageRoot  = document.getElementById("page-root");

// Toast de notificaciones
const toast = document.getElementById("toast");
let toastTimer = null;

export function mostrarToast(mensaje, tipo = "success") {
  toast.textContent = mensaje;
  toast.className = `show ${tipo}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ""; }, 3500);
}

// ─── Autenticación ─────────────────────────────────────────────────────────
observarSesion(async (usuario) => {
  usuarioActual = usuario;

  if (!usuario) {
    // No autenticado → mostrar login
    navbar.classList.add("hidden");
    appRoot.classList.add("hidden");
    renderLogin(pageRoot);
    return;
  }

  // Autenticado → mostrar navbar y vista según rol
  navbar.classList.remove("hidden");
  appRoot.classList.remove("hidden");
  pageRoot.innerHTML = "";
  navUser.textContent = `${usuario.email} · ${usuario.rol}`;

  if (usuario.rol === "ADMIN") {
    await renderAdmin(appRoot, usuario);
  } else {
    await renderOperador(appRoot, usuario);
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────
btnLogout.addEventListener("click", async () => {
  try {
    await logout();
    mostrarToast("Sesión cerrada.", "success");
  } catch (err) {
    mostrarToast("Error al cerrar sesión.", "error");
  }
});
