/* ═══════════════════════════════════════════════════════════════════
   ESCENARIO
   Cielo, terreno, muralla, bosque y la decoracion repartida por la
   aldea. Todo determinista: la aldea se ve igual en cada carga.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from '../vendor/three.module.min.js';
import { C, mat, caja, cilindro, cono, ubicar, azar, techoDosAguas, fusionar } from './paleta.js';
import { barril, cajon, carro, puesto, banderines, pozo, cerca, farol,
         roca, pilaDeHeno, arbol, pino, nube } from './props.js';

export const RADIO_MURALLA = 34;
const GRADO = Math.PI / 180;

/* Colinas suaves afuera de la muralla. */
export function alturaTerreno(x, z) {
  const d = Math.hypot(x, z);
  if (d < RADIO_MURALLA + 2) return 0;
  const k = Math.min((d - RADIO_MURALLA - 2) / 22, 1);
  const n = Math.sin(x * 0.068) * Math.cos(z * 0.058) + 0.5 * Math.sin((x + z) * 0.1);
  return n * 3.4 * k * k;
}

/* ── Cielo ──────────────────────────────────────────────────────────
   Domo con gradiente vertical. Sin esto el fondo es un color plano y
   la escena se lee como render de prueba. */
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
    const r = 130 + rnd() * 150;
    n.position.set(Math.sin(a) * r, 74 + rnd() * 44, Math.cos(a) * r);
    n.userData.deriva = 0.35 + rnd() * 0.5;
    escena.add(n);
    nubes.push(n);
  }
  return nubes;
}

/* ── Terreno ────────────────────────────────────────────────────────
   El pasto lleva color por vertice: dos verdes mezclados con ruido.
   Un plano de un solo verde se ve sintetico enseguida. */
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
    pos.setY(i, alturaTerreno(x, z));
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

  /* plaza de adoquin y caminos de tierra */
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(10.5, 40), mat(C.adoquin));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.03;
  plaza.receiveShadow = true;
  escena.add(plaza);

  const tierraMat = mat(C.tierra);
  const camino = (angulo, desde, hasta, ancho) => {
    const largo = hasta - desde;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo), tierraMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -angulo;
    const r = desde + largo / 2;
    m.position.set(Math.sin(angulo) * r, 0.02, Math.cos(angulo) * r);
    m.receiveShadow = true;
    escena.add(m);
  };
  for (const n of nodos) if (n.radius > 0) camino(n.angle * GRADO, 8, n.radius - 3.4, 2.8);
  camino(0, 8, RADIO_MURALLA + 1, 5.2);

  /* anillo de tierra alrededor de la plaza, como calle principal */
  const anillo = new THREE.Mesh(new THREE.RingGeometry(12.2, 15.4, 48), tierraMat);
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.015;
  anillo.receiveShadow = true;
  escena.add(anillo);
}

/* Matas de pasto y flores: rompen la superficie lisa del plano. */
export function construirPasto(escena) {
  const rnd = azar(909);
  const N = 420;
  const mataGeo = new THREE.ConeGeometry(0.16, 0.6, 4);
  const florGeo = new THREE.ConeGeometry(0.1, 0.2, 4);
  const matas = new THREE.InstancedMesh(mataGeo, mat(C.pastoOscuro), N);
  const flores = new THREE.InstancedMesh(florGeo, mat(0xF2EDE0), Math.floor(N / 3));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), e = new THREE.Vector3();
  let i = 0, j = 0, intentos = 0;
  while (i < N && intentos++ < N * 8) {
    const a = rnd() * Math.PI * 2;
    const r = 11 + rnd() * 66;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (r > 11.8 && r < 15.8) continue;                   // no sobre la calle
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
}

/* ── Muralla ────────────────────────────────────────────────────────
   Piedra tibia y baja, con portón de madera al frente. Marca el borde
   de la aldea sin convertirla en fortaleza. */
