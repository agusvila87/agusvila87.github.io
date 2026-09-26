/* ═══════════════════════════════════════════════════════════════════
   VIDA

   crearVida(escena, { nodos, posiciones, alturaTerreno, anillos, terrazas })
     anillos:  [{ radio, y }] — los caminos circulares de cada terraza
     terrazas: { R_ALTA, H_ALTA, R_MEDIA, H_MEDIA, R_BAJA, H_BAJA, RADIO_MURALLA }
     → { actualizar(t, dt), setNoche(t) }

   Lo que se mueve:
     - aldeanos low-poly caminando por los caminos circulares y
       bajando/subiendo por las escaleras; balanceo al caminar, miran
       hacia donde van, colores de ropa variados, algun sombrero
     - pajaros en dos bandadas girando sobre el torreon, aleteo
     - molino de viento contra la muralla con aspas girando
     - banderas: los meshes marcados userData.esBandera se ondulan
       (vertex animation); vida.js los encuentra con escena.traverse

   Presupuesto: todo lo que aca se agrega suma ~25 draw calls. Cada
   aldeano son 3 meshes (cuerpo fusionado + dos piernas), cada bandada
   es UN mesh cuyos vertices se reescriben por cuadro, y el molino son
   dos (cuerpo y aspas). Para poder fusionar sin multiplicar materiales,
   todo lo de este archivo usa un unico material con colores por vertice.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { caja, cilindro, cono, azar, C } from './paleta.js';

const GRADO = Math.PI / 180;
const DOS_PI = Math.PI * 2;

/* Mismos angulos que escenario.js (no los exporta). Los aldeanos suben
   y bajan por aca, y los que pasan de largo esquivan los muretes. */
const ESCALERAS = [0, 130, -130];

/* Un material para toda la vida de la aldea: al pintar por vertice, el
   cuerpo entero de un aldeano (ropa, piel, sombrero) cabe en un mesh. */
const MAT = new THREE.MeshStandardMaterial({
  vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0
});

const PIEL = [0xE8C4A0, 0xC99A72];
const ROPA = [...C.tela, 0x8A5A3C, 0x6E4B2C, 0xA07850];
const PANTALON = [0x5A4636, 0x3E3A3A, 0x6E4B2C, 0x4A4A66];
const PELO = [0x3B2A1E, 0x6E4B2C, 0xC9A15A, 0x2A2222];
const BOTA = 0x3E2E22;

const _color = new THREE.Color();

/* Pinta una geometria de un solo color, en el espacio de color de
   trabajo (Color ya convierte el hex sRGB, igual que material.color). */
function tenir(mesh, hex) {
  const g = mesh.geometry;
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  _color.setHex(hex);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = _color.r; arr[i * 3 + 1] = _color.g; arr[i * 3 + 2] = _color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return mesh;
}

function pieza(mesh, hex, x = 0, y = 0, z = 0) {
  tenir(mesh, hex);
  mesh.position.set(x, y, z);
  return mesh;
}

/* Fusion propia: la de paleta.js descarta el atributo color, que aca
   es justamente lo que distingue una pieza de otra. Aplasta todo lo
   que cuelga del grupo en un mesh con el material compartido. */
