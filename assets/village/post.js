/* ═══════════════════════════════════════════════════════════════════
   POST-PROCESO

   API que espera village.js:

   crearPost({ render, escena, camara, calidad })
     calidad: 'alta' | 'media' | 'baja'
       alta  → GTAO + bloom + grade/viñeta + output (ACES), MSAA en el target
       media → bloom + grade, sin AO
       baja  → passthrough (render.render directo)
     devuelve {
       render(dt)             dibuja un cuadro
       redimensionar(w, h)    tamaño en pixeles CSS (el pixelRatio lo pone render)
       setNoche(t)            0 = dia, 1 = noche; ajusta el grade (mas frio, mas
                              oscuro, bloom mas presente) con transicion suave
       calidad                la calidad efectiva
     }

   Cadena (alta):
     RenderPass → GTAOPass → UnrealBloomPass → grade (ShaderPass) → OutputPass

   Por que el orden es ese: con EffectComposer la escena se dibuja en un
   target lineal HDR (HalfFloat) y Three NO aplica tone mapping ni sRGB
   mientras el render target no es la pantalla. Eso lo hace OutputPass al
   final, leyendo render.toneMapping y render.toneMappingExposure. Asi que
   AO, bloom y el grade trabajan sobre luz lineal, antes de ACES: el bloom
   agarra lo que de verdad es brillante (emissive, oro al sol) y el grade
   no recorta nada. La contra es que sus numeros no son "de pantalla": una
   viñeta del 34% en lineal termina siendo ~18% a ojo despues del gamma.

   Si algo falla al armar un pass (contexto sin float MSAA, shader que no
   compila, etc.) se baja un escalon de calidad y se avisa por consola.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ── Parametros ────────────────────────────────────────────────────── */

const EXPOSICION_RENDER = 1.05;   // la aplica OutputPass (o el renderer en 'baja')

/* Oclusion. Radio en unidades de mundo: las casas miden ~5, asi que 3.5
   marca el encuentro pared-piso y los rincones entre edificios sin
   ensuciar fachadas enteras. thickness es cuanto puede alejarse en
   profundidad una muestra para seguir contando como oclusor; con el
   default (1) a esta escala se pierden muchos contactos. */
const AO = {
  radius: 3.5,
  distanceExponent: 1.0,
  thickness: 1.2,
  distanceFallOff: 1.0,
  scale: 1.0,
  samples: 16,
  screenSpaceRadius: false
};
/* Denoise Poisson: valores del propio GTAOPass, explicitados para poder
   tocarlos sin buscar en el vendor. */
const DENOISE = { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 8, radiusExponent: 2, rings: 2, samples: 16 };
const AO_INTENSIDAD = 0.9;

/* Bloom de dia sutil (solo oro, ventanas y faroles superan el umbral);
   de noche pasa a ser el efecto principal. */
const BLOOM = {
  radio: 0.55,
  dia:   { fuerza: 0.32, umbral: 0.86 },
  noche: { fuerza: 0.85, umbral: 0.50 }
};

const MUESTRAS_MSAA = 4;

/* ── Grade ─────────────────────────────────────────────────────────── */

/* Trabaja en lineal HDR, antes de ACES (ver encabezado). Todo lo de
   noche sale del uniform `noche`, asi la transicion es un solo numero
   que village.js mueve cada cuadro. */