export function construirMuralla(escena) {
  const g = new THREE.Group();
  const piedra = mat(C.piedra);
  const piedraOsc = mat(C.piedraOscura);
  const madera = mat(C.maderaOscura);
  const musgo = mat(C.musgo);
  const tejaTorre = mat(C.techos[0]);
  const R = RADIO_MURALLA, SEG = 46;

  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const desdeFrente = Math.abs(a > Math.PI ? a - Math.PI * 2 : a);
    if (desdeFrente < 0.15) continue;
    const largo = (Math.PI * 2 * R) / SEG + 0.3;
    const m = caja(largo, 2.6, 1.4, piedra);
    m.position.set(Math.sin(a) * R, 1.3, Math.cos(a) * R);
    m.rotation.y = a;
    g.add(m);
    const remate = caja(largo, 0.3, 1.7, piedraOsc);
    remate.position.set(Math.sin(a) * R, 2.7, Math.cos(a) * R);
    remate.rotation.y = a;
    g.add(remate);
    if (i % 5 === 0) {
      const parche = caja(largo * 0.6, 0.12, 1.75, musgo);
      parche.position.set(Math.sin(a) * R, 2.87, Math.cos(a) * R);
      parche.rotation.y = a;
      g.add(parche);
    }
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    g.add(ubicar(cilindro(1.4, 1.6, 4.6, piedra, 8), x, 2.3, z));
    g.add(ubicar(cono(1.75, 2.5, tejaTorre, 8), x, 5.85, z));
  }

  /* porton: dos torres, dintel de madera y banderas */
  for (const s of [-1, 1]) {
    const a = s * 0.28;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    g.add(ubicar(cilindro(1.6, 1.9, 7.0, piedra, 8), x, 3.5, z));
    g.add(ubicar(cono(2.05, 3.0, tejaTorre, 8), x, 8.5, z));
  }
  for (const s of [-1, 1]) {
    g.add(ubicar(caja(0.6, 6.4, 0.6, madera), s * 3.0, 3.2, R));
    g.add(ubicar(caja(1.4, 0.5, 0.5, madera), s * 2.5, 5.9, R));   // ménsula
  }
  g.add(ubicar(caja(7.0, 0.8, 1.4, madera), 0, 6.7, R));
  /* la cumbrera cruza el camino: techoDosAguas ya orienta el ancho en X,
     girarlo 90° dejaba una losa plana sobre el portón */
  const techoPorton = techoDosAguas({
    ancho: 7.4, largo: 3.0, alto: 2.0, alero: 0.6, aleroFrente: 0.4,
    matTecho: tejaTorre, matFronton: madera
  });
  techoPorton.position.set(0, 7.1, R);
  g.add(techoPorton);
  for (const s of [-1, 1]) {                                        // banderas del portón
    const b = caja(1.1, 1.7, 0.07, mat(C.tela[s > 0 ? 0 : 1], { side: THREE.DoubleSide }));
    g.add(ubicar(b, s * 2.2, 5.0, R - 0.8));
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(fusionar(g));
}

export function construirBosque(escena) {
  const rnd = azar(1337);
  const g = new THREE.Group();
  let puestos = 0;
  while (puestos < 52) {
    const a = rnd() * Math.PI * 2;
    const r = RADIO_MURALLA + 4 + rnd() * 40;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.abs(x) < 6 && z > 0) continue;                // deja libre la entrada
    const t = rnd() > 0.42 ? arbol(rnd) : pino(rnd);
    t.position.set(x, alturaTerreno(x, z), z);
    t.rotation.y = rnd() * Math.PI * 2;
    g.add(t);
    puestos++;
  }
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const r = RADIO_MURALLA + 3 + rnd() * 34;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const p = roca(0.7 + rnd());
    p.position.set(x, alturaTerreno(x, z) + p.position.y, z);
    g.add(p);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(fusionar(g));
}

/* ── Decoracion de la aldea ─────────────────────────────────────────
   Utileria alrededor de cada edificio y guirnaldas de banderines
   uniendo el anillo de casas. */
