/* ═══════════════════════════════════════════════════════════════════
   MOTOR DE LA ALDEA
   Arma la escena, maneja la camara orbital y el hover/click sobre los
   edificios. Los nombres no viven fijos sobre la aldea: aparecen en
   una etiqueta solo mientras apuntas un edificio, y al hacer click la
   ficha completa aparece en el panel.

   Cuando llegue el mapa de Unity solo cambia construirEdificio() por
   un loader de .glb: camara, seleccion y paneles siguen igual.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';
import { C, azar } from './paleta.js';
import { construirEdificio } from './edificios.js';
import { construirCielo, construirTerreno, construirTerrazas, construirPasto,
         construirMuralla, decorarAldea, alturaTerreno, H_ALTA } from './escenario.js';
import { NODOS } from './data.js';

const GRADO = Math.PI / 180;

/* Encuadre por tipo. alturaFoco se mide desde el piso de su terraza.
   desvio corre la camara de la linea que pasa por el torreon, para que
   el fondo del edificio elegido no sea siempre el keep. */
const ENCUADRE = {
  keep:   { dist: 142, alturaFoco: 10, polar: 57, desvio: 0 },
  castle: { dist: 54,  alturaFoco: 7,  polar: 52, desvio: 38 },
  house:  { dist: 36,  alturaFoco: 6,  polar: 50, desvio: 34 }
};

function posicionDe(nodo) {
  const a = nodo.angle * GRADO;
  const x = Math.sin(a) * nodo.radius, z = Math.cos(a) * nodo.radius;
  return new THREE.Vector3(x, alturaTerreno(x, z), z);
}

function semillaDe(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ── Camara orbital (mouse + touch) ────────────────────────────────── */
class CamaraOrbital {
  constructor(camara, dom) {
    this.cam = camara;
    this.foco = new THREE.Vector3(0, 14, 0);
    this.focoMeta = this.foco.clone();
    this.azim = 0;           this.azimMeta = 0;
    this.polar = 57 * GRADO; this.polarMeta = this.polar;
    this.dist = 205;         this.distMeta = 142;
    this.punteros = new Map();
    this.pinch = 0;
    this.arrastro = 0;

    dom.addEventListener('pointerdown', e => {
      dom.setPointerCapture(e.pointerId);
      this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.arrastro = 0;
      if (this.punteros.size === 2) this.pinch = this.distPunteros();
    });
    dom.addEventListener('pointermove', e => {
      const p = this.punteros.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      this.arrastro += Math.abs(dx) + Math.abs(dy);
      if (this.punteros.size === 1) {
        this.azimMeta -= dx * 0.005;
        this.polarMeta = THREE.MathUtils.clamp(this.polarMeta - dy * 0.005, 12 * GRADO, 78 * GRADO);
      } else if (this.punteros.size === 2) {
        const d = this.distPunteros();
        if (this.pinch > 0) this.zoom((this.pinch - d) * 0.9);
        this.pinch = d;
      }
    });
    const soltar = e => { this.punteros.delete(e.pointerId); this.pinch = 0; };
    dom.addEventListener('pointerup', soltar);
    dom.addEventListener('pointercancel', soltar);
    dom.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY * 0.6); }, { passive: false });
  }
  distPunteros() {
    const v = [...this.punteros.values()];
    return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
  }
  zoom(d) { this.distMeta = THREE.MathUtils.clamp(this.distMeta + d * 0.1, 22, 235); }
  irA(foco, dist, azim, polar) {
    this.focoMeta.copy(foco);
    this.distMeta = dist;
    if (polar !== undefined) this.polarMeta = polar * GRADO;
    if (azim !== undefined) {
      let delta = (azim - this.azimMeta) % (Math.PI * 2);
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      this.azimMeta += delta;
    }
  }
  actualizar() {
    const k = 0.075;
    this.foco.lerp(this.focoMeta, k);
    this.azim  += (this.azimMeta  - this.azim)  * k;
    this.polar += (this.polarMeta - this.polar) * k;
    this.dist  += (this.distMeta  - this.dist)  * k;

    const sp = Math.sin(this.polar);
    this.cam.position.set(
      this.foco.x + this.dist * sp * Math.sin(this.azim),
      this.foco.y + this.dist * Math.cos(this.polar),
      this.foco.z + this.dist * sp * Math.cos(this.azim)
    );
    this.cam.lookAt(this.foco);
  }
}

