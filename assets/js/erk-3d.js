/* Visualizador 3D das pecas ERK Pratas.
   Codigo do projeto que a Vera Group entregou para a ERK Pratas (Salto, SP),
   reaproveitado aqui para o visitante do portfolio girar a peca de verdade.
   Geometria procedural em three.js: elo por elo, na medida real em centimetros.
   Diferencas desta copia: three.js hospedado no proprio site e sem zoom pelo
   scroll do mouse, para nao prender a rolagem da pagina. */

const THREE_URL = new URL('../vendor/three.module.min.js', import.meta.url).href;
let T = null;

async function three() {
  if (!T) T = await import(THREE_URL);
  return T;
}

/* ---------- ambiente: um estúdio de estúdio falso, gerado em canvas ---------- */
function ambiente(renderer) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#eef2f7');
  grad.addColorStop(0.17, '#c7cfd9');
  grad.addColorStop(0.30, '#5e666f');
  grad.addColorStop(0.46, '#1d2126');
  grad.addColorStop(0.62, '#2b3138');
  grad.addColorStop(0.80, '#15181c');
  grad.addColorStop(1.00, '#080a0c');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  // faixas de luz: dão os riscos de brilho que correm no metal ao girar
  g.globalAlpha = 0.85;
  for (const [x, w, cor] of [[80, 130, '#ffffff'], [420, 60, '#dfe6ef'], [700, 180, '#f4f7fb'], [960, 40, '#cfd6df']]) {
    const f = g.createLinearGradient(x, 0, x + w, 0);
    f.addColorStop(0, 'rgba(255,255,255,0)');
    f.addColorStop(0.5, cor);
    f.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = f; g.fillRect(x, 30, w, 250);
  }
  g.globalAlpha = 1;
  const tex = new T.CanvasTexture(c);
  tex.mapping = T.EquirectangularReflectionMapping;
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  const pm = new T.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose(); tex.dispose();
  return env;
}

/* ---------- material: prata 925, três acabamentos ---------- */
function prata(acabamento) {
  const p = { color: 0xe2e7ee, metalness: 1, roughness: 0.11, envMapIntensity: 1.35 };
  if (acabamento === 'escovado') Object.assign(p, { color: 0xd6dbe2, roughness: 0.34, envMapIntensity: 1.1 });
  if (acabamento === 'oxidado') Object.assign(p, { color: 0x969ca4, roughness: 0.52, envMapIntensity: 0.85 });
  return new T.MeshStandardMaterial(p);
}

function texturaGravacao(texto) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#5b6068';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const t = (texto || '').slice(0, 14);
  g.font = '600 ' + (t.length > 8 ? 78 : 108) + 'px Cinzel, Georgia, serif';
  g.fillText(t, 256, 132);
  const tex = new T.CanvasTexture(c);
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

/* ---------- curvas ---------- */
function catenaria(L) {
  const x0 = L * 0.58 / 2;
  let lo = 0.05, hi = 5000, a = 1;
  for (let i = 0; i < 90; i++) {
    a = (lo + hi) / 2;
    if (2 * a * Math.sinh(x0 / a) > L) lo = a; else hi = a;
  }
  return { a, x0 };
}

function curvaCorrente(L) {
  const { a, x0 } = catenaria(L);
  const topo = a * Math.cosh(x0 / a);
  const prof = x0 * 0.24;
  return (s) => {
    const sc = Math.max(-L / 2, Math.min(L / 2, s));
    const x = a * Math.asinh(sc / a);
    const y = a * Math.cosh(x / a) - topo;
    const r = Math.min(1, Math.abs(x) / x0);
    return new T.Vector3(x, y, prof * (1 - r * r));
  };
}

function curvaPulseira(L) {
  const r = L / (2 * Math.PI);
  return (s) => {
    const t = (s / L) * Math.PI * 2;
    return new T.Vector3(Math.cos(t) * r, Math.sin(t) * r * 0.34, Math.sin(t) * r * 0.86);
  };
}

/* ---------- elos ---------- */
function elo(tipo, R, rt) {
  if (tipo === 'veneziana') {
    const g = new T.BoxGeometry(R * 1.6, R * 1.6, R * 1.7);
    return { g, passo: R * 1.72, roll: false };
  }
  if (tipo === 'cartier') {
    const g = new T.TorusGeometry(R, rt * 0.85, 10, 26); g.scale(1, 1.95, 1);
    return { g, passo: R * 2.05, roll: true };
  }
  if (tipo === 'grumet') {
    const g = new T.TorusGeometry(R, rt, 10, 26); g.scale(1, 0.96, 1.2);
    return { g, passo: R * 1.18, roll: true };
  }
  if (tipo === 'baiana') {
    const g = new T.TorusGeometry(R, rt * 0.9, 10, 24); g.scale(1, 1, 1.1);
    const g2 = new T.SphereGeometry(R * 0.78, 18, 14);
    return { g, g2, passo: R * 1.45, roll: true };
  }
  const g = new T.TorusGeometry(R, rt, 10, 26); g.scale(1.02, 0.82, 1.6); // cubano
  return { g, passo: R * 1.06, roll: true };
}

