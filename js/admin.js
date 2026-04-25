// AÑADIDO: LÓGICA DE COBRO QR

function buscarUsuarioPorCodigo(codigo) {
  return state.usuarios.find(u => {
    const cod = (u.codigo_qr || u.codigo_interno || '').toString();
    return codigo.includes(cod) || cod.includes(codigo);
  });
}

async function cobrarUsuario(codigo, importe, concepto) {
  const usuario = buscarUsuarioPorCodigo(codigo);
  const resultado = document.getElementById('cobroResultado');

  if (!usuario) {
    resultado.textContent = '❌ Usuario no encontrado';
    return;
  }

  if (usuario.saldo < importe) {
    resultado.textContent = '❌ Saldo insuficiente';
    return;
  }

  usuario.saldo -= importe;

  const movimiento = {
    usuario: usuario.nombre,
    concepto: concepto || 'Cobro QR',
    importe: -importe
  };

  if (usingSupabase && usuario.id) {
    await supabaseClient.from('usuarios').update({ saldo: usuario.saldo }).eq('id', usuario.id);
    await supabaseClient.from('movimientos').insert(movimiento);
  }

  state.movimientos.unshift(movimiento);
  resultado.textContent = `✅ Cobrado ${importe}€ a ${usuario.nombre}`;
  renderAll();
}

// FORMULARIO COBRO
document.getElementById('cobroForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = cobroCodigo.value;
  const importe = Number(cobroImporte.value);
  const concepto = cobroConcepto.value;

  await cobrarUsuario(codigo, importe, concepto);
});

// ESCÁNER QR (cámara)
let qrScanner;

if (typeof Html5Qrcode !== 'undefined') {
  document.getElementById('startScanner')?.addEventListener('click', () => {
    qrScanner = new Html5Qrcode('qr-reader');
    qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        document.getElementById('cobroCodigo').value = decodedText;
        document.getElementById('scannerStatus').textContent = 'QR detectado ✔️';
      }
    );
  });

  document.getElementById('stopScanner')?.addEventListener('click', () => {
    if (qrScanner) qrScanner.stop();
    document.getElementById('scannerStatus').textContent = 'Escáner detenido';
  });
}