const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse:   { value: null },
    exposicion: { value: 1.0 },
    contraste:  { value: 1.08 },   // potencia alrededor del gris medio
    saturacion: { value: 1.08 },   // +8% de dia
    calidez:    { value: 0.40 },   // cuanto empujan las luces hacia ambar
    vineta:     { value: 0.34 },   // oscurecimiento lineal en las esquinas (~18% a ojo)
    noche:      { value: 0.0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float exposicion;
    uniform float contraste;
    uniform float saturacion;
    uniform float calidez;
    uniform float vineta;
    uniform float noche;
    varying vec2 vUv;

    const vec3 LUMA  = vec3( 0.2126, 0.7152, 0.0722 );
    const vec3 AMBAR = vec3( 1.00, 0.92, 0.78 );   // tinte de las luces de dia
    const vec3 AZUL  = vec3( 0.80, 0.88, 1.12 );   // tinte de los medios de noche
    const float GRIS = 0.18;                        // gris medio lineal

    void main() {
      vec3 c = max( texture2D( tDiffuse, vUv ).rgb, 0.0 );

      /* exposicion: de noche baja 35%, el resto de la oscuridad la ponen
         las luces de la escena */
      c *= exposicion * ( 1.0 - 0.35 * noche );

      /* contraste como potencia alrededor del gris medio: no recorta
         ni aplasta los valores HDR que despues necesita el bloom */
      c = GRIS * pow( max( c, 1e-5 ) / GRIS, vec3( contraste ) );

      float l = dot( c, LUMA );

      /* calidez: solo las luces, y solo de dia */
      float luces = smoothstep( 0.25, 1.4, l );
      c = mix( c, c * AMBAR, calidez * luces * ( 1.0 - noche ) );

      /* noche: enfria los medios tonos y deja tranquilas las luces, que
         son ventanas y faroles y tienen que seguir calidas */
      float medios = smoothstep( 0.0, 0.08, l ) * ( 1.0 - smoothstep( 0.35, 1.2, l ) );
      c = mix( c, c * AZUL, 0.55 * noche * medios );

      /* saturacion: +8% de dia, un poco por debajo de neutro de noche */
      float sat = saturacion * ( 1.0 - 0.15 * noche );
      c = mix( vec3( dot( c, LUMA ) ), c, sat );

      /* viñeta: radio grande, en uv (elipse con el aspecto de la
         pantalla, que es como se espera verla); de noche cierra mas */
      float r = length( vUv - 0.5 );
      float v = smoothstep( 0.38, 0.78, r );
      c *= max( 0.0, 1.0 - vineta * v * ( 1.0 + 0.6 * noche ) );

      gl_FragColor = vec4( c, 1.0 );
    }`
};

/* ── Armado ────────────────────────────────────────────────────────── */

const NIVELES = ['alta', 'media', 'baja'];
const lerp = (a, b, t) => a + (b - a) * t;

/* Cosas que no deben entrar al G-buffer del AO: puntos y lineas (eso ya
   lo hace el pass) mas cualquier transparente. El humo de las chimeneas
   es un monton de esferas con opacidad; en el buffer de normales serian
   solidas y dejarian manchas oscuras moviendose por los techos. */
const fueraDelGBuffer = o => o.isPoints || o.isLine || o.isSprite ||
  (o.material && o.material.transparent === true);

function armarCadena(nivel, { render, escena, camara }) {
  const tam = render.getSize(new THREE.Vector2());
  const pr = render.getPixelRatio();
  const w = Math.max(1, Math.floor(tam.width * pr));
  const h = Math.max(1, Math.floor(tam.height * pr));

  /* El composer anula el antialias del canvas (la escena ya no se dibuja
     ahi), asi que el MSAA va en el target. HalfFloat para que el bloom
     tenga rango sobre 1. */
  const objetivo = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    samples: MUESTRAS_MSAA
  });
  objetivo.texture.name = 'Post.rt';

  const composer = new EffectComposer(render, objetivo);
  const passes = [];
  const agregar = p => { composer.addPass(p); passes.push(p); return p; };

  try {
    agregar(new RenderPass(escena, camara));

    let gtao = null;
    if (nivel === 'alta') {
      gtao = new GTAOPass(escena, camara, w, h, undefined, AO, DENOISE);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = AO_INTENSIDAD;
      /* misma logica que el original (cachea visible y lo restaura), con
         el filtro ampliado a transparentes */
      gtao.overrideVisibility = function () {
        const cache = this._visibilityCache;
        this.scene.traverse(o => {
          cache.set(o, o.visible);
          if (fueraDelGBuffer(o)) o.visible = false;
        });
      };
      agregar(gtao);
    }

    const bloom = agregar(new UnrealBloomPass(new THREE.Vector2(w, h),
      BLOOM.dia.fuerza, BLOOM.radio, BLOOM.dia.umbral));

    const grade = agregar(new ShaderPass(GradeShader));

    /* ultimo: tone mapping (ACES, lo lee del renderer) + sRGB */
    agregar(new OutputPass());

    /* EffectComposer construido con target propio guarda el ancho en
       pixeles fisicos y despues lo vuelve a multiplicar por el pixelRatio.
       Un setSize en unidades CSS lo deja coherente antes del primer cuadro. */
    composer.setSize(tam.width, tam.height);

    return { composer, passes, gtao, bloom, grade, pixelRatio: pr };
  } catch (err) {
    for (const p of passes) { if (typeof p.dispose === 'function') p.dispose(); }
    composer.dispose();
    throw err;
  }
}

export function crearPost({ render, escena, camara, calidad = 'alta' }) {
  /* Consistencia entre niveles: en 'baja' el renderer aplica ACES solo;
     con composer lo hace OutputPass leyendo estos mismos valores. */
  render.toneMapping = THREE.ACESFilmicToneMapping;
  render.toneMappingExposure = EXPOSICION_RENDER;

  let nivel = NIVELES.includes(calidad) ? calidad : 'alta';
  let cadena = null;

  while (nivel !== 'baja' && !cadena) {
    try {
      cadena = armarCadena(nivel, { render, escena, camara });
    } catch (err) {
      const siguiente = NIVELES[NIVELES.indexOf(nivel) + 1];
      console.warn(`post: no se pudo armar la calidad '${nivel}', bajando a '${siguiente}'.`, err);
      nivel = siguiente;
    }
  }

  if (!cadena) {
    return {
      calidad: 'baja',
      render() { render.render(escena, camara); },
      redimensionar() {},
      setNoche() {}
    };
  }

  const { composer, bloom, grade } = cadena;
  let pixelRatio = cadena.pixelRatio;

  function redimensionar(w, h) {
    const pr = render.getPixelRatio();
    /* setPixelRatio ya llama a setSize con el tamaño viejo; solo vale la
       pena cuando cambio de verdad (mover la ventana entre monitores) */
    if (pr !== pixelRatio) { pixelRatio = pr; composer.setPixelRatio(pr); }
    /* setSize del composer propaga a todos los passes (GTAO y bloom
       incluidos) en pixeles fisicos */
    composer.setSize(w, h);
  }

  function setNoche(t) {
    t = THREE.MathUtils.clamp(Number(t) || 0, 0, 1);
    grade.uniforms.noche.value = t;
    bloom.strength  = lerp(BLOOM.dia.fuerza, BLOOM.noche.fuerza, t);
    bloom.threshold = lerp(BLOOM.dia.umbral, BLOOM.noche.umbral, t);
  }

  return {
    calidad: nivel,
    render(dt) { composer.render(dt); },
    redimensionar,
    setNoche
  };
}
