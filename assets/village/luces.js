/* ═══════════════════════════════════════════════════════════════════
   LUCES
   Hora dorada de dia: sol bajo y tibio que estira las sombras, cielo
   azul de relleno y rebote verde del pasto. De noche, luna fria y
   tenue, y todo lo demas lo hacen las ventanas y los faroles con
   emissive + bloom.

   crearLuces(escena) → { sol, setNoche(t) }   t: 0 dia … 1 noche
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const DIA = {
  sol:      { color: 0xFFE2B4, intensidad: 2.6, pos: new THREE.Vector3(-96, 58, 74) },
  hemi:     { cielo: 0xA9CFEC, suelo: 0x7E9A4E, intensidad: 1.25 },
  ambiente: { color: 0xFFF4E6, intensidad: 0.22 }
};
const NOCHE = {
  sol:      { color: 0x8FA7D6, intensidad: 0.55, pos: new THREE.Vector3(70, 80, -40) },
  hemi:     { cielo: 0x27324F, suelo: 0x141A24, intensidad: 0.55 },
  ambiente: { color: 0x2C3552, intensidad: 0.28 }
};

export function crearLuces(escena) {
  const sol = new THREE.DirectionalLight(DIA.sol.color, DIA.sol.intensidad);
  sol.position.copy(DIA.sol.pos);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.near = 20;
  sol.shadow.camera.far = 360;
  sol.shadow.camera.left = -84;
  sol.shadow.camera.right = 84;
  sol.shadow.camera.top = 84;
  sol.shadow.camera.bottom = -84;
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0005;
  sol.shadow.normalBias = 0.045;
  escena.add(sol);

  const hemi = new THREE.HemisphereLight(DIA.hemi.cielo, DIA.hemi.suelo, DIA.hemi.intensidad);
  escena.add(hemi);
  const ambiente = new THREE.AmbientLight(DIA.ambiente.color, DIA.ambiente.intensidad);
  escena.add(ambiente);

  const ca = new THREE.Color(), cb = new THREE.Color();
  const lerp = (a, b, t) => a + (b - a) * t;

  function setNoche(t) {
    sol.color.copy(ca.setHex(DIA.sol.color).lerp(cb.setHex(NOCHE.sol.color), t));
    sol.intensity = lerp(DIA.sol.intensidad, NOCHE.sol.intensidad, t);
    sol.position.lerpVectors(DIA.sol.pos, NOCHE.sol.pos, t);
    hemi.color.copy(ca.setHex(DIA.hemi.cielo).lerp(cb.setHex(NOCHE.hemi.cielo), t));
    hemi.groundColor.copy(ca.setHex(DIA.hemi.suelo).lerp(cb.setHex(NOCHE.hemi.suelo), t));
    hemi.intensity = lerp(DIA.hemi.intensidad, NOCHE.hemi.intensidad, t);
    ambiente.color.copy(ca.setHex(DIA.ambiente.color).lerp(cb.setHex(NOCHE.ambiente.color), t));
    ambiente.intensity = lerp(DIA.ambiente.intensidad, NOCHE.ambiente.intensidad, t);
  }

  return { sol, setNoche };
}
