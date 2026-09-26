/* ═══════════════════════════════════════════════════════════════════
   AGUA

   crearFoso({ radioInterno, radioExterno, y, segmentos })
     → { mesh, actualizar(t), setNoche(t) }
     Anillo de agua animada alrededor de la muralla. Shader propio:
     olas suaves, fresnel, color de cielo reflejado (uniforms de dia y
     noche), un poco de transparencia y espuma tenue en los bordes.

   crearRio(puntos, ancho, y) → { mesh, actualizar(t), setNoche(t) }
     Cinta de agua que sigue una polilinea [[x,z],...], mismo material.

   crearPuente({ largo, ancho, y, matMadera }) → THREE.Group
     Puente de tablones sobre el foso, alineado con la avenida (eje +Z).

   El agua no se fusiona: es un ShaderMaterial y se anima por uniforms.
   Todos los cuerpos de agua comparten el shader y el juego de uniforms
   (tiempo, noche, sol, colores), asi que con animar uno se animan todos;
   cada cuerpo lleva solo su propio `ancho`, que el shader necesita para
   medir la banda de espuma en unidades de mundo. Three cachea el
   programa por codigo, asi que no hay costo por instancia.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { mat, caja, cilindro, ubicar, fusionar, C } from './paleta.js';

/* ── Paleta del agua ────────────────────────────────────────────────
   De dia el foso es celeste con fondo azul y devuelve el cielo bajo;
   de noche se apaga a azul tinta y solo la luna le saca un brillo
   chico y frio. La espuma nocturna es gris azulada para no brillar. */
const DIA = {
  profundo: 0x2F6E9E, superficie: 0x5FA9CF, cielo: 0xA9D8F0, espuma: 0xEAF6FA,
  brillo: 0xFFF0D2, sol: new THREE.Vector3(-96, 58, 74).normalize()
};
const NOCHE = {
  profundo: 0x0B182F, superficie: 0x1A3358, cielo: 0x2A3560, espuma: 0x8C9BC0,
  brillo: 0xC9D6F5, sol: new THREE.Vector3(70, 80, -40).normalize()
};

/* Frecuencia espacial del rizo que corre a lo largo de uv.x (rad por
   unidad de mundo). El anillo del foso ajusta su uv.x a un numero
   entero de ciclos de este rizo para que la costura no se note. */
const K_FLUJO = 2.0;

/* ── Shader ─────────────────────────────────────────────────────────
   Estilizado: no busca fisica sino lectura. Dos olas en espacio de
   mundo (sin costuras, distintas direcciones y velocidades) mas un rizo
   que corre a lo largo de la cinta; las tres solo inclinan la normal,
   la superficie es plana. Sobre eso: color por profundidad, fresnel al
   cielo, brillo Blinn-Phong del sol y espuma en los bordes. Lleva los
   chunks de niebla de Three para fundirse con el resto de la escena. */
