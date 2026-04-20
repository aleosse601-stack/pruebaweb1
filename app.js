document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) return;

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const tipoUsuario = document.getElementById("tipoUsuario").value;
    const password = document.getElementById("password").value.trim();
    const loginMessage = document.getElementById("loginMessage");

    loginMessage.textContent = "";
    loginMessage.className = "login-message";

    if (tipoUsuario === "fallero") {
      loginMessage.textContent = "Accediendo como fallero...";
      loginMessage.classList.add("success");

      setTimeout(function () {
        window.location.href = "fallero.html";
      }, 600);

      return;
    }

    if (tipoUsuario === "admin") {
      const adminPassword = "admin123";

      if (password === adminPassword) {
        loginMessage.textContent = "Acceso correcto. Entrando en administración...";
        loginMessage.classList.add("success");

        setTimeout(function () {
          window.location.href = "admin.html";
        }, 600);
      } else {
        loginMessage.textContent = "Contraseña incorrecta";
        loginMessage.classList.add("error");
      }

      return;
    }
  });
});