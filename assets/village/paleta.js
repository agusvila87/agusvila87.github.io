/* ═══════════════════════════════════════════════════════════════════
   PALETA Y PIEZAS BASE
   Colores y helpers de geometria sacados de la referencia: pueblo
   medieval estilizado, de dia. Entramado de madera anaranjada sobre
   revoque crema, techos a dos aguas empinados, piedra tibia.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';

export const C = {
  /* cielo y luz */
  cieloAlto: 0x2F79C4,  cieloBajo: 0xA9D8F0,  nube: 0xFDFCFA,
  sol: 0xFFF0D2,        reboteCielo: 0xA8CDE8, reboteSuelo: 0x86A055,

  /* suelo */
  pastoClaro: 0x7FAE45, pastoOscuro: 0x59873A, pastoSeco: 0x93AE52,
  tierra: 0xC7A671,     tierraOscura: 0xAA8956, adoquin: 0xA79C89,

  /* construccion */
  yeso: 0xE9DEC5,       yesoSombra: 0xD8C9A8,
  madera: 0xB05F31,     maderaOscura: 0x7E4020, maderaClara: 0xC57B45,
  piedra: 0xB6A88D,     piedraOscura: 0x8E836B,

  /* techos: la variedad de color es lo que hace que no parezcan clones */
  techos: [0xA24A4C, 0x8D3B45, 0x6F5F94, 0x7C6BA6, 0x6D8244, 0x9A5340],
  musgo: 0x6E8B45,

  /* detalles */
  marco: 0x6B3B1F, vidrio: 0xFFCE85, humo: 0xF2EDE4,
  tela: [0x7EC8E8, 0x8B6BC4, 0xF0E7D2, 0xD4696B, 0xE2A94F],
  tronco: 0x6E4B2C, hoja: 0x4F8B33, hojaClara: 0x6FAA45, hojaOscura: 0x3E7029,
  hierro: 0x4A4038, heno: 0xD9B85C
};

/* Lambert + flatShading: da la lectura plana y estilizada de la referencia
   sin el costo de Standard. Cada edificio clona sus materiales para poder
   resaltarse solo. */
export function mat(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
}

export function caja(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

export function cilindro(rTop, rBot, h, material, caras = 8) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, caras), material);
}

export function cono(r, h, material, caras = 8) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, caras), material);
}

export function ubicar(m, x, y, z, rotY = 0) {
  m.position.set(x, y, z);
  if (rotY) m.rotation.y = rotY;
  return m;
}

/* ── Techo a dos aguas ──────────────────────────────────────────────
   La silueta que mas define el estilo: pendiente empinada, alero que
   sobresale y frontones triangulares. El ridge tapa la union arriba. */
export function techoDosAguas({ ancho, largo, alto, grosor = 0.32,
                                alero = 0.7, aleroFrente = 0.5,
                                matTecho, matFronton }) {
  const g = new THREE.Group();
  const a = Math.atan2(alto, ancho / 2);
  const faldon = Math.hypot(ancho / 2, alto) + alero;
  const L = largo + aleroFrente * 2;

  for (const lado of [1, -1]) {
    const f = caja(faldon, grosor, L, matTecho);
    f.position.set(
      lado * (ancho / 4 + (alero / 2) * Math.cos(a)),
      alto / 2 - (alero / 2) * Math.sin(a),
      0
    );
    f.rotation.z = -lado * a;
    f.castShadow = true; f.receiveShadow = true;
    g.add(f);
  }

  const forma = new THREE.Shape();
  forma.moveTo(-ancho / 2, 0);
  forma.lineTo(ancho / 2, 0);
  forma.lineTo(0, alto);
  forma.closePath();
  const geoFronton = new THREE.ShapeGeometry(forma);
  for (const lado of [1, -1]) {
    const f = new THREE.Mesh(geoFronton, matFronton);
    f.position.z = lado * largo / 2;
    if (lado < 0) f.rotation.y = Math.PI;
    f.castShadow = true; f.receiveShadow = true;
    g.add(f);
  }

  const cumbrera = caja(0.42, 0.3, L + 0.12, matTecho);
  cumbrera.position.y = alto;
  cumbrera.castShadow = true;
  g.add(cumbrera);

  return g;
}

/* ── Entramado de madera ────────────────────────────────────────────
   Postes en las esquinas, vigas arriba y abajo, y cruces en las caras.
   Es lo que convierte una caja de revoque en una casa medieval. */
