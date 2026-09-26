/* ═══════════════════════════════════════════════════════════════════
   HORIZONTE

   construirHorizonte(escena, { alturaTerreno, radioMuralla, radioFoso })
     → { actualizar(t), setNoche(t) }

   Todo lo que da profundidad mas alla de la aldea:
     - cordillera lejana (r 170..320): siluetas low-poly con picos
       nevados, escalonadas para que la niebla las separe en capas
     - bosque lejano (r > radioFoso + 22): arboles low-poly instanciados,
       denso, tenido por la niebla; NUNCA dentro de la aldea
     - arbustos e hiedra: matas chicas apoyadas contra la muralla y los
       muros de las terrazas, canteros con flores. No arboles.
     - rocas y piedras grandes en las colinas
     - un rio que baja de la cordillera y muere en el foso
   Determinista (azar de paleta.js).

   Presupuesto: cada seccion se fusiona por material, asi que el modulo
   entero suma ~16 draw calls y ~25k triangulos. Nada de aca se anima
   salvo el agua del rio.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { mat, azar, fusionar, C } from './paleta.js';
/* Namespace y no import nombrado: si agua.js todavia no exporta crearRio
   el modulo tiene que seguir cargando, con el rio ausente y nada mas. */
import * as agua from './agua.js';
import { RIO, RIO_ANCHO, distanciaRio } from './escenario.js';

const GRADO = Math.PI / 180;

/* Geometria de la aldea que este modulo tiene que esquivar. Copiada de
   escenario.js y data.js en vez de importada para no acoplar el horizonte
   a la aldea: si cambia algo de esto, cambia tambien lo que se ve. */
const R_MEDIA = 28.5, R_BAJA = 40, H_BAJA = 1.8;
const ESCALERAS = [0, 130, -130];                        // angulos, grados
const CASAS_TERRAZA_BAJA = [-65, 65, -152];              // pegadas al muro de R_MEDIA
const CASAS_SUELO = [-30, 30, -95, 95, 155];             // pegadas al muro de R_BAJA
const TORRES_MURALLA = Array.from({ length: 8 }, (_, i) => i * 45 + 22.3);

/* Altura de la lamina de agua sobre el fondo del cauce. */
const LAMINA_RIO = 0.5;

const polar = (grados, r) => [Math.sin(grados * GRADO) * r, Math.cos(grados * GRADO) * r];

/* La avenida de entrada corre por x≈0 hacia +z y tiene que quedar libre
   hasta el infinito: es el eje por el que la camara mira la aldea. */
const enCorredor = (x, z, ancho = 12) => z > 0 && Math.abs(x) < ancho;

function cercaDeAngulo(x, z, angulos, margenGrados) {
  const a = Math.atan2(x, z) / GRADO;
  for (const e of angulos) {
    let d = Math.abs(a - e) % 360;
    if (d > 180) d = 360 - d;
    if (d < margenGrados) return true;
  }
  return false;
}

/* Cono con los anillos corridos radialmente: una montaña de cono
   perfecto se lee como carpa. `jitMid` y `jitBase` son un factor por
   lado, compartidos entre el pico y su casquete para que este lo abrace.
   `sesgo` corre la punta respecto de la base (ladera asimetrica). */
