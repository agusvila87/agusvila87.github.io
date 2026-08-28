# Notas de la aldea

Apuntes para revisar más adelante. No es documentación del código — para eso
están los comentarios de cada módulo en `assets/village/`.

---

## Pendiente inmediato

- [ ] **Subir la foto de perfil.** El panel ya la busca en `assets/foto.jpg`.
      Mientras el archivo no exista muestra las iniciales "AV" y no se rompe
      nada, pero tira un 404 en la consola. Para resolverlo:

      cp /ruta/a/tu/foto.jpg assets/foto.jpg

      Cuadrada, 500×500 alcanza. La ruta ya está puesta en
      `assets/village/data.js` (campo `foto` del objeto `PERFIL`).

- [ ] **Imagen de Open Graph.** Falta subir `og.png` (1200×630) a la raíz.
      El `<meta property="og:image">` ya la apunta. Sin eso, cuando compartís
      el link por WhatsApp o LinkedIn no aparece la preview.

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
