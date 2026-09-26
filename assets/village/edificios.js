/* ═══════════════════════════════════════════════════════════════════
   EDIFICIOS
   torreon → el perfil. Realeza: piedra clara, techo purpura y filetes
             de oro en cumbrera, aleros, almenas, marcos y banderas.
   castillo→ los dos titulos profesionales. Comparten tono: piedra
             tibia, teja borgoña y filetes de bronce.
   casa    → los ocho proyectos de carrera. Teja de terracota y madera,
             sin metal, con una variacion chica para que no sean clones.

   El rango se lee por material antes que por tamaño.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { materialTexturado } from './texturas.js';
import { C, CLASES, mat, caja, cilindro, cono, ubicar, techoDosAguas,
         entramado, ventana, puerta, azar, variar, fusionar, MAT_VIDRIO, MAT_FAROL,
         postigos, jardinera, arcoPuerta, cartelColgante, estandarte } from './paleta.js';

/* Materiales de detalle compartidos por todos los edificios: no se
   resaltan, no hace falta clonarlos. */
const M_HOJA = mat(C.hoja);
const M_FLORES = [0xE04E5E, 0xF2C94C, 0xF0F0F0, 0xB86BD4].map(c => mat(c));
const M_HIERRO = mat(C.hierro);
const M_TABLA = mat(0xD9C6A0);

/* Farol de pared junto a la puerta: de noche es lo que enciende la
   fachada, con el mismo material que los faroles de la calle. */
function farolDePared(g, x, y, z, rotY, matHierro) {
  g.add(ubicar(caja(0.5, 0.08, 0.08, matHierro), x, y + 0.3, z, rotY));
  const luz = caja(0.3, 0.38, 0.3, MAT_FAROL);
  luz.position.set(x, y, z);
  g.add(luz);
  g.add(ubicar(new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 4), matHierro), x, y + 0.3, z, rotY + Math.PI / 4));
}

/* Junta los materiales del edificio para poder resaltarlo despues.
   El vidrio queda afuera: no tiene que cambiar de color al seleccionar. */
function taller() {
  const materiales = [];
  return {
    materiales,
    /* m(color, textura, extra): la textura es de luminancia y se multiplica
       con el color, asi que la clase sigue mandando el tono. */
    m: (color, textura, extra) => {
      const x = textura ? materialTexturado(color, textura, extra) : mat(color, extra);
      materiales.push(x);
      return x;
    },
    suelto: (color, extra) => mat(color, extra)
  };
}

function humo(g, x, y, z, matHumo) {
  const nube = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const r = 0.34 + i * 0.13;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), matHumo);
    b.position.set(Math.sin(i * 1.9) * 0.3, i * 0.85, Math.cos(i * 1.7) * 0.25);
    b.userData.faseHumo = i * 0.8;
    nube.add(b);
  }
  nube.position.set(x, y, z);
  nube.userData.esHumo = true;
  g.add(nube);
  return nube;
}

function musgoEnTecho(g, ancho, largo, alto, y, matMusgo, rnd) {
  const a = Math.atan2(alto, ancho / 2);
  for (let i = 0; i < 2; i++) {
    const lado = rnd() > 0.5 ? 1 : -1;
    const parche = caja(0.5 + rnd() * 1.1, 0.1, 0.6 + rnd() * 1.3, matMusgo);
    const t = 0.25 + rnd() * 0.5;
    parche.position.set(lado * (ancho / 2) * t, y + alto * (1 - t) + 0.18, (rnd() - 0.5) * largo * 0.7);
    parche.rotation.z = -lado * a;
    g.add(parche);
  }
}

/* Bandera: plano con segmentos, anclada al asta por su borde izquierdo y
   marcada como animada para que fusionar() la deje suelta y vida.js la
   pueda ondular vertice por vertice. */
function bandera(material, ancho, alto, x, y, z) {
  const geo = new THREE.PlaneGeometry(ancho, alto, 8, 3);
  geo.translate(ancho / 2, 0, 0);
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.userData.animado = true;
  m.userData.esBandera = true;
  m.userData.ancho = ancho;
  m.castShadow = true;
  return m;
}

/* Anillo de almenas alrededor de una torre, con coronamiento del metal
   de la clase si lo tiene. */
