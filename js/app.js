document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  if (!loginForm) return;

  function mostrarError(texto) {
    loginMessage.textContent = texto;
    loginMessage.className = 'login-message error';
  }

  function mostrarOk(texto) {
    loginMessage.textContent = texto;
    loginMessage.className = 'login-message success';
  }

  function buscarUsuario(lista, usuarioInput) {
    return lista.find(u => {
      const usuarioBD = (u.usuario || '').toLowerCase();
      const emailBD = (u.email || '').toLowerCase();
      return usuarioBD === usuarioInput || emailBD === usuarioInput;
    });
  }

  function entrar(usuarioEncontrado, tipoUsuario) {
    if (usuarioEncontrado.estado !== 'activo') {
      mostrarError('El usuario está inactivo.');
      return;
    }

    if (tipoUsuario === 'admin' && usuarioEncontrado.rol !== 'admin') {
      mostrarError('Este usuario no tiene acceso de administración.');
      return;
    }

    if (tipoUsuario === 'fallero' && usuarioEncontrado.rol !== 'fallero' && usuarioEncontrado.rol !== 'admin') {
      mostrarError('Este usuario no tiene acceso válido.');
      return;
    }

    localStorage.setItem('usuarioActivo', JSON.stringify(usuarioEncontrado));
    mostrarOk('Acceso correcto.');

    setTimeout(() => {
      window.location.href = tipoUsuario === 'admin' ? 'admin.html' : 'fallero.html';
    }, 300);
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const tipoUsuario = document.getElementById('tipoUsuario').value;
    const usuarioInput = document.getElementById('usuario').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();

    loginMessage.textContent = '';
    loginMessage.className = 'login-message';

    if (!usuarioInput || !password) {
      mostrarError('Completa usuario y contraseña.');
      return;
    }

    if (!window.supabaseClient) {
      mostrarError('No hay conexión con Supabase.');
      return;
    }

    const resultado = await supabaseClient
      .from('usuarios')
      .select('id, nombre, usuario, email, rol, estado, saldo, password_demo, codigo_interno, codigo_qr');

    if (resultado.error) {
      console.error(resultado.error);
      mostrarError('Error al leer usuarios de Supabase.');
      return;
    }

    const usuarioEncontrado = buscarUsuario(resultado.data || [], usuarioInput);

    if (!usuarioEncontrado) {
      mostrarError('Usuario no encontrado.');
      return;
    }

    if (usuarioEncontrado.password_demo !== password) {
      mostrarError('Contraseña incorrecta.');
      return;
    }

    entrar(usuarioEncontrado, tipoUsuario);
  });
});
