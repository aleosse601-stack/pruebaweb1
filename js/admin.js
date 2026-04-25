document.addEventListener('DOMContentLoaded', async () => {
  const hasSupabase = typeof supabaseClient !== 'undefined';
  const defaults = { eventos: [], usuarios: [], comunicados: [], formularios: [], movimientos: [] };
  let state = JSON.parse(localStorage.getItem('adminDemoData') || 'null') || defaults;
  let usingSupabase = false;

  const saveLocal = () => localStorage.setItem('adminDemoData', JSON.stringify(state));

  async function loadSupabase() {
    if (!hasSupabase) return false;
    try {
      const [eventosRes, usuariosRes, comunicadosRes, formulariosRes, movimientosRes] = await Promise.all([
        supabaseClient.from('eventos').select('*').order('fecha', { ascending: true }),
        supabaseClient.from('usuarios').select('*').order('nombre', { ascending: true }),
        supabaseClient.from('comunicados').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('formularios').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('movimientos').select('*').order('created_at', { ascending: false })
      ]);

      if (eventosRes.error || usuariosRes.error || comunicadosRes.error || formulariosRes.error || movimientosRes.error) {
        console.warn('Supabase no disponible, usando modo local');
        return false;
      }

      state = {
        eventos: eventosRes.data || [],
        usuarios: usuariosRes.data || [],
        comunicados: comunicadosRes.data || [],
        formularios: (formulariosRes.data || []).map(f => ({ ...f, opciones: Array.isArray(f.opciones) ? f.opciones : [] })),
        movimientos: movimientosRes.data || []
      };
      usingSupabase = true;
      saveLocal();
      return true;
    } catch (error) {
      console.warn('Error conectando Supabase', error);
      return false;
    }
  }

  const renderEventos = () => {
    const el = document.getElementById('eventosLista');
    if (!el) return;
    el.innerHTML = state.eventos.map((e, i) => `<tr><td>${e.fecha || ''}</td><td>${e.hora || ''}</td><td>${e.titulo || ''}</td><td>${e.lugar || ''}</td><td><button class="small-btn" data-del-evento="${i}" data-id="${e.id || ''}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">No hay eventos.</td></tr>';
    document.getElementById('totalEventos').textContent = state.eventos.length;
  };

  const renderUsuarios = () => {
    const el = document.getElementById('usuariosLista');
    if (!el) return;
    el.innerHTML = state.usuarios.map((u, i) => `<tr><td>${u.nombre || ''}</td><td>${u.rol || ''}</td><td>${Number(u.saldo || 0).toFixed(2)} €</td><td>${u.estado || 'Activo'}</td><td><button class="small-btn" data-add-saldo="${i}" data-id="${u.id || ''}">+5 €</button></td></tr>`).join('') || '<tr><td colspan="5">No hay usuarios.</td></tr>';
    document.getElementById('totalUsuarios').textContent = state.usuarios.length;
  };

  const renderComunicados = () => {
    const el = document.getElementById('comunicadosLista');
    if (!el) return;
    el.innerHTML = state.comunicados.map(c => `<div class="action-item"><strong>${c.titulo || ''}</strong><span>${c.texto || ''}</span></div>`).join('') || '<div class="empty-box">No hay comunicados.</div>';
  };

  const renderFormularios = () => {
    const el = document.getElementById('formulariosLista');
    if (!el) return;
    el.innerHTML = state.formularios.map((f, i) => {
      const opciones = f.tipo === 'opcion' ? `<span><b>Opciones:</b> ${(f.opciones || []).join(', ')}</span>` : '<span><b>Tipo:</b> respuesta escrita</span>';
      const respuestas = Array.isArray(f.respuestas) ? f.respuestas : [];
      const respuestasHtml = respuestas.length ? respuestas.map(r => `<li><b>${r.usuario}</b>: ${r.respuesta}</li>`).join('') : '<li>Sin respuestas todavía</li>';
      return `<div class="action-item formulario-admin-card"><strong>${f.titulo || ''}</strong><span>${f.pregunta || ''}</span>${opciones}<span><b>Respuestas:</b> ${respuestas.length}</span><ul class="responses-list">${respuestasHtml}</ul><button class="small-btn" data-del-formulario="${i}" data-id="${f.id || ''}">Eliminar formulario</button></div>`;
    }).join('') || '<div class="empty-box">No hay formularios.</div>';
  };

  const renderMovimientos = () => {
    const el = document.getElementById('movimientosLista');
    if (!el) return;
    el.innerHTML = state.movimientos.map(m => `<tr><td>${m.usuario || ''}</td><td>${m.concepto || ''}</td><td>${Number(m.importe || 0).toFixed(2)} €</td></tr>`).join('') || '<tr><td colspan="3">Sin movimientos.</td></tr>';
  };

  const renderAll = () => { renderEventos(); renderUsuarios(); renderComunicados(); renderFormularios(); renderMovimientos(); saveLocal(); };

  document.getElementById('eventoForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nuevo = { fecha: eventoFecha.value, hora: eventoHora.value, titulo: eventoTitulo.value, lugar: eventoLugar.value || 'Sin ubicación' };
    if (usingSupabase) {
      const { data, error } = await supabaseClient.from('eventos').insert(nuevo).select().single();
      if (!error && data) state.eventos.push(data);
    } else state.eventos.push(nuevo);
    e.target.reset();
    renderAll();
  });

  document.getElementById('usuarioForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nuevo = { nombre: usuarioNombre.value, usuario: usuarioNombre.value.toLowerCase().replaceAll(' ', ''), rol: usuarioRol.value, saldo: Number(usuarioSaldo.value || 0), estado: 'activo', password_demo: '1234' };
    if (usingSupabase) {
      const { data, error } = await supabaseClient.from('usuarios').insert(nuevo).select().single();
      if (!error && data) state.usuarios.push(data);
    } else state.usuarios.push(nuevo);
    e.target.reset();
    renderAll();
  });

  document.getElementById('comunicadoForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nuevo = { titulo: comunicadoTitulo.value, texto: comunicadoTexto.value };
    if (usingSupabase) {
      const { data, error } = await supabaseClient.from('comunicados').insert(nuevo).select().single();
      if (!error && data) state.comunicados.unshift(data);
    } else state.comunicados.unshift(nuevo);
    e.target.reset();
    renderAll();
  });

  document.getElementById('formularioForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const opciones = formularioOpciones.value.split(',').map(o => o.trim()).filter(Boolean);
    const nuevo = { titulo: formularioTitulo.value, pregunta: formularioPregunta.value, tipo: formularioTipo.value, opciones: formularioTipo.value === 'opcion' ? (opciones.length ? opciones : ['Sí', 'No']) : [], estado: 'Abierto', respuestas: [] };
    if (usingSupabase) {
      const { data, error } = await supabaseClient.from('formularios').insert(nuevo).select().single();
      if (!error && data) state.formularios.unshift(data);
    } else state.formularios.unshift(nuevo);
    e.target.reset();
    renderAll();
  });

  document.addEventListener('click', async e => {
    if (e.target.dataset.delEvento) {
      const idx = Number(e.target.dataset.delEvento);
      const id = e.target.dataset.id;
      if (usingSupabase && id) await supabaseClient.from('eventos').delete().eq('id', id);
      state.eventos.splice(idx, 1);
      renderAll();
    }
    if (e.target.dataset.delFormulario) {
      const idx = Number(e.target.dataset.delFormulario);
      const id = e.target.dataset.id;
      if (usingSupabase && id) await supabaseClient.from('formularios').delete().eq('id', id);
      state.formularios.splice(idx, 1);
      renderAll();
    }
    if (e.target.dataset.addSaldo) {
      const idx = Number(e.target.dataset.addSaldo);
      const usuario = state.usuarios[idx];
      usuario.saldo = Number(usuario.saldo || 0) + 5;
      const movimiento = { usuario: usuario.nombre, concepto: 'Recarga admin', importe: 5 };
      if (usingSupabase && usuario.id) {
        await supabaseClient.from('usuarios').update({ saldo: usuario.saldo }).eq('id', usuario.id);
        const { data } = await supabaseClient.from('movimientos').insert(movimiento).select().single();
        state.movimientos.unshift(data || movimiento);
      } else state.movimientos.unshift(movimiento);
      renderAll();
    }
  });

  await loadSupabase();
  renderAll();
});
