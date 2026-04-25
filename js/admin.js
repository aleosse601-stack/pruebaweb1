document.addEventListener('DOMContentLoaded', async () => {
  const hasSupabase = typeof supabaseClient !== 'undefined';
  const defaults = { eventos: [], usuarios: [], comunicados: [], formularios: [], movimientos: [] };
  let state = JSON.parse(localStorage.getItem('adminDemoData') || 'null') || defaults;
  let usingSupabase = false;
  let qrScanner = null;

  const saveLocal = () => localStorage.setItem('adminDemoData', JSON.stringify(state));
  const euro = value => `${Number(value || 0).toFixed(2)} €`;

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

      if (eventosRes.error || usuariosRes.error || comunicadosRes.error || formulariosRes.error || movimientosRes.error) return false;

      state = {
        eventos: eventosRes.data || [],
        usuarios: usuariosRes.data || [],
        comunicados: comunicadosRes.data || [],
        formularios: (formulariosRes.data || []).map(f => ({
          ...f,
          opciones: Array.isArray(f.opciones) ? f.opciones : [],
          respuestas: Array.isArray(f.respuestas) ? f.respuestas : []
        })),
        movimientos: movimientosRes.data || []
      };
      usingSupabase = true;
      saveLocal();
      return true;
    } catch (error) {
      console.warn('Supabase no disponible, modo local', error);
      return false;
    }
  }

  function codigoUsuario(u) {
    const base = (u.codigo_qr || u.codigo_interno || u.id || u.usuario || u.nombre || '').toString();
    return `FB-${base.slice(0, 12).toUpperCase()}`;
  }

  function buscarUsuarioPorCodigo(codigo) {
    const limpio = (codigo || '').trim().toUpperCase();
    return state.usuarios.find(u => {
      const codigos = [codigoUsuario(u), u.codigo_qr, u.codigo_interno, u.id, u.usuario, u.nombre]
        .filter(Boolean)
        .map(x => x.toString().toUpperCase());
      return codigos.some(c => limpio === c || limpio.includes(c) || c.includes(limpio));
    });
  }

  function renderEventos() {
    const el = document.getElementById('eventosLista');
    if (!el) return;
    el.innerHTML = state.eventos.map((e, i) => `<tr><td>${e.fecha || ''}</td><td>${e.hora || ''}</td><td>${e.titulo || ''}</td><td>${e.lugar || ''}</td><td><button class="small-btn danger" data-del-evento="${i}" data-id="${e.id || ''}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">No hay eventos.</td></tr>';
    document.getElementById('totalEventos').textContent = state.eventos.length;
  }

  function renderUsuarios() {
    const el = document.getElementById('usuariosLista');
    if (!el) return;
    el.innerHTML = state.usuarios.map((u, i) => `
      <tr>
        <td><input class="table-input" value="${u.nombre || ''}" data-nombre="${i}"><small>${codigoUsuario(u)}</small></td>
        <td><input class="table-input" value="${u.usuario || ''}" data-usuario="${i}"></td>
        <td><select class="table-input" data-rol="${i}"><option value="fallero" ${u.rol === 'fallero' ? 'selected' : ''}>Fallero</option><option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option></select></td>
        <td><select class="table-input" data-estado="${i}"><option value="activo" ${u.estado === 'activo' ? 'selected' : ''}>Activo</option><option value="inactivo" ${u.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option></select></td>
        <td><input class="table-input saldo-input" type="number" step="0.01" value="${Number(u.saldo || 0)}" data-saldo="${i}"></td>
        <td class="table-actions"><input class="table-input password-input" placeholder="Nueva clave" data-password="${i}"><button class="small-btn" data-save-usuario="${i}" data-id="${u.id || ''}">Guardar</button><button class="small-btn" data-add-saldo="${i}" data-id="${u.id || ''}">+5 €</button><button class="small-btn danger" data-delete-usuario="${i}" data-id="${u.id || ''}">Eliminar</button></td>
      </tr>`).join('') || '<tr><td colspan="6">No hay usuarios.</td></tr>';
    document.getElementById('totalUsuarios').textContent = state.usuarios.length;
  }

  function renderComunicados() {
    const el = document.getElementById('comunicadosLista');
    if (!el) return;
    el.innerHTML = state.comunicados.map(c => `<div class="action-item"><strong>${c.titulo || ''}</strong><span>${c.texto || ''}</span></div>`).join('') || '<div class="empty-box">No hay comunicados.</div>';
  }

  function renderFormularios() {
    const el = document.getElementById('formulariosLista');
    if (!el) return;
    el.innerHTML = state.formularios.map((f, i) => {
      const respuestas = Array.isArray(f.respuestas) ? f.respuestas : [];
      return `<div class="action-item formulario-admin-card"><strong>${f.titulo || ''}</strong><span>${f.pregunta || ''}</span><span><b>Opciones:</b> ${(f.opciones || []).join(', ') || 'Respuesta escrita'}</span><span><b>Respuestas:</b> ${respuestas.length}</span><ul class="responses-list">${respuestas.length ? respuestas.map(r => `<li><b>${r.usuario}</b>: ${r.respuesta}</li>`).join('') : '<li>Sin respuestas todavía</li>'}</ul><button class="small-btn danger" data-del-formulario="${i}" data-id="${f.id || ''}">Eliminar formulario</button></div>`;
    }).join('') || '<div class="empty-box">No hay formularios.</div>';
  }

  function renderMovimientos() {
    const el = document.getElementById('movimientosLista');
    if (!el) return;
    el.innerHTML = state.movimientos.map(m => `<tr><td>${m.usuario || ''}</td><td>${m.concepto || ''}</td><td>${euro(m.importe)}</td></tr>`).join('') || '<tr><td colspan="3">Sin movimientos.</td></tr>';
  }

  function renderStats() {
    const totalSaldo = state.usuarios.reduce((acc, u) => acc + Number(u.saldo || 0), 0);
    const totalCobrado = state.movimientos.filter(m => Number(m.importe) < 0).reduce((acc, m) => acc + Math.abs(Number(m.importe || 0)), 0);
    const sistema = document.querySelector('.info-grid .info-card:nth-child(3) h3');
    if (sistema) sistema.textContent = usingSupabase ? 'Supabase' : 'Local';
    const totalUsuarios = document.getElementById('totalUsuarios');
    if (totalUsuarios) totalUsuarios.textContent = state.usuarios.length;
    const totalEventos = document.getElementById('totalEventos');
    if (totalEventos) totalEventos.textContent = state.eventos.length;
    document.title = `Admin · ${state.usuarios.length} usuarios · ${euro(totalCobrado)} cobrado`;
  }

  function renderAll() {
    renderEventos(); renderUsuarios(); renderComunicados(); renderFormularios(); renderMovimientos(); renderStats(); saveLocal();
  }

  async function insertarMovimiento(movimiento) {
    if (usingSupabase) {
      const { data } = await supabaseClient.from('movimientos').insert(movimiento).select().single();
      state.movimientos.unshift(data || movimiento);
    } else {
      state.movimientos.unshift(movimiento);
    }
  }

  async function actualizarUsuario(usuario, payload) {
    Object.assign(usuario, payload);
    if (usingSupabase && usuario.id) {
      const { error } = await supabaseClient.from('usuarios').update(payload).eq('id', usuario.id);
      if (error) throw error;
    }
  }

  async function cobrarUsuario(codigo, importe, concepto) {
    const resultado = document.getElementById('cobroResultado');
    if (resultado) resultado.className = 'login-message';
    const usuario = buscarUsuarioPorCodigo(codigo);
    if (!usuario) {
      if (resultado) { resultado.textContent = '❌ Usuario no encontrado'; resultado.classList.add('error'); }
      return;
    }
    if (usuario.estado && usuario.estado !== 'activo') {
      if (resultado) { resultado.textContent = '❌ Usuario inactivo'; resultado.classList.add('error'); }
      return;
    }
    if (!importe || importe <= 0) {
      if (resultado) { resultado.textContent = '❌ Importe no válido'; resultado.classList.add('error'); }
      return;
    }
    if (Number(usuario.saldo || 0) < importe) {
      if (resultado) { resultado.textContent = `❌ Saldo insuficiente. Saldo actual: ${euro(usuario.saldo)}`; resultado.classList.add('error'); }
      return;
    }
    const nuevoSaldo = Number(usuario.saldo || 0) - importe;
    await actualizarUsuario(usuario, { saldo: nuevoSaldo });
    await insertarMovimiento({ usuario: usuario.nombre, concepto: concepto || 'Cobro QR', importe: -importe });
    if (resultado) { resultado.textContent = `✅ Cobrado ${euro(importe)} a ${usuario.nombre}. Saldo: ${euro(nuevoSaldo)}`; resultado.classList.add('success'); }
    document.getElementById('cobroForm')?.reset();
    renderAll();
  }

  document.getElementById('eventoForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nuevo = { fecha: eventoFecha.value, hora: eventoHora.value, titulo: eventoTitulo.value, lugar: eventoLugar.value || 'Sin ubicación' };
    if (usingSupabase) {
      const { data, error } = await supabaseClient.from('eventos').insert(nuevo).select().single();
      if (!error && data) state.eventos.push(data);
    } else state.eventos.push(nuevo);
    e.target.reset(); renderAll();
  });

  document.getElementById('usuarioForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nuevo = { nombre: usuarioNombre.value.trim(), usuario: usuarioUsuario.value.trim().toLowerCase(), email: usuarioEmail.value.trim().toLowerCase(), rol: usuarioRol.value, estado: usuarioEstado.value, saldo: Number(usuarioSaldo.value || 0), password_demo: usuarioPassword.value.trim(), codigo_interno: `FB-${Date.now().toString().slice(-6)}`, codigo_qr: `QR-${Date.now()}` };
    if (usingSupabase) {
      const { data, error } = await supabaseClient.from('usuarios').insert(nuevo).select().single();
      if (error) return alert('No se ha podido crear el usuario. Revisa columnas y permisos.');
      state.usuarios.push(data);
    } else state.usuarios.push(nuevo);
    e.target.reset(); renderAll();
  });

  document.getElementById('comunicadoForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nuevo = { titulo: comunicadoTitulo.value, texto: comunicadoTexto.value };
    if (usingSupabase) {
      const { data } = await supabaseClient.from('comunicados').insert(nuevo).select().single();
      state.comunicados.unshift(data || nuevo);
    } else state.comunicados.unshift(nuevo);
    e.target.reset(); renderAll();
  });

  document.getElementById('formularioForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const opciones = formularioOpciones.value.split(',').map(o => o.trim()).filter(Boolean);
    const nuevo = { titulo: formularioTitulo.value, pregunta: formularioPregunta.value, tipo: formularioTipo.value, opciones: formularioTipo.value === 'opcion' ? (opciones.length ? opciones : ['Sí', 'No']) : [], estado: 'Abierto', respuestas: [] };
    if (usingSupabase) {
      const { data } = await supabaseClient.from('formularios').insert(nuevo).select().single();
      state.formularios.unshift(data || nuevo);
    } else state.formularios.unshift(nuevo);
    e.target.reset(); renderAll();
  });

  document.getElementById('cobroForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await cobrarUsuario(cobroCodigo.value, Number(cobroImporte.value), cobroConcepto.value);
  });

  document.getElementById('startScanner')?.addEventListener('click', async () => {
    const status = document.getElementById('scannerStatus');
    if (typeof Html5Qrcode === 'undefined') {
      if (status) status.textContent = 'El escáner no se ha cargado. Usa el código manual.';
      return;
    }
    try {
      qrScanner = new Html5Qrcode('qr-reader');
      await qrScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, decodedText => {
        cobroCodigo.value = decodedText;
        if (status) status.textContent = 'QR detectado ✔️';
      });
    } catch (error) {
      if (status) status.textContent = 'No se pudo abrir la cámara. Usa el código manual.';
    }
  });

  document.getElementById('stopScanner')?.addEventListener('click', async () => {
    if (qrScanner) await qrScanner.stop().catch(() => {});
    qrScanner = null;
    const status = document.getElementById('scannerStatus');
    if (status) status.textContent = 'Escáner detenido';
  });

  document.addEventListener('click', async e => {
    if (e.target.dataset.delEvento) {
      const idx = Number(e.target.dataset.delEvento); const id = e.target.dataset.id;
      if (usingSupabase && id) await supabaseClient.from('eventos').delete().eq('id', id);
      state.eventos.splice(idx, 1); renderAll();
    }
    if (e.target.dataset.delFormulario) {
      const idx = Number(e.target.dataset.delFormulario); const id = e.target.dataset.id;
      if (usingSupabase && id) await supabaseClient.from('formularios').delete().eq('id', id);
      state.formularios.splice(idx, 1); renderAll();
    }
    if (e.target.dataset.saveUsuario) {
      const idx = Number(e.target.dataset.saveUsuario); const usuario = state.usuarios[idx];
      const saldoAnterior = Number(usuario.saldo || 0);
      const nuevoSaldo = Number(document.querySelector(`[data-saldo="${idx}"]`).value || 0);
      const nuevaClave = document.querySelector(`[data-password="${idx}"]`).value.trim();
      const payload = { nombre: document.querySelector(`[data-nombre="${idx}"]`).value.trim(), usuario: document.querySelector(`[data-usuario="${idx}"]`).value.trim().toLowerCase(), rol: document.querySelector(`[data-rol="${idx}"]`).value, estado: document.querySelector(`[data-estado="${idx}"]`).value, saldo: nuevoSaldo };
      if (nuevaClave) payload.password_demo = nuevaClave;
      await actualizarUsuario(usuario, payload).catch(() => alert('No se han podido guardar los cambios.'));
      const diferencia = nuevoSaldo - saldoAnterior;
      if (diferencia !== 0) await insertarMovimiento({ usuario: usuario.nombre, concepto: 'Ajuste manual admin', importe: diferencia });
      renderAll();
    }
    if (e.target.dataset.deleteUsuario) {
      const idx = Number(e.target.dataset.deleteUsuario); const id = e.target.dataset.id; const usuario = state.usuarios[idx];
      if (!confirm(`¿Eliminar a ${usuario.nombre || 'este usuario'}?`)) return;
      if (usingSupabase && id) {
        const { error } = await supabaseClient.from('usuarios').delete().eq('id', id);
        if (error) return alert('No se ha podido eliminar el usuario.');
      }
      state.usuarios.splice(idx, 1); renderAll();
    }
    if (e.target.dataset.addSaldo) {
      const idx = Number(e.target.dataset.addSaldo); const usuario = state.usuarios[idx];
      const nuevoSaldo = Number(usuario.saldo || 0) + 5;
      await actualizarUsuario(usuario, { saldo: nuevoSaldo });
      await insertarMovimiento({ usuario: usuario.nombre, concepto: 'Recarga admin', importe: 5 });
      renderAll();
    }
  });

  await loadSupabase();
  renderAll();
});
