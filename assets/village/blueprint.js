/* ═══════════════════════════════════════════════════════════════════
   BLUEPRINT

   crearBlueprint({ escena, edificios, camara, canvas, notas, anotaciones,
                    terrazas, alturaTerreno })
     → { setActivo(bool), get activo(), actualizar() }

   Modo "greybox" de level design sobre la aldea: al activarlo toda la
   escena pasa a materiales planos gris/azulados sin texturas, los
   edificios reciben un contorno de lineas, se dibuja el diagrama de
   anillos / accesos / camino critico y aparecen anotaciones HTML
   ancladas a puntos 3D. Al desactivarlo todo vuelve a como estaba.

   Como funciona:
     - setActivo(true) recorre la escena y a cada objeto con material le
       guarda el original en userData.__bpMat y le pone uno de blueprint
       (compartido por categoria, salvo los edificios que llevan uno
       propio para que village.js pueda resaltarlos por emissive, en
       g.userData.materialesBP). Lo que no tiene sentido en un plano
       (cielo, estrellas, nubes, humo, sprites, cosas semitransparentes)
       se oculta guardando su visibilidad en userData.__bpVisible. Los
       objetos ocultos NO cambian de material, asi lo que otros modulos
       les hagan mientras tanto (las nubes cambian de material de noche)
       sigue valiendo al volver.
     - El diagrama es un grupo propio, creado una sola vez, con
       userData.blueprint = true en todos sus nodos para que el recorrido
       lo saltee. Los contornos de los edificios viven en ese grupo (no
       como hijos del mesh, para no ensuciar los raycasts) y actualizar()
       les copia matrixWorld cada cuadro porque los edificios se levantan
       al pasar el cursor.
     - Las anotaciones son <div class="nota"> dentro de `notas`; el CSS
       (.nota, .nota.visible, body.blueprint) lo pone index.html. Aca solo
       se proyecta la posicion y se fija el transform.
     - setActivo(false) restaura desde la lista de objetos tocados, sin
       volver a recorrer la escena. Nunca hace dispose de los originales.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const GRADO = Math.PI / 180;
const ACCESOS = [0, 130, -130];          // misma convencion que data.js / escenario.js
const AZUL_PLANO = 0x1F3B5E;
const LINEA_CLARA = 0xEAF1F8;
const AMBAR = 0xF5B36A;
const BORDE = 0x1B2E48;
const NEUTRO = 0xB6BEC7;
const AGUA = 0x6F93BD;
const CLASE = { keep: 0xEADFC4, castle: 0xC5D0E2, house: 0xD6D1C9 };

function matPlano(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: 0.9, metalness: 0, ...extra
  });
}

/* Domo del cielo: la unica esfera con ShaderMaterial y cara interior
   (BackSide) de la escena. De respaldo, cualquier esfera enorme. */
function esDomo(o, m) {
  if (!o.isMesh) return false;
  if (m && m.isShaderMaterial && m.side === THREE.BackSide) return true;
  const p = o.geometry && o.geometry.parameters;
  return !!(p && o.geometry.type === 'SphereGeometry' && p.radius >= 500);
}

/* Nubes: construirCielo las deja colgando de la escena con
   userData.deriva (village.js las mueve con eso). */
const esNube = o => o.userData && o.userData.deriva !== undefined;

const esSemitransparente = m => !!(m && m.transparent && m.opacity < 1);

