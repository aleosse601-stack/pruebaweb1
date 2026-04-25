(() => {
  const page = document.body.dataset.page;
  const rawUser = localStorage.getItem('usuarioActivo');

  if (!rawUser) {
    window.location.href = 'login.html';
    return;
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem('usuarioActivo');
    window.location.href = 'login.html';
    return;
  }

  if (page === 'admin' && user.rol !== 'admin') {
    window.location.href = 'fallero.html';
    return;
  }

  if (page === 'fallero' && user.rol !== 'fallero' && user.rol !== 'admin') {
    localStorage.removeItem('usuarioActivo');
    window.location.href = 'login.html';
    return;
  }

  window.usuarioActivo = user;
})();
