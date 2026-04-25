document.addEventListener('DOMContentLoaded', async () => {
  const demo = {
    eventos: [
      { fecha: '2026-05-04', hora: '20:00', titulo: 'Reunión de comisión', lugar: 'Casal' },
      { fecha: '2026-05-10', hora: '11:30', titulo: 'Almuerzo fallero', lugar: 'Casal' }
    ],
    usuarios: [{ nombre: 'Alejandro', rol: 'fallero', saldo: 50, estado: 'Activo', codigo_interno: 'FB-ALE-050', codigo_qr: 'FB-ALE-050' }],
    comunicados: [{ titulo: 'Bienvenida', texto: 'Ya está disponible el panel interno de la falla.' }],
    formularios: [{ titulo: 'Asistencia a comida', estado: 'Abierto' }],
    movimientos: [{ usuario: 'Alejandro', concepto: 'Saldo inicial', importe: 50 }]
  };

  const sesion = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
  const localData = JSON.parse(localStorage.getItem('adminDemoData') || 'null') || demo;
  let data = localData;
  let usuario = sesion || localData.usuarios.find(u => u.rol === 'fallero') || demo.usuarios[0];

  async function cargarSupabase() {
    if (!window.supabaseClient) return;
    try {
      const [usuariosRes, eventosRes, comunicadosRes, formulariosRes, movimientosRes] = await Promise.all([
        supabaseClient.from('usuarios').select('*'),
        supabaseClient.from('eventos').select('*').order('fecha', { ascending: true }),
        supabaseClient.from('comunicados').select('*').order('id', { ascending: false }),
        supabaseClient.from('formularios').select('*').order('id', { ascending: false }),
        supabaseClient.from('movimientos').select('*').order('id', { ascending: false })
      ]);

      if ([usuariosRes, eventosRes, comunicadosRes, formulariosRes, movimientosRes].some(r => r.error)) return;

      data = {
        usuarios: usuariosRes.data || [],
        eventos: eventosRes.data || [],
        comunicados: comunicadosRes.data || [],
        formularios: formulariosRes.data || [],
        movimientos: movimientosRes.data || []
      };

      if (sesion?.id) {
        usuario = data.usuarios.find(u => u.id === sesion.id) || usuario;
      } else if (sesion?.nombre) {
        usuario = data.usuarios.find(u => (u.nombre || '').toLowerCase() === sesion.nombre.toLowerCase()) || usuario;
      } else {
        usuario = data.usuarios.find(u => u.rol === 'fallero') || usuario;
      }
    } catch (err) {
      console.warn('Supabase no disponible. Usando datos demo.', err);
    }
  }

  await cargarSupabase();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const codigo = usuario.codigo_qr || usuario.codigo_interno || `FB-${(usuario.nombre || 'USR').slice(0, 3).toUpperCase()}-${String(usuario.saldo || 0).padStart(3, '0')}`;

  setText('falleroNombre', usuario.nombre || 'Fallero');
  setText('falleroRol', usuario.rol === 'admin' ? 'Administrador' : 'Fallero');
  setText('falleroSaldo', `${Number(usuario.saldo || 0).toFixed(2)} €`);
  setText('falleroEventosCount', data.eventos.length);
  setText('falleroCodigo', codigo);
  setText('qrText', codigo);

  const eventosLista = document.getElementById('falleroEventosLista');
  if (eventosLista) {
    eventosLista.innerHTML = data.eventos.length
      ? data.eventos.map(e => `<div class="action-item"><strong>${e.titulo}</strong><span>${e.fecha || ''} · ${e.hora || ''} · ${e.lugar || 'Sin ubicación'}</span></div>`).join('')
      : '<div class="empty-box">No hay eventos publicados todavía.</div>';
  }

  const formulariosLista = document.getElementById('falleroFormulariosLista');
  if (formulariosLista) {
    formulariosLista.innerHTML = data.formularios.length
      ? data.formularios.map(f => `<div class="action-item"><strong>${f.titulo}</strong><span>${f.estado || 'Abierto'}</span><button class="small-btn">Responder</button></div>`).join('')
      : '<div class="empty-box">No hay formularios activos.</div>';
  }

  const comunicadosLista = document.getElementById('falleroComunicadosLista');
  if (comunicadosLista) {
    comunicadosLista.innerHTML = data.comunicados.length
      ? data.comunicados.map(c => `<div class="action-item"><strong>${c.titulo}</strong><span>${c.texto}</span></div>`).join('')
      : '<div class="empty-box">No hay comunicados nuevos.</div>';
  }

  const movimientosLista = document.getElementById('falleroMovimientosLista');
  if (movimientosLista) {
    const movimientos = data.movimientos.filter(m => (m.usuario || '').toLowerCase() === (usuario.nombre || '').toLowerCase());
    movimientosLista.innerHTML = movimientos.length
      ? movimientos.map(m => `<tr><td>${m.concepto}</td><td>${Number(m.importe || 0).toFixed(2)} €</td></tr>`).join('')
      : '<tr><td colspan="2">Sin movimientos todavía.</td></tr>';
  }

  function generarQRVisual(texto) {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cells = 29;
    const cell = size / cells;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#10233f';

    const drawFinder = (x, y) => {
      ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#fff';
      ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#10233f';
      ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell);
    };

    drawFinder(1, 1);
    drawFinder(21, 1);
    drawFinder(1, 21);

    let seed = 0;
    for (let i = 0; i < texto.length; i++) seed += texto.charCodeAt(i) * (i + 1);
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const inFinder = (x < 9 && y < 9) || (x > 19 && y < 9) || (x < 9 && y > 19);
        if (!inFinder && ((x * 17 + y * 31 + seed) % 5 === 0 || (x + y + seed) % 11 === 0)) {
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }

  generarQRVisual(codigo);
});
