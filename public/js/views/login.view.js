// login.view.js
import { login } from "../services/auth.service.js";
import { mostrarToast } from "../app.js";

export function renderLogin(container) {
  container.innerHTML = `
    <div id="login-view">
      <div class="login-card">
        <div class="logo">🏗️</div>
        <h2>PAB-IN v2.0</h2>
        <p class="text-muted text-center mb-1">Control de Insumos — Gasfitería &amp; Electricidad</p>
        <br>
        <div class="form-group">
          <label for="login-email">Correo electrónico</label>
          <input type="email" id="login-email" placeholder="usuario@empresa.cl" autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="login-password">Contraseña</label>
          <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <div id="login-errors" class="error-box hidden"><ul></ul></div>
        <button class="btn btn-primary w-full" id="btn-login" style="justify-content:center;">
          Iniciar Sesión
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-login").addEventListener("click", handleLogin);
  document.getElementById("login-password").addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("btn-login");
  const errorsEl = document.getElementById("login-errors");

  errorsEl.classList.add("hidden");
  errorsEl.querySelector("ul").innerHTML = "";

  if (!email || !password) {
    errorsEl.querySelector("ul").innerHTML = "<li>Ingresa tu correo y contraseña.</li>";
    errorsEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Ingresando...`;

  try {
    await login(email, password);
    // onAuthStateChanged en app.js manejará el redirect
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = "Iniciar Sesión";
    const msg = traducirErrorAuth(err.code);
    errorsEl.querySelector("ul").innerHTML = `<li>${msg}</li>`;
    errorsEl.classList.remove("hidden");
  }
}

function traducirErrorAuth(code) {
  const mapa = {
    "auth/user-not-found": "No existe un usuario con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-email": "El correo ingresado no es válido.",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
    "auth/invalid-credential": "Credenciales incorrectas. Verifica correo y contraseña."
  };
  return mapa[code] || "Error al iniciar sesión. Intenta nuevamente.";
}