function conoIrregular({ r, h, lados, jitMid, jitBase, sesgo, sesgoBase = [0, 0], segmentos = 2 }) {
  const geo = new THREE.ConeGeometry(r, h, lados, segmentos, true);
  const pos = geo.attributes.position;
  const paso = Math.PI * 2 / lados;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const frac = (y + h / 2) / h;                          // 0 base, 1 punta
    let nx = x, nz = z;
    if (Math.hypot(x, z) > 1e-4) {
      let theta = Math.atan2(x, z);
      if (theta < 0) theta += Math.PI * 2;
      const k = Math.round(theta / paso) % lados;
      const f = frac > 0.4 ? jitMid[k] : jitBase[k];
      nx *= f; nz *= f;
    }
    nx += sesgoBase[0] + (sesgo[0] - sesgoBase[0]) * frac;
    nz += sesgoBase[1] + (sesgo[1] - sesgoBase[1]) * frac;
    pos.setXYZ(i, nx, y, nz);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ── Cordillera ─────────────────────────────────────────────────────
   Cumulos de 2-3 picos con radios escalonados: la niebla (230..470)
   tiñe cada plano distinto y eso es lo que separa las capas. Las
   cumbres se dejan lejos del corredor de la avenida. */
function construirCordillera(g, alturaTerreno, rnd, matNoche) {
  const tintes = [matNoche(0x6E7B94, 0.72), matNoche(0x65728B, 0.72), matNoche(0x7A879F, 0.72)];
  const nieve = matNoche(0xF2F4F8, 0.5);

  /* [angulo, radio base, cantidad de picos]; el de -140 es donde nace el rio */
  const cumulos = [
    [-140, 262, 3], [-96, 288, 2], [-46, 236, 2], [34, 274, 3],
    [88, 232, 2], [146, 300, 3], [-178, 244, 2]
  ];
  let picos = 0, nevados = 0;

  for (const [angulo, radio, cantidad] of cumulos) {
    for (let i = 0; i < cantidad; i++) {
      const a = angulo + (rnd() - 0.5) * 16;
      /* cada pico del cumulo a otra profundidad, para que se solapen en
         diagonal y no uno delante del otro */
      const r = radio + (i - (cantidad - 1) / 2) * 24 + (rnd() - 0.5) * 14;
      const [x, z] = polar(a, r);
      /* el primero del cumulo es el alto; los otros lo escoltan */
      const h = (i === 0 ? 62 + rnd() * 26 : 34 + rnd() * 30) * (0.82 + 0.18 * r / 280);
      const rb = h * (0.55 + rnd() * 0.25);
      if (enCorredor(x, z, 12 + rb)) continue;
      const lados = 5 + Math.floor(rnd() * 3);
      const jitMid = [], jitBase = [];
      for (let k = 0; k < lados; k++) {
        jitMid.push(0.84 + rnd() * 0.32);
        jitBase.push(0.78 + rnd() * 0.44);
      }
      const sesgo = [(rnd() - 0.5) * 0.36 * rb, (rnd() - 0.5) * 0.36 * rb];
      /* la base va 8 unidades bajo el terreno: las colinas suben ±3.6 */
      const yBase = alturaTerreno(x, z) - 8;

      const pico = new THREE.Mesh(
        conoIrregular({ r: rb, h, lados, jitMid, jitBase, sesgo }), tintes[picos % tintes.length]);
      pico.position.set(x, yBase + h / 2, z);
      g.add(pico);
      picos++;

      if (h >= 64) {
        /* casquete apenas mas ancho que el pico a esa altura, asi no lo
           atraviesa aunque los anillos esten corridos */
        const hc = h * 0.24, rc = rb * 0.24 * 1.15;
        const casquete = new THREE.Mesh(
          conoIrregular({ r: rc, h: hc, lados, jitMid, jitBase: jitMid, sesgo,
                          sesgoBase: [sesgo[0] * 0.7, sesgo[1] * 0.7], segmentos: 1 }), nieve);
        casquete.position.set(x, yBase + h - hc / 2 + 0.4, z);
        g.add(casquete);
        nevados++;
      }
    }
  }
  return { picos, nevados };
}

/* ── Bosque lejano ──────────────────────────────────────────────────
   Dos InstancedMesh (troncos y copas). Sesgo hacia afuera y manchas de
   densidad: un bosque no es una lluvia uniforme de arboles, tiene
   claros y masas. El verde va en instanceColor; el material queda
   blanco para que la noche lo pueda multiplicar. */
function construirBosque(escena, { alturaTerreno, radioFoso, rnd, matNoche, distRio }) {
  const N = 900;
  const geoCopa = new THREE.ConeGeometry(2.1, 4.4, 6);
  geoCopa.translate(0, 2.2 + 1.0, 0);
  const geoTronco = new THREE.CylinderGeometry(0.22, 0.34, 1.4, 5, 1, true);
  geoTronco.translate(0, 0.7, 0);

  const copas = new THREE.InstancedMesh(geoCopa, matNoche(0xFFFFFF, 0.74), N);
  const troncos = new THREE.InstancedMesh(geoTronco, matNoche(C.tronco, 0.72), N);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), e = new THREE.Vector3();
  const color = new THREE.Color();
  const oscuro = new THREE.Color(C.hojaOscura), claro = new THREE.Color(C.hojaClara);
  const rMin = radioFoso + 22, rMax = 160;

  let i = 0, intentos = 0;
  while (i < N && intentos++ < N * 14) {
    const a = rnd() * Math.PI * 2;
    const r = rMin + (rMax - rMin) * Math.pow(rnd(), 0.45);       // mas denso lejos
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (enCorredor(x, z, 14)) continue;
    if (distRio(x, z) < 7) continue;
    const mancha = 0.5 + 0.5 * Math.sin(a * 2.7 + 0.8) * Math.cos(r * 0.055 + 1.3);
    if (rnd() > 0.3 + 0.7 * mancha) continue;

    const s = 0.8 + rnd() * 0.7;
    q.setFromAxisAngle(eje, rnd() * Math.PI * 2);
    e.set(s, s * (0.9 + rnd() * 0.25), s);
    p.set(x, alturaTerreno(x, z) - 0.15, z);
    m.compose(p, q, e);
    copas.setMatrixAt(i, m);
    troncos.setMatrixAt(i, m);
    color.copy(oscuro).lerp(claro, rnd()).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.06);
    copas.setColorAt(i, color);
    i++;
  }
  copas.count = troncos.count = i;
  copas.instanceMatrix.needsUpdate = true;
  troncos.instanceMatrix.needsUpdate = true;
  if (copas.instanceColor) copas.instanceColor.needsUpdate = true;
  /* fuera del frustum de sombras del sol (±84) y demasiado lejos para
     que se note: sombra proyectada apagada */
  copas.castShadow = troncos.castShadow = false;
  copas.receiveShadow = troncos.receiveShadow = true;
  escena.add(copas, troncos);
  return i;
}