function fundir(grupo) {
  grupo.updateMatrixWorld(true);
  const geos = [];
  grupo.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    geos.push(g);
  });

  let nVert = 0, nIdx = 0;
  for (const g of geos) {
    nVert += g.attributes.position.count;
    nIdx += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nVert * 3);
  const nor = new Float32Array(nVert * 3);
  const col = new Float32Array(nVert * 3);
  const idx = new Uint16Array(nIdx);
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    pos.set(p.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    col.set(g.attributes.color.array, vo * 3);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  const m = new THREE.Mesh(out, MAT);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const elegir = (rnd, lista) => lista[Math.floor(rnd() * lista.length) % lista.length];
const suave = k => k * k * (3 - 2 * k);

/* ═══════════════════════════════════════════════════════════════════
   ALDEANOS
   ═══════════════════════════════════════════════════════════════════ */

/* Una pierna es su propio mesh porque se balancea; el pivote queda en
   la cadera (origen), la caja cuelga hacia abajo y la bota apunta al
   frente (+z), que es hacia donde mira la figura. */
function pierna(hexPantalon) {
  const g = new THREE.Group();
  g.add(pieza(caja(0.2, 0.7, 0.22, MAT), hexPantalon, 0, -0.36, 0));
  g.add(pieza(caja(0.2, 0.1, 0.32, MAT), BOTA, 0, -0.74, 0.05));
  return fundir(g);
}

function construirAldeano(rnd) {
  const piel = elegir(rnd, PIEL);
  const ropa = elegir(rnd, ROPA);
  const pantalon = elegir(rnd, PANTALON);
  const pelo = elegir(rnd, PELO);

  const cuerpo = new THREE.Group();

  /* torso: tunica (cilindro que se abre abajo) o jubon (caja) */
  const torso = rnd() < 0.5
    ? cilindro(0.24, 0.31, 0.68, MAT, 7)
    : caja(0.5, 0.68, 0.32, MAT);
  cuerpo.add(pieza(torso, ropa, 0, 1.12, 0));
  cuerpo.add(pieza(cilindro(0.3, 0.3, 0.08, MAT, 7), C.maderaOscura, 0, 0.92, 0));   // cinturon

  /* brazos caidos, un poco abiertos, con las manos de piel */
  for (const s of [-1, 1]) {
    const brazo = pieza(caja(0.13, 0.56, 0.13, MAT), ropa, s * 0.32, 1.14, 0);
    brazo.rotation.z = s * 0.14;
    cuerpo.add(brazo);
    cuerpo.add(pieza(caja(0.12, 0.12, 0.12, MAT), piel, s * 0.36, 0.82, 0));
  }

  /* cabeza + pelo, y a algunos un sombrero o una capucha */
  cuerpo.add(pieza(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), MAT), piel, 0, 1.6, 0));
  const tocado = rnd();
  if (tocado < 0.35) {
    cuerpo.add(pieza(caja(0.34, 0.14, 0.34, MAT), pelo, 0, 1.73, -0.04));
    cuerpo.add(pieza(cilindro(0.42, 0.42, 0.05, MAT, 8), C.maderaOscura, 0, 1.76, 0));   // ala
    cuerpo.add(pieza(cono(0.3, 0.36, MAT, 8), C.maderaOscura, 0, 1.96, 0));
  } else if (tocado < 0.62) {
    /* capucha del mismo color que la ropa, corrida atras para que asome la cara */
    cuerpo.add(pieza(cono(0.3, 0.56, MAT, 7), ropa, 0, 1.7, -0.07));
  } else {
    cuerpo.add(pieza(caja(0.36, 0.16, 0.36, MAT), pelo, 0, 1.74, -0.04));
  }

  const g = new THREE.Group();
  g.add(fundir(cuerpo));
  const pI = pierna(pantalon), pD = pierna(pantalon);
  pI.position.set(-0.13, 0.8, 0);
  pD.position.set(0.13, 0.8, 0);
  g.add(pI, pD);
  /* armado a escala comoda, queda de ~1.7 (algo mas con sombrero) */
  g.scale.setScalar(0.93);
  return { g, pI, pD };
}

/* ── Rutas ──────────────────────────────────────────────────────────
   Cada aldeano recorre un circuito cerrado: lista plana de puntos y
   distancias acumuladas, que en actualizar() se recorre por longitud
   de arco a velocidad constante. Los arcos se muestrean cada ~4 grados. */
function armarRuta() {
  const pts = [];
  const agregar = (x, y, z) => {
    const n = pts.length;
    if (n && Math.abs(pts[n - 3] - x) + Math.abs(pts[n - 2] - y) + Math.abs(pts[n - 1] - z) < 1e-3) return;
    pts.push(x, y, z);
  };
  return {
    agregar,
    cerrar() {
      const n = pts.length / 3;
      /* si el ultimo punto es el primero (vuelta completa), sobra */
      const last = (n - 1) * 3;
      const cierra = Math.abs(pts[last] - pts[0]) + Math.abs(pts[last + 1] - pts[1]) + Math.abs(pts[last + 2] - pts[2]) < 1e-3;
      const m = cierra ? n - 1 : n;
      const arr = new Float32Array(pts.slice(0, m * 3));
      const cum = new Float32Array(m + 1);
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m;
        cum[i + 1] = cum[i] + Math.hypot(arr[j * 3] - arr[i * 3], arr[j * 3 + 1] - arr[i * 3 + 1], arr[j * 3 + 2] - arr[i * 3 + 2]);
      }
      return { pts: arr, cum, n: m, total: cum[m] };
    }
  };
}

