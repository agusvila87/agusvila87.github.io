/* ═══════════════════════════════════════════════════════════════════
   UTILERIA
   Barriles, cajones, carros, puestos de feria, banderines, pozo,
   cercas, faroles, rocas y nubes.

   Esto es lo que separa un blockout de una aldea: sin objetos chicos
   y desordenados, cualquier escena 3D se lee como render generico.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';
import { C, mat, caja, cilindro, cono, ubicar } from './paleta.js';

/* Materiales compartidos: la utileria no se resalta, no necesita clones. */
const M = {
  madera:    mat(C.maderaOscura),
  maderaClara: mat(C.maderaClara),
  hierro:    mat(C.hierro),
  piedra:    mat(C.piedra),
  piedraOsc: mat(C.piedraOscura),
  teja:      mat(C.techos[0]),
  paja:      mat(C.heno),
  nube:      mat(C.nube),
  luz:       mat(C.vidrio),
  manzana:   mat(0xC0392B)
};
const TELAS = C.tela.map(c => mat(c, { side: THREE.DoubleSide }));

function tramo(a, b, radio, material, caras = 5) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const largo = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, caras), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

export function barril() {
  const g = new THREE.Group();
  g.add(ubicar(cilindro(0.34, 0.34, 0.92, M.madera, 8), 0, 0.46, 0));
  g.add(ubicar(cilindro(0.38, 0.38, 0.14, M.hierro, 8), 0, 0.24, 0));
  g.add(ubicar(cilindro(0.38, 0.38, 0.14, M.hierro, 8), 0, 0.68, 0));
  return g;
}

export function cajon(conManzanas = false) {
  const g = new THREE.Group();
  g.add(ubicar(caja(0.9, 0.62, 0.7, M.madera), 0, 0.31, 0));
  g.add(ubicar(caja(0.96, 0.12, 0.76, M.maderaClara), 0, 0.58, 0));
  if (conManzanas) {
    for (let i = 0; i < 5; i++) {
      const a = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), M.manzana);
      a.position.set((i % 3 - 1) * 0.24, 0.68, (Math.floor(i / 3) - 0.5) * 0.26);
      g.add(a);
    }
  }
  return g;
}

export function carro() {
  const g = new THREE.Group();
  g.add(ubicar(caja(2.0, 0.5, 1.1, M.madera), 0, 0.72, 0));
  for (const sz of [-1, 1]) g.add(ubicar(caja(2.0, 0.42, 0.1, M.maderaClara), 0, 1.05, sz * 0.55));
  for (const sz of [-1, 1]) {
    const rueda = cilindro(0.52, 0.52, 0.14, M.maderaClara, 10);
    rueda.rotation.x = Math.PI / 2;
    g.add(ubicar(rueda, -0.5, 0.52, sz * 0.62));
  }
  for (const sz of [-1, 1]) {
    const vara = caja(1.5, 0.12, 0.12, M.madera);
    vara.rotation.z = 0.18;
    g.add(ubicar(vara, 1.7, 0.85, sz * 0.42));
  }
  g.add(ubicar(caja(0.5, 0.5, 0.9, M.piedraOsc), 0.3, 1.2, 0));
  return g;
}

/* Puesto de feria con toldo a rayas. */
export function puesto(semilla = 0) {
  const g = new THREE.Group();
  const telaA = TELAS[semilla % TELAS.length];
  const telaB = TELAS[(semilla + 2) % TELAS.length];

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(ubicar(caja(0.16, 2.3, 0.16, M.madera), sx * 1.35, 1.15, sz * 0.72));
  }
  g.add(ubicar(caja(3.0, 0.16, 1.7, M.maderaClara), 0, 1.05, 0));
  g.add(ubicar(caja(3.0, 0.5, 0.12, M.madera), 0, 0.75, 0.8));

  /* toldo: franjas alternadas inclinadas hacia adelante */
  for (let i = 0; i < 6; i++) {
    const franja = caja(0.52, 0.08, 2.0, i % 2 ? telaA : telaB);
    franja.position.set(-1.3 + i * 0.52, 2.42, 0.1);
    franja.rotation.x = -0.26;
    g.add(franja);
  }
  g.add(ubicar(cajon(true), -0.8, 1.13, 0));
  g.add(ubicar(barril(), 1.75, 0, 0.4));
  return g;
}