/* ── Arbustos, hiedra y canteros ────────────────────────────────────
   Matas en grupitos apoyadas contra la cara exterior de la muralla y
   de los muros de contencion, esquivando escaleras, porton, torres y
   las casas que estan pegadas a esos muros. */
function construirArbustos(g, { alturaTerreno, radioMuralla, rnd, matNoche }) {
  const hoja = matNoche(C.hoja, 0.7), hojaClara = matNoche(C.hojaClara, 0.7);
  const hiedra = matNoche(C.hojaOscura, 0.7);
  const flores = [0xE04E5E, 0xF2C94C, 0xF0F0F0, 0xB86BD4].map(c => matNoche(c, 0.6));

  /* r = donde se apoya la mata, cara = radio de la cara de piedra, y =
     piso al pie del muro, alto = cuanto sube el muro desde ese piso */
  const muros = [
    { r: radioMuralla + 1.7, cara: radioMuralla + 0.7, y: 0, alto: 2.8, grupos: 6, parches: 5,
      evitar: [[[0], 20], [TORRES_MURALLA, 4]] },
    { r: R_MEDIA + 0.9, cara: R_MEDIA, y: H_BAJA, alto: 1.8, grupos: 4, parches: 4,
      evitar: [[ESCALERAS, 12], [CASAS_TERRAZA_BAJA, 14]] },
    { r: R_BAJA + 0.9, cara: R_BAJA, y: 0, alto: 1.8, grupos: 5, parches: 4,
      evitar: [[ESCALERAS, 12], [CASAS_SUELO, 13]] }
  ];
  const libre = (muro, x, z) => !muro.evitar.some(([lista, margen]) => cercaDeAngulo(x, z, lista, margen));
  const anguloLibre = (muro, radio) => {
    for (let t = 0; t < 40; t++) {
      const a = rnd() * 360;
      const [x, z] = polar(a, radio);
      if (libre(muro, x, z)) return a;
    }
    return null;
  };

  let matas = 0, parches = 0, canteros = 0;

  for (const muro of muros) {
    for (let gI = 0; gI < muro.grupos; gI++) {
      const centro = anguloLibre(muro, muro.r);
      if (centro === null) continue;
      const cantidad = 2 + Math.floor(rnd() * 3);
      let paso = 0;
      for (let k = 0; k < cantidad; k++) {
        const rr = 0.6 + rnd() * 0.7;
        paso += k === 0 ? 0 : (1.3 + rnd() * 0.9);
        const a = centro + (paso - (cantidad - 1) * 0.9) / muro.r / GRADO;
        const radio = muro.r + rnd() * 0.5 + rr * 0.3;
        const [x, z] = polar(a, radio);
        if (!libre(muro, x, z)) continue;
        const y = muro.y === 0 && radio > 54 ? alturaTerreno(x, z) : muro.y;
        const mata = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 0), rnd() > 0.6 ? hojaClara : hoja);
        mata.scale.set(1 + rnd() * 0.3, 0.62 + rnd() * 0.15, 1);
        mata.rotation.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        mata.position.set(x, y + rr * 0.4, z);
        g.add(mata);
        matas++;

        /* cantero al pie: manchas de conitos, un color dominante y algun
           intruso, siempre hacia afuera del muro */
        if (rnd() > 0.55) {
          const principal = flores[Math.floor(rnd() * flores.length)];
          const n = 5 + Math.floor(rnd() * 5);
          for (let f = 0; f < n; f++) {
            const desvio = (rnd() - 0.5) * 140;
            const d = rr + 0.3 + rnd() * 0.7;
            const [fx, fz] = polar(a + desvio, 1);
            const px = x + fx * d, pz = z + fz * d;
            const flor = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 4),
              rnd() > 0.8 ? flores[Math.floor(rnd() * flores.length)] : principal);
            flor.position.set(px, y + 0.13, pz);
            flor.rotation.y = rnd() * Math.PI;
            g.add(flor);
          }
          canteros++;
        }
      }
    }

    /* hiedra: varios rectangulos finos superpuestos, pegados a la cara
       de piedra y mirando hacia afuera, con bordes desparejos */
    for (let pI = 0; pI < muro.parches; pI++) {
      const a = anguloLibre(muro, muro.cara + 0.07);
      if (a === null) continue;
      const [tx, tz] = polar(a + 90, 1);                       // tangente al muro
      const alto = Math.min(muro.alto - 0.1, 1 + rnd() * 1.5);
      const rects = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < rects; k++) {
        const w = k === 0 ? 0.9 + rnd() * 0.6 : 0.35 + rnd() * 0.6;
        const h = k === 0 ? alto : alto * (0.35 + rnd() * 0.6);
        const corr = k === 0 ? 0 : (rnd() - 0.5) * 1.6;
        const [cx, cz] = polar(a, muro.cara + 0.07 + k * 0.012);
        const caja = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), hiedra);
        caja.position.set(cx + tx * corr, muro.y + h / 2 + (k === 0 ? 0 : rnd() * (alto - h)), cz + tz * corr);
        caja.rotation.y = a * GRADO;
        g.add(caja);
      }
      parches++;
    }
  }
  return { matas, parches, canteros };
}