/* Obstaculos sobre los caminos. El anillo de tierra pasa por debajo de
   las casas y los castillos (asi esta dibujado), asi que el aldeano se
   desvia hacia el lado de la terraza donde queda mas lugar, y pasa por
   afuera de los muretes de las escaleras que no va a usar. La transicion
   es suave para que no haya quiebres en el paso. */
function armarObstaculos(nodos, posiciones, anillos, T) {
  const limites = [
    [T.R_ALTA + 0.6,  T.R_MEDIA - 0.4],
    [T.R_MEDIA + 0.6, T.R_BAJA - 0.4],
    [T.R_BAJA + 0.6,  T.RADIO_MURALLA - 2.0]
  ];
  /* media huella real (no el radio de ocupacion): la casa gira hasta 14
     grados, asi que va con margen */
  const huella = { castle: 4.6, house: 3.3 };
  const obst = anillos.map(() => []);

  for (const n of nodos) {
    if (n.kind === 'keep') continue;
    const p = posiciones.get(n.id);
    if (!p) continue;
    const i = anillos.findIndex(a => Math.abs(a.y - p.y) < 0.01);
    if (i < 0) continue;
    const rb = Math.hypot(p.x, p.z), h = huella[n.kind] || 3.3;
    const [rIn, rOut] = limites[i];
    const gapIn = (rb - h) - rIn, gapOut = rOut - (rb + h);
    const r = gapOut >= gapIn ? (rb + h + rOut) / 2 : (rIn + rb - h) / 2;
    /* la transicion es larga en los castillos porque el desvio es
       grande (unos 6 de radio) y una diagonal corta se veria brusca */
    obst[i].push({
      ang: Math.atan2(p.x, p.z) / GRADO, r,
      semi: Math.atan((h + 0.7) / rb) / GRADO,
      trans: n.kind === 'castle' ? 10 : 8
    });
  }
  /* los muretes de las escaleras llegan justo hasta el camino */
  for (const i of [1, 2]) for (const a of ESCALERAS) {
    if (anillos[i]) obst[i].push({ ang: a, r: anillos[i].radio + 1.1, semi: 7, trans: 4 });
  }
  return obst;
}

function difAngular(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/* ═══════════════════════════════════════════════════════════════════
   PAJAROS
   Una bandada es un solo mesh: cada pajaro son tres cuadrilateros
   (cuerpo y dos alas) cuyos vertices se calculan por cuadro a mano,
   sin Object3D ni vectores. Basic y oscuro: se leen como siluetas.
   ═══════════════════════════════════════════════════════════════════ */
const POR_PAJARO = 12;   // vertices: cuerpo 4 + ala 4 + ala 4

/* Un vertice del pajaro en coordenadas de mundo: centro + (derecha,
   arriba, adelante) escalados por la posicion local. Funcion suelta y
   no closure, para no reservar nada por cuadro. */
function vertice(p, o, px, py, pz, rx, rz, fx, fz, lx, ly, lz) {
  p[o] = px + rx * lx + fx * lz;
  p[o + 1] = py + ly;
  p[o + 2] = pz + rz * lx + fz * lz;
}

function construirBandada(rnd, cant, base) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cant * POR_PAJARO * 3);
  const idx = new Uint16Array(cant * 18);
  for (let j = 0; j < cant; j++) {
    const b = j * POR_PAJARO, o = j * 18;
    for (let q = 0; q < 3; q++) {
      const v = b + q * 4, k = o + q * 6;
      idx[k] = v; idx[k + 1] = v + 1; idx[k + 2] = v + 2;
      idx[k + 3] = v; idx[k + 4] = v + 2; idx[k + 5] = v + 3;
    }
  }
  const attr = new THREE.BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  geo.setIndex(new THREE.BufferAttribute(idx, 1));

  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0x2B2622, side: THREE.DoubleSide, transparent: true, opacity: 1
  }));
  mesh.frustumCulled = false;   // el bounding no sigue a los vertices

  const pajaros = [];
  for (let j = 0; j < cant; j++) {
    pajaros.push({
      desfase: (rnd() - 0.5) * 0.7,      // adelante o atras en el giro
      dr: (rnd() - 0.5) * 7,             // mas adentro o mas afuera
      dh: (rnd() - 0.5) * 4,
      fase: rnd() * DOS_PI,
      frec: 7 + rnd() * 4,               // aleteo, rad/s
      vaiven: rnd() * DOS_PI
    });
  }
  return { mesh, pos: attr, pajaros, ...base };
}

