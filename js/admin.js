document.addEventListener('DOMContentLoaded', () => {
  const defaults = {
    eventos: [
      { fecha: '2026-05-04', hora: '20:00', titulo: 'Reunión de comisión', lugar: 'Casal' },
      { fecha: '2026-05-10', hora: '11:30', titulo: 'Almuerzo fallero', lugar: 'Casal' }
    ],
    usuarios: [
      { nombre: 'Alejandro', rol: 'admin', saldo: 100, estado: 'Activo' },
      { nombre: 'Juan', rol: 'fallero', saldo: 50, estado: 'Activo' }
    ],
    comunicados: [
      { titulo: 'Bienvenida', texto: 'Ya está disponible el panel interno de la falla.' }
    ],
    formularios: [
      {
        id: Date.now(),
        titulo: 'Asistencia a comida',
        pregunta: '¿Vendrás a la comida? ',
        tipo: 'opcion',
        opciones: ['Sí', 'No', 'Tal vez'],
        estado: 'Abierto',
        respuestas: []
      }
    ],
    movimientos: [
      { usuario: 'Juan', concepto: 'Saldo inicial', importe: 50 }
    ]
  };

  const state = JSON.parse(localStorage.getItem('adminDemoData') || 'null') || defaults;
  state.formularios = (state.formularios || []).map((f, i) => ({
    id: f.id || Date.now() + i,
    titulo: f.titulo || 'Formulario',
    pregunta: f.pregunta || f.titulo || 'Pregunta',
    tipo: f.tipo || 'opcion',
    opciones: Array.isArray(f.opciones) ? f.opciones : ['Sí', 'No'],
    estado: f.estado || 'Abierto',
    respuestas: Array.isArray(f.respuestas) ? f.respuestas : []
  }));

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
    el.innerHTML = state.usuarios.map((u, i) => `<tr><td>${u.nombre}</td><td>${u.rol}</td><td>${Number(u.saldo || 0).toFixed(2)} €</td><td>${u.estado}</td><td><button class="small-btn" data-add-saldo="${i}">+5 €</button></td></tr>`).join('');
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
    el.innerHTML = state.formularios.map((f, i) => {
      const opciones = f.tipo === 'opcion' ? `<span><b>Opciones:</b> ${f.opciones.join(', ')}</span>` : '<span><b>Tipo:</b> respuesta escrita</span>';
      const respuestas = f.respuestas.length
        ? f.respuestas.map(r => `<li><b>${r.usuario}</b>: ${r.respuesta}</li>`).join('')
        : '<li>Sin respuestas todavía</li>';
      return `<div class="action-item formulario-admin-card"><strong>${f.titulo}</strong><span>${f.pregunta}</span>${opciones}<span><b>Respuestas:</b> ${f.respuestas.length}</span><ul class="responses-list">${respuestas}</ul><button class="small-btn" data-del-formulario="${i}">Eliminar formulario</button></div>`;
    }).join('');
  };

  const renderMovimientos = () => {
    const el = document.getElementById('movimientosLista');
    if (!el) return;
    el.innerHTML = state.movimientos.map(m => `<tr><td>${m.usuario}</td><td>${m.concepto}</td><td>${Number(m.importe || 0).toFixed(2)} €</td></tr>`).join('');
  };

  const renderAll = () => { renderEventos(); renderUsuarios(); renderComunicados(); renderFormularios(); renderMovimientos(); save(); };

  document.getElementById('eventoForm')?.addEventListener('submit', e => {
    e.preventDefault();
    state.eventos.push({ fecha: eventoFecha.value, hora: eventoHora.value, titulo: eventoTitulo.value, lugar: eventoLugar.value || 'Sin ubicación' });
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
    const tipo = formularioTipo.value;
    const opciones = formularioOpciones.value.split(',').map(o => o.trim()).filter(Boolean);
    state.formularios.unshift({
      id: Date.now(),
      titulo: formularioTitulo.value,
      pregunta: formularioPregunta.value,
      tipo,
      opciones: tipo === 'opcion' ? (opciones.length ? opciones : ['Sí', 'No']) : [],
      estado: 'Abierto',
      respuestas: []
    });
    e.target.reset();
    renderAll();
  });

  document.addEventListener('click', e => {
    if (e.target.dataset.delEvento) {
      state.eventos.splice(Number(e.target.dataset.delEvento), 1);
      renderAll();
    }
    if (e.target.dataset.delFormulario) {
      state.formularios.splice(Number(e.target.dataset.delFormulario), 1);
      renderAll();
    }
    if (e.target.dataset.addSaldo) {
      const idx = Number(e.target.dataset.addSaldo);
      state.usuarios[idx].saldo = Number(state.usuarios[idx].saldo || 0) + 5;
      state.movimientos.unshift({ usuario: state.usuarios[idx].nombre, concepto: 'Recarga admin', importe: 5 });
      renderAll();
    }
  });

  renderAll();
});
