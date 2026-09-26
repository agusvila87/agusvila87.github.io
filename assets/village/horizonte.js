/* ═══════════════════════════════════════════════════════════════════
   HORIZONTE  (stub)

   construirHorizonte(escena, { alturaTerreno, radioMuralla, radioFoso })
     → { actualizar(t), setNoche(t) }

   Todo lo que da profundidad mas alla de la aldea:
     - cordillera lejana (r 170..320): siluetas low-poly con picos
       nevados, escalonadas para que la niebla las separe en capas
     - bosque lejano (r > radioFoso + 25): arboles low-poly instanciados,
       denso, tenido por la niebla; NUNCA dentro de la aldea
     - arbustos e hiedra: matas chicas apoyadas contra la muralla y los
       muros de las terrazas, canteros con flores. No arboles.
     - rocas y piedras grandes en las colinas
   Determinista (azar de paleta.js).
   ═══════════════════════════════════════════════════════════════════ */

export function construirHorizonte() {
  return { actualizar() {}, setNoche() {} };
}