/* ═══════════════════════════════════════════════════════════════════
   MOLINO
   ═══════════════════════════════════════════════════════════════════ */
function construirMolino(rnd) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Group();

  /* medio segmento de giro: asi una cara plana del prisma queda al
     frente y la puerta no cae sobre una arista */
  const base  = pieza(cilindro(2.45, 2.6, 0.5, MAT, 10), C.piedraOscura, 0, 0.25, 0);
  const torre = pieza(cilindro(1.85, 2.2, 7, MAT, 10), C.piedra, 0, 3.8, 0);
  const techo = pieza(cono(2.5, 2.7, MAT, 10), C.maderaOscura, 0, 7.3 + 1.35, 0);
  base.rotation.y = torre.rotation.y = techo.rotation.y = Math.PI / 10;
  cuerpo.add(base, torre, techo);
  cuerpo.add(pieza(cilindro(0.3, 0.3, 0.6, MAT, 6), C.hierro, 0, 8.9, 0));   // remate
  /* puerta y ventana en el frente, que mira al centro de la aldea */
  cuerpo.add(pieza(caja(1.0, 1.8, 0.2, MAT), C.marco, 0, 1.2, 2.15));
  cuerpo.add(pieza(caja(0.7, 1.5, 0.12, MAT), C.madera, 0, 1.2, 2.24));
  cuerpo.add(pieza(caja(0.5, 0.6, 0.16, MAT), C.marco, 0, 4.6, 1.96));
  cuerpo.add(pieza(caja(0.32, 0.42, 0.1, MAT), C.vidrio, 0, 4.6, 2.03));
  /* eje que sale del frente */
  const eje = pieza(cilindro(0.18, 0.18, 1.7, MAT, 6), C.maderaOscura, 0, 6.2, 2.5);
  eje.rotation.x = Math.PI / 2;
  cuerpo.add(eje);
  g.add(fundir(cuerpo));

  /* aspas: cuatro brazos con travesaños y un paño de tela mas claro.
     Giran como un bloque, asi que se fusionan en un solo mesh dentro de
     un Group que es el que rota. */
  const aspas = new THREE.Group();
  aspas.position.set(0, 6.2, 3.15);
  aspas.userData.animado = true;
  const bloque = new THREE.Group();
  const cubo = pieza(cilindro(0.42, 0.42, 0.4, MAT, 8), C.maderaOscura, 0, 0, 0);
  cubo.rotation.x = Math.PI / 2;
  bloque.add(cubo);
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Group();
    a.rotation.z = i * Math.PI / 2;
    a.add(pieza(caja(0.22, 5.5, 0.16, MAT), C.maderaOscura, 0, 3.0, 0));
    for (const y of [1.5, 2.6, 3.7, 4.8]) a.add(pieza(caja(1.35, 0.1, 0.12, MAT), C.madera, 0.45, y, 0));
    a.add(pieza(caja(1.0, 4.2, 0.05, MAT), 0xEDE3CC, 0.62, 3.4, -0.1));
    bloque.add(a);
  }
  aspas.add(fundir(bloque));
  aspas.rotation.z = rnd() * DOS_PI;
  g.add(aspas);

  return { g, aspas };
}

/* ═══════════════════════════════════════════════════════════════════
   BANDERAS
   Normales a mano para una grilla de PlaneGeometry: computeVertexNormals
   reserva vectores en cada llamada y esto corre por cuadro.
   ═══════════════════════════════════════════════════════════════════ */