function pingenteMesh(tipo, mat, matGrav) {
  const grupo = new T.Group();
  const argola = new T.Mesh(new T.TorusGeometry(0.2, 0.055, 8, 22), mat);
  if (tipo === 'cruz') {
    const v = new T.Mesh(new T.BoxGeometry(0.2, 1.05, 0.14), mat); v.position.y = -0.72;
    const h = new T.Mesh(new T.BoxGeometry(0.68, 0.2, 0.14), mat); h.position.y = -0.52;
    grupo.add(v, h);
  } else if (tipo === 'medalha') {
    const m = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.11, 40), mat);
    m.rotation.x = Math.PI / 2; m.position.y = -0.85;
    grupo.add(m);
  } else {
    const geo = new T.BoxGeometry(1.55, 0.82, 0.11);
    const lados = [mat, mat, mat, mat, matGrav || mat, mat];
    const p = new T.Mesh(geo, lados); p.position.y = -0.75;
    grupo.add(p);
  }
  argola.position.y = -0.16;
  argola.rotation.y = Math.PI / 2;
  grupo.add(argola);
  return grupo;
}

/* ---------- montagem da peça ---------- */
function montar(spec) {
  const g = new T.Group();
  const mat = prata(spec.acabamento);
  const matGrav = spec.gravacao
    ? (() => { const m = prata(spec.acabamento); m.map = texturaGravacao(spec.gravacao); m.roughness = Math.max(0.2, m.roughness); return m; })()
    : null;
  const esp = spec.esp || 4;
  const rt = esp * 0.05;
  const R = esp * 0.115;

  if (spec.tipo === 'corrente' || spec.tipo === 'pulseira') {
    const L = spec.medida || (spec.tipo === 'corrente' ? 60 : 21);
    const P = spec.tipo === 'corrente' ? curvaCorrente(L) : curvaPulseira(L);
    const e = elo(spec.elo || 'cubano', R, rt);
    const n = Math.max(10, Math.min(150, Math.round(L / e.passo)));
    const passo = L / n;
    const eixo = new T.Vector3(0, 0, 1);
    const q = new T.Quaternion(), qr = new T.Quaternion();
    const inicio = spec.tipo === 'corrente' ? -L / 2 : 0;
    for (let i = 0; i < n; i++) {
      const s = inicio + (i + 0.5) * passo;
      const p = P(s);
      const t = P(s + passo * 0.4).sub(P(s - passo * 0.4)).normalize();
      q.setFromUnitVectors(eixo, t);
      const geo = e.g2 && i % 2 ? e.g2 : e.g;
      const m = new T.Mesh(geo, mat);
      m.position.copy(p);
      m.quaternion.copy(q);
      if (e.roll && i % 2 && !e.g2) {
        qr.setFromAxisAngle(eixo, Math.PI / 2);
        m.quaternion.multiply(qr);
      }
      g.add(m);
    }
    if (spec.tipo === 'corrente') {
      const fecho = new T.Mesh(new T.BoxGeometry(rt * 3.4, R * 1.7, R * 2.6), mat);
      const pf = P(L / 2 - passo * 0.4);
      fecho.position.copy(pf);
      g.add(fecho);
    }
    if (spec.pingente) {
      const pg = pingenteMesh(spec.pingente, mat, matGrav);
      pg.position.copy(P(spec.tipo === 'corrente' ? 0 : L * 0.75));
      pg.scale.setScalar(Math.max(0.8, esp / 4));
      g.add(pg);
    }
  } else if (spec.tipo === 'anel') {
    const med = spec.medida || 18;
    const d = 1.52 + (med - 16) * 0.058;
    const t = 0.085;
    const Ra = d / 2 + t;
    const geo = new T.TorusGeometry(Ra, t, 16, 72);
    geo.scale(1, 1, Math.max(1, esp * 0.62));
    g.add(new T.Mesh(geo, mat));
    if (spec.sinete) {
      const placa = new T.Mesh(new T.BoxGeometry(d * 0.66, d * 0.46, 0.13), [mat, mat, mat, mat, matGrav || mat, mat]);
      placa.position.y = Ra + 0.05;
      placa.rotation.x = -Math.PI / 2;
      g.add(placa);
    }
    g.rotation.x = 0.42;
    g.rotation.y = -0.3;
  } else if (spec.tipo === 'bracelete') {
    const geo = new T.TorusGeometry(3.1, 0.26, 18, 80);
    geo.scale(1, 1, Math.max(1, esp * 0.5));
    const m = new T.Mesh(geo, mat);
    m.rotation.x = 1.15;
    g.add(m);
  } else if (spec.tipo === 'brinco') {
    for (const x of [-1.7, 1.7]) {
      if (spec.brinco === 'ponto') {
        const b = new T.Mesh(new T.SphereGeometry(0.24, 26, 20), mat);
        b.position.set(x, 0.1, 0);
        const haste = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.85, 12), mat);
        haste.position.set(x, 0.1, -0.42); haste.rotation.x = Math.PI / 2;
        g.add(b, haste);
      } else {
        const a = new T.Mesh(new T.TorusGeometry(1.05, 0.085, 14, 60), mat);
        a.position.set(x, 0, 0);
        a.rotation.y = 0.18 * Math.sign(x);
        g.add(a);
      }
    }
  } else {
    const pg = pingenteMesh(spec.pingente || 'placa', mat, matGrav);
    pg.scale.setScalar(1.6);
    g.add(pg);
  }
  return g;
}