export function entramado(w, h, d, matMadera, { cruces = true } = {}) {
  const g = new THREE.Group();
  const p = 0.3;

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(ubicar(caja(p, h, p, matMadera), sx * (w / 2 - p / 2 + 0.03), 0, sz * (d / 2 - p / 2 + 0.03)));
  }
  for (const sy of [-1, 1]) {
    const y = sy * (h / 2 - 0.16);
    for (const sz of [-1, 1]) g.add(ubicar(caja(w + 0.06, 0.3, p, matMadera), 0, y, sz * (d / 2 - 0.02)));
    for (const sx of [-1, 1]) g.add(ubicar(caja(p, 0.3, d + 0.06, matMadera), sx * (w / 2 - 0.02), y, 0));
  }

  if (cruces) {
    const alto = h - 0.7;
    const cruzar = (largoCara, ejeZ, offset) => {
      const l = Math.hypot(largoCara * 0.42, alto * 0.86);
      const ang = Math.atan2(alto * 0.86, largoCara * 0.42);
      for (const s of [1, -1]) {
        const v = caja(l, 0.24, 0.2, matMadera);
        v.rotation.z = s * ang;
        if (ejeZ) { v.position.set(offset, 0, 0); v.rotation.y = Math.PI / 2; }
        else v.position.set(0, 0, offset);
        g.add(v);
      }
    };
    cruzar(w, false, d / 2 + 0.01);
    cruzar(w, false, -(d / 2 + 0.01));
    cruzar(d, true, w / 2 + 0.01);
    cruzar(d, true, -(w / 2 + 0.01));
  }

  for (const m of g.children) { m.castShadow = true; m.receiveShadow = true; }
  return g;
}

/* ── Ventana con luz adentro ────────────────────────────────────────
   El vidrio es Basic: brilla siempre, no depende del sol. Da la
   sensacion de que la aldea esta habitada. */
export function ventana(matMarco, matVidrio, w = 0.85, h = 1.05) {
  const g = new THREE.Group();
  const marco = caja(w, h, 0.16, matMarco);
  const vidrio = caja(w - 0.26, h - 0.26, 0.1, matVidrio);
  vidrio.position.z = 0.05;
  g.add(marco, vidrio);
  const travesano = caja(w - 0.26, 0.09, 0.13, matMarco);
  travesano.position.z = 0.06;
  g.add(travesano);
  return g;
}

export function puerta(matMarco, w = 1.1, h = 1.9) {
  const g = new THREE.Group();
  g.add(caja(w, h, 0.18, matMarco));
  const tablas = caja(w - 0.22, h - 0.2, 0.1, matMarco);
  tablas.position.z = 0.06;
  g.add(tablas);
  return g;
}

/* Ruido determinista: mismo id, misma aldea en cada carga. */
export function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── Fusion de geometria ────────────────────────────────────────────
   Cada casa son ~60 primitivas y cada una es un draw call. Juntando
   las que comparten material, un edificio pasa de ~60 llamadas a ~7.
   Se pierde la posibilidad de mover las piezas por separado, que en
   una aldea estatica no hace falta. */
function unirGeometrias(geos) {
  let nVert = 0, nIdx = 0;
  for (const g of geos) {
    nVert += g.attributes.position.count;
    nIdx += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nVert * 3);
  const nor = new Float32Array(nVert * 3);
  const uv  = new Float32Array(nVert * 2);
  const idx = nVert > 65535 ? new Uint32Array(nIdx) : new Uint16Array(nIdx);

  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    pos.set(p.array, vo * 3);
    if (n) nor.set(n.array, vo * 3);
    if (u) uv.set(u.array, vo * 2);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

export function fusionar(grupo, saltar) {
  grupo.updateWorldMatrix(true, true);
  const aBase = new THREE.Matrix4().copy(grupo.matrixWorld).invert();
  const porMaterial = new Map();
  const aQuitar = [];
  const tmp = new THREE.Matrix4();

  grupo.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (saltar && saltar(o)) return;
    const g = o.geometry.clone();
    g.applyMatrix4(tmp.multiplyMatrices(aBase, o.matrixWorld));
    const lista = porMaterial.get(o.material);
    if (lista) lista.push(g); else porMaterial.set(o.material, [g]);
    aQuitar.push(o);
  });

  for (const o of aQuitar) if (o.parent) o.parent.remove(o);
  for (const [material, geos] of porMaterial) {
    const m = new THREE.Mesh(unirGeometrias(geos), material);
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
    for (const g of geos) g.dispose();
  }
  return grupo;
}
