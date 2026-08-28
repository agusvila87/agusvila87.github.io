/* ═══════════════════════════════════════════════════════════════════
   EDIFICIOS
   casa    → los ocho proyectos de carrera
   castillo→ los dos titulos profesionales
   torreon → el perfil, en el centro de la plaza

   Cada uno recibe una semilla para que el color de techo, la chimenea
   y el musgo varien: ocho casas identicas se notan al instante.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';
import { C, mat, caja, cilindro, cono, ubicar, techoDosAguas, entramado,
         ventana, puerta, azar, fusionar } from './paleta.js';

/* Junta los materiales del edificio para poder resaltarlo despues.
   El vidrio queda afuera: no tiene que cambiar de color al seleccionar. */
function taller() {
  const materiales = [];
  return {
    materiales,
    m: (color, extra) => { const x = mat(color, extra); materiales.push(x); return x; },
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

/* ── Casa de aldea ─────────────────────────────────────────────────── */
export function construirCasa(semilla) {
  const rnd = azar(semilla);
  const t = taller();
  const g = new THREE.Group();

  const piedra = t.m(C.piedra);
  const yeso   = t.m(C.yeso);
  const yesoAlto = t.m(C.yesoSombra);
  const madera = t.m(C.madera);
  const marco  = t.m(C.marco);
  const teja   = t.m(C.techos[Math.floor(rnd() * C.techos.length)]);
  const musgo  = t.m(C.musgo);
  const vidrio = t.suelto(C.vidrio);
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
  for (const sx of [-1, 1]) g.add(ubicar(ventana(marco, vidrio), sx * 1.3, yAlta + 0.2, 2.82));
  g.add(ubicar(ventana(marco, vidrio), -2.82, yAlta + 0.2, 0, -Math.PI / 2));

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
  const t = taller();
  const g = new THREE.Group();

  const piedra = t.m(C.piedra);
  const piedraOsc = t.m(C.piedraOscura);
  const yeso   = t.m(C.yesoSombra);
  const madera = t.m(C.madera);
  const marco  = t.m(C.marco);
  const teja   = t.m(C.techos[semilla % 2 === 0 ? 0 : 2]);
  const musgo  = t.m(C.musgo);
  const vidrio = t.suelto(C.vidrio);
  const matHumo = t.suelto(C.humo, { transparent: true, opacity: 0.72 });
  const banderaMat = t.suelto(C.tela[semilla % C.tela.length], { side: THREE.DoubleSide });

  g.add(ubicar(caja(8.6, 0.9, 8.6, piedraOsc), 0, 0.45, 0));

  /* cuerpo de piedra */
  const baja = 6.2, yBaja = 0.9 + baja / 2;
  g.add(ubicar(caja(6.8, baja, 6.8, piedra), 0, yBaja, 0));
  g.add(ubicar(puerta(marco, 1.8, 2.9), 0, 0.9 + 1.45, 3.46));
  for (const sx of [-1, 1]) {
    g.add(ubicar(ventana(marco, vidrio, 1.0, 1.3), sx * 1.9, yBaja + 0.9, 3.46));
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
  for (const sx of [-1, 1]) g.add(ubicar(ventana(marco, vidrio), sx * 1.9, yAlta + 0.25, 3.92));

  const yTecho = 0.9 + baja + alta;
  const altoTecho = 4.0;
  const techo = techoDosAguas({
    ancho: 8.5, largo: 8.5, alto: altoTecho, alero: 0.9,
    matTecho: teja, matFronton: yeso
  });
  techo.position.y = yTecho;
  g.add(techo);
  musgoEnTecho(g, 8.5, 8.5, altoTecho, yTecho, musgo, rnd);

  /* torre lateral con techo conico y bandera */
  const tx = 4.3, tz = -3.4, altoTorre = 15.5;
  g.add(ubicar(cilindro(2.0, 2.2, altoTorre, piedra, 10), tx, altoTorre / 2, tz));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(ubicar(caja(0.75, 0.9, 0.55, piedraOsc),
      tx + Math.sin(a) * 2.0, altoTorre + 0.45, tz + Math.cos(a) * 2.0, a));
  }
  g.add(ubicar(ventana(marco, vidrio, 0.8, 1.1), tx, altoTorre - 3.4, tz + 2.05));
  const conoTorre = cono(2.9, 4.4, teja, 10);
  g.add(ubicar(conoTorre, tx, altoTorre + 3.1, tz));
  g.add(ubicar(caja(0.16, 2.6, 0.16, marco), tx, altoTorre + 6.4, tz));
  const bandera = caja(1.9, 1.15, 0.08, banderaMat);
  g.add(ubicar(bandera, tx + 0.95, altoTorre + 7.2, tz));

  /* chimenea */
  g.add(ubicar(caja(0.95, 4.2, 0.95, piedra), -2.6, yTecho + 1.6, 2.2));
  humo(g, -2.6, yTecho + 3.9, 2.2, matHumo);

  g.userData.materiales = t.materiales;
  g.userData.altoCartel = altoTorre + 8.6;
  return g;
}

/* ── Torreon del perfil: lo mas alto de la aldea, en el centro ─────── */
export function construirTorreon() {
  const t = taller();
  const g = new THREE.Group();

  const piedra = t.m(C.piedra);
  const piedraOsc = t.m(C.piedraOscura);
  const yeso   = t.m(C.yesoSombra);
  const madera = t.m(C.madera);
  const marco  = t.m(C.marco);
  const teja   = t.m(C.techos[1]);
  const musgo  = t.m(C.musgo);
  const vidrio = t.suelto(C.vidrio);
  const banderaMat = t.suelto(C.tela[1], { side: THREE.DoubleSide });
  const banderaMat2 = t.suelto(C.tela[0], { side: THREE.DoubleSide });

  /* plataforma escalonada */
  g.add(ubicar(caja(14.5, 0.5, 14.5, piedraOsc), 0, 0.25, 0));
  g.add(ubicar(caja(13.0, 0.5, 13.0, piedra), 0, 0.72, 0));

  /* salon de piedra */
  const baja = 6.6, yBaja = 1.0 + baja / 2;
  g.add(ubicar(caja(9.4, baja, 9.4, piedra), 0, yBaja, 0));
  g.add(ubicar(puerta(marco, 2.2, 3.4), 0, 1.0 + 1.7, 4.76));
  for (const sx of [-1, 1]) {
    g.add(ubicar(ventana(marco, vidrio, 1.1, 1.5), sx * 2.7, yBaja + 1.1, 4.76));
    g.add(ubicar(ventana(marco, vidrio, 1.1, 1.5), sx * 4.76, yBaja + 1.1, 0, sx * Math.PI / 2));
  }

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

  const yTecho = 1.0 + baja + alta;
  const altoTecho = 4.6;
  const techo = techoDosAguas({
    ancho: 11.4, largo: 11.4, alto: altoTecho, alero: 1.0,
    matTecho: teja, matFronton: yeso
  });
  techo.position.y = yTecho;
  g.add(techo);
  musgoEnTecho(g, 11.4, 11.4, altoTecho, yTecho, musgo, azar(7));

  /* torre central: atraviesa el techo y define la silueta de la aldea */
  const altoTorre = 21.0;
  g.add(ubicar(cilindro(2.9, 3.3, altoTorre, piedra, 12), 0, altoTorre / 2, 0));
  g.add(ubicar(cilindro(3.5, 3.5, 0.6, piedraOsc, 12), 0, altoTorre - 0.3, 0));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(ubicar(caja(0.9, 1.1, 0.6, piedraOsc),
      Math.sin(a) * 3.3, altoTorre + 0.55, Math.cos(a) * 3.3, a));
  }
  for (let i = 0; i < 3; i++) {
    const a = (-0.5 + i * 0.5);
    g.add(ubicar(ventana(marco, vidrio, 0.85, 1.2),
      Math.sin(a) * 2.95, altoTorre - 4.5, Math.cos(a) * 2.95, a));
  }
  g.add(ubicar(cono(4.2, 6.0, teja, 12), 0, altoTorre + 3.9, 0));
  g.add(ubicar(caja(0.18, 3.4, 0.18, marco), 0, altoTorre + 8.4, 0));
  g.add(ubicar(caja(2.6, 1.5, 0.08, banderaMat), 1.3, altoTorre + 9.3, 0));

  /* cuatro torretas de esquina */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 5.0, z = sz * 5.0, h = 13.0;
    g.add(ubicar(cilindro(1.5, 1.7, h, piedra, 8), x, h / 2, z));
    g.add(ubicar(cono(2.2, 3.4, teja, 8), x, h + 1.7, z));
    g.add(ubicar(caja(0.12, 1.8, 0.12, marco), x, h + 4.2, z));
    g.add(ubicar(caja(1.3, 0.8, 0.06, banderaMat2), x + 0.65, h + 4.6, z));
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
  fusionar(g, o => o.parent && o.parent.userData.esHumo);
  return g;
}