/* ── Arranque ──────────────────────────────────────────────────────── */
export function iniciarAldea({ canvas, etiqueta, onSeleccion }) {
  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(C.cieloBajo, 230, 470);

  const camara = new THREE.PerspectiveCamera(50, 1, 0.5, 1400);
  const render = new THREE.WebGLRenderer({ canvas, antialias: true });
  render.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  render.shadowMap.enabled = true;
  render.shadowMap.type = THREE.PCFSoftShadowMap;

  /* Luz de mediodia tibia: sol fuerte, cielo azul de relleno y rebote
     verde del pasto. Las tres juntas dan la lectura estilizada. */
  escena.add(new THREE.HemisphereLight(C.reboteCielo, C.reboteSuelo, 1.45));
  const sol = new THREE.DirectionalLight(C.sol, 2.3);
  sol.position.set(-74, 100, 64);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.near = 20;
  sol.shadow.camera.far = 320;
  sol.shadow.camera.left = -84;
  sol.shadow.camera.right = 84;
  sol.shadow.camera.top = 84;
  sol.shadow.camera.bottom = -84;
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.04;
  escena.add(sol);
  escena.add(new THREE.AmbientLight(0xFFFFFF, 0.25));

  const nubes = construirCielo(escena);
  construirTerreno(escena, NODOS);
  construirTerrazas(escena, NODOS);
  construirPasto(escena);
  construirMuralla(escena);

  /* ── edificios ── */
  const edificios = [];
  const posiciones = new Map();

  for (const nodo of NODOS) {
    const g = construirEdificio(nodo, semillaDe(nodo.id));
    const pos = posicionDe(nodo);
    g.position.copy(pos);
    if (nodo.radius > 0) {
      const giro = nodo.kind === 'house' ? (azar(semillaDe(nodo.id))() - 0.5) * 0.5 : 0;
      g.rotation.y = Math.atan2(-pos.x, -pos.z) + giro;   // mirando al centro, un poco torcida
    }
    g.userData.nodo = nodo;
    g.userData.suelo = pos.y;
    g.userData.levante = 0;
    escena.add(g);
    edificios.push(g);
    posiciones.set(nodo.id, pos);
  }

  decorarAldea(escena, NODOS, posiciones);

  /* Anillo de luz en el piso. Sin carteles, esto y el levante son la
     unica señal de que un edificio esta bajo el cursor o elegido. */
  const aro = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 1, 44),
    new THREE.MeshBasicMaterial({ color: 0xFFE9A8, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  aro.rotation.x = -Math.PI / 2;
  escena.add(aro);

  const orbita = new CamaraOrbital(camara, canvas);
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let hover = null, seleccionado = null;

  function pintar(g) {
    const id = g.userData.nodo.id;
    const activo = seleccionado === id, encima = hover === id;
    const intensidad = activo ? 0.07 : encima ? 0.045 : 0;
    for (const m of g.userData.materiales) {
      m.emissive.setHex(0xFFD98A);
      m.emissiveIntensity = intensidad;
    }
    g.userData.levante = activo ? 0.7 : encima ? 0.45 : 0;
  }

  const RADIO_ARO = { keep: 11.2, castle: 8.5, house: 5.6 };

  function marcarAro(id, fuerte) {
    const g = edificios.find(e => e.userData.nodo.id === id);
    if (!g) { aro.material.opacity = 0; return; }
    const r = RADIO_ARO[g.userData.nodo.kind];
    aro.scale.set(r, r, 1);
    aro.position.set(g.position.x, g.userData.suelo + 0.09, g.position.z);
    aro.material.opacity = fuerte ? 0.7 : 0.4;
  }

  /* En touch no hay hover real: el dedo dispara pointermove justo antes
     del tap y la etiqueta pegaria un flash. Ahi no se muestra. */
  const hayHover = matchMedia('(hover: hover)').matches;

  function setHover(id) {
    if (hover === id) return;
    hover = id;
    canvas.style.cursor = id ? 'pointer' : 'grab';
    edificios.forEach(pintar);
    if (hover) marcarAro(hover, false);
    else if (seleccionado) marcarAro(seleccionado, true);
    else aro.material.opacity = 0;

    if (!etiqueta) return;
    const g = id && edificios.find(e => e.userData.nodo.id === id);
    if (!g || !hayHover) { etiqueta.classList.remove('visible'); return; }
    const nodo = g.userData.nodo;
    etiqueta.querySelector('b').textContent = nodo.nombre;
    etiqueta.querySelector('em').textContent = nodo.rol || nodo.linea || '';
    etiqueta.classList.add('visible');
    moverEtiqueta();   // sin esto asoma un cuadro en la esquina antes de ubicarse
  }

  /* La etiqueta sigue al edificio apuntado, proyectando la punta de su
     techo a pantalla, y se mantiene dentro del cuadro. */
  const vEtiqueta = new THREE.Vector3();
  function moverEtiqueta() {
    if (!etiqueta || !hover || !etiqueta.classList.contains('visible')) return;
    const g = edificios.find(e => e.userData.nodo.id === hover);
    if (!g) return;
    const r = canvas.getBoundingClientRect();
    vEtiqueta.copy(g.position).setY(g.position.y + g.userData.altoCartel);
    vEtiqueta.project(camara);
    if (vEtiqueta.z > 1) { etiqueta.classList.remove('visible'); return; }
    const medio = etiqueta.offsetWidth / 2;
    const x = THREE.MathUtils.clamp((vEtiqueta.x * 0.5 + 0.5) * r.width, medio + 10, r.width - medio - 10);
    const y = THREE.MathUtils.clamp((-vEtiqueta.y * 0.5 + 0.5) * r.height,
                                    etiqueta.offsetHeight + 62, r.height - 70);
    etiqueta.style.transform = 'translate(-50%,-100%) translate(' +
      (r.left + x) + 'px,' + (r.top + y) + 'px)';
  }

  /* Vista general: la aldea entera y nada marcado. El panel igual muestra
     el perfil, pero el torreon no queda resaltado sin que lo hayas pedido. */
  function vistaGeneral() {
    seleccionado = null;
    edificios.forEach(pintar);
    if (!hover) aro.material.opacity = 0;
    const e = ENCUADRE.keep;
    const angosto = canvas.clientWidth < 900;
    orbita.irA(new THREE.Vector3(0, H_ALTA + e.alturaFoco, 0),
               angosto ? e.dist * 1.45 : e.dist, 0, e.polar);
    if (onSeleccion) onSeleccion(null);
  }

  function seleccionar(id) {
    seleccionado = id;
    edificios.forEach(pintar);

    const g = edificios.find(e => e.userData.nodo.id === id);
    if (g) {
      const nodo = g.userData.nodo;
      const base = ENCUADRE[nodo.kind];
      const angosto = canvas.clientWidth < 900;
      const e = angosto ? { ...base, dist: base.dist * 1.45 } : base;
      const foco = nodo.kind === 'keep'
        ? new THREE.Vector3(0, g.userData.suelo + e.alturaFoco, 0)
        : g.position.clone().setY(g.userData.suelo + e.alturaFoco);
      const lado = nodo.angle >= 0 ? 1 : -1;
      const azim = nodo.kind === 'keep' ? 0 : (nodo.angle + lado * e.desvio) * GRADO;
      orbita.irA(foco, e.dist, azim, e.polar);
      marcarAro(id, true);
    }
    if (onSeleccion) onSeleccion(id);
  }

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    const golpe = rayo.intersectObjects(edificios, true)[0];
    let g = golpe ? golpe.object : null;
    while (g && !g.userData.nodo) g = g.parent;
    setHover(g ? g.userData.nodo.id : null);
  });

  canvas.addEventListener('pointerleave', () => setHover(null));

  canvas.addEventListener('pointerup', () => {
    if (orbita.arrastro > 6) return;                  // fue un arrastre, no un click
    if (hover) seleccionar(hover); else vistaGeneral();
  });

  function redimensionar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = render.getPixelRatio();
    if (canvas.width === Math.floor(w * pr) && canvas.height === Math.floor(h * pr)) return;
    render.setSize(w, h, false);
    camara.aspect = w / h || 1;
    camara.updateProjectionMatrix();
  }
  addEventListener('resize', redimensionar);

  /* ── animacion ── */
  const humos = [];
  escena.traverse(o => { if (o.userData.esHumo) humos.push(o); });
  const reloj = new THREE.Clock();

  function cuadro() {
    const t = reloj.getElapsedTime();
    redimensionar();
    orbita.actualizar();

    for (const g of edificios) {
      const meta = g.userData.suelo + g.userData.levante;
      g.position.y += (meta - g.position.y) * 0.13;
    }

    for (const nube of humos) {
      for (const p of nube.children) {
        const f = (t * 0.4 + p.userData.faseHumo) % 3.2;
        p.position.y = f * 1.2;
        p.scale.setScalar((0.5 + f * 0.4) * Math.max(0.05, 1 - f / 3.4));
      }
    }
    for (const n of nubes) {
      n.position.z += n.userData.deriva * 0.014;
      if (n.position.z > 300) n.position.z = -300;
    }

    moverEtiqueta();
    render.render(escena, camara);
  }
  render.setAnimationLoop(cuadro);

  redimensionar();
  vistaGeneral();

  return { seleccionar, vistaGeneral };
}