function normalesGrilla(p, n, gx, gy) {
  for (let iy = 0; iy < gy; iy++) {
    for (let ix = 0; ix < gx; ix++) {
      const i = iy * gx + ix;
      const xa = (ix > 0 ? i - 1 : i) * 3, xb = (ix < gx - 1 ? i + 1 : i) * 3;
      const ya = (iy > 0 ? i - gx : i) * 3, yb = (iy < gy - 1 ? i + gx : i) * 3;
      const tx0 = p[xb] - p[xa], tx1 = p[xb + 1] - p[xa + 1], tx2 = p[xb + 2] - p[xa + 2];
      /* las filas van de arriba hacia abajo, asi que se invierte para que
         el producto cruzado siga apuntando a +z como en el plano original */
      const ty0 = p[ya] - p[yb], ty1 = p[ya + 1] - p[yb + 1], ty2 = p[ya + 2] - p[yb + 2];
      let nx = tx1 * ty2 - tx2 * ty1, ny = tx2 * ty0 - tx0 * ty2, nz = tx0 * ty1 - tx1 * ty0;
      const l = Math.hypot(nx, ny, nz) || 1;
      n[i * 3] = nx / l; n[i * 3 + 1] = ny / l; n[i * 3 + 2] = nz / l;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ARMADO
   ═══════════════════════════════════════════════════════════════════ */
export function crearVida(escena, { nodos = [], posiciones = new Map(), alturaTerreno, anillos = [], terrazas } = {}) {
  const rnd = azar(7331);
  const T = terrazas || { R_ALTA: 12, H_ALTA: 5.6, R_MEDIA: 28.5, H_MEDIA: 3.6, R_BAJA: 40, H_BAJA: 1.8, RADIO_MURALLA: 52 };
  const grupo = new THREE.Group();
  escena.add(grupo);

  /* ── rutas ── */
  const obstaculos = armarObstaculos(nodos, posiciones, anillos, T);

  const radioEn = (i, ang) => {
    let r = anillos[i].radio;
    for (const o of obstaculos[i]) {
      const d = difAngular(ang, o.ang);
      if (d >= o.semi + o.trans) continue;
      const k = d <= o.semi ? 1 : suave((o.semi + o.trans - d) / o.trans);
      r += k * (o.r - anillos[i].radio);
    }
    return r;
  };

  /* largo de una escalera, con la misma cuenta que escenario.js */
  const largoEscalera = alto => Math.max(4, Math.round(alto / 0.34)) * 0.8;

  const arco = (ruta, i, desde, hasta) => {
    const y = anillos[i].y, paso = hasta > desde ? 4 : -4;
    const n = Math.ceil(Math.abs(hasta - desde) / 4);
    for (let k = 0; k <= n; k++) {
      const ang = k < n ? desde + k * paso : hasta;
      const r = radioEn(i, ang), a = ang * GRADO;
      ruta.agregar(Math.sin(a) * r, y, Math.cos(a) * r);
    }
  };
  /* tramo recto en linea con el centro; si cambia la altura es la
     escalera, donde y baja lineal con el radio */
  const radial = (ruta, ang, rDesde, rHasta, yDesde, yHasta = yDesde) => {
    const a = ang * GRADO, n = Math.max(2, Math.round(Math.abs(rHasta - rDesde) / 1.2));
    for (let k = 0; k <= n; k++) {
      const f = k / n, r = rDesde + (rHasta - rDesde) * f;
      ruta.agregar(Math.sin(a) * r, yDesde + (yHasta - yDesde) * f, Math.cos(a) * r);
    }
  };
  const bajar = (ruta, ang, radio, arriba, abajo) => radial(ruta, ang, radio, radio + largoEscalera(arriba - abajo), arriba, abajo);
  const subir = (ruta, ang, radio, abajo, arriba) => radial(ruta, ang, radio + largoEscalera(arriba - abajo), radio, abajo, arriba);

  const { R_MEDIA, H_MEDIA, R_BAJA, H_BAJA } = T;
  const CIRCUITOS = [
    /* vueltas completas, en los dos sentidos */
    r => arco(r, 0, 0, 360),
    r => arco(r, 1, 90, -270),
    r => arco(r, 2, -60, 300),
    r => arco(r, 2, 200, -160),
    /* medio → baja por la escalera de -130, vuelve por la de 130 */
    r => {
      arco(r, 0, 130, 230);
      radial(r, -130, radioEn(0, -130), R_MEDIA, H_MEDIA);
      bajar(r, -130, R_MEDIA, H_MEDIA, H_BAJA);
      arco(r, 1, -130, -230);
      subir(r, 130, R_MEDIA, H_BAJA, H_MEDIA);
      radial(r, 130, R_MEDIA, radioEn(0, 130), H_MEDIA);
    },
    /* baja → suelo por la escalera de 130, vuelve por la de 0 */
    r => {
      arco(r, 1, 0, 130);
      radial(r, 130, radioEn(1, 130), R_BAJA, H_BAJA);
      bajar(r, 130, R_BAJA, H_BAJA, 0);
      arco(r, 2, 130, 0);
      subir(r, 0, R_BAJA, 0, H_BAJA);
      radial(r, 0, R_BAJA, radioEn(1, 0), H_BAJA);
    },
    /* suelo → baja por la escalera de -130, vuelve por la de 0 */
    r => {
      arco(r, 2, 0, -130);
      subir(r, -130, R_BAJA, 0, H_BAJA);
      radial(r, -130, R_BAJA, radioEn(1, -130), H_BAJA);
      arco(r, 1, -130, 0);
      radial(r, 0, radioEn(1, 0), R_BAJA, H_BAJA);
      bajar(r, 0, R_BAJA, H_BAJA, 0);
    }
  ];

  /* ── aldeanos ── */
  const aldeanos = [];
  if (anillos.length >= 3) {
    for (const definir of CIRCUITOS) {
      const armado = armarRuta();
      definir(armado);
      const ruta = armado.cerrar();
      const { g, pI, pD } = construirAldeano(rnd);
      const a = {
        g, pI, pD, ruta,
        vel: 1.2 + rnd() * 0.6,
        s: rnd() * ruta.total,
        i: 0,
        fase: rnd() * DOS_PI
      };
      g.position.set(ruta.pts[0], ruta.pts[1], ruta.pts[2]);
      grupo.add(g);
      aldeanos.push(a);
    }
  }

  /* ── pajaros ── */
  const bandadas = [
    construirBandada(rnd, 5, { ang: rnd() * DOS_PI, omega: 0.21,  radio: 21, altura: 46 }),
    construirBandada(rnd, 5, { ang: rnd() * DOS_PI, omega: -0.16, radio: 28, altura: 53 })
  ];
  for (const b of bandadas) grupo.add(b.mesh);

  /* ── molino ── */
  /* Contra la muralla, a -60 grados. Corrido un par de grados porque la
     cerca que hay a r=47.5 termina justo en -60.7 y tocaba la base. */
  const angMolino = -58.5 * GRADO, rMolino = 49.2;
  const mx = Math.sin(angMolino) * rMolino, mz = Math.cos(angMolino) * rMolino;
  const molino = construirMolino(rnd);
  molino.g.position.set(mx, alturaTerreno ? alturaTerreno(mx, mz) : 0, mz);
  molino.g.rotation.y = Math.atan2(-mx, -mz);
  grupo.add(molino.g);

  /* ── banderas ── */
  const banderas = [];
  escena.traverse(o => {
    if (!o.userData.esBandera || !o.geometry) return;
    const attr = o.geometry.attributes.position;
    attr.setUsage(THREE.DynamicDrawUsage);
    const par = o.geometry.parameters || {};
    banderas.push({
      pos: attr,
      nor: o.geometry.attributes.normal,
      orig: Float32Array.from(attr.array),
      ancho: o.userData.ancho || 1,
      gx: (par.widthSegments || 8) + 1,
      gy: (par.heightSegments || 3) + 1,
      fase: rnd() * DOS_PI
    });
  });

  /* ═══ animacion ═══ */
  const PASO = DOS_PI / 0.95;   // un ciclo de dos pasos cada ~0.95 unidades

  function actualizar(t, dt) {
    /* aldeanos: avanzan por longitud de arco */
    for (const a of aldeanos) {
      const { pts, cum, n, total } = a.ruta;
      a.s += a.vel * dt;
      if (a.s >= total) { a.s -= total; a.i = 0; }
      while (a.i < n - 1 && a.s >= cum[a.i + 1]) a.i++;
      const i0 = a.i * 3, i1 = ((a.i + 1) % n) * 3;
      const largo = cum[a.i + 1] - cum[a.i];
      const k = largo > 0 ? (a.s - cum[a.i]) / largo : 0;
      const dx = pts[i1] - pts[i0], dy = pts[i1 + 1] - pts[i0 + 1], dz = pts[i1 + 2] - pts[i0 + 2];

      a.fase += dt * a.vel * PASO;
      const sw = Math.sin(a.fase);
      a.g.position.set(pts[i0] + dx * k, pts[i0 + 1] + dy * k + 0.05 * Math.abs(sw), pts[i0 + 2] + dz * k);
      a.pI.rotation.x = 0.55 * sw;
      a.pD.rotation.x = -0.55 * sw;

      /* mira hacia donde va; el giro se amortigua para que el muestreo
         de 4 grados no se note como un tic */
      let d = Math.atan2(dx, dz) - a.g.rotation.y;
      if (d > Math.PI) d -= DOS_PI; else if (d < -Math.PI) d += DOS_PI;
      a.g.rotation.y += d * Math.min(1, dt * 9);
    }

    /* pajaros */
    for (const b of bandadas) {
      b.ang += b.omega * dt;
      const p = b.pos.array;
      const dir = b.omega >= 0 ? 1 : -1;
      for (let j = 0; j < b.pajaros.length; j++) {
        const q = b.pajaros[j];
        q.fase += q.frec * dt;
        const a = b.ang + q.desfase, r = b.radio + q.dr;
        const px = Math.sin(a) * r, pz = Math.cos(a) * r;
        const py = b.altura + q.dh + Math.sin(t * 0.7 + q.vaiven) * 0.8;
        /* adelante es la tangente del giro; derecha, perpendicular */
        const fx = Math.cos(a) * dir, fz = -Math.sin(a) * dir;
        const rx = fz, rz = -fx;
        const ala = 0.7 * Math.sin(q.fase), ca = Math.cos(ala) * 0.95, sa = Math.sin(ala) * 0.95;
        const o = j * POR_PAJARO * 3;
        /* cuerpo: rombo visto desde arriba */
        vertice(p, o,      px, py, pz, rx, rz, fx, fz,  0,    0.02,  0.34);
        vertice(p, o + 3,  px, py, pz, rx, rz, fx, fz, -0.1,  0,     0.04);
        vertice(p, o + 6,  px, py, pz, rx, rz, fx, fz,  0,    0,    -0.28);
        vertice(p, o + 9,  px, py, pz, rx, rz, fx, fz,  0.1,  0,     0.04);
        /* ala izquierda y derecha: raiz pegada al cuerpo, punta que sube y baja */
        vertice(p, o + 12, px, py, pz, rx, rz, fx, fz, -0.08, 0,     0.14);
        vertice(p, o + 15, px, py, pz, rx, rz, fx, fz, -ca,   sa,    0);
        vertice(p, o + 18, px, py, pz, rx, rz, fx, fz, -ca,   sa,   -0.3);
        vertice(p, o + 21, px, py, pz, rx, rz, fx, fz, -0.08, 0,    -0.1);
        vertice(p, o + 24, px, py, pz, rx, rz, fx, fz,  0.08, 0,     0.14);
        vertice(p, o + 27, px, py, pz, rx, rz, fx, fz,  ca,   sa,    0);
        vertice(p, o + 30, px, py, pz, rx, rz, fx, fz,  ca,   sa,   -0.3);
        vertice(p, o + 33, px, py, pz, rx, rz, fx, fz,  0.08, 0,    -0.1);
      }
      b.pos.needsUpdate = true;
    }

    /* molino */
    molino.aspas.rotation.z += 0.55 * dt;

    /* banderas: la amplitud crece hacia el borde libre (x/ancho) */
    for (const b of banderas) {
      const p = b.pos.array, o = b.orig, w = b.ancho;
      for (let i = 0; i < p.length; i += 3) {
        const x = o[i], k = x / w;
        p[i + 1] = o[i + 1] + Math.sin(x * 1.2 - t * 3) * 0.04 * k;
        p[i + 2] = Math.sin(x * 1.9 - t * 4.2 + b.fase) * 0.13 * k;
      }
      normalesGrilla(p, b.nor.array, b.gx, b.gy);
      b.pos.needsUpdate = true;
      b.nor.needsUpdate = true;
    }
  }

  /* Los pajaros se van a dormir: de 0.5 a 0.75 se desvanecen, y despues
     directamente no se dibujan. */
  function setNoche(t) {
    const op = 1 - Math.min(1, Math.max(0, (t - 0.5) / 0.25));
    for (const b of bandadas) {
      b.mesh.material.opacity = op;
      b.mesh.visible = op > 0.01;
    }
  }

  return { actualizar, setNoche };
}
