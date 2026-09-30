/* Liga o bloco "Gire a peça" da página do case ERK Pratas.
   O three.js (cerca de 170 KB comprimido) só baixa quando a pessoa toca no botão. */
const raiz = document.querySelector('[data-giro]');
if (raiz) {
  const iniciar = raiz.querySelector('[data-giro-iniciar]');
  const capa = raiz.querySelector('[data-giro-capa]');
  const canvas = raiz.querySelector('[data-giro-canvas]');
  const legenda = raiz.querySelector('[data-giro-legenda]');
  const grupos = raiz.querySelectorAll('[data-giro-grupo]');
  const spec = { tipo: 'corrente', elo: 'cubano', esp: 6, medida: 50, acabamento: 'polido' };
  let viewer = null;
  const escrever = () => (legenda.textContent = `Elo ${spec.elo} · ${spec.esp} mm · ${spec.medida} cm · ${spec.acabamento}`);

  grupos.forEach((g) =>
    g.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-valor]');
      if (!b) return;
      g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      spec[g.dataset.giroGrupo] = b.dataset.valor;
      escrever();
      if (viewer) viewer.setSpec({ ...spec });
    }),
  );

  iniciar.addEventListener('click', async () => {
    const rotulo = iniciar.lastChild;
    iniciar.disabled = true;
    rotulo.textContent = ' Carregando…';
    try {
      const teste = document.createElement('canvas');
      if (!(teste.getContext('webgl2') || teste.getContext('webgl'))) throw new Error('sem WebGL');
      const { createViewer } = await import('./erk-3d.js');
      canvas.hidden = false;
      viewer = await createViewer(canvas, { orbitaVertical: false });
      viewer.setSpec({ ...spec });
      capa.remove();
      legenda.hidden = false;
      grupos.forEach((g) => (g.disabled = false));
      escrever();
    } catch (erro) {
      console.warn('3D indisponível:', erro);
      rotulo.textContent = ' Este aparelho não mostra 3D';
    }
  });
}