/* ── Banderines ─────────────────────────────────────────────────────
   El detalle mas reconocible de la referencia: la guirnalda cruzando
   la calle entre dos edificios, con la cuerda colgando. */
export function banderines(desde, hasta, { hundimiento = 2.2, cada = 1.05 } = {}) {
  const g = new THREE.Group();
  const a = new THREE.Vector3(...desde), b = new THREE.Vector3(...hasta);
  const largo = a.distanceTo(b);
  const n = Math.max(6, Math.round(largo / cada));
  const cuerdaMat = M.maderaClara;

  const punto = t => {
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= hundimiento * Math.sin(Math.PI * t);
    return p;
  };

  let prev = punto(0);
  for (let i = 1; i <= n; i++) {
    const p = punto(i / n);
    g.add(tramo(prev, p, 0.045, cuerdaMat, 4));

    const medio = new THREE.Vector3().addVectors(prev, p).multiplyScalar(0.5);
    const forma = new THREE.Shape();
    forma.moveTo(-0.28, 0); forma.lineTo(0.28, 0); forma.lineTo(0, -0.62); forma.closePath();
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(forma), TELAS[i % TELAS.length]);
    flag.position.copy(medio);
    flag.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    g.add(flag);
    prev = p;
  }
  return g;
}

export function pozo() {
  const g = new THREE.Group();
  g.add(ubicar(cilindro(1.25, 1.35, 1.1, M.piedra, 12), 0, 0.55, 0));
  g.add(ubicar(cilindro(1.32, 1.32, 0.18, M.piedraOsc, 12), 0, 1.15, 0));
  g.add(ubicar(cilindro(1.0, 1.0, 0.06, mat(0x3E6B7A), 12), 0, 1.02, 0));
  for (const sx of [-1, 1]) g.add(ubicar(caja(0.2, 2.2, 0.2, M.madera), sx * 1.0, 2.1, 0));
  g.add(ubicar(cilindro(0.16, 0.16, 2.2, M.maderaClara, 6), 0, 3.0, 0).rotateZ(Math.PI / 2));
  const techo = cono(1.9, 1.1, M.teja, 4);
  techo.rotation.y = Math.PI / 4;
  g.add(ubicar(techo, 0, 3.75, 0));
  g.add(ubicar(barril(), 0.1, 1.5, 0));
  return g;
}

export function cerca(desde, hasta) {
  const g = new THREE.Group();
  const a = new THREE.Vector3(...desde), b = new THREE.Vector3(...hasta);
  const n = Math.max(2, Math.round(a.distanceTo(b) / 1.6));
  for (let i = 0; i <= n; i++) {
    const p = new THREE.Vector3().lerpVectors(a, b, i / n);
    g.add(ubicar(caja(0.16, 1.3, 0.16, M.madera), p.x, 0.65, p.z));
  }
  for (const y of [0.5, 1.0]) {
    const pa = a.clone().setY(y), pb = b.clone().setY(y);
    g.add(tramo(pa, pb, 0.07, M.maderaClara, 4));
  }
  return g;
}

export function farol() {
  const g = new THREE.Group();
  g.add(ubicar(caja(0.18, 3.0, 0.18, M.hierro), 0, 1.5, 0));
  g.add(ubicar(caja(0.5, 0.55, 0.5, M.luz), 0, 3.1, 0));
  g.add(ubicar(cono(0.42, 0.35, M.hierro, 4), 0, 3.5, 0));
  return g;
}

export function roca(escala = 1) {
  const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * escala, 0), M.piedraOsc);
  r.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  r.position.y = 0.28 * escala;
  return r;
}

export function pilaDeHeno() {
  const g = new THREE.Group();
  const h = cilindro(0.75, 0.75, 1.1, M.paja, 8);
  h.rotation.z = Math.PI / 2;
  g.add(ubicar(h, 0, 0.75, 0));
  return g;
}

export function nube(rnd) {
  const g = new THREE.Group();
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const r = 3.2 + rnd() * 3.4;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M.nube);
    b.position.set((rnd() - 0.5) * 14, (rnd() - 0.5) * 2.6, (rnd() - 0.5) * 9);
    b.scale.y = 0.62;
    g.add(b);
  }
  return g;
}
