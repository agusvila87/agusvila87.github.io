/* ═══════════════════════════════════════════════════════════════════
   ESCENARIO
   La aldea esta construida en terrazas concentricas: la jerarquia de
   los proyectos se lee por altura, no por carteles.

     terraza 0 (la mas alta)  → el torreon del perfil
     terraza 1                → Sealcoating y SolAR
     suelo                    → los ocho proyectos de carrera

   Escaleras de piedra conectan los tres niveles sobre el eje principal.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';
import { C, mat, caja, cilindro, cono, ubicar, azar, techoDosAguas, fusionar } from './paleta.js';
import { barril, cajon, carro, puesto, banderines, pozo, cerca, farol,
         roca, pilaDeHeno, nube } from './props.js';

/* ── Geometria de las terrazas ── */
export const R_ALTA = 12,  H_ALTA = 4.2;    // meseta del torreon
export const R_MEDIA = 28, H_MEDIA = 2.0;   // primer anillo
export const RADIO_MURALLA = 41.5;

const GRADO = Math.PI / 180;
const ESCALERAS = [0, 90, 180, -90];        // angulos donde bajan las escaleras

/* Altura del piso en cualquier punto. La usan los edificios, la utileria
   y el pasto para apoyarse donde corresponde. */
export function alturaTerreno(x, z) {
  const d = Math.hypot(x, z);
  if (d < R_ALTA) return H_ALTA;
  if (d < R_MEDIA) return H_MEDIA;
  if (d < RADIO_MURALLA + 2) return 0;
  const k = Math.min((d - RADIO_MURALLA - 2) / 24, 1);
  const n = Math.sin(x * 0.062) * Math.cos(z * 0.054) + 0.5 * Math.sin((x + z) * 0.09);
  return n * 3.6 * k * k;
}

/* ── Cielo ──────────────────────────────────────────────────────────
   Domo con gradiente vertical. Sin esto el fondo es un color plano. */