/* ---------- visualizador ---------- */
export async function createViewer(canvas, opcoes) {
  const opts = opcoes || {};
  await three();
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const cena = new T.Scene();
  cena.environment = ambiente(renderer);

  const luz = new T.DirectionalLight(0xffffff, 1.6);
  luz.position.set(2.4, 3.4, 3.2);
  const luz2 = new T.DirectionalLight(0x9fb2c8, 0.7);
  luz2.position.set(-3, -1.2, -2.4);
  cena.add(luz, luz2, new T.AmbientLight(0xffffff, 0.18));

  const cam = new T.PerspectiveCamera(34, 1, 0.05, 400);
  let alvo = new T.Vector3();
  let dist = 10, minD = 3, maxD = 30;
  let theta = 0.55, phi = 1.32;
  let girando = true, pausa = 0;
  let peca = null, vivo = true, visivel = true;
  const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function enquadrar() {
    const box = new T.Box3().setFromObject(peca);
    const esf = box.getBoundingSphere(new T.Sphere());
    alvo = esf.center.clone();
    dist = esf.radius / Math.sin((cam.fov * Math.PI) / 360) * 1.12;
    minD = dist * 0.42; maxD = dist * 2.4;
  }

  function setSpec(spec) {
    if (peca) {
      cena.remove(peca);
      peca.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    }
    peca = montar(spec);
    cena.add(peca);
    enquadrar();
  }

  function tamanho() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(tamanho);
  ro.observe(canvas);
  tamanho();

  const io = new IntersectionObserver((e) => { visivel = e[0].isIntersecting; }, { threshold: 0.02 });
  io.observe(canvas);

  /* interação: arraste gira, pinça aproxima */
  let arrasto = null;
  const toques = new Map();
  let pinca = 0;
  const down = (e) => {
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 2) {
      const [a, b] = [...toques.values()];
      pinca = Math.hypot(a.x - b.x, a.y - b.y);
      arrasto = null;
      girando = false;
      return;
    }
    arrasto = { x: e.clientX, y: e.clientY, toque: e.pointerType === 'touch' };
    girando = false;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (toques.has(e.pointerId)) toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size >= 2) {
      const [a, b] = [...toques.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinca > 0 && d > 0) dist = Math.max(minD, Math.min(maxD, dist * (pinca / d)));
      pinca = d;
      return;
    }
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    theta -= dx * 0.008;
    if (!arrasto.toque || opts.orbitaVertical) phi = Math.max(0.25, Math.min(Math.PI - 0.25, phi - dy * 0.006));
    arrasto.x = e.clientX; arrasto.y = e.clientY;
  };
  const up = (e) => {
    if (e && toques.has(e.pointerId)) toques.delete(e.pointerId);
    if (toques.size < 2) pinca = 0;
    arrasto = null;
    pausa = performance.now() + 2600;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  const pos = new T.Vector3();
  function quadro(t) {
    if (!vivo) return;
    requestAnimationFrame(quadro);
    if (!visivel || !peca) return;
    if (!girando && t > pausa) girando = true;
    if (girando && !parado) theta += 0.0022;
    pos.setFromSphericalCoords(dist, phi, theta).add(alvo);
    cam.position.copy(pos);
    cam.lookAt(alvo);
    renderer.render(cena, cam);
  }
  requestAnimationFrame(quadro);

  return {
    setSpec,
    reset() { theta = 0.55; phi = 1.32; enquadrar(); },
    dispose() {
      vivo = false;
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      renderer.dispose();
    },
  };
}
