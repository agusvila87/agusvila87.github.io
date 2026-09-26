/* ═══════════════════════════════════════════════════════════════════
   AGUA  (stub)

   crearFoso({ radioInterno, radioExterno, y, segmentos })
     → { mesh, actualizar(t), setNoche(t) }
     Anillo de agua animada alrededor de la muralla. Shader propio:
     olas suaves, fresnel, color de cielo reflejado (uniforms de dia y
     noche), un poco de transparencia y espuma tenue en los bordes.

   crearRio(puntos, ancho, y) → { mesh, actualizar(t), setNoche(t) }
     Cinta de agua que sigue una polilinea [[x,z],...], mismo material.

   crearPuente({ largo, ancho, y, matMadera }) → THREE.Group
     Puente de tablones sobre el foso, alineado con la avenida (eje +Z).
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export function crearFoso() {
  return { mesh: new THREE.Group(), actualizar() {}, setNoche() {} };
}
export function crearRio() {
  return { mesh: new THREE.Group(), actualizar() {}, setNoche() {} };
}
export function crearPuente() { return new THREE.Group(); }
