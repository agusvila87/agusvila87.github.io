/* ═══════════════════════════════════════════════════════════════════
   MOTOR DE LA ALDEA
   Arma la escena, maneja la camara orbital, el hover/click sobre los
   edificios y los carteles flotantes con el nombre.

   Cuando llegue el mapa de Unity solo cambia construirEdificio() por
   un loader de .glb: camara, seleccion y paneles siguen igual.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';
import { C, azar } from './paleta.js';
import { construirEdificio } from './edificios.js';
import { construirCielo, construirTerreno, construirPasto, construirMuralla,
         construirBosque, decorarAldea } from './escenario.js';
import { PERFIL, NODOS } from './data.js';

const GRADO = Math.PI / 180;

/* Encuadre por tipo. desvio corre la camara de la linea que pasa por el
   torreon, para que el fondo del edificio elegido no sea siempre el keep. */
const ENCUADRE = {
  keep:   { dist: 84, alturaFoco: 10, polar: 55, desvio: 0 },
  castle: { dist: 46, alturaFoco: 9,  polar: 52, desvio: 38 },
  house:  { dist: 34, alturaFoco: 6,  polar: 50, desvio: 34 }
};

function posicionDe(nodo) {
  const a = nodo.angle * GRADO;
  return new THREE.Vector3(Math.sin(a) * nodo.radius, 0, Math.cos(a) * nodo.radius);
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
    this.foco = new THREE.Vector3(0, 10, 0);
    this.focoMeta = this.foco.clone();
    this.azim = 0;           this.azimMeta = 0;
    this.polar = 56 * GRADO; this.polarMeta = this.polar;
    this.dist = 132;         this.distMeta = 84;
    this.corrX = 0; this.corrXMeta = 0;   // panel al costado (desktop)
    this.corrY = 0; this.corrYMeta = 0;   // panel abajo (mobile)
    this.punteros = new Map();
    this.pinch = 0;
    this.arrastro = 0;
    this.derecha = new THREE.Vector3();
    this.arriba = new THREE.Vector3();

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
  zoom(d) { this.distMeta = THREE.MathUtils.clamp(this.distMeta + d * 0.07, 18, 128); }
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
    this.corrX += (this.corrXMeta - this.corrX) * k;
    this.corrY += (this.corrYMeta - this.corrY) * k;

    const sp = Math.sin(this.polar);
    this.cam.position.set(
      this.foco.x + this.dist * sp * Math.sin(this.azim),
      this.foco.y + this.dist * Math.cos(this.polar),
      this.foco.z + this.dist * sp * Math.cos(this.azim)
    );
    this.cam.lookAt(this.foco);

    /* Corre camara y objetivo juntos: el edificio se va al lado opuesto
       del panel en vez de quedar tapado. */
    if (Math.abs(this.corrX) > 0.01 || Math.abs(this.corrY) > 0.01) {
      this.derecha.setFromMatrixColumn(this.cam.matrix, 0).multiplyScalar(this.corrX);
      this.arriba.setFromMatrixColumn(this.cam.matrix, 1).multiplyScalar(this.corrY);
      const d = this.derecha.add(this.arriba);
      this.cam.position.add(d);
      this.cam.lookAt(this.foco.x + d.x, this.foco.y + d.y, this.foco.z + d.z);
    }
  }
}

