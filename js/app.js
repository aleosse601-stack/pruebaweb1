document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  if (!loginForm) return;

  const usuariosDemo = [
    {
      id: "demo-admin",
      nombre: "Alejandro",
      usuario: "alejandro",
      email: "alejandro@test.com",
      rol: "admin",
      estado: "activo",
      saldo: 100,
      password_demo: "1234",
      codigo_interno: "FB-ALE-100",
      codigo_qr: "FB-ALE-100"
    },
    {
      id: "demo-fallero",
      nombre: "Juan",
      usuario: "juan",
      email: "juan@test.com",
      rol: "fallero",
      estado: "activo",
      saldo: 50,
      password_demo: "1234",
      codigo_interno: "FB-JUA-050",
      codigo_qr: "FB-JUA-050"
    }
  ];

  function buscarUsuario(lista, usuarioInput) {
    return lista.find(function (u) {
      const usuarioBD = u.usuario ? u.usuario.toLowerCase() : "";
      const emailBD = u.email ? u.email.toLowerCase() : "";
      return usuarioBD === usuarioInput || emailBD === usuarioInput;
    });
  }

  function entrar(usuarioEncontrado, tipoUsuario) {
    if (usuarioEncontrado.estado !== "activo") {
      loginMessage.textContent = "El usuario está inactivo.";
      loginMessage.classList.add("error");
      return;
    }

    if (tipoUsuario === "admin" && usuarioEncontrado.rol !== "admin") {
      loginMessage.textContent = "Este usuario no tiene acceso de administración.";
      loginMessage.classList.add("error");
      return;
    }

    if (tipoUsuario === "fallero" && usuarioEncontrado.rol !== "fallero" && usuarioEncontrado.rol !== "admin") {
      loginMessage.textContent = "Este usuario no tiene acceso válido.";
      loginMessage.classList.add("error");
      return;
    }

    localStorage.setItem("usuarioActivo", JSON.stringify(usuarioEncontrado));

    loginMessage.textContent = "Acceso correcto.";
    loginMessage.classList.add("success");

    setTimeout(function () {
      window.location.href = tipoUsuario === "admin" ? "admin.html" : "fallero.html";
    }, 300);
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const tipoUsuario = document.getElementById("tipoUsuario").value;
    const usuarioInput = document.getElementById("usuario").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();

    loginMessage.textContent = "";
    loginMessage.className = "login-message";

    if (!usuarioInput || !password) {
      loginMessage.textContent = "Completa usuario y contraseña.";
      loginMessage.classList.add("error");
      return;
    }

    let usuarios = [];

    try {
      if (window.supabaseClient) {
        const resultado = await supabaseClient
          .from("usuarios")
          .select("id, nombre, usuario, email, rol, estado, saldo, password_demo, codigo_interno, codigo_qr");

        if (!resultado.error && Array.isArray(resultado.data)) {
          usuarios = resultado.data;
        }
      }
    } catch (error) {
      console.warn("Supabase no disponible. Usando usuarios demo.", error);
    }

    let usuarioEncontrado = buscarUsuario(usuarios, usuarioInput);

    if (!usuarioEncontrado) {
      usuarioEncontrado = buscarUsuario(usuariosDemo, usuarioInput);
    }

    if (!usuarioEncontrado) {
      loginMessage.textContent = "Usuario no encontrado.";
      loginMessage.classList.add("error");
      return;
    }

    if (usuarioEncontrado.password_demo !== password) {
      loginMessage.textContent = "Contraseña incorrecta.";
      loginMessage.classList.add("error");
      return;
    }

    entrar(usuarioEncontrado, tipoUsuario);
  });
});