export function crearBlueprint({ escena, edificios, camara, canvas, notas, anotaciones = [],
                                 terrazas, alturaTerreno }) {
  const T = terrazas;
  let activo = false;

  /* ── materiales compartidos, creados una sola vez ── */
  const matNeutro = matPlano(NEUTRO);
  const matNeutroDoble = matPlano(NEUTRO, { side: THREE.DoubleSide });
  const matAgua = matPlano(AGUA);
  const matLineaNeutra = new THREE.LineBasicMaterial({ color: NEUTRO });
  const matClase = {};
  for (const k in CLASE) matClase[k] = matPlano(CLASE[k]);

  /* Uno por edificio (clon del de su clase), para el emissive de hover.
     Se crean en el primer recorrido y se reutilizan despues. */
  const matPorEdificio = new Map();
  function materialDeEdificio(g) {
    let m = matPorEdificio.get(g);
    if (!m) {
      const kind = (g.userData.nodo && g.userData.nodo.kind) || 'house';
      m = (matClase[kind] || matClase.house).clone();
      matPorEdificio.set(g, m);
      g.userData.materialesBP = [m];
    }
    return m;
  }

  /* Que material de blueprint le toca a un material original. */
  function reemplazoDe(m, o, edificio) {
    if (edificio) return materialDeEdificio(edificio);
    if (m && (m.isShaderMaterial || m.isRawShaderMaterial)) return matAgua;
    if (o.isLine) return matLineaNeutra;
    if (m && m.side === THREE.DoubleSide) return matNeutroDoble;
    return matNeutro;
  }

  /* ── estado de lo tocado, para restaurar sin recorrer ── */
  const tocados = [];         // objetos con material reemplazado
  const ocultados = [];       // objetos con visible cambiado
  let fondoPrevio = null, nieblaPrevia = null;

  function ocultar(o) {
    o.userData.__bpVisible = o.visible;
    o.visible = false;
    ocultados.push(o);
  }

  function reemplazar(o, edificio) {
    const m = o.material;
    o.userData.__bpMat = m;
    if (Array.isArray(m)) {
      o.material = m.map(x => reemplazoDe(x, o, edificio));
    } else {
      o.material = reemplazoDe(m, o, edificio);
    }
    /* el color por instancia (copas del bosque) se aplica aunque el
       material no lleve vertexColors: se apaga mientras dure el plano */
    if (o.isInstancedMesh && o.instanceColor) {
      o.userData.__bpInstanceColor = o.instanceColor;
      o.instanceColor = null;
    }
    tocados.push(o);
  }

  /* Recorrido propio en vez de escena.traverse: hace falta saber si el
     objeto cuelga de un edificio o de algo que ya se oculto. */
  function visitar(o, edificio) {
    if (o.userData && o.userData.blueprint) return;      // el diagrama propio
    if (edificios.includes(o)) edificio = o;

    if (o.userData && o.userData.esHumo) { ocultar(o); return; }
    if (esNube(o)) { ocultar(o); return; }

    if (o.material) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const oculto =
        o.isPoints || o.isSprite || esDomo(o, m) ||
        (!edificio && esSemitransparente(m) && !(m.isShaderMaterial || m.isRawShaderMaterial));
      if (oculto) { ocultar(o); return; }
      reemplazar(o, edificio);
    }

    for (const h of o.children) visitar(h, edificio);
  }

  /* ── diagrama (perezoso) ── */
  let diagrama = null;
  const contornos = [];       // { mesh, linea }

  function marcar(o) {
    o.traverse(h => { h.userData.blueprint = true; });
    return o;
  }

  function anilloEn(radio, y, material) {
    const pts = [];
    for (let i = 0; i < 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.sin(a) * radio, y, Math.cos(a) * radio));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.LineLoop(geo, material);
    l.computeLineDistances();
    l.renderOrder = 999;
    l.frustumCulled = false;
    return l;
  }

  /* Polilinea que sigue el terreno entre dos radios sobre un angulo. */
  function radialSobreTerreno(anguloGrados, rDesde, rHasta, paso, alza, dx = 0) {
    const a = anguloGrados * GRADO;
    const sx = Math.sin(a), sz = Math.cos(a);
    const n = Math.max(1, Math.ceil(Math.abs(rHasta - rDesde) / paso));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const r = rDesde + (rHasta - rDesde) * (i / n);
      const x = sx * r + dx, z = sz * r;
      pts.push(new THREE.Vector3(x, alturaTerreno(x, z) + alza, z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  function construirDiagrama() {
    const g = new THREE.Group();
    g.name = 'blueprint';

    /* anillos de las terrazas y de la muralla */
    const matAnillo = new THREE.LineDashedMaterial({
      color: LINEA_CLARA, dashSize: 1.6, gapSize: 1.0,
      transparent: true, opacity: 0.85, depthTest: false, depthWrite: false
    });
    g.add(anilloEn(T.R_ALTA, T.H_ALTA + 0.25, matAnillo));
    g.add(anilloEn(T.R_MEDIA, T.H_MEDIA + 0.25, matAnillo));
    g.add(anilloEn(T.R_BAJA, T.H_BAJA + 0.25, matAnillo));
    g.add(anilloEn(T.RADIO_MURALLA, 0.35, matAnillo));

    /* accesos: de la muralla a la meseta alta, siguiendo el terreno */
    const matAcceso = new THREE.LineBasicMaterial({
      color: LINEA_CLARA, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false
    });
    for (const ang of ACCESOS) {
      const l = new THREE.Line(radialSobreTerreno(ang, T.RADIO_MURALLA, T.R_ALTA, 1.5, 0.3), matAcceso);
      l.renderOrder = 998;
      l.frustumCulled = false;
      g.add(l);
    }

    /* camino critico: del puente al centro, triplicado para que se lea grueso */
    const matCritico = new THREE.LineDashedMaterial({
      color: AMBAR, dashSize: 2.2, gapSize: 1.1,
      transparent: true, opacity: 0.95, depthTest: false, depthWrite: false
    });
    for (const dx of [-0.35, 0, 0.35]) {
      const l = new THREE.Line(radialSobreTerreno(0, T.R_FOSO_EXTERNO + 8, 0, 1, 0.35, dx), matCritico);
      l.computeLineDistances();
      l.renderOrder = 1000;
      l.frustumCulled = false;
      g.add(l);
    }

    /* contornos de los edificios: en el grupo del diagrama, no bajo el
       mesh, y sincronizados por matrixWorld en actualizar() */
    const matBorde = new THREE.LineBasicMaterial({ color: BORDE, transparent: true, opacity: 0.7 });
    for (const e of edificios) {
      e.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        if (o.parent && o.parent.userData.esHumo) return;   // el humo se oculta
        const linea = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), matBorde);
        linea.matrixAutoUpdate = false;
        linea.frustumCulled = false;
        linea.renderOrder = 1;
        g.add(linea);
        contornos.push({ mesh: o, linea });
      });
    }

    marcar(g);
    g.visible = false;
    escena.add(g);
    return g;
  }

  /* ── anotaciones ── */
  let fichas = null;          // [{ el, pos }]
  const vProy = new THREE.Vector3();

  function construirAnotaciones() {
    const lista = [];
    if (!notas) return lista;
    for (const a of anotaciones) {
      const el = document.createElement('div');
      el.className = 'nota';
      const b = document.createElement('b');
      b.textContent = a.titulo || '';
      const s = document.createElement('span');
      s.textContent = a.texto || '';
      el.append(b, s);
      notas.appendChild(el);
      lista.push({ el, pos: new THREE.Vector3(a.pos[0], a.pos[1], a.pos[2]) });
    }
    return lista;
  }

  function moverAnotaciones() {
    if (!fichas || !fichas.length) return;
    const r = canvas.getBoundingClientRect();
    for (const f of fichas) {
      vProy.copy(f.pos).project(camara);
      if (vProy.z > 1) { f.el.classList.remove('visible'); continue; }
      const x = r.left + (vProy.x * 0.5 + 0.5) * r.width;
      const y = r.top + (-vProy.y * 0.5 + 0.5) * r.height;
      f.el.style.transform = 'translate(-50%,-100%) translate(' + x + 'px,' + y + 'px)';
      f.el.classList.add('visible');
    }
  }

  function ocultarAnotaciones() {
    if (!fichas) return;
    for (const f of fichas) f.el.classList.remove('visible');
  }

  /* ── contornos: seguir a los meshes ── */
  function sincronizarContornos() {
    /* las matrices de los edificios se ponen al dia aca, asi el contorno
       no va un cuadro atras del levante de hover */
    for (const e of edificios) e.updateMatrixWorld(true);
    for (const c of contornos) {
      c.linea.matrix.copy(c.mesh.matrixWorld);
      c.linea.matrixWorldNeedsUpdate = true;
    }
  }

  /* ── activar / desactivar ── */
  function activar() {
    if (!diagrama) diagrama = construirDiagrama();
    if (!fichas) fichas = construirAnotaciones();

    for (const h of escena.children) visitar(h, null);

    fondoPrevio = escena.background;
    escena.background = new THREE.Color(AZUL_PLANO);
    if (escena.fog) {
      nieblaPrevia = escena.fog.color.clone();
      escena.fog.color.setHex(AZUL_PLANO);
    }

    diagrama.visible = true;
    sincronizarContornos();
    moverAnotaciones();
  }

  function desactivar() {
    for (const o of tocados) {
      o.material = o.userData.__bpMat;
      delete o.userData.__bpMat;
      if (o.userData.__bpInstanceColor) {
        o.instanceColor = o.userData.__bpInstanceColor;
        delete o.userData.__bpInstanceColor;
      }
    }
    tocados.length = 0;
    for (const o of ocultados) {
      o.visible = o.userData.__bpVisible;
      delete o.userData.__bpVisible;
    }
    ocultados.length = 0;

    escena.background = fondoPrevio;
    if (escena.fog && nieblaPrevia) escena.fog.color.copy(nieblaPrevia);
    fondoPrevio = null; nieblaPrevia = null;

    if (diagrama) diagrama.visible = false;
    ocultarAnotaciones();
  }

  function setActivo(v) {
    v = !!v;
    if (v === activo) return;
    activo = v;
    if (activo) activar(); else desactivar();
  }

  function actualizar() {
    if (!activo) return;
    sincronizarContornos();
    moverAnotaciones();
  }

  return {
    setActivo,
    get activo() { return activo; },
    actualizar
  };
}
