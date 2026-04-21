document.addEventListener("DOMContentLoaded", function () {
  const usuarioActivo = localStorage.getItem("usuarioActivo");

  if (!usuarioActivo) {
    window.location.href = "login.html";
    return;
  }

  const usuario = JSON.parse(usuarioActivo);

  const nombre = document.getElementById("falleroNombre");
  const subtitulo = document.getElementById("falleroSubtitulo");
  const rol = document.getElementById("falleroRol");
  const codigo = document.getElementById("falleroCodigo");
  const codigoTexto = document.getElementById("falleroCodigoTexto");

  if (nombre) {
    nombre.textContent = "Bienvenido, " + usuario.nombre;
  }

  if (subtitulo) {
    subtitulo.textContent = "Acceso personal a la plataforma de la falla.";
  }

  if (rol) {
    rol.textContent = usuario.rol === "admin" ? "Administrador" : "Fallero";
  }

  if (codigo) {
    codigo.textContent = usuario.codigo_interno ? usuario.codigo_interno : "Sin código";
  }

  if (codigoTexto) {
    codigoTexto.textContent = usuario.codigo_qr
      ? "Referencia QR: " + usuario.codigo_qr
      : "Código pendiente de asignación";
  }
});