export function decorarAldea(escena, nodos, posiciones) {
  const rnd = azar(2024);
  const g = new THREE.Group();

  g.add(ubicar(pozo(), -6.4, 0, 5.2));
  g.add(ubicar(puesto(0), 6.8, 0, 4.4, -0.7));
  g.add(ubicar(puesto(3), -7.2, 0, -4.6, 2.3));
  g.add(ubicar(carro(), 4.2, 0, -6.6, 1.1));

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    g.add(ubicar(farol(), Math.sin(a) * 12.6, 0, Math.cos(a) * 12.6));
  }
  for (const s of [-1, 1]) {
    g.add(ubicar(farol(), s * 3.4, 0, 22));
    g.add(ubicar(farol(), s * 3.4, 0, 28));
  }

  /* utileria apoyada contra cada edificio */
  for (const nodo of nodos) {
    if (nodo.radius === 0) continue;
    const p = posiciones.get(nodo.id);
    const haciaAfuera = Math.atan2(p.x, p.z);
    const lateral = haciaAfuera + Math.PI / 2;
    const cerca1 = 4.6, cerca2 = 5.4;

    g.add(ubicar(barril(),
      p.x + Math.sin(lateral) * cerca1, 0, p.z + Math.cos(lateral) * cerca1));
    if (rnd() > 0.4) g.add(ubicar(barril(),
      p.x + Math.sin(lateral) * cerca2 - 0.7, 0, p.z + Math.cos(lateral) * cerca2));
    g.add(ubicar(cajon(rnd() > 0.5),
      p.x - Math.sin(lateral) * cerca1, 0, p.z - Math.cos(lateral) * cerca1,
      rnd() * Math.PI));
    if (rnd() > 0.55) g.add(ubicar(pilaDeHeno(),
      p.x - Math.sin(lateral) * cerca2 + 0.6, 0, p.z - Math.cos(lateral) * cerca2,
      rnd() * Math.PI));
    if (rnd() > 0.6) g.add(ubicar(carro(),
      p.x + Math.sin(haciaAfuera) * 5.6, 0, p.z + Math.cos(haciaAfuera) * 5.6,
      haciaAfuera + 1.4));
  }

  /* guirnaldas entre casas vecinas del anillo */
  const anillo = nodos.filter(n => n.kind === 'house')
    .slice()
    .sort((a, b) => a.angle - b.angle);
  for (let i = 0; i < anillo.length - 1; i++) {
    const a = posiciones.get(anillo[i].id), b = posiciones.get(anillo[i + 1].id);
    if (Math.hypot(a.x - b.x, a.z - b.z) > 22) continue;
    g.add(banderines([a.x, 9.4, a.z], [b.x, 9.4, b.z], { hundimiento: 2.6 }));
  }
  /* y cruzando la avenida de entrada */
  const seal = posiciones.get('sealcoating'), sol = posiciones.get('solar');
  if (seal && sol) g.add(banderines([seal.x, 12.5, seal.z], [sol.x, 12.5, sol.z], { hundimiento: 3.2 }));

  /* arboles y matas dentro de la muralla: los huecos de pasto vacio
     entre el anillo de casas y el muro se leen como escena sin terminar */
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + 0.24;
    if (Math.abs(ang > Math.PI ? ang - Math.PI * 2 : ang) < 0.3) continue;
    const r = 21.5 + rnd() * 8.5;
    const x = Math.sin(ang) * r, z = Math.cos(ang) * r;
    const t = rnd() > 0.35 ? arbol(rnd) : pino(rnd);
    t.scale.setScalar(0.8);
    g.add(ubicar(t, x, 0, z, rnd() * 6));
    if (rnd() > 0.6) g.add(ubicar(roca(0.8), x + 2.4, 0, z - 1.6));
  }

  /* cercas sueltas contra la muralla */
  for (const a of [-2.4, -1.2, 1.2, 2.4]) {
    const r = RADIO_MURALLA - 3.2;
    g.add(cerca(
      [Math.sin(a - 0.16) * r, 0, Math.cos(a - 0.16) * r],
      [Math.sin(a + 0.16) * r, 0, Math.cos(a + 0.16) * r]
    ));
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  escena.add(fusionar(g));
}