/* ── Arranque ──────────────────────────────────────────────────────── */
export function iniciarAldea({ canvas, capaCarteles, onSeleccion, huecoPanel }) {
  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(C.cieloBajo, 165, 395);

  const camara = new THREE.PerspectiveCamera(50, 1, 0.5, 1400);
  const render = new THREE.WebGLRenderer({ canvas, antialias: true });
  render.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  render.shadowMap.enabled = true;
  render.shadowMap.type = THREE.PCFSoftShadowMap;

  /* Luz de mediodia tibia: sol fuerte, cielo azul de relleno y rebote
     verde del pasto. Las tres juntas dan la lectura estilizada. */
  escena.add(new THREE.HemisphereLight(C.reboteCielo, C.reboteSuelo, 1.45));
  const sol = new THREE.DirectionalLight(C.sol, 2.3);
  sol.position.set(-46, 64, 40);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.near = 20;
  sol.shadow.camera.far = 200;
  sol.shadow.camera.left = -56;
  sol.shadow.camera.right = 56;
  sol.shadow.camera.top = 56;
  sol.shadow.camera.bottom = -56;
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.035;
  escena.add(sol);
  escena.add(new THREE.AmbientLight(0xFFFFFF, 0.25));

  const nubes = construirCielo(escena);
  construirTerreno(escena, NODOS);
  construirPasto(escena);
  construirMuralla(escena);
  construirBosque(escena);

  /* ── edificios ── */
  const edificios = [];
  const carteles = new Map();
  const posiciones = new Map();

  for (const nodo of NODOS) {
    const g = construirEdificio(nodo, semillaDe(nodo.id));
    const pos = posicionDe(nodo);
    g.position.copy(pos);
    if (nodo.radius > 0) {
      const giro = nodo.kind === 'house' ? (azar(semillaDe(nodo.id))() - 0.5) * 0.5 : 0;
      g.rotation.y = Math.atan2(-pos.x, -pos.z) + giro;   // mirando a la plaza, un poco torcida
    }
    g.userData.nodo = nodo;
    g.userData.baseY = 0;
    escena.add(g);
    edificios.push(g);
    posiciones.set(nodo.id, pos);
  }

  decorarAldea(escena, NODOS, posiciones);

  /* anillo de luz en el piso, bajo el edificio elegido */
  const aro = new THREE.Mesh(
    new THREE.RingGeometry(4.4, 5.4, 40),
    new THREE.MeshBasicMaterial({ color: 0xFFE9A8, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = 0.07;
  escena.add(aro);

  /* ── carteles con el nombre ── */
  for (const nodo of NODOS) {
    const el = document.createElement('div');
    el.className = 'cartel k-' + nodo.kind;
    el.dataset.id = nodo.id;
    el.innerHTML = '<b>' + nodo.nombre + '</b><em>' + (nodo.rol || nodo.linea || '') + '</em>';
    el.addEventListener('pointerenter', () => setHover(nodo.id));
    el.addEventListener('pointerleave', () => setHover(null));
    el.addEventListener('click', () => seleccionar(nodo.id));
    capaCarteles.appendChild(el);
    carteles.set(nodo.id, el);
  }

  const orbita = new CamaraOrbital(camara, canvas);
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let hover = null, seleccionado = null;

  function pintar(g) {
    const id = g.userData.nodo.id;
    const activo = seleccionado === id, encima = hover === id;
    const intensidad = activo ? 0.15 : encima ? 0.085 : 0;
    for (const m of g.userData.materiales) {
      m.emissive.setHex(0xFFD98A);
      m.emissiveIntensity = intensidad;
    }
    g.userData.baseY = activo ? 0.65 : encima ? 0.3 : 0;
  }

  function setHover(id) {
    if (hover === id) return;
    hover = id;
    canvas.style.cursor = id ? 'pointer' : 'grab';
    edificios.forEach(pintar);
    carteles.forEach((el, k) => el.classList.toggle('hov', k === hover));
  }

  /* Cuanto correr la camara para que el panel no tape el edificio.
     En desktop el panel esta al costado; en mobile es una hoja abajo. */
  function acomodarPorPanel(dist) {
    const p = huecoPanel ? huecoPanel() : null;
    const upp = (2 * dist * Math.tan(camara.fov * GRADO / 2)) / canvas.clientHeight;
    orbita.corrXMeta = p && p.ancho ? p.ancho * 0.42 * upp : 0;
    orbita.corrYMeta = p && p.alto ? -p.alto * 0.5 * upp : 0;
  }

  function seleccionar(id) {
    seleccionado = id;
    edificios.forEach(pintar);
    carteles.forEach((el, k) => el.classList.toggle('sel', k === seleccionado));

    const g = edificios.find(e => e.userData.nodo.id === id);
    if (g) {
      const nodo = g.userData.nodo;
      const base = ENCUADRE[nodo.kind];
      const angosto = canvas.clientWidth < 900;
      const e = angosto ? { ...base, dist: base.dist * 1.7 } : base;
      if (nodo.kind === 'keep') {
        orbita.irA(new THREE.Vector3(0, e.alturaFoco, 0), e.dist, 0, e.polar);
        aro.material.opacity = 0;
      } else {
        const lado = nodo.angle >= 0 ? 1 : -1;
        orbita.irA(g.position.clone().setY(e.alturaFoco), e.dist,
                   (nodo.angle + lado * e.desvio) * GRADO, e.polar);
        aro.position.set(g.position.x, 0.07, g.position.z);
        const r = nodo.kind === 'castle' ? 1.55 : 1;
        aro.scale.set(r, r, r);
        aro.material.opacity = 0.45;
      }
    }
    if (onSeleccion) onSeleccion(id);
    /* el panel recien cambia de tamaño en el proximo cuadro */
    requestAnimationFrame(() => acomodarPorPanel(orbita.distMeta));
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

  canvas.addEventListener('pointerup', () => {
    if (orbita.arrastro > 6) return;                  // fue un arrastre, no un click
    seleccionar(hover || PERFIL.id);
  });

  function redimensionar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = render.getPixelRatio();
    if (canvas.width === Math.floor(w * pr) && canvas.height === Math.floor(h * pr)) return;
    render.setSize(w, h, false);
    camara.aspect = w / h || 1;
    camara.updateProjectionMatrix();
    acomodarPorPanel(orbita.distMeta);
  }
  addEventListener('resize', redimensionar);

  /* ── carteles proyectados ── */
  const v = new THREE.Vector3();
  function proyectarCarteles() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const hueco = huecoPanel ? huecoPanel() : null;
    const topeAbajo = (hueco && hueco.alto ? hueco.alto : 0) + 80;
    for (const g of edificios) {
      const nodo = g.userData.nodo;
      const el = carteles.get(nodo.id);
      v.copy(g.position).setY(g.userData.altoCartel + g.position.y);
      const dist = camara.position.distanceTo(v);
      v.project(camara);
      const px0 = (v.x * 0.5 + 0.5) * w, py0 = (-v.y * 0.5 + 0.5) * h;
      if (v.z > 1 || px0 < -20 || px0 > w + 20 || py0 < -20 || py0 > h + 20) {
        el.style.opacity = '0'; el.style.pointerEvents = 'none';
        continue;
      }
      /* Once carteles juntos en la vista general se pisan entre si. Las
         casas muestran el nombre solo si las mirás o si estás cerca; el
         torreón y los dos castillos siempre. */
      const activo = nodo.id === seleccionado || nodo.id === hover;
      if (nodo.kind === 'house' && !activo && dist > 52) {
        el.style.opacity = '0'; el.style.pointerEvents = 'none';
        continue;
      }
      const medio = el.offsetWidth / 2;
      const px = THREE.MathUtils.clamp(px0, medio + 10, w - medio - 10);
      const py = THREE.MathUtils.clamp(py0, el.offsetHeight + 66, h - topeAbajo);
      el.style.transform = 'translate(-50%,-100%) translate(' + px + 'px,' + py + 'px)';
      el.style.opacity = activo ? '1' : String(THREE.MathUtils.clamp(1.7 - dist / 115, 0.34, 0.92));
      el.style.zIndex = String(Math.round(1000 - dist));
      el.style.pointerEvents = 'auto';
    }
  }

  /* ── animacion ── */
  const humos = [];
  escena.traverse(o => { if (o.userData.esHumo) humos.push(o); });
  const reloj = new THREE.Clock();

  function cuadro() {
    const t = reloj.getElapsedTime();
    redimensionar();
    orbita.actualizar();

    for (const g of edificios) g.position.y += (g.userData.baseY - g.position.y) * 0.13;

    for (const nube of humos) {
      for (const p of nube.children) {
        const f = (t * 0.4 + p.userData.faseHumo) % 3.2;
        p.position.y = f * 1.2;
        p.scale.setScalar((0.5 + f * 0.4) * Math.max(0.05, 1 - f / 3.4));
      }
    }
    for (const n of nubes) {
      n.position.z += n.userData.deriva * 0.014;
      if (n.position.z > 200) n.position.z = -200;
    }

    proyectarCarteles();
    render.render(escena, camara);
  }
  render.setAnimationLoop(cuadro);

  redimensionar();
  seleccionar(PERFIL.id);

  return {
    seleccionar,
    vistaGeneral: () => seleccionar(PERFIL.id),
    recalcularEncuadre: () => acomodarPorPanel(orbita.distMeta)
  };
}