/* ── Rocas grandes ──────────────────────────────────────────────────── */
function construirRocas(g, { alturaTerreno, rnd, matNoche, distRio }) {
  const tintes = [matNoche(0x8A8C88, 0.72), matNoche(0x74787A, 0.72)];
  let rocas = 0;
  for (let k = 0; k < 26; k++) {
    let x = 0, z = 0, ok = false;
    for (let t = 0; t < 24 && !ok; t++) {
      const a = rnd() * Math.PI * 2, r = 70 + rnd() * 130;
      x = Math.sin(a) * r; z = Math.cos(a) * r;
      ok = !enCorredor(x, z, 14) && distRio(x, z) > 6.5;
    }
    if (!ok) continue;
    const tam = 1.5 + rnd() * 2.5;
    const roca = new THREE.Mesh(new THREE.IcosahedronGeometry(tam, 0), tintes[k % 2]);
    roca.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    roca.scale.set(1 + rnd() * 0.4, 0.72 + rnd() * 0.35, 1);
    roca.position.set(x, alturaTerreno(x, z) + tam * 0.32, z);      // un tercio enterrada
    g.add(roca);
    rocas++;
  }
  return rocas;
}

/* ── Rio ─────────────────────────────────────────────────────────────
   Polilinea de la cordillera (atras-izquierda, -140°) al borde exterior
   del foso. Los puntos de control van en polares y un Catmull-Rom los
   suaviza; los meandros son los cambios de angulo. */
