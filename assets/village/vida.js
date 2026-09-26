/* ═══════════════════════════════════════════════════════════════════
   VIDA  (stub)

   crearVida(escena, { nodos, posiciones, alturaTerreno, anillos })
     anillos: [{ radio, y }] — los caminos circulares de cada terraza
     → { actualizar(t, dt), setNoche(t) }

   Lo que se mueve:
     - aldeanos low-poly (6-8) caminando por los caminos circulares y
       bajando/subiendo por las escaleras; balanceo al caminar, miran
       hacia donde van, colores de ropa variados, algun sombrero
     - pajaros en dos bandadas girando sobre el torreon, aleteo
     - molino de viento en el anillo exterior con aspas girando
     - banderas: los meshes marcados userData.esBandera se ondulan
       (vertex animation); vida.js los encuentra con escena.traverse
   ═══════════════════════════════════════════════════════════════════ */

export function crearVida() {
  return { actualizar() {}, setNoche() {} };
}