const VERTEX = /* glsl */`
  #include <fog_pars_vertex>
  varying vec3 vMundo;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vMundo = mundo.xyz;
    vec4 mvPosition = viewMatrix * mundo;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAGMENT = /* glsl */`
  #include <fog_pars_fragment>
  uniform float tiempo;
  uniform float noche;
  uniform float ancho;
  uniform vec3 direccionSol;
  uniform vec3 profundoDia, superficieDia, cieloDia, espumaDia, brilloDia;
  uniform vec3 profundoNoche, superficieNoche, cieloNoche, espumaNoche, brilloNoche;
  varying vec3 vMundo;
  varying vec2 vUv;

  const float K_FLUJO = ${K_FLUJO.toFixed(2)};

  void main() {
    vec3 profundo   = mix(profundoDia,   profundoNoche,   noche);
    vec3 superficie = mix(superficieDia, superficieNoche, noche);
    vec3 cielo      = mix(cieloDia,      cieloNoche,      noche);
    vec3 espuma     = mix(espumaDia,     espumaNoche,     noche);
    vec3 brillo     = mix(brilloDia,     brilloNoche,     noche);

    /* olas: la pendiente analitica de cada seno inclina la normal */
    vec2 p = vMundo.xz;
    vec2 k1 = vec2(0.30, 0.18), k2 = vec2(-0.14, 0.36);
    float f1 = dot(p, k1) + tiempo * 0.50;
    float f2 = dot(p, k2) + tiempo * 0.38 + 1.7;
    float f3 = vUv.x * K_FLUJO - tiempo * 0.9;
    vec2 pendiente = k1 * cos(f1) * 0.45 + k2 * cos(f2) * 0.35;
    pendiente.x += cos(f3) * 0.06;
    vec3 n = normalize(vec3(-pendiente.x, 1.0, -pendiente.y));

    /* profundidad: orillas claras y un poco verdosas, centro hondo */
    float centro = 1.0 - abs(vUv.y * 2.0 - 1.0);
    vec3 orilla = superficie * vec3(0.93, 1.05, 0.92);
    vec3 color = mix(orilla, profundo, smoothstep(0.0, 0.85, centro));
    color += (sin(f1) * 0.5 + sin(f2) * 0.5) * 0.035 * superficie;

    /* fresnel: mirando de costado devuelve el cielo, desde arriba deja ver el fondo */
    vec3 v = normalize(cameraPosition - vMundo);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    color = mix(color, cielo, 0.12 + 0.68 * fresnel);

    /* brillo del sol: ancho y suave de dia, mas chico y frio de noche */
    vec3 h = normalize(v + direccionSol);
    float expo = mix(36.0, 160.0, noche);
    float fuerza = mix(0.5, 0.22, noche);
    color += brillo * pow(max(dot(n, h), 0.0), expo) * fuerza;

    /* espuma: banda de ~0.6 unidades contra cada orilla, con el borde ondulado */
    float borde = min(vUv.y, 1.0 - vUv.y) * ancho;
    float ondulado = 0.6 + 0.25 * sin(f3 * 1.3 + f1 * 2.0);
    float banda = 1.0 - smoothstep(0.0, ondulado, borde);
    banda *= 0.55 + 0.45 * sin(f3 * 0.7 + f2 * 1.5);
    color = mix(color, espuma, banda * 0.45);

    gl_FragColor = vec4(color, 0.82 + banda * 0.1);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

/* Uniforms compartidos por todos los cuerpos de agua (ver encabezado). */
let compartidos = null;
function uniformsCompartidos() {
  if (compartidos) return compartidos;
  compartidos = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    tiempo:       { value: 0 },
    noche:        { value: 0 },
    direccionSol: { value: DIA.sol.clone() },
    profundoDia:     { value: new THREE.Color(DIA.profundo) },
    superficieDia:   { value: new THREE.Color(DIA.superficie) },
    cieloDia:        { value: new THREE.Color(DIA.cielo) },
    espumaDia:       { value: new THREE.Color(DIA.espuma) },
    brilloDia:       { value: new THREE.Color(DIA.brillo) },
    profundoNoche:   { value: new THREE.Color(NOCHE.profundo) },
    superficieNoche: { value: new THREE.Color(NOCHE.superficie) },
    cieloNoche:      { value: new THREE.Color(NOCHE.cielo) },
    espumaNoche:     { value: new THREE.Color(NOCHE.espuma) },
    brilloNoche:     { value: new THREE.Color(NOCHE.brillo) }
  }]);
  return compartidos;
}

function materialAgua(ancho) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniformsCompartidos(), ancho: { value: ancho } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    fog: true,
    transparent: true,
    depthWrite: false
  });
}

function controlesAgua(mesh) {
  const u = uniformsCompartidos();
  return {
    mesh,
    actualizar(t) { u.tiempo.value = t; },
    setNoche(t) {
      u.noche.value = t;
      u.direccionSol.value.lerpVectors(DIA.sol, NOCHE.sol, t).normalize();
    }
  };
}

/* ── Foso ───────────────────────────────────────────────────────────
   RingGeometry trae uv planares (x,y del disco), que no sirven para
   medir la orilla. Se reescriben: uv.x recorre el anillo en unidades de
   mundo (cerrado en ciclos enteros del rizo, ver K_FLUJO) y uv.y va de
   la orilla interna (0) a la externa (1). Los vertices del anillo van
   por filas de radio creciente, `segmentos + 1` por fila con la ultima
   columna repetida sobre la primera. */
export function crearFoso({ radioInterno, radioExterno, y, segmentos = 96 }) {
  const geo = new THREE.RingGeometry(radioInterno, radioExterno, segmentos, 3);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const rMedio = (radioInterno + radioExterno) / 2;
  const ciclos = Math.max(1, Math.round(rMedio * K_FLUJO));   // perimetro * K / 2π
  const largoUv = ciclos * 2 * Math.PI / K_FLUJO;
  const porFila = segmentos + 1;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    const columna = i % porFila;
    uv.setXY(i, columna / segmentos * largoUv, (r - radioInterno) / (radioExterno - radioInterno));
  }
  uv.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, materialAgua(radioExterno - radioInterno));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return controlesAgua(mesh);
}

