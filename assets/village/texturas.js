/* ═══════════════════════════════════════════════════════════════════
   TEXTURAS PROCEDURALES

   Todas generadas con canvas la primera vez que alguien las pide: cero
   archivos, cero peso de descarga. Cada una es un tile que cubre
   UNIDADES_POR_TILE unidades de mundo (ver paleta.js); las primitivas ya
   traen las UVs a esa escala, asi que una hilada de piedra mide lo mismo
   en el basamento de una casa que en la torre del torreon.

   texturaDe(nombre) → THREE.CanvasTexture con RepeatWrapping, cacheada.
     nombres: 'revoque' | 'piedra' | 'piedraOscura' | 'teja' | 'madera'
              | 'adoquin' | 'tierra' | 'pasto' | 'tela'
   bumpDe(nombre)    → mapa de relieve (o null) para el mismo tile.
   materialTexturado(color, nombre, extra) → MeshStandardMaterial listo.

   Son texturas de luminancia (grises) que se multiplican con el color
   del material: la paleta sigue mandando, y una misma piedra sirve para
   las tres clases de edificio. Estilo pintado a mano, como los packs
   low-poly: formas simples, bordes suaves, contraste bajo, nada de ruido
   fotografico. Todo tileable: lo que se sale por un borde entra por el
   otro. Deterministas: misma semilla, misma aldea en cada carga.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { azar } from './paleta.js';

/* Gris medio de todos los mapas. El mapa se multiplica con el color del
   material, y la paleta esta afinada para verse sin textura: un medio de
   0.5 dejaria la aldea a la mitad de brillo. Con 0.86 los colores quedan
   casi como estan y la variacion (±0.05 en el grano, hasta -0.2 en las
   juntas) tiene lugar sin recortar en blanco. Es el unico numero a tocar
   si toda la aldea se ve demasiado clara u oscura. */
const MEDIA = 0.86;

const TAU = Math.PI * 2;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const gris = v => { const k = Math.round(clamp01(v) * 255); return `rgb(${k},${k},${k})`; };
const rgba = (v, a) => { const k = Math.round(clamp01(v) * 255); return `rgba(${k},${k},${k},${a})`; };

/* ── Utilidades de dibujo ───────────────────────────────────────────── */

function lienzo(s) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  return { canvas, ctx: canvas.getContext('2d') };
}

/* Ruido de valor tileable: una rejilla de celdas×celdas valores al azar,
   interpolada con smoothstep. El modulo en los indices hace que el borde
   derecho continue en el izquierdo sin costura. Va entre -1 y 1. */
const suave = t => t * t * (3 - 2 * t);

function ruidoValor(s, celdas, rnd) {
  const g = new Float32Array(celdas * celdas);
  for (let i = 0; i < g.length; i++) g[i] = rnd() * 2 - 1;
  const out = new Float32Array(s * s);
  const esc = celdas / s;
  for (let y = 0; y < s; y++) {
    const fy = y * esc, y0 = Math.floor(fy), ty = suave(fy - y0), y1 = (y0 + 1) % celdas;
    for (let x = 0; x < s; x++) {
      const fx = x * esc, x0 = Math.floor(fx), tx = suave(fx - x0), x1 = (x0 + 1) % celdas;
      const a = g[y0 * celdas + x0], b = g[y0 * celdas + x1];
      const c = g[y1 * celdas + x0], d = g[y1 * celdas + x1];
      const arriba = a + (b - a) * tx, abajo = c + (d - c) * tx;
      out[y * s + x] = arriba + (abajo - arriba) * ty;
    }
  }
  return out;
}

/* Varias octavas sumadas: [celdas, peso]. Pocas celdas = manchas grandes,
   muchas = grano fino. Sin octavas altas queda "pintado", no "foto". */
function campo(s, rnd, octavas) {
  const out = new Float32Array(s * s);
  let total = 0;
  for (const [celdas, peso] of octavas) {
    const r = ruidoValor(s, celdas, rnd);
    for (let i = 0; i < out.length; i++) out[i] += r[i] * peso;
    total += peso;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/* Suma el campo de ruido a lo que ya esta pintado, pixel a pixel. Asi el
   grano se aplica al final, sobre bloques y juntas por igual. */
function sumarRuido(ctx, s, r, amp) {
  const img = ctx.getImageData(0, 0, s, s), d = img.data;
  for (let i = 0, p = 0; i < r.length; i++, p += 4) {
    const k = r[i] * amp * 255;
    d[p]     = Math.max(0, Math.min(255, d[p] + k));
    d[p + 1] = Math.max(0, Math.min(255, d[p + 1] + k));
    d[p + 2] = Math.max(0, Math.min(255, d[p + 2] + k));
  }
  ctx.putImageData(img, 0, 0);
}

/* Dibuja lo mismo nueve veces, corrido un tile en cada direccion: lo que
   se sale por un borde aparece por el opuesto. Las formas se calculan una
   sola vez afuera (con rnd) y aca solo se pintan, para que las copias
   sean identicas. */
function envuelto(ctx, s, dibujar) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    ctx.save();
    ctx.translate(dx * s, dy * s);
    dibujar();
    ctx.restore();
  }
}

