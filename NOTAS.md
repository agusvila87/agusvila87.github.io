# Notas de la aldea

Apuntes para revisar más adelante. No es documentación del código — para eso
están los comentarios de cada módulo en `assets/village/`.

---

## Pendiente inmediato

- [x] ~~Subir la foto de perfil.~~ Hecho. `assets/foto.jpg`, 512×512 y
      ~47 KB. Salió de `Foto Nueva 4x4.jpg` (2395×2395, 1,1 MB), que quedó
      en la carpeta local pero fuera del repo por `.gitignore`. Si la
      querés cambiar, reemplazá `assets/foto.jpg` por otra cuadrada; si el
      archivo llegara a faltar, la ficha cae sola a las iniciales "AV".

- [x] ~~Imagen de Open Graph.~~ Hecha: `og.jpg` (1200×630, ~140 KB) generada desde
      la propia aldea con la vista general de día. Si querés otra, cualquier
      captura del canvas a esa proporción sirve; el `<meta>` ya la apunta.

---

## Segunda etapa (septiembre 2026): de blockout a mundo

Lo que se agregó, módulo por módulo, y qué botón tocar en cada uno:

| Módulo | Qué hace | Dónde ajustar |
|---|---|---|
| `luces.js` | Sol de hora dorada y luna; `setNoche(t)` | constantes `DIA` / `NOCHE` |
| `post.js` | EffectComposer: GTAO, bloom, grade (viñeta, calidez, noche), ACES | constantes al principio y uniforms del `GradeShader`; umbral de bloom de día si el oro no florece |
| `texturas.js` | 9 texturas de canvas (revoque, piedra, piedraOscura, teja, madera, adoquín, tierra, pasto, tela) + bump | `MEDIA = 0.86` (gris medio); `sillares()`, `tejado()`, `armarTablas()` para escala |
| `agua.js` | Foso, río y puente. Shader propio con olas, fresnel, espuma | uniforms de color día/noche; `K_FLUJO` |
| `horizonte.js` | Cordillera, bosque lejano (900 instancias), arbustos, hiedra, flores, rocas | array de cúmulos (ángulo, radio, picos); `LAMINA_RIO` |
| `vida.js` | 7 aldeanos con circuitos y escaleras, 2 bandadas, molino, banderas ondeando | `azar(7331)`; circuitos en `armarCircuitos` |
| `escenario.js` | Terrazas, muralla con almenas y contrafuertes, **cauce del foso y del río en `alturaTerreno`**, trazado del río (`RIO`) | `R_FOSO_*`, `PROFUNDIDAD_*`, `RIO_CONTROL` |
| `paleta.js` | `CLASES`, UVs a escala de mundo (`UNIDADES_POR_TILE`), techo con alero levantado, postigos/jardinera/arco/cartel/estandarte, `fusionar` | — |

Reglas que conviene no romper:
- Todo importa `three` por el **import map** de `index.html`. Nunca la ruta del archivo: serían dos copias de Three.
- Lo que se **anima** (humo, banderas, aspas, aldeanos) va marcado `userData.animado` o queda fuera de `fusionar()`. Lo demás se fusiona por material.
- El **agua tiene que tener cauce**: una lámina sobre un plano opaco no se ve. Foso y río se cavan en `alturaTerreno`, que es la única fuente de verdad de la altura del piso.
- Calidad: desktop `alta` (con GTAO), touch/angosto `media` (sin GTAO), `?calidad=baja` para depurar. `?sin-intro` salta la entrada cinematica. Medido: ~300 draw calls y ~140k triángulos la escena, más los pases.

---

## Tercera etapa (septiembre 2026): de escenario a portfolio

La aldea ya estaba linda pero adentro de cada edificio había lo mismo que
en la versión clásica. Esta etapa hace que el sitio conteste rápido
"qué hizo esta persona y cómo piensa".

| Pieza | Qué es | Dónde se edita |
|---|---|---|
| Portada | El pitch de tres segundos sobre la entrada cinemática, con Tour / Explorar / Lista | HTML `#portada` en `index.html`; las cifras están a mano ahí |
| Tour guiado | La cámara va parada por parada (8 s cada una), con una frase por proyecto y cierre con CV/LinkedIn/mail | `ORDEN_TOUR`, `CIERRE_TOUR` y el campo `tour` de cada nodo en `data.js` |
| Blueprint | La aldea como greybox: materiales planos, contornos, anillos, accesos, camino crítico y anotaciones | `blueprint.js` (motor), `ANOTACIONES` en `data.js` (texto y posición) |
| Fichas case study | Video primero, después "El proyecto", "Mi rol", "Decisiones de diseño", "Además", "Qué aprendí" | campos `miRol`, `decisiones[{titulo,texto}]`, `aprendi` en cada nodo. Las secciones vacías no se dibujan |
| Ficha meta | "Cómo diseñé esta aldea": el sitio mismo como case study, con botón al plano | `ALDEA` en `data.js` |
| Lista plana | Todos los proyectos en una ventana, para el que no quiere orbitar | `fichaLista()` en `index.html` |

Atajos: `?sin-intro` salta cinemática y portada; `?sin-portada` solo la
portada. Esc cierra lo que esté más arriba (lightbox → ficha → portada →
tour → blueprint). Flechas ← → mueven el tour.

