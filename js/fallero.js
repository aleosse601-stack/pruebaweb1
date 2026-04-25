document.addEventListener('DOMContentLoaded', () => {
  const data = JSON.parse(localStorage.getItem('adminDemoData') || '{}');
  const usuario = JSON.parse(localStorage.getItem('usuarioActivo') || '{}');

  const formulariosLista = document.getElementById('falleroFormulariosLista');

  if (formulariosLista) {
    formulariosLista.innerHTML = (data.formularios || []).map((f, i) => {
      if (f.tipo === 'opcion') {
        return `<div class="formulario-card"><strong>${f.titulo}</strong><p>${f.pregunta}</p>${f.opciones.map(op => `<button class="btn-opcion" data-form="${i}" data-opcion="${op}">${op}</button>`).join('')}</div>`;
      } else {
        return `<div class="formulario-card"><strong>${f.titulo}</strong><p>${f.pregunta}</p><input placeholder="Escribe tu respuesta" id="resp-${i}"><button class="btn-responder" data-form="${i}">Responder</button></div>`;
      }
    }).join('');
  }

  document.addEventListener('click', e => {
    if (e.target.dataset.opcion) {
      const idx = e.target.dataset.form;
      data.formularios[idx].respuestas.push({ usuario: usuario.nombre, respuesta: e.target.dataset.opcion });
      localStorage.setItem('adminDemoData', JSON.stringify(data));
      alert('Respuesta enviada');
    }

    if (e.target.dataset.form && e.target.classList.contains('btn-responder')) {
      const idx = e.target.dataset.form;
      const input = document.getElementById('resp-' + idx);
      data.formularios[idx].respuestas.push({ usuario: usuario.nombre, respuesta: input.value });
      localStorage.setItem('adminDemoData', JSON.stringify(data));
      alert('Respuesta enviada');
    }
  });
});
