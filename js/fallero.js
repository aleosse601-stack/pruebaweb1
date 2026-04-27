document.addEventListener('DOMContentLoaded', async () => {
  const usuarioActivo = window.usuarioActivo || JSON.parse(localStorage.getItem('usuarioActivo') || '{}');
  const state = { eventos: [], usuarios: [], comunicados: [], formularios: [], movimientos: [] };

  const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function crearCodigo(usuario) {
    return usuario.codigo_qr || usuario.codigo_interno || `FB-${String(usuario.id || usuario.usuario || usuario.nombre || 'fallero').slice(0, 12).toUpperCase()}`;
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
      render();
    } catch (err) {
      console.error(err);
      alert('No se han podido cargar los datos de Supabase.');
    }
  }

  function buscarUsuario() {
    const nombre = (usuarioActivo.nombre || '').toLowerCase();
    const usuario = (usuarioActivo.usuario || '').toLowerCase();
    const email = (usuarioActivo.email || '').toLowerCase();
    return state.usuarios.find(u =>
      (u.id && u.id === usuarioActivo.id) ||
      (u.nombre || '').toLowerCase() === nombre ||
      (u.usuario || '').toLowerCase() === usuario ||
      (u.email || '').toLowerCase() === email
    ) || usuarioActivo;
  }

  function renderQR(codigo) {
    const canvas = document.getElementById('qrCanvas');
    const qrText = document.getElementById('qrText');
    if (qrText) qrText.textContent = codigo;
    if (canvas && typeof QRCode !== 'undefined') {
      QRCode.toCanvas(canvas, codigo, { width: 180, margin: 2 });
    }
  }

  function render() {
    const usuario = buscarUsuario();
    const codigo = crearCodigo(usuario);
    const movimientosUsuario = state.movimientos.filter(m => (m.usuario || '').toLowerCase() === (usuario.nombre || '').toLowerCase());

    setText('falleroNombre', usuario.nombre || 'Zona personal');
    setText('falleroRol', usuario.rol === 'admin' ? 'Administrador' : 'Fallero');
    setText('falleroSaldo', `${Number(usuario.saldo || 0).toFixed(2)} €`);
    setText('falleroEventosCount', state.eventos.length);
    setText('falleroCodigo', codigo);
    renderQR(codigo);

    falleroEventosLista.innerHTML = state.eventos.length
      ? state.eventos.map(e => `<div class="action-item"><strong>${esc(e.titulo)}</strong><span>${esc(e.fecha)} · ${esc(e.hora)} · ${esc(e.lugar)}</span></div>`).join('')
      : '<div class="empty-box">No hay eventos publicados todavía.</div>';

    falleroComunicadosLista.innerHTML = state.comunicados.length
      ? state.comunicados.map(c => `<div class="action-item"><strong>${esc(c.titulo)}</strong><span>${esc(c.contenido)}</span></div>`).join('')
      : '<div class="empty-box">No hay comunicados nuevos.</div>';

    falleroMovimientosLista.innerHTML = movimientosUsuario.length
      ? movimientosUsuario.map(m => `<tr><td>${esc(m.concepto)}</td><td>${Number(m.importe || 0).toFixed(2)} €</td></tr>`).join('')
      : '<tr><td colspan="2">Sin movimientos todavía.</td></tr>';

    falleroFormulariosLista.innerHTML = state.formularios.length
      ? state.formularios.map((f, i) => {
        const opciones = Array.isArray(f.opciones) ? f.opciones : [];
        if (!opciones.length) {
          return `<div class="formulario-card"><strong>${esc(f.titulo)}</strong><p>${esc(f.descripcion)}</p><input placeholder="Escribe tu respuesta" id="resp-${i}"><button class="btn btn-primary btn-responder" data-form="${i}">Responder</button></div>`;
        }
        return `<div class="formulario-card"><strong>${esc(f.titulo)}</strong><p>${esc(f.descripcion)}</p>${opciones.map(op => `<button class="btn-opcion" data-form="${i}" data-opcion="${esc(op)}">${esc(op)}</button>`).join('')}</div>`;
      }).join('')
      : '<div class="empty-box">No hay formularios activos.</div>';
  }

  async function guardarRespuesta(index, respuesta) {
    const formulario = state.formularios[index];
    const usuario = buscarUsuario();
    if (!formulario) return;
    formulario.respuestas = Array.isArray(formulario.respuestas) ? formulario.respuestas : [];
    formulario.respuestas.push({ usuario: usuario.nombre || 'Fallero', respuesta, fecha: new Date().toISOString() });
    const { error } = await supabaseClient.from('formularios').update({ respuestas: formulario.respuestas }).eq('id', formulario.id);
    if (error) {
      console.error(error);
      alert('No se ha podido enviar la respuesta.');
      return;
    }
    alert('Respuesta enviada');
    await load();
  }

  document.addEventListener('click', async e => {
    if (e.target.dataset.opcion) await guardarRespuesta(Number(e.target.dataset.form), e.target.dataset.opcion);
    if (e.target.classList.contains('btn-responder')) {
      const idx = Number(e.target.dataset.form);
      const input = document.getElementById('resp-' + idx);
      if (!input || !input.value.trim()) return alert('Escribe una respuesta antes de enviar.');
      await guardarRespuesta(idx, input.value.trim());
    }
  });

  await load();
});
