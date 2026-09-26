/* ═══════════════════════════════════════════════════════════════════
   PALETA Y PIEZAS BASE
   Colores y helpers de geometria sacados de la referencia: pueblo
   medieval estilizado, de dia. Entramado de madera anaranjada sobre
   revoque crema, techos a dos aguas empinados, piedra tibia.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

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

  /* techos sueltos, para murallas y utileria */
  techos: [0xA24A4C, 0x8D3B45, 0x6F5F94, 0x7C6BA6, 0x6D8244, 0x9A5340],
  musgo: 0x6E8B45,
  oro: 0xE8B84B, oroOscuro: 0xBC8A28,
  bronce: 0xAE7B34, bronceOscuro: 0x8A5F26,

  /* detalles */
  marco: 0x6B3B1F, vidrio: 0xFFCE85, humo: 0xF2EDE4,
  tela: [0x7EC8E8, 0x8B6BC4, 0xF0E7D2, 0xD4696B, 0xE2A94F],
  tronco: 0x6E4B2C, hoja: 0x4F8B33, hojaClara: 0x6FAA45, hojaOscura: 0x3E7029,
  hierro: 0x4A4038, heno: 0xD9B85C
};

/* ── Clases ─────────────────────────────────────────────────────────
   El rango de cada edificio se lee por material antes que por tamaño:
   el torreon es realeza (piedra clara, techo purpura, filetes de oro),
   los dos castillos comparten un tono de bronce y borgoña, y las ocho
   casas comparten teja de terracota y madera, sin metal. */
export const CLASES = {
  keep: {
    muro: 0xF0E7D2, muroAlto: 0xE3D6BB, piedra: 0xDCCBA8,
    teja: 0x6B3A7E, madera: 0x8A5B2E, marco: 0x5E3A18,
    trim: 0xE8B84B, trimOscuro: 0xBC8A28, bandera: 0xE8B84B
  },
  castle: {
    muro: 0xDCCEB1, muroAlto: 0xCCBC98, piedra: 0xC3B392,
    teja: 0x50609A, madera: 0xA1552B, marco: 0x6B3B1F,
    trim: 0xAE7B34, trimOscuro: 0x8A5F26, bandera: 0xAE7B34
  },
  house: {
    muro: 0xE9DEC5, muroAlto: 0xD8C9A8, piedra: 0xB6A88D,
    teja: 0xA85040, madera: 0xB05F31, marco: 0x6B3B1F,
    trim: null, trimOscuro: null, bandera: null
  }
};

/* Standard + flatShading: responde a luz de entorno y a los mapas de las
   texturas procedurales, y sigue leyendo plano y estilizado. Cada edificio
   clona sus materiales para poder resaltarse solo. */
export function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: 0.92, metalness: 0, ...extra
  });
}

/* Ventanas y faroles: un solo material compartido cada uno, asi el modo
   noche los enciende a todos con un emissive y el bloom hace el resto. */
export const MAT_VIDRIO = new THREE.MeshStandardMaterial({
  color: 0xFFCE85, emissive: 0xFFB74A, emissiveIntensity: 0, roughness: 0.4, metalness: 0
});
export const MAT_FAROL = new THREE.MeshStandardMaterial({
  color: 0xFFD98A, emissive: 0xFFC25A, emissiveIntensity: 0.15, roughness: 0.5, metalness: 0
});

/* ── UVs a escala de mundo ──────────────────────────────────────────
   Las primitivas de Three mapean cada cara a 0..1, asi que una textura
   se estiraria distinto en una viga de 0.3 que en un muro de 9. Aca se
   reescalan para que un tile de textura cubra siempre UNIDADES_POR_TILE
   unidades de mundo, sin importar el tamaño de la pieza. Las texturas
   repiten (RepeatWrapping) y la fusion de geometria las conserva. */
export const UNIDADES_POR_TILE = 2.2;

function uvCaja(geo, w, h, d) {
  const uv = geo.attributes.uv, n = geo.attributes.normal, k = UNIDADES_POR_TILE;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const ancho = nx > 0.5 ? d : (ny > 0.5 ? w : w);
    const alto  = nx > 0.5 ? h : (ny > 0.5 ? d : h);
    uv.setXY(i, uv.getX(i) * ancho / k, uv.getY(i) * alto / k);
  }
  uv.needsUpdate = true;
  return geo;
}

function uvRedondo(geo, radio, h) {
  const uv = geo.attributes.uv, n = geo.attributes.normal, k = UNIDADES_POR_TILE;
  const vuelta = 2 * Math.PI * radio;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.99) uv.setXY(i, uv.getX(i) * radio * 2 / k, uv.getY(i) * radio * 2 / k);
    else uv.setXY(i, uv.getX(i) * vuelta / k, uv.getY(i) * h / k);
  }
  uv.needsUpdate = true;
  return geo;
}

export function caja(w, h, d, material) {
  return new THREE.Mesh(uvCaja(new THREE.BoxGeometry(w, h, d), w, h, d), material);
}

export function cilindro(rTop, rBot, h, material, caras = 8) {
  const r = Math.max(rTop, rBot);
  return new THREE.Mesh(uvRedondo(new THREE.CylinderGeometry(rTop, rBot, h, caras), r, h), material);
}