**Lo que falta y solo lo podés llenar vos** (sin inventar nada quedó así):
- `decisiones` solo tienen Sealcoating, SolAR, Cold Blooded y Bit Con: eran
  los únicos con material real en los textos. Zack 2, Grab it, OrbBuster,
  Proyecto Caos, Asteroids y Cold World tienen una sola línea. Con dos o
  tres decisiones por juego (qué problema había, qué probaste, qué quedó)
  la ficha las dibuja sola.
- `aprendi` está soportado pero vacío en todos.
- Imágenes de trabajo (mapas de nivel, greyboxes, planillas de balanceo,
  bocetos) irían en `imagenes` de cada casa. Hoy solo los dos estudios
  tienen tiras.
- La ficha meta dice que el código se escribió "en pareja con Claude
  Code". Es verdad; si preferís no decirlo, está en `ALDEA.parrafos[1]`.

---

## Llevar los assets del pack de Unity a la web

Sobre *Modular Stylized Medieval Town* (StylArts), que ya está comprado.

### Se puede, y las herramientas están instaladas

- Blender 5.1 → `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`
- Unity 6000.2 / 6000.3 (varias versiones en el Hub)

FBX directo al navegador no conviene: existe `FBXLoader` en Three.js pero el
formato es pesado y lento de parsear. El camino correcto es **FBX → glTF/GLB**,
que es el formato nativo de la web. Blender lo hace headless, sin abrir la GUI:

    blender.exe --background --python convertir.py

Después, del lado web hay que vendorizar `GLTFLoader` y `DRACOLoader` junto a
`three.module.min.js`, y reemplazar `construirEdificio()` en
`assets/village/edificios.js` por un loader. **Ese es el único punto de
contacto**: cámara, selección, hover, etiqueta y fichas siguen igual.

### Tres cosas a resolver antes, en orden de importancia

**1. Licencia.** Es lo primero que hay que mirar. La EULA estándar del Asset
Store está escrita para distribuir assets dentro de un producto integrado del
que no se puedan extraer. Un `.glb` servido desde una web pública se baja con
click derecho: cualquiera se lleva los modelos. No tengo confirmado qué dice
exactamente la versión vigente de la EULA — hay que leerla antes de publicar,
no después. Si el uso web no está permitido, la aldea procedural actual sigue
siendo 100% propia y publicable sin problema.

**2. Los materiales no viajan; las mallas y texturas sí.** El pack es
**HDRP-only** (la propia ficha del Asset Store dice "Built-in: Not compatible,
URP: Not compatible"). Esos shaders no existen en web. Las mallas y los mapas
(albedo, normal, roughness) pasan bien y se rearman como PBR
metallic-roughness, que es lo que glTF usa de forma nativa. O sea: se ve
parecido, pero hay trabajo de materiales de por medio.

   → Ojo que esto también aplica al plan de hacerlo en Unity: si tus proyectos
     están en Built-in o URP, vas a tener que migrar el proyecto a HDRP o
     reconvertir todos los materiales del pack.

**3. El peso.** El pack son 194 MB. Hoy el sitio entero pesa ~700 KB y carga
instantáneo. Un portfolio que tarda en abrir pierde al que lo está mirando.
Plan razonable: elegir 10–15 piezas modulares (dos o tres variantes de casa,
una torre, muro, algunos props), reducir texturas y comprimir con Draco +
KTX2, apuntando a **3–6 MB** en total.

### Qué haría falta para arrancar

La carpeta con los FBX y sus texturas, o la ruta del proyecto Unity donde está
importado el pack.

---

## Decisiones tomadas, por si hay que revisarlas

- **Sin carteles fijos.** Los nombres aparecen sólo al pasar el cursor, en una
  etiqueta anclada al techo del edificio. En touch no se muestra: el dedo
  dispara `pointermove` justo antes del tap y pegaba un flash inútil.
- **La vista general no selecciona nada.** Al entrar no hay edificio marcado.
  El panel igual muestra el perfil, que es el contenido natural de entrada.
- **El rango se lee por material, no por tamaño.** Tres clases en
  `assets/village/paleta.js` → `CLASES`: torreón (púrpura + oro), castillos
  (pizarra azul + bronce), casas (terracota + madera).
- **Geometría fusionada por material.** Sin eso eran 1663 draw calls; con eso,
  ~170. Cada primitiva era una llamada aparte.
- **Three.js vendorizado**, sin CDN: el sitio funciona offline y no depende de
  que unpkg siga en pie.
- **`clasico.html`** es el portfolio anterior, intacto y linkeado desde la
  barra de arriba. Es también el respaldo para quien entre sin WebGL.

---

## Cosas que se rompieron y cómo, por si vuelven

- **La pantalla de carga no se iba.** Dependía de `requestAnimationFrame`, que
  el navegador no dispara si la pestaña no está componiendo (pestaña en
  segundo plano, ventana minimizada, mobile ahorrando batería). Ahora se saca
  al iniciar, con un timer de 5 s de respaldo.
- **El coronamiento de las terrazas tapaba el pasto.** Estaba hecho con un
  cilindro sólido, y su tapa superior es un disco que cubría la terraza
  entera. Va abierto (`openEnded`).
- **El resaltado lavaba el color de clase.** Con emissive 0.15 el castillo
  seleccionado perdía su azul y quedaba lavanda. Bajado a 0.07.
- **Caché del navegador.** Al probar cambios, forzá recarga dura
  (Ctrl+Shift+R) o vas a estar mirando la versión vieja y pensando que algo
  no funcionó.