export function construirCielo(escena) {
  const geo = new THREE.SphereGeometry(620, 28, 18);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      arriba: { value: new THREE.Color(C.cieloAlto) },
      abajo:  { value: new THREE.Color(C.cieloBajo) }
    },
    vertexShader: `
      varying float h;
      void main(){
        h = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: `
      uniform vec3 arriba; uniform vec3 abajo; varying float h;
      void main(){
        gl_FragColor = vec4(mix(abajo, arriba, smoothstep(-0.05, 0.55, h)), 1.0);
      }`
  });
  const domo = new THREE.Mesh(geo, material);
  domo.frustumCulled = false;
  escena.add(domo);

  const rnd = azar(4242);
  const nubes = [];
  for (let i = 0; i < 9; i++) {
    const n = nube(rnd);
    const a = rnd() * Math.PI * 2;
    const r = 140 + rnd() * 150;
    n.position.set(Math.sin(a) * r, 78 + rnd() * 46, Math.cos(a) * r);
    n.userData.deriva = 0.35 + rnd() * 0.5;
    escena.add(n);
    nubes.push(n);
  }
  return nubes;
}

/* ── Suelo ──────────────────────────────────────────────────────────
   El pasto lleva color por vertice: un verde plano se ve sintetico. */
export function construirTerreno(escena, nodos) {
  const geo = new THREE.PlaneGeometry(620, 620, 104, 104);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colores = new Float32Array(pos.count * 3);
  const claro = new THREE.Color(C.pastoClaro);
  const oscuro = new THREE.Color(C.pastoOscuro);
  const seco = new THREE.Color(C.pastoSeco);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    /* el plano solo modela el nivel del suelo; las terrazas son geometria aparte */
    pos.setY(i, d < RADIO_MURALLA + 2 ? 0 : alturaTerreno(x, z));
    const n = Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.5 + 0.5;
    const n2 = Math.sin((x + z) * 0.09) * 0.5 + 0.5;
    c.copy(oscuro).lerp(claro, n).lerp(seco, n2 * 0.35);
    colores[i * 3] = c.r; colores[i * 3 + 1] = c.g; colores[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geo.computeVertexNormals();

  const suelo = new THREE.Mesh(geo, mat(0xFFFFFF, { vertexColors: true }));
  suelo.receiveShadow = true;
  escena.add(suelo);

  /* caminos del anillo exterior */
  const g = new THREE.Group();
  const tierra = mat(C.tierra);
  const anillo = new THREE.Mesh(new THREE.RingGeometry(29.5, 33, 56), tierra);
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.02;
  anillo.receiveShadow = true;
  g.add(anillo);

  const senda = (angulo, desde, hasta, ancho, y) => {
    const largo = hasta - desde;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo), tierra);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -angulo;
    const r = desde + largo / 2;
    m.position.set(Math.sin(angulo) * r, y + 0.02, Math.cos(angulo) * r);
    m.receiveShadow = true;
    g.add(m);
  };
  for (const n of nodos) {
    if (n.kind !== 'house') continue;
    senda(n.angle * GRADO, 31, n.radius - 4, 3.0, 0);
  }
  senda(0, 31, RADIO_MURALLA + 1, 5.4, 0);       // avenida al porton
  escena.add(g);
}

/* ── Terrazas ───────────────────────────────────────────────────────
   Muro de contencion + coronamiento + superficie, y escaleras que
   bajan al nivel de abajo. */
function escalera(g, anguloGrados, radio, arriba, abajo, ancho, matPiedra) {
  const a = anguloGrados * GRADO;
  const alto = arriba - abajo;
  const n = Math.max(4, Math.round(alto / 0.34));
  const paso = alto / n, fondo = 0.8;

  for (let i = 0; i < n; i++) {
    const techo = arriba - (i + 1) * paso;
    const h = techo - abajo + 0.4;
    const esc = caja(ancho, h, fondo, matPiedra);
    const r = radio + (i + 0.5) * fondo;
    esc.position.set(Math.sin(a) * r, techo - h / 2, Math.cos(a) * r);
    esc.rotation.y = a;
    esc.castShadow = true; esc.receiveShadow = true;
    g.add(esc);
  }
  /* muretes a los costados, para que la escalera se lea desde arriba */
  for (const s of [-1, 1]) {
    const largo = n * fondo;
    const m = caja(0.5, alto + 0.7, largo, matPiedra);
    const r = radio + largo / 2;
    m.position.set(
      Math.sin(a) * r + Math.cos(a) * s * (ancho / 2 + 0.25),
      abajo + (alto + 0.7) / 2 - 0.35,
      Math.cos(a) * r - Math.sin(a) * s * (ancho / 2 + 0.25)
    );
    m.rotation.y = a;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
}

function terraza(g, radio, alto, base, matMuro, matBorde) {
  const muro = new THREE.Mesh(
    new THREE.CylinderGeometry(radio, radio, alto - base, 56, 1, true), matMuro);
  muro.position.y = base + (alto - base) / 2;
  muro.castShadow = true; muro.receiveShadow = true;
  g.add(muro);

  /* abierto arriba y abajo: un cilindro solido taparia toda la terraza
     con su tapa superior y el piso quedaria de piedra */
  const borde = new THREE.Mesh(
    new THREE.CylinderGeometry(radio + 0.45, radio + 0.45, 0.45, 56, 1, true), matBorde);
  borde.position.y = alto - 0.18;
  borde.castShadow = true; borde.receiveShadow = true;
  g.add(borde);
}

export function construirTerrazas(escena, nodos) {
  const g = new THREE.Group();
  const piedra = mat(C.piedra);
  const piedraOsc = mat(C.piedraOscura);
  const adoquin = mat(C.adoquin);
  const pastoAlto = mat(C.pastoClaro);
  const tierra = mat(C.tierra);

  /* terraza media (primer anillo: los dos castillos) */
  terraza(g, R_MEDIA, H_MEDIA, 0, piedra, piedraOsc);
  const pisoMedia = new THREE.Mesh(new THREE.CircleGeometry(R_MEDIA, 56), pastoAlto);
  pisoMedia.rotation.x = -Math.PI / 2;
  pisoMedia.position.y = H_MEDIA;
  pisoMedia.receiveShadow = true;
  g.add(pisoMedia);

  const anilloMedia = new THREE.Mesh(new THREE.RingGeometry(17.5, 22.5, 56), tierra);
  anilloMedia.rotation.x = -Math.PI / 2;
  anilloMedia.position.y = H_MEDIA + 0.02;
  anilloMedia.receiveShadow = true;
  g.add(anilloMedia);

  /* terraza alta (el torreon) */
  terraza(g, R_ALTA, H_ALTA, H_MEDIA, piedra, piedraOsc);
  const pisoAlta = new THREE.Mesh(new THREE.CircleGeometry(R_ALTA, 48), adoquin);
  pisoAlta.rotation.x = -Math.PI / 2;
  pisoAlta.position.y = H_ALTA;
  pisoAlta.receiveShadow = true;
  g.add(pisoAlta);

  /* escaleras: del suelo a la media, y de la media a la alta */
  for (const a of ESCALERAS) {
    escalera(g, a, R_MEDIA, H_MEDIA, 0, 6.5, piedraOsc);
    escalera(g, a, R_ALTA, H_ALTA, H_MEDIA, 5.0, piedraOsc);
  }

  /* sendas de la terraza media hacia cada castillo */
  for (const n of nodos) {
    if (n.kind !== 'castle') continue;
    const a = n.angle * GRADO;
    const largo = 6;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, largo), tierra);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -a;
    const r = n.radius - 7 + largo / 2;
    m.position.set(Math.sin(a) * r, H_MEDIA + 0.03, Math.cos(a) * r);
    m.receiveShadow = true;
    g.add(m);
  }

  escena.add(fusionar(g));
}

/* ── Muralla ───────────────────────────────────────────────────────── */
export function construirMuralla(escena) {
  const g = new THREE.Group();
  const piedra = mat(C.piedra);
  const piedraOsc = mat(C.piedraOscura);
  const madera = mat(C.maderaOscura);
  const musgo = mat(C.musgo);
  const tejaTorre = mat(C.techos[0]);
  const R = RADIO_MURALLA, SEG = 54;

  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const desdeFrente = Math.abs(a > Math.PI ? a - Math.PI * 2 : a);
    if (desdeFrente < 0.13) continue;
    const largo = (Math.PI * 2 * R) / SEG + 0.3;
    const m = caja(largo, 2.8, 1.4, piedra);
    m.position.set(Math.sin(a) * R, 1.4, Math.cos(a) * R);
    m.rotation.y = a;
    g.add(m);
    const remate = caja(largo, 0.3, 1.7, piedraOsc);
    remate.position.set(Math.sin(a) * R, 2.9, Math.cos(a) * R);
    remate.rotation.y = a;
    g.add(remate);
    if (i % 6 === 0) {
      const parche = caja(largo * 0.6, 0.12, 1.75, musgo);
      parche.position.set(Math.sin(a) * R, 3.07, Math.cos(a) * R);
      parche.rotation.y = a;
      g.add(parche);
    }
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    g.add(ubicar(cilindro(1.4, 1.6, 4.8, piedra, 8), x, 2.4, z));
    g.add(ubicar(cono(1.75, 2.5, tejaTorre, 8), x, 6.05, z));
  }

  /* porton */
  for (const s of [-1, 1]) {
    const a = s * 0.24;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    g.add(ubicar(cilindro(1.6, 1.9, 7.2, piedra, 8), x, 3.6, z));
    g.add(ubicar(cono(2.05, 3.0, tejaTorre, 8), x, 8.7, z));
  }
  for (const s of [-1, 1]) {
    g.add(ubicar(caja(0.6, 6.4, 0.6, madera), s * 3.0, 3.2, R));
    g.add(ubicar(caja(1.4, 0.5, 0.5, madera), s * 2.5, 5.9, R));
  }
  g.add(ubicar(caja(7.0, 0.8, 1.4, madera), 0, 6.7, R));
  const techoPorton = techoDosAguas({
    ancho: 7.4, largo: 3.0, alto: 2.0, alero: 0.6, aleroFrente: 0.4,
    matTecho: tejaTorre, matFronton: madera
  });
  techoPorton.position.set(0, 7.1, R);
  g.add(techoPorton);
  for (const s of [-1, 1]) {
    const b = caja(1.1, 1.7, 0.07, mat(C.tela[s > 0 ? 0 : 1], { side: THREE.DoubleSide }));
    g.add(ubicar(b, s * 2.2, 5.0, R - 0.8));
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(fusionar(g));
}

/* Matas de pasto y piedras sueltas: rompen la superficie lisa. */
export function construirPasto(escena) {
  const rnd = azar(909);
  const N = 460;
  const matas = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.16, 0.6, 4), mat(C.pastoOscuro), N);
  const flores = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.1, 0.2, 4), mat(0xF2EDE0), Math.floor(N / 3));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), e = new THREE.Vector3();
  let i = 0, j = 0, intentos = 0;
  while (i < N && intentos++ < N * 8) {
    const a = rnd() * Math.PI * 2;
    const r = 13 + rnd() * 74;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (r > 17 && r < 23) continue;                  // anillo de la terraza media
    if (r > 29 && r < 33.5) continue;                // anillo del suelo
    const y = alturaTerreno(x, z);
    const s = 0.7 + rnd() * 0.9;
    q.setFromAxisAngle(eje, rnd() * Math.PI);
    e.set(s, s, s);
    p.set(x, y + 0.3 * s, z); m.compose(p, q, e); matas.setMatrixAt(i++, m);
    if (j < flores.count && rnd() > 0.66) {
      p.set(x + 0.4, y + 0.12, z + 0.3); m.compose(p, q, e); flores.setMatrixAt(j++, m);
    }
  }
  matas.count = i;
  flores.count = j;
  matas.receiveShadow = true;
  escena.add(matas, flores);

  /* piedras sueltas afuera de la muralla */
  const rocas = new THREE.Group();
  for (let k = 0; k < 26; k++) {
    const a = rnd() * Math.PI * 2;
    const r = RADIO_MURALLA + 3 + rnd() * 42;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const p2 = roca(0.7 + rnd() * 1.1);
    p2.position.set(x, alturaTerreno(x, z) + p2.position.y, z);
    rocas.add(p2);
  }
  rocas.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(fusionar(rocas));
}

/* ── Decoracion ─────────────────────────────────────────────────────
   Utileria repartida por los tres niveles. En vez de posiciones a mano
   (que terminaban adentro de los castillos) cada objeto se prueba
   contra los edificios y contra las escaleras antes de colocarse. */

const RADIO_OCUPADO = { keep: 9.5, castle: 8.5, house: 5.5 };

function hacerHueco(nodos, posiciones) {
  return (x, z, margen = 1.6) => {
    for (const n of nodos) {
      const p = posiciones.get(n.id);
      if (!p) continue;
      if (Math.hypot(x - p.x, z - p.z) < RADIO_OCUPADO[n.kind] + margen) return false;
    }
    /* tampoco encima de las escaleras */
    const ang = Math.atan2(x, z);
    for (const e of ESCALERAS) {
      let d = Math.abs(ang - e * GRADO);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < 0.16) return false;
    }
    return true;
  };
}

export function decorarAldea(escena, nodos, posiciones) {
  const rnd = azar(2024);
  const g = new THREE.Group();
  const libre = hacerHueco(nodos, posiciones);

  const poner = (obj, x, z, y, rot) => {
    if (!libre(x, z)) return false;
    g.add(ubicar(obj, x, y, z, rot || 0));
    return true;
  };
  const enAnillo = (radio, angGrados, y, hacer) => {
    const a = angGrados * GRADO;
    poner(hacer(), Math.sin(a) * radio, Math.cos(a) * radio, y, a + Math.PI);
  };

  /* terraza alta: la plaza del torreon */
  poner(pozo(), -7.4, 6.0, H_ALTA);
  for (const a of [40, 140, 220, 320]) enAnillo(10.4, a, H_ALTA, farol);

  /* terraza media: feria entre los dos castillos */
  for (const a of [-115, 115, 155, -155, 65, -65]) enAnillo(24.5, a, H_MEDIA, () => puesto(Math.abs(a) % 5));
  for (const a of [-70, -140, 70, 140, 180]) enAnillo(25.8, a, H_MEDIA, farol);
  for (const a of [-100, 100]) enAnillo(24, a, H_MEDIA, carro);

  /* suelo: faroles a lo largo de la avenida al porton */
  for (const s of [-1, 1]) for (const r of [33, 37]) poner(farol(), s * 3.8, r, 0);

  /* utileria apoyada contra cada edificio, a la altura de su terraza */
  for (const nodo of nodos) {
    if (nodo.radius === 0) continue;
    const p = posiciones.get(nodo.id);
    const y = alturaTerreno(p.x, p.z);
    const haciaAfuera = Math.atan2(p.x, p.z);
    const lateral = haciaAfuera + Math.PI / 2;
    const d1 = nodo.kind === 'castle' ? 6.4 : 4.9;
    const d2 = d1 + 1.2;
    const en = (dist, ang) => [p.x + Math.sin(ang) * dist, p.z + Math.cos(ang) * dist];

    let q = en(d1, lateral);
    g.add(ubicar(barril(), q[0], y, q[1]));
    if (rnd() > 0.4) { q = en(d2, lateral); g.add(ubicar(barril(), q[0] - 0.7, y, q[1])); }
    q = en(d1, lateral + Math.PI);
    g.add(ubicar(cajon(rnd() > 0.5), q[0], y, q[1], rnd() * Math.PI));
    if (rnd() > 0.55) {
      q = en(d2, lateral + Math.PI);
      g.add(ubicar(pilaDeHeno(), q[0] + 0.6, y, q[1], rnd() * Math.PI));
    }
    if (nodo.kind === 'house' && rnd() > 0.5) {
      q = en(5.8, haciaAfuera);
      g.add(ubicar(carro(), q[0], y, q[1], haciaAfuera + 1.4));
    }
  }

  /* guirnaldas entre casas vecinas del anillo exterior */
  const anillo = nodos.filter(n => n.kind === 'house').slice().sort((a, b) => a.angle - b.angle);
  for (let i = 0; i < anillo.length - 1; i++) {
    const a = posiciones.get(anillo[i].id), b = posiciones.get(anillo[i + 1].id);
    if (Math.hypot(a.x - b.x, a.z - b.z) > 28) continue;
    g.add(banderines([a.x, 9.4, a.z], [b.x, 9.4, b.z], { hundimiento: 3.0 }));
  }
  /* y cruzando entre los dos castillos, por encima de la plaza */
  const seal = posiciones.get('sealcoating'), sol = posiciones.get('solar');
  if (seal && sol) {
    g.add(banderines([seal.x, H_MEDIA + 12, seal.z], [sol.x, H_MEDIA + 12, sol.z],
      { hundimiento: 3.6 }));
  }

  /* cercas contra la muralla */
  for (const a of [-2.4, -1.2, 1.2, 2.4]) {
    const r = RADIO_MURALLA - 3.4;
    g.add(cerca(
      [Math.sin(a - 0.14) * r, 0, Math.cos(a - 0.14) * r],
      [Math.sin(a + 0.14) * r, 0, Math.cos(a + 0.14) * r]
    ));
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(fusionar(g));
}
