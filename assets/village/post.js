/* ═══════════════════════════════════════════════════════════════════
   POST-PROCESO  (stub: se reemplaza por la implementacion completa)

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
   ═══════════════════════════════════════════════════════════════════ */

export function crearPost({ render, escena, camara, calidad = 'alta' }) {
  return {
    calidad: 'baja',
    render() { render.render(escena, camara); },
    redimensionar() {},
    setNoche() {}
  };
}
