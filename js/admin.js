document.addEventListener('DOMContentLoaded', async () => {
  const state = { eventos: [], usuarios: [], comunicados: [], formularios: [], movimientos: [] };
  let qrScanner = null;
  const euro = v => `${Number(v || 0).toFixed(2)} €`;
  const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  function uid(prefix = 'FB') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  }

  function codigoUsuario(u) {
    return u.codigo_qr || u.codigo_interno || `FB-${String(u.id || u.usuario || u.nombre || '').slice(0, 12).toUpperCase()}`;
  }

  async function sb(table, action, payload, extra) {
    let q = supabaseClient.from(table)[action](payload);
    if (extra) q = extra(q);
    const res = await q;
    if (res.error) throw res.error;
    return res.data;
  }

  async function load() {
    try {
      const [eventos, usuarios, comunicados, formularios, movimientos] = await Promise.all([
        supabaseClient.from('eventos').select('*').order('fecha', { ascending: true }),
        supabaseClient.from('usuarios').select('*').order('nombre', { ascending: true }),
        supabaseClient.from('comunicados').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('formularios').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('movimientos').select('*').order('created_at', { ascending: false })
      ]);
      const err = [eventos, usuarios, comunicados, formularios, movimientos].find(r => r.error)?.error;
      if (err) throw err;
      state.eventos = eventos.data || [];
      state.usuarios = usuarios.data || [];
      state.comunicados = comunicados.data || [];
      state.formularios = (formularios.data || []).map(f => ({ ...f, opciones: Array.isArray(f.opciones) ? f.opciones : [], respuestas: Array.isArray(f.respuestas) ? f.respuestas : [] }));
      state.movimientos = movimientos.data || [];
      renderAll();
    } catch (e) {
      console.error(e);
      alert('Error conectando con Supabase. Revisa tablas, columnas y políticas.');
    }
  }

  function renderEventos() {
    eventosLista.innerHTML = state.eventos.map((e, i) => `<tr><td>${esc(e.fecha)}</td><td>${esc(e.hora)}</td><td>${esc(e.titulo)}</td><td>${esc(e.lugar)}</td><td><button class="small-btn danger" data-del-evento="${i}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">No hay eventos.</td></tr>';
    totalEventos.textContent = state.eventos.length;
  }

  function renderUsuarios() {
    usuariosLista.innerHTML = state.usuarios.map((u, i) => `
      <tr>
        <td><input class="table-input" value="${esc(u.nombre)}" data-nombre="${i}"><small>${esc(codigoUsuario(u))}</small></td>
        <td><input class="table-input" value="${esc(u.usuario)}" data-usuario="${i}"></td>
        <td><select class="table-input" data-rol="${i}"><option value="fallero" ${u.rol === 'fallero' ? 'selected' : ''}>Fallero</option><option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option></select></td>
        <td><select class="table-input" data-estado="${i}"><option value="activo" ${u.estado === 'activo' ? 'selected' : ''}>Activo</option><option value="inactivo" ${u.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option></select></td>
        <td><input class="table-input saldo-input" type="number" step="0.01" value="${Number(u.saldo || 0)}" data-saldo="${i}"></td>
        <td class="table-actions"><input class="table-input password-input" placeholder="Nueva clave" data-password="${i}"><button class="small-btn" data-save-usuario="${i}">Guardar</button><button class="small-btn" data-add-saldo="${i}">+5 €</button><button class="small-btn danger" data-delete-usuario="${i}">Eliminar</button></td>
      </tr>`).join('') || '<tr><td colspan="6">No hay usuarios.</td></tr>';
    totalUsuarios.textContent = state.usuarios.length;
  }

  function renderComunicados() {
    comunicadosLista.innerHTML = state.comunicados.map(c => `<div class="action-item"><strong>${esc(c.titulo)}</strong><span>${esc(c.contenido || c.texto)}</span></div>`).join('') || '<div class="empty-box">No hay comunicados.</div>';
  }

  function renderFormularios() {
    formulariosLista.innerHTML = state.formularios.map((f, i) => {
      const respuestas = Array.isArray(f.respuestas) ? f.respuestas : [];
      return `<div class="action-item formulario-admin-card"><strong>${esc(f.titulo)}</strong><span>${esc(f.pregunta || f.descripcion)}</span><span><b>Opciones:</b> ${(f.opciones || []).map(esc).join(', ') || 'Respuesta escrita'}</span><span><b>Respuestas:</b> ${respuestas.length}</span><ul class="responses-list">${respuestas.length ? respuestas.map(r => `<li><b>${esc(r.usuario)}</b>: ${esc(r.respuesta)}</li>`).join('') : '<li>Sin respuestas todavía</li>'}</ul><button class="small-btn danger" data-del-formulario="${i}">Eliminar formulario</button></div>`;
    }).join('') || '<div class="empty-box">No hay formularios.</div>';
  }

  function renderMovimientos() {
    movimientosLista.innerHTML = state.movimientos.map(m => `<tr><td>${esc(m.usuario)}</td><td>${esc(m.concepto)}</td><td>${euro(m.importe)}</td></tr>`).join('') || '<tr><td colspan="3">Sin movimientos.</td></tr>';
  }

  function renderAll() {
    renderEventos(); renderUsuarios(); renderComunicados(); renderFormularios(); renderMovimientos();
    const sistema = document.querySelector('.info-grid .info-card:nth-child(3) h3');
    if (sistema) sistema.textContent = 'Supabase';
  }

  function buscarUsuarioPorCodigo(codigo) {
    const limpio = String(codigo || '').trim().toUpperCase();
    return state.usuarios.find(u => [codigoUsuario(u), u.codigo_qr, u.codigo_interno, u.id, u.usuario, u.nombre].filter(Boolean).map(x => String(x).toUpperCase()).some(c => limpio === c || limpio.includes(c)));
  }

  async function crearMovimiento(mov) {
    await sb('movimientos', 'insert', mov);
  }

  async function cambiarSaldo(usuario, nuevoSaldo, concepto, importe) {
    await sb('usuarios', 'update', { saldo: nuevoSaldo }, q => q.eq('id', usuario.id));
    await crearMovimiento({ usuario: usuario.nombre, concepto, importe });
    await load();
  }

  usuarioForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const usuario = usuarioUsuario.value.trim().toLowerCase();
    const nuevo = {
      nombre: usuarioNombre.value.trim(),
      usuario,
      email: usuarioEmail.value.trim().toLowerCase() || `${usuario}@falla.local`,
      rol: usuarioRol.value,
      estado: usuarioEstado.value,
      saldo: Number(usuarioSaldo.value || 0),
      password_demo: usuarioPassword.value.trim(),
      codigo_interno: uid('FB'),
      codigo_qr: uid('QR')
    };
    try { await sb('usuarios', 'insert', nuevo); e.target.reset(); await load(); }
    catch (err) { console.error(err); alert('No se ha podido crear el usuario. Mira consola/Supabase.'); }
  });

  eventoForm?.addEventListener('submit', async e => {
    e.preventDefault();
    try { await sb('eventos', 'insert', { titulo: eventoTitulo.value, fecha: eventoFecha.value || null, hora: eventoHora.value || null, lugar: eventoLugar.value || null }); e.target.reset(); await load(); }
    catch (err) { console.error(err); alert('No se ha podido crear el evento.'); }
  });

  comunicadoForm?.addEventListener('submit', async e => {
    e.preventDefault();
    try { await sb('comunicados', 'insert', { titulo: comunicadoTitulo.value, contenido: comunicadoTexto.value }); e.target.reset(); await load(); }
    catch (err) { console.error(err); alert('No se ha podido publicar el comunicado.'); }
  });

  formularioForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const opciones = formularioOpciones.value.split(',').map(o => o.trim()).filter(Boolean);
    try { await sb('formularios', 'insert', { titulo: formularioTitulo.value, descripcion: formularioPregunta.value, opciones, respuestas: [] }); e.target.reset(); await load(); }
    catch (err) { console.error(err); alert('No se ha podido crear el formulario.'); }
  });

  cobroForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const usuario = buscarUsuarioPorCodigo(cobroCodigo.value);
    const importe = Number(cobroImporte.value || 0);
    cobroResultado.className = 'login-message';
    if (!usuario) { cobroResultado.textContent = '❌ Usuario no encontrado'; cobroResultado.classList.add('error'); return; }
    if (usuario.estado !== 'activo') { cobroResultado.textContent = '❌ Usuario inactivo'; cobroResultado.classList.add('error'); return; }
    if (Number(usuario.saldo || 0) < importe) { cobroResultado.textContent = `❌ Saldo insuficiente. Saldo: ${euro(usuario.saldo)}`; cobroResultado.classList.add('error'); return; }
    try { await cambiarSaldo(usuario, Number(usuario.saldo || 0) - importe, cobroConcepto.value || 'Cobro QR', -importe); cobroResultado.textContent = `✅ Cobrado ${euro(importe)} a ${usuario.nombre}`; cobroResultado.classList.add('success'); cobroForm.reset(); }
    catch (err) { console.error(err); alert('No se ha podido cobrar.'); }
  });

  document.addEventListener('click', async e => {
    try {
      if (e.target.dataset.delEvento) { await sb('eventos', 'delete', null, q => q.eq('id', state.eventos[Number(e.target.dataset.delEvento)].id)); await load(); }
      if (e.target.dataset.delFormulario) { await sb('formularios', 'delete', null, q => q.eq('id', state.formularios[Number(e.target.dataset.delFormulario)].id)); await load(); }
      if (e.target.dataset.deleteUsuario) { const u = state.usuarios[Number(e.target.dataset.deleteUsuario)]; if (confirm(`¿Eliminar a ${u.nombre}?`)) { await sb('usuarios', 'delete', null, q => q.eq('id', u.id)); await load(); } }
      if (e.target.dataset.addSaldo) { const u = state.usuarios[Number(e.target.dataset.addSaldo)]; await cambiarSaldo(u, Number(u.saldo || 0) + 5, 'Recarga admin', 5); }
      if (e.target.dataset.saveUsuario) {
        const i = Number(e.target.dataset.saveUsuario); const u = state.usuarios[i];
        const payload = { nombre: document.querySelector(`[data-nombre="${i}"]`).value.trim(), usuario: document.querySelector(`[data-usuario="${i}"]`).value.trim().toLowerCase(), rol: document.querySelector(`[data-rol="${i}"]`).value, estado: document.querySelector(`[data-estado="${i}"]`).value, saldo: Number(document.querySelector(`[data-saldo="${i}"]`).value || 0) };
        const clave = document.querySelector(`[data-password="${i}"]`).value.trim(); if (clave) payload.password_demo = clave;
        await sb('usuarios', 'update', payload, q => q.eq('id', u.id));
        const diff = payload.saldo - Number(u.saldo || 0); if (diff !== 0) await crearMovimiento({ usuario: payload.nombre, concepto: 'Ajuste manual admin', importe: diff });
        await load();
      }
    } catch (err) { console.error(err); alert('Error guardando en Supabase.'); }
  });

  startScanner?.addEventListener('click', async () => {
    if (typeof Html5Qrcode === 'undefined') { scannerStatus.textContent = 'El escáner no se ha cargado. Usa código manual.'; return; }
    try { qrScanner = new Html5Qrcode('qr-reader'); await qrScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, text => { cobroCodigo.value = text; scannerStatus.textContent = 'QR detectado ✔️'; }); }
    catch { scannerStatus.textContent = 'No se pudo abrir la cámara. Usa código manual.'; }
  });
  stopScanner?.addEventListener('click', async () => { if (qrScanner) await qrScanner.stop().catch(() => {}); qrScanner = null; scannerStatus.textContent = 'Escáner detenido'; });

  await load();
});
