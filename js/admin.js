document.addEventListener('DOMContentLoaded', () => {
  const defaults = {
    eventos: [
      { fecha: '2026-05-04', hora: '20:00', titulo: 'Reunión de comisión', lugar: 'Casal' },
      { fecha: '2026-05-10', hora: '11:30', titulo: 'Almuerzo fallero', lugar: 'Casal' }
    ],
    usuarios: [
      { nombre: 'Alejandro', rol: 'fallero', saldo: 50, estado: 'Activo' },
      { nombre: 'Administración', rol: 'admin', saldo: 0, estado: 'Activo' }
    ],
    comunicados: [
      { titulo: 'Bienvenida', texto: 'Ya está disponible el panel interno de la falla.' }
    ],
    formularios: [
      { titulo: 'Asistencia a comida', estado: 'Abierto' }
    ],
    movimientos: [
      { usuario: 'Alejandro', concepto: 'Saldo inicial', importe: 50 }
    ]
  };

  const state = JSON.parse(localStorage.getItem('adminDemoData') || 'null') || defaults;
  const save = () => localStorage.setItem('adminDemoData', JSON.stringify(state));

  const renderEventos = () => {
    const el = document.getElementById('eventosLista');
    if (!el) return;
    el.innerHTML = state.eventos.map((e, i) => `<tr><td>${e.fecha}</td><td>${e.hora}</td><td>${e.titulo}</td><td>${e.lugar}</td><td><button class="small-btn" data-del-evento="${i}">Eliminar</button></td></tr>`).join('');
    document.getElementById('totalEventos').textContent = state.eventos.length;
  };

  const renderUsuarios = () => {
    const el = document.getElementById('usuariosLista');
    if (!el) return;
    el.innerHTML = state.usuarios.map((u, i) => `<tr><td>${u.nombre}</td><td>${u.rol}</td><td>${u.saldo} €</td><td>${u.estado}</td><td><button class="small-btn" data-add-saldo="${i}">+5 €</button></td></tr>`).join('');
    document.getElementById('totalUsuarios').textContent = state.usuarios.length;
  };

  const renderComunicados = () => {
    const el = document.getElementById('comunicadosLista');
    if (!el) return;
    el.innerHTML = state.comunicados.map(c => `<div class="action-item"><strong>${c.titulo}</strong><span>${c.texto}</span></div>`).join('');
  };

  const renderFormularios = () => {
    const el = document.getElementById('formulariosLista');
    if (!el) return;
    el.innerHTML = state.formularios.map(f => `<div class="action-item"><strong>${f.titulo}</strong><span>${f.estado}</span></div>`).join('');
  };

  const renderMovimientos = () => {
    const el = document.getElementById('movimientosLista');
    if (!el) return;
    el.innerHTML = state.movimientos.map(m => `<tr><td>${m.usuario}</td><td>${m.concepto}</td><td>${m.importe} €</td></tr>`).join('');
  };

  const renderAll = () => { renderEventos(); renderUsuarios(); renderComunicados(); renderFormularios(); renderMovimientos(); save(); };

  document.getElementById('eventoForm')?.addEventListener('submit', e => {
    e.preventDefault();
    state.eventos.push({
      fecha: eventoFecha.value,
      hora: eventoHora.value,
      titulo: eventoTitulo.value,
      lugar: eventoLugar.value || 'Sin ubicación'
    });
    e.target.reset();
    renderAll();
  });

  document.getElementById('usuarioForm')?.addEventListener('submit', e => {
    e.preventDefault();
    state.usuarios.push({ nombre: usuarioNombre.value, rol: usuarioRol.value, saldo: Number(usuarioSaldo.value || 0), estado: 'Activo' });
    e.target.reset();
    renderAll();
  });

  document.getElementById('comunicadoForm')?.addEventListener('submit', e => {
    e.preventDefault();
    state.comunicados.unshift({ titulo: comunicadoTitulo.value, texto: comunicadoTexto.value });
    e.target.reset();
    renderAll();
  });

  document.getElementById('formularioForm')?.addEventListener('submit', e => {
    e.preventDefault();
    state.formularios.unshift({ titulo: formularioTitulo.value, estado: 'Abierto' });
    e.target.reset();
    renderAll();
  });

  document.addEventListener('click', e => {
    if (e.target.dataset.delEvento) {
      state.eventos.splice(Number(e.target.dataset.delEvento), 1);
      renderAll();
    }
    if (e.target.dataset.addSaldo) {
      const idx = Number(e.target.dataset.addSaldo);
      state.usuarios[idx].saldo += 5;
      state.movimientos.unshift({ usuario: state.usuarios[idx].nombre, concepto: 'Recarga admin', importe: 5 });
      renderAll();
    }
  });

  renderAll();
});