function almenas(g, x, y, z, radio, n, matPiedra, matFilete) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.add(ubicar(caja(radio * 0.55, 1.0, 0.6, matPiedra),
      x + Math.sin(a) * radio, y + 0.5, z + Math.cos(a) * radio, a));
  }
  if (matFilete) {
    const aro = cilindro(radio + 0.22, radio + 0.22, 0.3, matFilete, Math.max(10, n));
    g.add(ubicar(aro, x, y - 0.1, z));
  }
}

/* ── Casa de aldea ─────────────────────────────────────────────────── */
export function construirCasa(semilla) {
  const rnd = azar(semilla);
  const K = CLASES.house;
  const t = taller();
  const g = new THREE.Group();

  const piedra = t.m(K.piedra, 'piedra');
  const yeso   = t.m(K.muro, 'revoque');
  const yesoAlto = t.m(K.muroAlto, 'revoque');
  const madera = t.m(K.madera, 'madera');
  const marco  = t.m(K.marco, 'madera');
  const teja   = t.m(variar(K.teja, (rnd() - 0.5) * 0.16), 'teja');   // misma clase, no clones
  const musgo  = t.m(C.musgo);
  const vidrio = MAT_VIDRIO;
  const matHumo = t.suelto(C.humo, { transparent: true, opacity: 0.72 });

  g.add(ubicar(caja(5.5, 0.7, 5.5, piedra), 0, 0.35, 0));

  /* planta baja */
  const baja = 3.1, yBaja = 0.7 + baja / 2;
  g.add(ubicar(caja(4.7, baja, 4.7, yeso), 0, yBaja, 0));
  g.add(ubicar(entramado(4.7, baja, 4.7, madera, { cruces: false }), 0, yBaja, 0));
  g.add(ubicar(puerta(marco), 0, 0.7 + 0.95, 2.42));
  g.add(ubicar(ventana(marco, vidrio), 0, yBaja + 0.35, -2.42, Math.PI));
  g.add(ubicar(ventana(marco, vidrio), 2.42, yBaja + 0.35, 0, Math.PI / 2));

  /* planta alta: vuela sobre la de abajo, con mensulas que la sostienen */
  const alta = 2.9, yAlta = 0.7 + baja + alta / 2;
  g.add(ubicar(caja(5.5, alta, 5.5, yesoAlto), 0, yAlta, 0));
  g.add(ubicar(entramado(5.5, alta, 5.5, madera), 0, yAlta, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const mensula = caja(0.28, 0.8, 0.7, madera);
    mensula.position.set(sx * 2.4, 0.7 + baja - 0.25, sz * 2.15);
    mensula.rotation.x = sz * 0.5;
    g.add(mensula);
  }
  for (const sx of [-1, 1]) {
    g.add(ubicar(ventana(marco, vidrio), sx * 1.3, yAlta + 0.2, 2.82));
    g.add(ubicar(postigos(madera), sx * 1.3, yAlta + 0.2, 2.86));
    if (rnd() > 0.3) g.add(ubicar(jardinera(madera, M_HOJA, M_FLORES), sx * 1.3, yAlta - 0.45, 2.82));
  }
  g.add(ubicar(ventana(marco, vidrio), -2.82, yAlta + 0.2, 0, -Math.PI / 2));
  g.add(ubicar(postigos(madera), -2.86, yAlta + 0.2, 0, -Math.PI / 2));

  /* farol junto a la puerta, y en algunas un cartel colgando */
  farolDePared(g, 1.1, 0.7 + 2.25, 2.5, 0, M_HIERRO);
  if (rnd() > 0.45) g.add(ubicar(cartelColgante(madera, M_TABLA, M_HIERRO), -2.35, 0.7 + baja - 0.15, 2.5));

  /* techo */
  const yTecho = 0.7 + baja + alta;
  const altoTecho = 3.0 + rnd() * 0.7;
  const techo = techoDosAguas({
    ancho: 6.2, largo: 6.2, alto: altoTecho,
    matTecho: teja, matFronton: yesoAlto
  });
  techo.position.y = yTecho;
  if (rnd() > 0.5) techo.rotation.y = Math.PI / 2;
  g.add(techo);
  if (rnd() > 0.35) musgoEnTecho(g, 6.2, 6.2, altoTecho, yTecho, musgo, rnd);

  /* chimenea + humo */
  const cx = (rnd() > 0.5 ? 1 : -1) * 1.7, cz = (rnd() > 0.5 ? 1 : -1) * 1.5;
  const altoChim = 3.4 + rnd() * 0.9;
  g.add(ubicar(caja(0.8, altoChim, 0.8, piedra), cx, yTecho + altoChim / 2 - 0.6, cz));
  g.add(ubicar(caja(1.0, 0.28, 1.0, piedra), cx, yTecho + altoChim - 0.6, cz));
  humo(g, cx, yTecho + altoChim - 0.2, cz, matHumo);

  g.userData.materiales = t.materiales;
  g.userData.altoCartel = yTecho + altoTecho + 2.4;
  return g;
}

/* ── Castillo: los dos titulos profesionales ───────────────────────── */
export function construirCastillo(semilla) {
  const rnd = azar(semilla);
  const K = CLASES.castle;
  const t = taller();
  const g = new THREE.Group();

  const piedra = t.m(K.piedra, 'piedra');
  const piedraOsc = t.m(K.muroAlto, 'piedraOscura');
  const yeso   = t.m(K.muro, 'revoque');
  const madera = t.m(K.madera, 'madera');
  const marco  = t.m(K.marco, 'madera');
  const teja   = t.m(K.teja, 'teja');
  const bronce = t.m(K.trim, null, { roughness: 0.55, metalness: 0.35 });
  const musgo  = t.m(C.musgo);
  const vidrio = MAT_VIDRIO;
  const matHumo = t.suelto(C.humo, { transparent: true, opacity: 0.72 });
  const banderaMat = t.suelto(K.bandera, { side: THREE.DoubleSide });

  g.add(ubicar(caja(8.6, 0.9, 8.6, piedraOsc), 0, 0.45, 0));

  /* cuerpo de piedra */
  const baja = 6.2, yBaja = 0.9 + baja / 2;
  g.add(ubicar(caja(6.8, baja, 6.8, piedra), 0, yBaja, 0));
  g.add(ubicar(puerta(marco, 1.8, 2.9), 0, 0.9 + 1.45, 3.46));
  g.add(ubicar(arcoPuerta(piedraOsc, 1.8, 0.5), 0, 0.9 + 2.9, 3.5));
  for (const sx of [-1, 1]) farolDePared(g, sx * 1.55, 0.9 + 2.3, 3.55, 0, M_HIERRO);
  for (const sx of [-1, 1]) {
    g.add(ubicar(ventana(marco, vidrio, 1.0, 1.3), sx * 1.9, yBaja + 0.9, 3.46));
    g.add(ubicar(postigos(madera, 1.0, 1.3), sx * 1.9, yBaja + 0.9, 3.5));
    g.add(ubicar(ventana(marco, vidrio, 1.0, 1.3), sx * 3.46, yBaja + 0.9, 0, sx * Math.PI / 2));
  }

  /* planta entramada que vuela */
  const alta = 3.3, yAlta = 0.9 + baja + alta / 2;
  g.add(ubicar(caja(7.7, alta, 7.7, yeso), 0, yAlta, 0));
  g.add(ubicar(entramado(7.7, alta, 7.7, madera), 0, yAlta, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const mensula = caja(0.32, 0.95, 0.8, madera);
    mensula.position.set(sx * 3.4, 0.9 + baja - 0.3, sz * 3.0);
    mensula.rotation.x = sz * 0.5;
    g.add(mensula);
  }
  for (const sx of [-1, 1]) {
    g.add(ubicar(ventana(marco, vidrio), sx * 1.9, yAlta + 0.25, 3.92));
    g.add(ubicar(jardinera(madera, M_HOJA, M_FLORES), sx * 1.9, yAlta - 0.4, 3.92));
  }
  /* estandarte de la clase colgando de la planta alta */
  g.add(ubicar(estandarte(banderaMat, 1.0, 2.6), 0, yAlta + alta / 2 - 0.2, 3.98));

  const yTecho = 0.9 + baja + alta;
  const altoTecho = 4.0;
  const techo = techoDosAguas({
    ancho: 8.5, largo: 8.5, alto: altoTecho, alero: 0.9,
    matTecho: teja, matFronton: yeso, matFilete: bronce
  });
  techo.position.y = yTecho;
  g.add(techo);
  musgoEnTecho(g, 8.5, 8.5, altoTecho, yTecho, musgo, rnd);

  /* torre lateral con techo conico y bandera */
  const tx = 4.3, tz = -3.4, altoTorre = 15.5;
  g.add(ubicar(cilindro(2.0, 2.2, altoTorre, piedra, 10), tx, altoTorre / 2, tz));
  g.add(ubicar(cilindro(2.12, 2.12, 0.28, bronce, 10), tx, altoTorre * 0.62, tz));
  almenas(g, tx, altoTorre, tz, 2.0, 10, piedraOsc, bronce);
  g.add(ubicar(ventana(marco, vidrio, 0.8, 1.1), tx, altoTorre - 3.4, tz + 2.05));
  g.add(ubicar(cono(2.9, 4.4, teja, 10), tx, altoTorre + 3.1, tz));
  g.add(ubicar(caja(0.16, 2.6, 0.16, bronce), tx, altoTorre + 6.4, tz));
  g.add(bandera(banderaMat, 1.9, 1.15, tx, altoTorre + 7.2, tz));

  /* chimenea */
  g.add(ubicar(caja(0.95, 4.2, 0.95, piedra), -2.6, yTecho + 1.6, 2.2));
  humo(g, -2.6, yTecho + 3.9, 2.2, matHumo);

  g.userData.materiales = t.materiales;
  g.userData.altoCartel = altoTorre + 8.6;
  return g;
}

/* ── Torreon del perfil: realeza ───────────────────────────────────── */
export function construirTorreon() {
  const K = CLASES.keep;
  const t = taller();
  const g = new THREE.Group();

  const piedra = t.m(K.piedra, 'piedra');
  const piedraOsc = t.m(K.muroAlto, 'piedraOscura');
  const yeso   = t.m(K.muro, 'revoque');
  const madera = t.m(K.madera, 'madera');
  const marco  = t.m(K.trim, null, { roughness: 0.45, metalness: 0.5 });   // los marcos tambien van en oro
  const teja   = t.m(K.teja, 'teja');
  const oro    = t.m(K.trim, null, { roughness: 0.45, metalness: 0.5 });
  const oroOsc = t.m(K.trimOscuro, null, { roughness: 0.5, metalness: 0.45 });
  const musgo  = t.m(C.musgo);
  const vidrio = MAT_VIDRIO;
  const banderaMat = t.suelto(K.bandera, { side: THREE.DoubleSide });

  /* plataforma escalonada, con filo de oro */
  g.add(ubicar(caja(14.5, 0.5, 14.5, piedraOsc), 0, 0.25, 0));
  g.add(ubicar(caja(13.0, 0.5, 13.0, piedra), 0, 0.72, 0));
  g.add(ubicar(caja(13.2, 0.16, 13.2, oroOsc), 0, 0.99, 0));

  /* salon de piedra */
  const baja = 6.6, yBaja = 1.0 + baja / 2;
  g.add(ubicar(caja(9.4, baja, 9.4, piedra), 0, yBaja, 0));
  g.add(ubicar(puerta(marco, 2.2, 3.4), 0, 1.0 + 1.7, 4.76));
  g.add(ubicar(arcoPuerta(oro, 2.2, 0.55), 0, 1.0 + 3.4, 4.8));
  for (const sx of [-1, 1]) farolDePared(g, sx * 1.9, 1.0 + 2.6, 4.86, 0, oroOsc);
  /* pilastras en las esquinas del salon, con capitel de oro */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(ubicar(caja(0.8, baja, 0.8, piedraOsc), sx * 4.55, yBaja, sz * 4.55));
    g.add(ubicar(caja(1.0, 0.24, 1.0, oro), sx * 4.55, 1.0 + baja - 0.12, sz * 4.55));
  }
  for (const sx of [-1, 1]) {
    g.add(ubicar(ventana(marco, vidrio, 1.1, 1.5), sx * 2.7, yBaja + 1.1, 4.76));
    g.add(ubicar(ventana(marco, vidrio, 1.1, 1.5), sx * 4.76, yBaja + 1.1, 0, sx * Math.PI / 2));
  }
  /* cornisa dorada entre los dos cuerpos */
  g.add(ubicar(caja(9.7, 0.22, 9.7, oro), 0, 1.0 + baja - 0.1, 0));

  /* planta entramada */
  const alta = 3.6, yAlta = 1.0 + baja + alta / 2;
  g.add(ubicar(caja(10.4, alta, 10.4, yeso), 0, yAlta, 0));
  g.add(ubicar(entramado(10.4, alta, 10.4, madera), 0, yAlta, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const mensula = caja(0.34, 1.05, 0.9, madera);
    mensula.position.set(sx * 4.7, 1.0 + baja - 0.35, sz * 4.2);
    mensula.rotation.x = sz * 0.5;
    g.add(mensula);
  }
  for (const sx of [-1.5, 1.5]) g.add(ubicar(ventana(marco, vidrio), sx * 1.7, yAlta + 0.3, 5.32));
  for (const sx of [-1, 1]) g.add(ubicar(estandarte(banderaMat, 1.2, 3.4), sx * 4.3, yAlta + alta / 2 - 0.25, 5.38));

  const yTecho = 1.0 + baja + alta;
  const altoTecho = 4.6;
  const techo = techoDosAguas({
    ancho: 11.4, largo: 11.4, alto: altoTecho, alero: 1.0,
    matTecho: teja, matFronton: yeso, matFilete: oro
  });
  techo.position.y = yTecho;
  g.add(techo);
  musgoEnTecho(g, 11.4, 11.4, altoTecho, yTecho, musgo, azar(7));

  /* torre central: atraviesa el techo y define la silueta de la aldea */
  const altoTorre = 21.0;
  g.add(ubicar(cilindro(2.9, 3.3, altoTorre, piedra, 12), 0, altoTorre / 2, 0));
  for (const y of [altoTorre * 0.42, altoTorre * 0.68]) {   // anillos de oro
    g.add(ubicar(cilindro(3.06, 3.06, 0.3, oro, 12), 0, y, 0));
  }
  g.add(ubicar(cilindro(3.5, 3.5, 0.6, piedraOsc, 12), 0, altoTorre - 0.3, 0));
  almenas(g, 0, altoTorre, 0, 3.3, 12, piedraOsc, oro);
  for (let i = 0; i < 3; i++) {
    const a = (-0.5 + i * 0.5);
    g.add(ubicar(ventana(marco, vidrio, 0.85, 1.2),
      Math.sin(a) * 2.95, altoTorre - 4.5, Math.cos(a) * 2.95, a));
  }
  g.add(ubicar(cono(4.2, 6.0, teja, 12), 0, altoTorre + 3.9, 0));
  g.add(ubicar(cilindro(4.24, 4.24, 0.26, oro, 12), 0, altoTorre + 1.05, 0));
  g.add(ubicar(new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), oro),
    0, altoTorre + 7.1, 0));                                 // remate dorado
  g.add(ubicar(caja(0.18, 3.4, 0.18, oro), 0, altoTorre + 8.4, 0));
  g.add(bandera(banderaMat, 2.6, 1.5, 0, altoTorre + 9.3, 0));

  /* cuatro torretas de esquina */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 5.0, z = sz * 5.0, h = 13.0;
    g.add(ubicar(cilindro(1.5, 1.7, h, piedra, 8), x, h / 2, z));
    g.add(ubicar(cilindro(1.58, 1.58, 0.24, oro, 8), x, h * 0.66, z));
    g.add(ubicar(cono(2.2, 3.4, teja, 8), x, h + 1.7, z));
    g.add(ubicar(caja(0.12, 1.8, 0.12, oro), x, h + 4.2, z));
    g.add(bandera(banderaMat, 1.3, 0.8, x, h + 4.6, z));
  }

  g.userData.materiales = t.materiales;
  g.userData.altoCartel = altoTorre + 11.2;
  return g;
}

export function construirEdificio(nodo, semilla) {
  const g = nodo.kind === 'keep' ? construirTorreon()
          : nodo.kind === 'castle' ? construirCastillo(semilla)
          : construirCasa(semilla);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  /* el humo se anima pieza por pieza, no se puede fusionar */
  fusionar(g);
  return g;
}