function rectRedondo(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* Piedra redondeada: puntos alrededor de una elipse con el radio movido
   al azar, unidos por curvas que pasan por los puntos medios. Da formas
   blandas, sin picos, que es lo que se espera de un adoquin pisado. */
function pedrusco(cx, cy, rx, ry, rnd, n = 8) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 0.84 + rnd() * 0.28;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}

function trazarBlob(ctx, pts) {
  const n = pts.length;
  const medio = i => {
    const a = pts[i % n], b = pts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  ctx.beginPath();
  let p = medio(0);
  ctx.moveTo(p[0], p[1]);
  for (let i = 1; i <= n; i++) {
    const c = pts[i % n];
    p = medio(i);
    ctx.quadraticCurveTo(c[0], c[1], p[0], p[1]);
  }
  ctx.closePath();
}

/* Mancha suave: degradado radial que se apaga hacia el borde. */
function manchaSuave(ctx, x, y, r, tono, alfa) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(tono, alfa));
  g.addColorStop(1, rgba(tono, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/* ── Revoque ────────────────────────────────────────────────────────
   Pared encalada: manchas grandes y suaves de humedad vieja, alguna zona
   repintada mas clara, dos o tres grietas finas y un grano casi
   imperceptible. Sin relieve: el entramado de madera ya da volumen. */
function grieta(rnd, s) {
  const pts = [];
  let x = rnd() * s, y = rnd() * s, a = rnd() * TAU;
  const n = 5 + Math.floor(rnd() * 5);
  for (let i = 0; i < n; i++) {
    pts.push([x, y]);
    a += (rnd() - 0.5) * 1.1;
    const l = s * (0.03 + rnd() * 0.04);
    x += Math.cos(a) * l; y += Math.sin(a) * l;
  }
  return pts;
}

function trazarLinea(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

function pintarRevoque(ctx, s, _, rnd) {
  ctx.fillStyle = gris(MEDIA);
  ctx.fillRect(0, 0, s, s);
  sumarRuido(ctx, s, campo(s, rnd, [[3, 0.5], [7, 0.3], [16, 0.2]]), 0.05);

  const manchas = [];
  for (let i = 0; i < 6; i++) manchas.push({ x: rnd() * s, y: rnd() * s, r: s * (0.12 + rnd() * 0.2), tono: MEDIA - 0.25, alfa: 0.05 + rnd() * 0.05 });
  for (let i = 0; i < 3; i++) manchas.push({ x: rnd() * s, y: rnd() * s, r: s * (0.1 + rnd() * 0.15), tono: 1, alfa: 0.05 + rnd() * 0.04 });
  const grietas = [];
  for (let i = 0; i < 3; i++) {
    const g = grieta(rnd, s);
    grietas.push(g);
    /* una rama corta que sale del medio: las grietas reales bifurcan */
    if (rnd() < 0.7) {
      const desde = g[Math.floor(g.length / 2)];
      const rama = grieta(rnd, s).slice(0, 4).map((p, i, arr) => [desde[0] + p[0] - arr[0][0], desde[1] + p[1] - arr[0][1]]);
      grietas.push(rama);
    }
  }
  const motas = [];
  for (let i = 0; i < 260; i++) motas.push([rnd() * s, rnd() * s, rnd() < 0.5]);

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  envuelto(ctx, s, () => {
    for (const m of manchas) manchaSuave(ctx, m.x, m.y, m.r, m.tono, m.alfa);
    for (const g of grietas) {
      /* la grieta oscura y, corrida un pixel, su borde iluminado: asi se lee
         como hendidura y no como linea dibujada */
      trazarLinea(ctx, g);
      ctx.strokeStyle = rgba(MEDIA - 0.3, 0.3); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.save(); ctx.translate(0.8, 0.8);
      trazarLinea(ctx, g);
      ctx.strokeStyle = rgba(1, 0.14); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    for (const [x, y, clara] of motas) {
      ctx.fillStyle = rgba(clara ? 1 : 0, 0.05);
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  });
}

/* ── Silleria ───────────────────────────────────────────────────────
   Tres hiladas por tile, con dos o tres sillares cada una y el aparejo
   trabado (cada hilada arranca corrida al azar). Los bloques tienen su
   tono propio y las caras arriba/abajo un poco desparejas, para que la
   junta no sea una regla. La misma disposicion sirve al mapa de color y
   al relieve, asi las juntas hundidas caen donde estan las juntas. */
function sillares(s, rnd, filas = 3) {
  const pesos = [];
  for (let r = 0; r < filas; r++) pesos.push(0.85 + rnd() * 0.3);
  const total = pesos.reduce((a, b) => a + b, 0);
  const bloques = [];
  let y = 0;
  for (let r = 0; r < filas; r++) {
    const h = s * pesos[r] / total;
    const n = rnd() < 0.6 ? 3 : 2;
    const anchos = [];
    for (let i = 0; i < n; i++) anchos.push(0.7 + rnd() * 0.6);
    const ta = anchos.reduce((a, b) => a + b, 0);
    let x = rnd() * s;   /* puede pasar de s: el envuelto lo trae de vuelta */
    for (let i = 0; i < n; i++) {
      const w = s * anchos[i] / ta;
      bloques.push({
        x, y, w, h,
        d0: (rnd() - 0.5) * s * 0.012, d1: (rnd() - 0.5) * s * 0.012,
        tono: (rnd() - 0.5) * 2
      });
      x += w;
    }
    y += h;
  }
  return bloques;
}

function pintarSilleria(ctx, s, bloques, rnd, contraste) {
  const j = s * 0.014, radio = s * 0.018, junta = MEDIA - contraste;
  ctx.fillStyle = gris(junta);
  ctx.fillRect(0, 0, s, s);
  ctx.lineJoin = 'round';
  envuelto(ctx, s, () => {
    for (const b of bloques) {
      const x = b.x + j / 2, y = b.y + b.d0 + j / 2, w = b.w - j, h = b.h + b.d1 - b.d0 - j;
      rectRedondo(ctx, x, y, w, h, radio);
      ctx.fillStyle = gris(MEDIA + b.tono * contraste * 0.45);
      ctx.fill();
      /* borde suave: dos trazos del tono de la junta, uno ancho y uno
         fino, en vez de un desenfoque que no todos los navegadores dan igual */
      ctx.strokeStyle = rgba(junta, 0.3); ctx.lineWidth = j * 1.2; ctx.stroke();
      ctx.strokeStyle = rgba(junta, 0.3); ctx.lineWidth = j * 0.5; ctx.stroke();
      /* luz arriba, sombra abajo: el bloque se lee con volumen aunque el
         relieve sea chico */
      ctx.save(); ctx.clip();
      ctx.fillStyle = rgba(1, 0.12); ctx.fillRect(x, y, w, j * 0.9);
      ctx.fillStyle = rgba(0, 0.10); ctx.fillRect(x, y + h - j * 0.9, w, j * 0.9);
      ctx.restore();
    }
  });
  sumarRuido(ctx, s, campo(s, rnd, [[6, 0.5], [14, 0.3], [40, 0.2]]), 0.035);
}

function relieveSilleria(ctx, s, bloques, rnd) {
  const j = s * 0.014, radio = s * 0.018;
  ctx.fillStyle = gris(0.32);
  ctx.fillRect(0, 0, s, s);
  ctx.lineJoin = 'round';
  envuelto(ctx, s, () => {
    for (const b of bloques) {
      const x = b.x + j / 2, y = b.y + b.d0 + j / 2, w = b.w - j, h = b.h + b.d1 - b.d0 - j;
      rectRedondo(ctx, x, y, w, h, radio);
      ctx.fillStyle = gris(0.62 + b.tono * 0.05);
      ctx.fill();
      /* chaflan: el borde del bloque baja hacia la junta en dos escalones */
      ctx.strokeStyle = rgba(0.32, 0.5); ctx.lineWidth = j * 1.4; ctx.stroke();
      ctx.strokeStyle = rgba(0.32, 0.4); ctx.lineWidth = j * 0.6; ctx.stroke();
    }
  });
  sumarRuido(ctx, s, campo(s, rnd, [[8, 0.5], [24, 0.5]]), 0.04);
}

/* ── Tejas ──────────────────────────────────────────────────────────
   Cuatro filas por tile, seis tejas curvas por fila, filas alternadas
   media teja. Cada fila tapa el borde de arriba de la de abajo y le tira
   una sombra: eso, mas el degradado convexo de cada teja, es todo lo que
   hace falta para leer un tejado. Se dibuja de abajo hacia arriba y al
   final se repite la fila de abajo corrida un tile para arriba, para que
   tape a la primera igual que la primera tapa a la segunda. */
function tejado(s, rnd, filas = 4, porFila = 6) {
  const H = s / filas, W = s / porFila, tejas = [];
  for (let r = 0; r < filas; r++) {
    const corrido = (r % 2) * W / 2;
    for (let i = 0; i < porFila; i++) {
      tejas.push({ r, x: corrido + i * W, y: r * H, w: W, h: H, tono: (rnd() - 0.5) * 2 });
    }
  }
  return { filas, H, W, tejas };
}

function trazarTeja(ctx, x, yt, yb, w, prof) {
  ctx.beginPath();
  ctx.moveTo(x, yt);
  ctx.lineTo(x + w, yt);
  ctx.lineTo(x + w, yb - prof);
  ctx.quadraticCurveTo(x + w / 2, yb + prof, x, yb - prof);
  ctx.closePath();
}

/* Recorre las filas en el orden correcto y delega el pintado de cada
   teja: el color y el relieve comparten geometria y difieren en tinta. */
function recorrerTejado(ctx, s, t, pintarSombra, pintarTeja) {
  const solape = t.H * 0.4, prof = t.H * 0.16, sombra = t.H * 0.1;
  const fila = (r, offsets) => {
    const propias = t.tejas.filter(tj => tj.r === r);
    for (const [dx, dy] of offsets) {
      ctx.save();
      ctx.translate(dx * s, dy * s);
      for (const tj of propias) {
        trazarTeja(ctx, tj.x, tj.y - solape + sombra, tj.y + tj.h + sombra, tj.w, prof);
        pintarSombra(tj);
      }
      for (const tj of propias) {
        const yt = tj.y - solape, yb = tj.y + tj.h;
        trazarTeja(ctx, tj.x + 1.5, yt, yb, tj.w - 3, prof);   /* 3px de junta entre tejas */
        pintarTeja(tj, yt, yb, prof);
      }
      ctx.restore();
    }
  };
  /* la primera fila, corrida un tile para abajo, va debajo de la ultima:
     es lo que asoma entre los picos de las tejas del borde inferior */
  fila(0, [[-1, 1], [0, 1], [1, 1]]);
  const horizontal = [[-1, 0], [0, 0], [1, 0]];
  for (let r = t.filas - 1; r >= 0; r--) fila(r, horizontal);
  fila(t.filas - 1, [[-1, -1], [0, -1], [1, -1]]);
}

function pintarTejas(ctx, s, t, rnd) {
  ctx.fillStyle = gris(MEDIA - 0.14);   /* lo que asoma entre teja y teja */
  ctx.fillRect(0, 0, s, s);
  recorrerTejado(ctx, s, t,
    () => { ctx.fillStyle = rgba(0, 0.3); ctx.fill(); },
    (tj, yt, yb, prof) => {
      /* teja curva: clara en el lomo, oscura en los dos cantos */
      const base = MEDIA + tj.tono * 0.05;
      const g = ctx.createLinearGradient(tj.x, 0, tj.x + tj.w, 0);
      g.addColorStop(0, gris(base - 0.09));
      g.addColorStop(0.45, gris(base + 0.06));
      g.addColorStop(1, gris(base - 0.1));
      ctx.fillStyle = g;
      ctx.fill();
      /* canto inferior iluminado: la teja tiene espesor */
      ctx.save(); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(tj.x, yb - prof);
      ctx.quadraticCurveTo(tj.x + tj.w / 2, yb + prof, tj.x + tj.w, yb - prof);
      ctx.strokeStyle = rgba(1, 0.2); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    });
  sumarRuido(ctx, s, campo(s, rnd, [[5, 0.6], [12, 0.4]]), 0.025);
}

function relieveTejas(ctx, s, t) {
  ctx.fillStyle = gris(0.3);
  ctx.fillRect(0, 0, s, s);
  recorrerTejado(ctx, s, t,
    () => { ctx.fillStyle = rgba(0.3, 0.55); ctx.fill(); },
    (tj, yt, yb) => {
      const g = ctx.createLinearGradient(tj.x, 0, tj.x + tj.w, 0);
      g.addColorStop(0, gris(0.48));
      g.addColorStop(0.5, gris(0.78));
      g.addColorStop(1, gris(0.48));
      ctx.fillStyle = g;
      ctx.fill();
      /* sube de arriba hacia abajo y cae de golpe en el borde: el escalon */
      ctx.save(); ctx.clip();
      const v = ctx.createLinearGradient(0, yt, 0, yb);
      v.addColorStop(0, rgba(0, 0.4));
      v.addColorStop(1, rgba(0, 0));
      ctx.fillStyle = v;
      ctx.fillRect(tj.x, yt, tj.w, yb - yt);
      ctx.restore();
    });
}

/* ── Madera ─────────────────────────────────────────────────────────
   Tres tablas verticales por tile, con junta entre ellas, vetas que
   ondulan a lo largo y algun nudo. La ondulacion es una suma de senos
   con frecuencias enteras: asi la veta que sale por abajo entra por
   arriba en el mismo punto. */
function armarTablas(s, rnd, n = 3) {
  const w = s / n, tablas = [];
  for (let i = 0; i < n; i++) {
    const vetas = [], nv = 5 + Math.floor(rnd() * 3);
    for (let k = 0; k < nv; k++) vetas.push({
      x: w * (0.08 + 0.84 * (k + rnd()) / nv),
      amp: w * (0.02 + rnd() * 0.05), f: 1 + Math.floor(rnd() * 2), fase: rnd() * TAU,
      amp2: w * 0.015 * rnd(), f2: 2 + Math.floor(rnd() * 3), fase2: rnd() * TAU,
      ancho: 1 + rnd() * 1.4, alfa: 0.1 + rnd() * 0.12, clara: rnd() < 0.25
    });
    const nudo = rnd() < 0.5
      ? { x: i * w + w * (0.3 + rnd() * 0.4), y: s * rnd(), rx: w * (0.06 + rnd() * 0.05), ry: w * (0.1 + rnd() * 0.08) }
      : null;
    tablas.push({ x: i * w, w, tono: (rnd() - 0.5) * 2, vetas, nudo });
  }
  return tablas;
}

function trazarVeta(ctx, t, v, s) {
  ctx.beginPath();
  for (let y = -4; y <= s + 4; y += 4) {
    let x = t.x + v.x
      + v.amp * Math.sin(TAU * v.f * y / s + v.fase)
      + v.amp2 * Math.sin(TAU * v.f2 * y / s + v.fase2);
    x = Math.min(t.x + t.w - 3, Math.max(t.x + 3, x));
    if (y === -4) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
}

function pintarTablas(ctx, s, tablas, rnd) {
  const n = tablas.length, w = s / n;
  ctx.lineCap = 'round';
  for (const t of tablas) {
    ctx.fillStyle = gris(MEDIA + t.tono * 0.04);
    ctx.fillRect(t.x, 0, t.w, s);
    for (const v of t.vetas) {
      trazarVeta(ctx, t, v, s);
      ctx.strokeStyle = v.clara ? rgba(1, v.alfa * 0.8) : rgba(MEDIA - 0.3, v.alfa);
      ctx.lineWidth = v.ancho;
      ctx.stroke();
    }
  }
  /* nudos: mancha oscura, anillo y un halo mas claro alrededor */
  const nudos = tablas.filter(t => t.nudo).map(t => t.nudo);
  envuelto(ctx, s, () => {
    for (const k of nudos) {
      ctx.beginPath(); ctx.ellipse(k.x, k.y, k.rx * 1.9, k.ry * 1.7, 0, 0, TAU);
      ctx.fillStyle = rgba(1, 0.1); ctx.fill();
      ctx.beginPath(); ctx.ellipse(k.x, k.y, k.rx, k.ry, 0, 0, TAU);
      ctx.fillStyle = rgba(MEDIA - 0.3, 0.3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(k.x, k.y, k.rx * 1.35, k.ry * 1.3, 0, 0, TAU);
      ctx.strokeStyle = rgba(MEDIA - 0.3, 0.22); ctx.lineWidth = 1.4; ctx.stroke();
    }
  });
  /* juntas entre tablas, incluida la del borde (x = 0 y x = s son la misma) */
  ctx.lineCap = 'butt';
  for (let i = 0; i <= n; i++) {
    const x = i * w;
    ctx.fillStyle = rgba(MEDIA - 0.3, 0.12); ctx.fillRect(x - 3.5, 0, 7, s);
    ctx.fillStyle = rgba(MEDIA - 0.3, 0.3);  ctx.fillRect(x - 1.5, 0, 3, s);
    if (i < n) { ctx.fillStyle = rgba(1, 0.12); ctx.fillRect(x + 2, 0, 1.5, s); }   /* bisel iluminado */
  }
  sumarRuido(ctx, s, campo(s, rnd, [[5, 0.6], [12, 0.4]]), 0.025);
}

function relieveTablas(ctx, s, tablas) {
  const n = tablas.length, w = s / n;
  ctx.lineCap = 'round';
  for (const t of tablas) {
    ctx.fillStyle = gris(0.62 + t.tono * 0.04);
    ctx.fillRect(t.x, 0, t.w, s);
    for (const v of t.vetas) {
      trazarVeta(ctx, t, v, s);
      ctx.strokeStyle = rgba(0.45, 0.35); ctx.lineWidth = v.ancho; ctx.stroke();
    }
  }
  const nudos = tablas.filter(t => t.nudo).map(t => t.nudo);
  envuelto(ctx, s, () => {
    for (const k of nudos) {
      ctx.beginPath(); ctx.ellipse(k.x, k.y, k.rx * 1.35, k.ry * 1.3, 0, 0, TAU);
      ctx.strokeStyle = rgba(0.45, 0.6); ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(k.x, k.y, k.rx, k.ry, 0, 0, TAU);
      ctx.fillStyle = gris(0.72); ctx.fill();
    }
  });
  for (let i = 0; i <= n; i++) {
    const x = i * w;
    ctx.fillStyle = rgba(0.3, 0.35); ctx.fillRect(x - 4.5, 0, 9, s);
    ctx.fillStyle = rgba(0.3, 0.8);  ctx.fillRect(x - 2.5, 0, 5, s);
  }
}

/* ── Adoquin ────────────────────────────────────────────────────────
   Rejilla de 5×5 trabada (las filas impares corren media celda) con
   cada piedra corrida y de tamaño distinto, para que no se lea la
   rejilla. Las piedras son mas grandes que su celda y se pisan un poco:
   la junta queda angosta y la ultima dibujada tapa a la anterior, como
   en un empedrado apretado. Redondeadas, con un brillo arriba a la
   izquierda y una sombra abajo a la derecha, los dos muy leves. */
function empedrado(s, rnd, n = 5) {
  const c = s / n, piedras = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const cx = (i + 0.5 + (j % 2) * 0.5) * c + (rnd() - 0.5) * c * 0.16;
    const cy = (j + 0.5) * c + (rnd() - 0.5) * c * 0.16;
    const rx = c * (0.46 + rnd() * 0.14), ry = c * (0.42 + rnd() * 0.14);
    piedras.push({ cx, cy, r: Math.max(rx, ry), pts: pedrusco(cx, cy, rx, ry, rnd, 7), tono: (rnd() - 0.5) * 2 });
  }
  return piedras;
}

function pintarEmpedrado(ctx, s, piedras, rnd) {
  const junta = MEDIA - 0.14;
  ctx.fillStyle = gris(junta);
  ctx.fillRect(0, 0, s, s);
  ctx.lineJoin = 'round';
  envuelto(ctx, s, () => {
    for (const p of piedras) {
      trazarBlob(ctx, p.pts);
      ctx.fillStyle = gris(MEDIA + p.tono * 0.05);
      ctx.fill();
      ctx.strokeStyle = rgba(junta, 0.35); ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = rgba(junta, 0.3);  ctx.lineWidth = 1.2; ctx.stroke();
      /* apenas un brillo y una sombra: si se marcan mas, la piedra se lee
         como bolita suelta y no como adoquin pisado */
      ctx.save(); ctx.clip();
      manchaSuave(ctx, p.cx - p.r * 0.25, p.cy - p.r * 0.3, p.r * 0.9, 1, 0.1);
      manchaSuave(ctx, p.cx + p.r * 0.3, p.cy + p.r * 0.35, p.r * 0.9, 0, 0.07);
      ctx.restore();
    }
  });
  sumarRuido(ctx, s, campo(s, rnd, [[6, 0.5], [16, 0.5]]), 0.03);
}

function relieveEmpedrado(ctx, s, piedras) {
  ctx.fillStyle = gris(0.3);
  ctx.fillRect(0, 0, s, s);
  ctx.lineJoin = 'round';
  envuelto(ctx, s, () => {
    for (const p of piedras) {
      trazarBlob(ctx, p.pts);
      /* cupula: alta en el centro, baja hacia la junta */
      const g = ctx.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, p.r);
      g.addColorStop(0, gris(0.8));
      g.addColorStop(1, gris(0.45));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(0.3, 0.5); ctx.lineWidth = 3; ctx.stroke();
    }
  });
}

/* ── Tierra ─────────────────────────────────────────────────────────
   Moteado suave con manchas mas oscuras (pisado, humedo) y unos pocos
   guijarros con su sombrita. Relieve casi plano: solo los guijarros y
   un ondulado leve. */
function armarTierra(s, rnd) {
  const manchas = [], guijarros = [];
  for (let i = 0; i < 7; i++) manchas.push({ x: rnd() * s, y: rnd() * s, r: s * (0.1 + rnd() * 0.18), oscura: rnd() < 0.7 });
  for (let i = 0; i < 10; i++) {
    const r = 2.5 + rnd() * 4;
    guijarros.push({ x: rnd() * s, y: rnd() * s, rx: r, ry: r * (0.6 + rnd() * 0.4), rot: rnd() * Math.PI });
  }
  return { manchas, guijarros };
}

function pintarTierra(ctx, s, d, rnd) {
  ctx.fillStyle = gris(MEDIA);
  ctx.fillRect(0, 0, s, s);
  sumarRuido(ctx, s, campo(s, rnd, [[4, 0.5], [9, 0.3], [22, 0.2]]), 0.06);
  const motas = [];
  for (let i = 0; i < 300; i++) motas.push([rnd() * s, rnd() * s, rnd() < 0.4]);
  envuelto(ctx, s, () => {
    for (const m of d.manchas) manchaSuave(ctx, m.x, m.y, m.r, m.oscura ? MEDIA - 0.25 : 1, 0.1);
    for (const g of d.guijarros) {
      ctx.beginPath(); ctx.ellipse(g.x + 1, g.y + 1.5, g.rx, g.ry, g.rot, 0, TAU);
      ctx.fillStyle = rgba(0, 0.22); ctx.fill();
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx, g.ry, g.rot, 0, TAU);
      ctx.fillStyle = gris(MEDIA + 0.07); ctx.fill();
      ctx.beginPath(); ctx.ellipse(g.x - g.rx * 0.3, g.y - g.ry * 0.3, g.rx * 0.4, g.ry * 0.4, g.rot, 0, TAU);
      ctx.fillStyle = rgba(1, 0.25); ctx.fill();
    }
    for (const [x, y, clara] of motas) {
      ctx.fillStyle = rgba(clara ? 1 : 0, 0.06);
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  });
}

function relieveTierra(ctx, s, d, rnd) {
  ctx.fillStyle = gris(0.55);
  ctx.fillRect(0, 0, s, s);
  sumarRuido(ctx, s, campo(s, rnd, [[5, 0.5], [12, 0.5]]), 0.05);
  envuelto(ctx, s, () => {
    for (const g of d.guijarros) {
      const r = Math.max(g.rx, g.ry) * 1.2;
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
      grad.addColorStop(0, rgba(0.85, 1));
      grad.addColorStop(1, rgba(0.85, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2);
    }
  });
}

/* ── Pasto ──────────────────────────────────────────────────────────
   Dos tonos en pinceladas cortas, casi verticales, sobre un ondulado
   lento: de cerca son briznas, de lejos un moteado parejo. Sin relieve. */
function pintarPasto(ctx, s, _, rnd) {
  ctx.fillStyle = gris(MEDIA);
  ctx.fillRect(0, 0, s, s);
  sumarRuido(ctx, s, campo(s, rnd, [[3, 0.6], [8, 0.4]]), 0.035);
  const dabs = [];
  for (let i = 0; i < 1600; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 0.9, l = 3 + rnd() * 4;
    dabs.push({ x: rnd() * s, y: rnd() * s, dx: Math.cos(a) * l, dy: Math.sin(a) * l, clara: rnd() < 0.5 });
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  envuelto(ctx, s, () => {
    for (const clara of [false, true]) {
      ctx.strokeStyle = rgba(clara ? MEDIA + 0.1 : MEDIA - 0.1, 0.5);
      ctx.beginPath();
      for (const d of dabs) if (d.clara === clara) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.dx, d.y + d.dy);
      }
      ctx.stroke();
    }
  });
}

/* ── Tela ───────────────────────────────────────────────────────────
   Trama de hilos cada 4px, apenas visible, con un hilo claro entre
   medio para que respire. A la distancia de la camara se funde en un
   gris con textura; de cerca se lee como tejido. Sin relieve. */
function pintarTela(ctx, s, _, rnd) {
  ctx.fillStyle = gris(MEDIA);
  ctx.fillRect(0, 0, s, s);
  sumarRuido(ctx, s, campo(s, rnd, [[5, 0.6], [13, 0.4]]), 0.025);
  const paso = 4;   /* divide a 256: la trama empalma en el borde */
  ctx.fillStyle = rgba(MEDIA - 0.25, 0.07);
  for (let y = 0; y < s; y += paso) ctx.fillRect(0, y, s, 1);
  ctx.fillStyle = rgba(MEDIA - 0.25, 0.05);
  for (let x = 0; x < s; x += paso) ctx.fillRect(x, 0, 1, s);
  ctx.fillStyle = rgba(1, 0.05);
  for (let y = 2; y < s; y += paso) ctx.fillRect(0, y, s, 1);
}

/* ── Catalogo ───────────────────────────────────────────────────────
   armar: calcula la disposicion (bloques, tejas, tablas...) que comparten
   el mapa de color y el relieve. mapa/relieve pintan sobre un canvas de
   tam×tam. Cada uno recibe su propio generador derivado de la semilla,
   asi cambiar el pintado de uno no mueve las formas del otro. */
const TEXTURAS = {
  revoque:      { tam: 256, semilla: 101, armar: null,        mapa: pintarRevoque,   relieve: null },
  piedra:       { tam: 512, semilla: 202, armar: sillares,
                  mapa: (ctx, s, d, rnd) => pintarSilleria(ctx, s, d, rnd, 0.13), relieve: relieveSilleria },
  piedraOscura: { tam: 512, semilla: 303, armar: sillares,
                  mapa: (ctx, s, d, rnd) => pintarSilleria(ctx, s, d, rnd, 0.2),  relieve: relieveSilleria },
  teja:         { tam: 512, semilla: 404, armar: tejado,      mapa: pintarTejas,     relieve: relieveTejas },
  madera:       { tam: 256, semilla: 505, armar: armarTablas, mapa: pintarTablas,    relieve: relieveTablas },
  adoquin:      { tam: 256, semilla: 606, armar: empedrado,   mapa: pintarEmpedrado, relieve: relieveEmpedrado },
  tierra:       { tam: 256, semilla: 707, armar: armarTierra, mapa: pintarTierra,    relieve: relieveTierra },
  pasto:        { tam: 256, semilla: 808, armar: null,        mapa: pintarPasto,     relieve: null },
  tela:         { tam: 256, semilla: 909, armar: null,        mapa: pintarTela,      relieve: null }
};

const cache = { mapa: new Map(), relieve: new Map(), datos: new Map() };

function crearTextura(canvas, esColor) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  /* el mapa de color esta pintado en sRGB; el relieve es altura, lineal */
  t.colorSpace = esColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function generar(nombre, tipo) {
  const def = TEXTURAS[nombre];
  if (!def || !def[tipo] || typeof document === 'undefined') return null;
  const guardado = cache[tipo].get(nombre);
  if (guardado) return guardado;

  if (!cache.datos.has(nombre)) {
    cache.datos.set(nombre, def.armar ? def.armar(def.tam, azar(def.semilla)) : null);
  }
  const { canvas, ctx } = lienzo(def.tam);
  def[tipo](ctx, def.tam, cache.datos.get(nombre), azar(def.semilla + (tipo === 'mapa' ? 1 : 2)));
  const t = crearTextura(canvas, tipo === 'mapa');
  cache[tipo].set(nombre, t);
  return t;
}

export function texturaDe(nombre) { return generar(nombre, 'mapa'); }
export function bumpDe(nombre) { return generar(nombre, 'relieve'); }

/* Mismo material que mat() de paleta.js, con los mapas puestos. El
   bumpScale es chico a proposito: el estilo es pintado, el relieve solo
   tiene que insinuar las juntas cuando la luz cae de costado. */
export function materialTexturado(color, nombre, extra = {}) {
  const base = { color, flatShading: true, roughness: 0.92, metalness: 0 };
  const map = nombre ? texturaDe(nombre) : null;
  if (!map) return new THREE.MeshStandardMaterial({ ...base, ...extra });
  const bumpMap = bumpDe(nombre);
  return new THREE.MeshStandardMaterial({
    ...base, map, ...(bumpMap ? { bumpMap, bumpScale: 0.06 } : {}), ...extra
  });
}