/* El trazado es de escenario.js (el terreno le cava el cauce). Aca solo
   se le da a cada punto la altura del agua: el fondo del cauce en el
   centro, mas una lamina. */
function trazarRio(alturaTerreno) {
  return RIO.map(([x, z]) => [x, z, alturaTerreno(x, z) + LAMINA_RIO]);
}

function distanciaAPolilinea(puntos) {
  return (x, z) => {
    let mejor = Infinity;
    for (let i = 0; i < puntos.length - 1; i++) {
      const [ax, az] = puntos[i], [bx, bz] = puntos[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < mejor) mejor = d;
    }
    return mejor;
  };
}

/* La cinta sale de agua.js plana; aca cada vertice se apoya en el
   terreno, un poco hundido, para que suba y baje con las colinas. Se
   trabaja en coordenadas de mundo por si el mesh viene desplazado. */
function hundirRio(raiz, rio) {
  raiz.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    /* agua.js crea dos vertices por punto, en orden: los dos toman la
       altura del centro de su punto, asi la lamina es plana de orilla a
       orilla y no una U que sigue las laderas del cauce */
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, rio[Math.min(rio.length - 1, i >> 1)][2]);
    }
    pos.needsUpdate = true;
    o.geometry.computeBoundingSphere();
    o.geometry.computeBoundingBox();
  });
}

export function construirHorizonte(escena, { alturaTerreno, radioMuralla = 52, radioFoso = 64.5 } = {}) {
  /* Todos los materiales del horizonte pasan por aca: guardan su color
     de dia y uno de noche (mas oscuro y corrido al azul de la niebla
     nocturna) y setNoche interpola entre los dos. */
  const materiales = [];
  const NOCHE = new THREE.Color(0x1C2440);
  const matNoche = (hex, cuanto, extra) => {
    const m = mat(hex, extra);
    materiales.push({ m, dia: new THREE.Color(hex), noche: new THREE.Color(hex).lerp(NOCHE, cuanto) });
    return m;
  };

  const rio = trazarRio(alturaTerreno);
  const distRio = distanciaRio;

  const cordillera = new THREE.Group();
  const stCord = construirCordillera(cordillera, alturaTerreno, azar(7331), matNoche);
  fusionar(cordillera);
  cordillera.traverse(o => { if (o.isMesh) o.castShadow = false; });
  escena.add(cordillera);

  const arboles = construirBosque(escena, { alturaTerreno, radioFoso, rnd: azar(5150), matNoche, distRio });

  const verde = new THREE.Group();
  const stVerde = construirArbustos(verde, { alturaTerreno, radioMuralla, rnd: azar(8801), matNoche });
  escena.add(fusionar(verde));

  const piedras = new THREE.Group();
  const nRocas = construirRocas(piedras, { alturaTerreno, rnd: azar(6174), matNoche, distRio });
  escena.add(fusionar(piedras));

  /* el rio es lo unico animado; si agua.js todavia no lo sabe hacer,
     el horizonte sigue en pie sin el */
  let aguaRio = null;
  try {
    if (typeof agua.crearRio === 'function') {
      const h = agua.crearRio(rio, RIO_ANCHO, 0);
      if (h && h.mesh) {
        hundirRio(h.mesh, rio);
        escena.add(h.mesh);
        aguaRio = h;
      }
    }
  } catch (e) {
    console.warn('horizonte: el rio no se pudo crear', e);
    aguaRio = null;
  }

  /* conteos para el reporte de presupuesto, no los usa nadie mas */
  escena.userData.horizonte = { ...stCord, arboles, ...stVerde, rocas: nRocas, rio: !!aguaRio };

  return {
    actualizar(t) {
      if (aguaRio && aguaRio.actualizar) aguaRio.actualizar(t);
    },
    setNoche(t) {
      for (const { m, dia, noche } of materiales) m.color.copy(dia).lerp(noche, t);
      if (aguaRio && aguaRio.setNoche) aguaRio.setNoche(t);
    }
  };
}
