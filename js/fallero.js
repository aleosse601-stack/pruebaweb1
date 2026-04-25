document.addEventListener('DOMContentLoaded', async () => {
  const hasSupabase = typeof supabaseClient !== 'undefined';
  const usuarioActivo = window.usuarioActivo || JSON.parse(localStorage.getItem('usuarioActivo') || '{}');

  let state = JSON.parse(localStorage.getItem('adminDemoData') || 'null') || {
    eventos: [],
    usuarios: [],
    comunicados: [],
    formularios: [],
    movimientos: []
  };

  async function cargarSupabase() {
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
        console.warn('Supabase no disponible en fallero, usando localStorage');
        return false;
      }

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

      localStorage.setItem('adminDemoData', JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn('Error cargando Supabase en fallero', error);
      return false;
    }
  }

  function buscarUsuario() {
    const nombre = (usuarioActivo.nombre || '').toLowerCase();
    const usuario = (usuarioActivo.usuario || '').toLowerCase();
    const email = (usuarioActivo.email || '').toLowerCase();

    return state.usuarios.find(u =>
      (u.nombre || '').toLowerCase() === nombre ||
      (u.usuario || '').toLowerCase() === usuario ||
      (u.email || '').toLowerCase() === email
    ) || usuarioActivo || { nombre: 'Fallero', rol: 'fallero', saldo: 0 };
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function crearCodigo(usuario) {
    const base = (usuario.codigo_qr || usuario.codigo_interno || usuario.id || usuario.nombre || 'fallero').toString();
    return `FB-${base.slice(0, 8).toUpperCase()}`;
  }

  function renderQR(codigo) {
    const qrVisual = document.getElementById('qrVisual');
    const qrText = document.getElementById('qrText');
    if (!qrVisual) return;

    qrVisual.innerHTML = '';
    qrVisual.classList.add('qr-placeholder');
    qrVisual.title = codigo;
    if (qrText) qrText.textContent = codigo;
  }

  function render() {
    const usuario = buscarUsuario();
    const codigo = crearCodigo(usuario);
    const movimientosUsuario = (state.movimientos || []).filter(m =>
      (m.usuario || '').toLowerCase() === (usuario.nombre || '').toLowerCase()
    );

    setText('falleroNombre', usuario.nombre || 'Zona personal');
    setText('falleroRol', usuario.rol === 'admin' ? 'Administrador' : 'Fallero');
    setText('falleroSaldo', `${Number(usuario.saldo || 0).toFixed(2)} €`);
    setText('falleroEventosCount', (state.eventos || []).length);
    setText('falleroCodigo', codigo);
    renderQR(codigo);

    const eventosLista = document.getElementById('falleroEventosLista');
    if (eventosLista) {
      eventosLista.innerHTML = (state.eventos || []).length
        ? state.eventos.map(e => `<div class="action-item"><strong>${e.titulo || ''}</strong><span>${e.fecha || ''} · ${e.hora || ''} · ${e.lugar || ''}</span></div>`).join('')
        : '<div class="empty-box">No hay eventos publicados todavía.</div>';
    }

    const comunicadosLista = document.getElementById('falleroComunicadosLista');
    if (comunicadosLista) {
      comunicadosLista.innerHTML = (state.comunicados || []).length
        ? state.comunicados.map(c => `<div class="action-item"><strong>${c.titulo || ''}</strong><span>${c.texto || ''}</span></div>`).join('')
        : '<div class="empty-box">No hay comunicados nuevos.</div>';
    }

    const movimientosLista = document.getElementById('falleroMovimientosLista');
    if (movimientosLista) {
      movimientosLista.innerHTML = movimientosUsuario.length
        ? movimientosUsuario.map(m => `<tr><td>${m.concepto || ''}</td><td>${Number(m.importe || 0).toFixed(2)} €</td></tr>`).join('')
        : '<tr><td colspan="2">Sin movimientos todavía.</td></tr>';
    }

    const formulariosLista = document.getElementById('falleroFormulariosLista');
    if (formulariosLista) {
      formulariosLista.innerHTML = (state.formularios || []).length
        ? state.formularios.map((f, i) => {
          const opciones = Array.isArray(f.opciones) ? f.opciones : [];
          if (f.tipo === 'texto') {
            return `<div class="formulario-card"><strong>${f.titulo || ''}</strong><p>${f.pregunta || ''}</p><input placeholder="Escribe tu respuesta" id="resp-${i}"><button class="btn btn-primary btn-responder" data-form="${i}" data-id="${f.id || ''}">Responder</button></div>`;
          }
          return `<div class="formulario-card"><strong>${f.titulo || ''}</strong><p>${f.pregunta || ''}</p>${opciones.map(op => `<button class="btn-opcion" data-form="${i}" data-id="${f.id || ''}" data-opcion="${op}">${op}</button>`).join('')}</div>`;
        }).join('')
        : '<div class="empty-box">No hay formularios activos.</div>';
    }
  }

  async function guardarRespuesta(index, respuesta) {
    const formulario = state.formularios[index];
    const usuario = buscarUsuario();
    if (!formulario) return;

    const nuevaRespuesta = { usuario: usuario.nombre || 'Fallero', respuesta, fecha: new Date().toISOString() };
    formulario.respuestas = Array.isArray(formulario.respuestas) ? formulario.respuestas : [];
    formulario.respuestas.push(nuevaRespuesta);

    if (hasSupabase && formulario.id) {
      await supabaseClient.from('formularios').update({ respuestas: formulario.respuestas }).eq('id', formulario.id);
    }

    localStorage.setItem('adminDemoData', JSON.stringify(state));
    render();
    alert('Respuesta enviada');
  }

  document.addEventListener('click', async e => {
    if (e.target.dataset.opcion) {
      await guardarRespuesta(Number(e.target.dataset.form), e.target.dataset.opcion);
    }

    if (e.target.classList.contains('btn-responder')) {
      const idx = Number(e.target.dataset.form);
      const input = document.getElementById('resp-' + idx);
      if (!input || !input.value.trim()) {
        alert('Escribe una respuesta antes de enviar.');
        return;
      }
      await guardarRespuesta(idx, input.value.trim());
    }
  });

  await cargarSupabase();
  render();
});