/* ── Rio ────────────────────────────────────────────────────────────
   Dos vertices por punto de la polilinea, uno a cada lado de la
   perpendicular local (promedio de los tramos vecinos para que las
   esquinas no se pellizquen). uv.x acumula la distancia recorrida, asi
   el rizo del shader corre aguas abajo; uv.y es 0 en una orilla y 1 en
   la otra. La altura es la que pasa quien llama, ya calculada. */
export function crearRio(puntos, ancho, y) {
  const n = puntos.length;
  const pos = new Float32Array(n * 2 * 3);
  const nor = new Float32Array(n * 2 * 3);
  const uv  = new Float32Array(n * 2 * 2);
  const idx = [];
  let recorrido = 0;

  for (let i = 0; i < n; i++) {
    const [x, z] = puntos[i];
    const [xa, za] = puntos[Math.max(0, i - 1)];
    const [xb, zb] = puntos[Math.min(n - 1, i + 1)];
    let dx = xb - xa, dz = zb - za;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    if (i > 0) recorrido += Math.hypot(x - xa, z - za);

    /* perpendicular a la izquierda del sentido de avance */
    const px = -dz, pz = dx;
    for (let lado = 0; lado < 2; lado++) {
      const s = lado === 0 ? -0.5 : 0.5;
      const v = i * 2 + lado;
      pos[v * 3] = x + px * ancho * s;
      pos[v * 3 + 1] = y;
      pos[v * 3 + 2] = z + pz * ancho * s;
      nor[v * 3 + 1] = 1;
      uv[v * 2] = recorrido;
      uv[v * 2 + 1] = lado;
    }
    if (i > 0) {
      const a = (i - 1) * 2, b = i * 2;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();

  return controlesAgua(new THREE.Mesh(geo, materialAgua(ancho)));
}

/* ── Puente ─────────────────────────────────────────────────────────
   Tablones transversales sobre dos vigas, barandas con postes y dos
   travesaños, y un poste grueso con zuncho de hierro en cada esquina.
   El largo corre por Z centrado en el origen; `y` es la cara de apoyo
   de los tablones. Todo se fusiona por material al final. */
export function crearPuente({ largo, ancho, y = 0, matMadera } = {}) {
  const g = new THREE.Group();
  const matTabla = matMadera || mat(C.maderaClara);
  const matViga = mat(C.maderaOscura);
  const matHierro = mat(C.hierro, { roughness: 0.6 });

  /* tablones */
  const GROSOR = 0.18, TABLA = 0.55, SEPARACION = 0.08, paso = TABLA + SEPARACION;
  const nTablas = Math.max(1, Math.floor((largo + SEPARACION) / paso));
  const z0 = -(nTablas - 1) * paso / 2;
  for (let i = 0; i < nTablas; i++) {
    g.add(ubicar(caja(ancho, GROSOR, TABLA, matTabla), 0, y + GROSOR / 2, z0 + i * paso));
  }

  /* vigas longitudinales por debajo, y pilotes que bajan al agua */
  const xViga = ancho / 2 - 0.7;
  for (const s of [-1, 1]) {
    g.add(ubicar(caja(0.45, 0.4, largo, matViga), s * xViga, y - 0.2, 0));
    for (const sz of [-1, 1]) {
      g.add(ubicar(cilindro(0.2, 0.2, 1.7, matViga), s * xViga, y - 0.4 - 0.85, sz * largo / 4));
    }
  }

  /* barandas: postes cada ~1.6 y dos travesaños */
  const ALTO_POSTE = 1.05, xBaranda = ancho / 2 - 0.15;
  const tramos = Math.max(1, Math.round(largo / 1.6)), pasoPoste = largo / tramos;
  for (const s of [-1, 1]) {
    for (let i = 1; i < tramos; i++) {
      g.add(ubicar(caja(0.16, ALTO_POSTE, 0.16, matViga), s * xBaranda, y + GROSOR + ALTO_POSTE / 2, -largo / 2 + i * pasoPoste));
    }
    g.add(ubicar(caja(0.12, 0.1, largo, matTabla), s * xBaranda, y + GROSOR + ALTO_POSTE - 0.05, 0));
    g.add(ubicar(caja(0.12, 0.1, largo, matTabla), s * xBaranda, y + GROSOR + ALTO_POSTE * 0.52, 0));

    /* postes gruesos en las puntas, clavados mas abajo de las vigas */
    for (const sz of [-1, 1]) {
      const alto = 1.5 + GROSOR + 0.5;
      g.add(ubicar(caja(0.34, alto, 0.34, matViga), s * xBaranda, y - 0.5 + alto / 2, sz * largo / 2));
      g.add(ubicar(caja(0.4, 0.12, 0.4, matHierro), s * xBaranda, y + GROSOR + 1.3, sz * largo / 2));
    }
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return fusionar(g);
}