export function cono(r, h, material, caras = 8) {
  return new THREE.Mesh(uvRedondo(new THREE.ConeGeometry(r, h, caras), r, h), material);
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
                                matTecho, matFronton, matFilete }) {
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

  const cumbrera = caja(0.42, 0.3, L + 0.12, matFilete || matTecho);
  cumbrera.position.y = alto;
  cumbrera.castShadow = true;
  g.add(cumbrera);

  /* Alero levantado: una pestaña angulada en el borde bajo de cada faldon.
     Es el "swoop" de la referencia: la curva que separa un techo de
     videojuego estilizado de una caja con tapa. Mas una tabla de fascia. */
  for (const lado of [1, -1]) {
    const xb = lado * (ancho / 2 + alero * Math.cos(a));
    const yb = -alero * Math.sin(a);
    const pestana = caja(alero * 0.9, grosor * 0.85, L, matTecho);
    pestana.position.set(xb - lado * alero * 0.3, yb + 0.14, 0);
    pestana.rotation.z = -lado * (a - 0.62);          // mas plana que el faldon: se levanta
    pestana.castShadow = true;
    g.add(pestana);
    const fascia = caja(0.16, 0.34, L + 0.06, matFronton);
    fascia.position.set(xb + lado * 0.2, yb + 0.02, 0);
    fascia.rotation.z = -lado * a;
    g.add(fascia);
  }

  /* filete a lo largo de los dos aleros: es lo que da el aire de realeza */
  if (matFilete) {
    for (const lado of [1, -1]) {
      const f = caja(0.26, 0.2, L + 0.1, matFilete);
      f.position.set(lado * (ancho / 2 + alero * Math.cos(a) * 0.5),
                     -alero * Math.sin(a) * 0.5 + 0.06, 0);
      f.castShadow = true;
      g.add(f);
    }
  }

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

/* Corre la luminosidad de un color. Las ocho casas comparten teja, pero
   con una variacion chica no se leen como copias pegadas. */
export function variar(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(0.92, Math.max(0.08, hsl.l + k)));
  return c.getHex();
}

/* ── Detalles de fachada ────────────────────────────────────────────
   Lo que hace que una casa parezca habitada: postigos, una jardinera con
   flores bajo la ventana, un cartel colgando de una mensula, un arco
   sobre la puerta. Todos se apoyan en la cara +Z (o la que se rote). */
export function postigos(matMadera, w = 0.85, h = 1.05) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const hoja = caja(0.34, h - 0.1, 0.07, matMadera);
    hoja.position.set(s * (w / 2 + 0.2), 0, 0.03);
    hoja.rotation.y = s * 0.22;                        // entreabiertos
    g.add(hoja);
  }
  return g;
}

export function jardinera(matMadera, matHoja, colores, w = 0.9) {
  const g = new THREE.Group();
  g.add(ubicar(caja(w, 0.3, 0.34, matMadera), 0, 0, 0.25));
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + 0.15 + i * (w - 0.3) / 3;
    g.add(ubicar(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), matHoja), x, 0.2, 0.25));
    const flor = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), colores[i % colores.length]);
    flor.position.set(x + 0.04, 0.32, 0.3);
    g.add(flor);
  }
  return g;
}

export function arcoPuerta(matPiedra, w = 1.1, prof = 0.3) {
  const arco = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.22, w / 2 + 0.22, prof, 10, 1, false, 0, Math.PI), matPiedra);
  arco.rotation.x = Math.PI / 2;
  arco.rotation.z = Math.PI / 2;
  return arco;
}

export function cartelColgante(matMadera, matTabla, matHierro) {
  const g = new THREE.Group();
  g.add(ubicar(caja(1.15, 0.12, 0.12, matHierro), 0.45, 0, 0));        // mensula
  g.add(ubicar(caja(0.12, 0.12, 0.6, matHierro), 0.98, 0, 0.2));
  for (const z of [0.05, 0.4]) g.add(ubicar(caja(0.06, 0.55, 0.06, matHierro), 0.98, -0.32, z));
  g.add(ubicar(caja(0.14, 0.8, 0.95, matTabla), 0.98, -0.98, 0.22));  // la tabla, colgando
  g.add(ubicar(caja(0.16, 0.08, 1.0, matMadera), 0.98, -0.62, 0.22));
  g.add(ubicar(caja(0.16, 0.08, 1.0, matMadera), 0.98, -1.34, 0.22));
  return g;
}

export function estandarte(matTela, ancho = 1.1, largo = 3.2) {
  const g = new THREE.Group();
  g.add(ubicar(caja(ancho + 0.3, 0.1, 0.1, matTela), 0, 0, 0));
  const tela = caja(ancho, largo, 0.06, matTela);
  tela.position.set(0, -largo / 2, 0.04);
  g.add(tela);
  const punta = new THREE.Mesh(new THREE.ConeGeometry(ancho / 2, 0.5, 4), matTela);
  punta.rotation.x = Math.PI; punta.rotation.y = Math.PI / 4;
  punta.position.set(0, -largo - 0.25, 0.04);
  g.add(punta);
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

/* Predicado por defecto para fusionar: lo que se anima queda suelto. */
export const SUELTO = o => o.userData.animado || (o.parent && o.parent.userData.esHumo);

export function fusionar(grupo, saltar = SUELTO) {
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
