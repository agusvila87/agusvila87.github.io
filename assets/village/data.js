/* ═══════════════════════════════════════════════════════════════════
   DATOS DE LA ALDEA
   Todo lo editable vive acá. El motor no sabe nada de proyectos: lee
   esta lista, construye la aldea y arma los paneles.

   angle  = posicion en el circulo, en grados. 0 = frente (hacia la
            camara inicial), negativo = izquierda, positivo = derecha.
   radius = distancia al centro de la plaza.
   kind   = keep (el torreon del perfil) | castle (destacados) | house
   ═══════════════════════════════════════════════════════════════════ */

/* El torreon del centro: sos vos. */
export const PERFIL = {
  id: 'perfil',
  kind: 'keep',
  angle: 0,
  radius: 0,
  nombre: 'Agustín Vila',
  rol: 'Game Designer · Level Designer',
  lugar: 'Buenos Aires, AR · GMT-3',
  disponible: 'Abierto a propuestas',

  /* Subí tu foto al repo como assets/foto.jpg (cuadrada, 500x500 alcanza).
     Si el archivo todavia no esta, la ficha cae a las iniciales AV sola. */
  foto: 'assets/foto.jpg',

  tour: 'Game y Level Designer, tres años en la industria. Cada edificio de esta aldea es un proyecto.',
  pitch: 'Diseño loops, encuentros y niveles. Me interesa el momento en que alguien entiende una mecánica sin que nadie se la haya explicado.',
  parrafos: [
    'Trabajo como Game y Level Designer entre <strong>ACE 87 Studios</strong> y <strong>KYKUYO</strong>: un simulador cozy cooperativo para PC y un geo-RPG con realidad aumentada publicado en Singapur.',
    'Antes de eso terminé ocho juegos jugables durante la carrera de Videojuegos en Escuela Da Vinci — algunos solo, otros en equipos de hasta cuatro. Todos tienen video y descarga.',
    'Puedo mostrar documentación de diseño, layouts anotados y planillas de balanceo de mis proyectos propios y de los académicos. Del trabajo de estudio hablo en entrevista, con el detalle que haga falta.'
  ],
  stats: [
    ['2', 'Títulos profesionales'],
    ['8', 'Proyectos Da Vinci'],
    ['Unity · Unreal', 'Motores'],
    ['C#', 'Scripting'],
    ['PC · Mobile', 'Plataformas']
  ],
  links: [
    { label: 'LinkedIn',  url: 'https://www.linkedin.com/in/agustinvila87/' },
    { label: 'Descargar CV', url: 'Agustin_Vila_Game_Designer_CV.pdf', destacado: true },
    { label: 'Mail',      url: 'mailto:agusvila0087@gmail.com' },
    { label: 'WhatsApp',  url: 'https://wa.me/5491141401115' }
  ]
};

/* Los dos castillos: trabajo profesional, flanqueando la plaza. */
export const DESTACADOS = [
  {
    id: 'sealcoating',
    kind: 'castle',
    angle: -41,
    radius: 20.4,
    nombre: 'Sealcoating Simulator',
    linea: 'PC · Steam · Unity · ACE 87 Studios',
    rol: 'Game & Level Designer',
    meta: [
      ['Rol', 'Game &amp; Level Designer'],
      ['Estudio', 'ACE 87 Studios'],
      ['Motor', 'Unity · C#'],
      ['Plataforma', 'PC (Steam) · Coop hasta 4']
    ],
    tour: 'Diseño del juego y de cada nivel. La dificultad la regula la geometría, no los números.',
    video: 'G1gEgFUrqv8',
    portada: 'https://ace87studio.github.io/assets/keyart.jpg',
    imagenes: [
      'https://ace87studio.github.io/assets/screenshots/Sealcoating%20Chorro.png',
      'https://ace87studio.github.io/assets/screenshots/Sealcoating%20Barrido%201.png',
      'https://ace87studio.github.io/assets/screenshots/Sealcoating%20Faltante.png',
      'https://ace87studio.github.io/assets/screenshots/Sealcoating%20Recargar.png',
      'https://ace87studio.github.io/assets/screenshots/Sealcoating%2099_.png',
      'https://ace87studio.github.io/assets/screenshots/Sealcoating%20Lvl%20Completado.png'
    ],
    parrafos: [
      'Simulador cozy en primera persona sobre sellar asfalto, en desarrollo en <strong>ACE 87 Studios</strong> para PC. Cooperativo local y online para hasta cuatro jugadores, por ahora.'
    ],
    miRol: 'Estoy a cargo del <strong>diseño del juego y de los niveles</strong>: el core loop, las mecánicas, cada nivel jugable y la curva de ritmo que sostiene el interés desde el primer chorro hasta el 100% de cobertura.',
    decisiones: [
      { titulo: 'La dificultad la pone el espacio, no los números',
        texto: 'El sellador se comporta como un fluido: fluye, se encharca y se asienta, así que ninguna superficie se resuelve dos veces igual. Lo que gradúa la exigencia es la geometría del lugar, los obstáculos y la capacidad del tanque. No hay un multiplicador de dificultad.' },
      { titulo: 'Fricción en la tarea, nunca en orientarse',
        texto: 'En un cozy nadie tiene que preguntarse qué le falta ni adónde ir. Las zonas sin cubrir se resaltan y las estaciones de recarga se ven a través de las paredes: la atención queda en el trabajo, no en buscar.' }
    ],
    links: [
      { label: 'Ver en Steam', url: 'https://store.steampowered.com/app/5027030/Sealcoating_Simulator/', destacado: true }
    ]
  },
  {
    id: 'solar',
    kind: 'castle',
    angle: 40,
    radius: 19.6,
    nombre: 'SolAR',
    linea: 'Mobile · Geo + AR · Unity · KYKUYO',
    rol: 'Game Designer · 3 años',
    meta: [
      ['Rol', 'Game Designer · 3 años'],
      ['Estudio', 'KYKUYO · Singapur'],
      ['Motor', 'Unity'],
      ['Plataforma', 'Mobile · Geo y AR']
    ],
    tour: 'Tres años diseñando enemigos y habilidades de combate para un geo-RPG con 7.800 portales reales.',
    video: null,
    portada: 'https://www.kykuyo.com/media/web/gameplay-poster.jpg',
    imagenes: [
      'https://www.kykuyo.com/media/web/enemies-poster.jpg',
      'https://www.kykuyo.com/media/web/trailer-poster.jpg',
      'https://www.kykuyo.com/media/brand/169%20Thumbnails.png',
      'https://www.kykuyo.com/media/brand/169%20Thumbnails%20copy.png',
      'https://www.kykuyo.com/media/brand/169%20Thumbnails-2.png',
      'https://www.kykuyo.com/media/brand/169%20Thumbnails%20copy%202.png'
    ],
    parrafos: [
      'Geo-RPG solarpunk con geolocalización y realidad aumentada, publicado en Singapur para iOS y Android. Más de <strong>7.800 lugares reales</strong> funcionan como portales jugables. Formo parte del equipo de KYKUYO desde hace <strong>tres años</strong>.',
      'También participé en el desarrollo de <strong>SolAR × SPCA</strong>, un spin-off hecho junto a la SPCA de Singapur: el jugador sigue rastros de huellas por la ciudad para rescatar gatos que la organización tiene realmente a su cuidado. Salió en 2025 como app propia en iOS y Android.'
    ],
    miRol: 'Estoy a cargo del <strong>diseño de enemigos</strong> y diseño <strong>habilidades de combate del jugador</strong>. A eso se suman documentación de diseño, investigación, testeo y diseño de niveles en zonas puntuales del mapa.',
    decisiones: [
      { titulo: 'Cada enemigo, de punta a punta',
        texto: 'La mecánica de cada uno, su comportamiento y el rol que cumple en combate, del concepto a la documentación con la que después trabajan animación y programación. El área completa pasa por una sola cabeza, así el enemigo llega coherente al equipo.' },
      { titulo: 'Prototipar antes de comprometer producción',
        texto: 'Las habilidades de combate se validan primero en prototipos. Lo que no funciona en el prototipo no llega a costar tiempo de arte ni de código.' }
    ],
    links: [
      { label: 'App Store', url: 'https://apps.apple.com/sg/app/solar-solarpunk-geo-rpg/id6737652523', destacado: true },
      { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.kykuyo.solar' },
      { label: 'SolAR × SPCA', url: 'https://apps.apple.com/sg/app/solar-x-spca/id6751254495' },
      { label: 'Sobre el juego', url: 'https://www.kykuyo.com/solar' }
    ]
  }
];

/* Las ocho casas: carrera en Escuela Da Vinci.
   Ojo con el angulo 180 exacto: queda detras del torreon y el edificio
   no se puede apuntar con el mouse desde la vista inicial.
   Las tres primeras van en el anillo interior (terraza baja) y las
   cinco restantes en el anillo exterior, al nivel del suelo. */
export const CASITAS = [
  {
    id: 'cold-blooded', kind: 'house', angle: -65, radius: 34.0,
    nombre: 'Cold Blooded',
    linea: 'PC · Unity 3D · FPS · Solo',
    rol: 'Proyecto final de carrera',
    meta: [['Rol', 'Diseño · Niveles · Programación · Guion'], ['Equipo', 'Solo'],
           ['Motor', 'Unity 3D'], ['Género', 'FPS single player']],
    tour: 'Proyecto final de carrera: diseño, niveles, programación y guion, todo hecho solo.',
    video: '4lcbUXcykps',
    parrafos: [
      'Proyecto final de carrera, hecho enteramente por mí: diseño, niveles, programación y guion.'
    ],
    decisiones: [
      { titulo: 'Todo el pipeline en una sola persona',
        texto: 'Diseño, niveles, programación y guion salieron de la misma mano. Es la prueba de que puedo llevar un juego de la idea al build sin depender de nadie.' }
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/open?id=1xBf7i2JIhsNbTl9bxaHIxE__QqPO_fQR&usp=drive_fs', destacado: true }]
  },
  {
    id: 'zack-2', kind: 'house', angle: 65, radius: 33.4,
    nombre: 'Zack 2',
    linea: 'Mobile · Unity 3D · Shooter survival · Equipo de 3',
    rol: 'Sigue actualizándose',
    meta: [['Rol', 'Diseño · Niveles · Programación · Guion'], ['Equipo', '3 personas'],
           ['Motor', 'Unity 3D'], ['Género', 'Shooter survival mobile']],
    tour: 'Shooter survival para mobile que sigo actualizando hoy, en equipo de tres.',
    video: 'MwDtFKsLwvs',
    parrafos: [
      'Shooter de supervivencia para mobile, con actualizaciones que le sigo haciendo hoy. Cubrí diseño, niveles, programación y guion.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1wGHjWC-hT7eG88OY1FST6lJG-An_nNfE/view', destacado: true }]
  },
  {
    id: 'grab-it', kind: 'house', angle: -152, radius: 34.2,
    nombre: "Grab it, It's Hot!",
    linea: 'PC · Unity 3D · Multiplayer Photon · Equipo de 2',
    rol: 'Materia: Desarrollo de Redes',
    meta: [['Materia', 'Desarrollo de Redes'], ['Equipo', '2 personas'],
           ['Motor', 'Unity 3D · Photon'], ['Género', 'Multiplayer de 2 a 4']],
    tour: 'Multiplayer de 2 a 4 con Photon, hecho en dupla para Desarrollo de Redes.',
    video: 'TfBjDYBX2PI',
    parrafos: [
      'Multiplayer de 2 a 4 jugadores con Photon, hecho para la materia Desarrollo de Redes.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/open?id=1xErI63W65QAe1Zq-qM7va3-dPqqNPn2Q&usp=drive_fs', destacado: true }]
  },
  {
    id: 'bit-con', kind: 'house', angle: -30, radius: 45.8,
    nombre: 'Bit Con',
    linea: 'PC · Unity 3D · Plataformero · Solo',
    rol: 'Materia: Diseño de Niveles',
    meta: [['Materia', 'Diseño de Niveles'], ['Equipo', 'Solo'],
           ['Motor', 'Unity 3D'], ['Género', 'Plataformero']],
    tour: 'Un plataformero donde el nivel castiga al que quiere de más.',
    video: 'S9SGYD3hVBs',
    parrafos: [
      'Plataformero construido específicamente como ejercicio de diseño de niveles, sobre la consigna obligatoria <strong>"la avaricia corrompe"</strong>.'
    ],
    decisiones: [
      { titulo: 'Una consigna, todas las capas',
        texto: 'Mecánicas, niveles e historia empujan la misma idea: el nivel castiga al que quiere de más. El jugador lo entiende jugando, sin que nadie se lo explique.' }
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1vTNqeawi_gHIq55o95ece2zziRdQ1f81/view', destacado: true }]
  },
  {
    id: 'orbbuster', kind: 'house', angle: 30, radius: 46.4,
    nombre: 'OrbBuster',
    linea: 'PC · Unreal Engine 4 · RPG · Equipo de 3',
    rol: 'Game & Level Design',
    meta: [['Rol', 'Game &amp; Level Design'], ['Equipo', '3 personas'],
           ['Motor', 'Unreal Engine 4'], ['Género', 'RPG single player']],
    tour: 'Mi único proyecto en Unreal: mecánicas y niveles de un RPG, en equipo de tres.',
    video: 'kFyClFSWqzs',
    parrafos: [
      'Único proyecto en Unreal. Me concentré en el diseño e implementación de mecánicas y en la construcción de los niveles.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1E-hNoGor7rCVNsnJDJmmFoBBtuJWSDxg/view?usp=drive_link', destacado: true }]
  },
  {
    id: 'proyecto-caos', kind: 'house', angle: -95, radius: 45.4,
    nombre: 'Proyecto Caos',
    linea: 'PC · Unity 2D · Plataformero · Equipo de 4',
    rol: 'Materia: Diseño y Producción',
    meta: [['Materia', 'Diseño y Producción de Juegos'], ['Equipo', '4 personas'],
           ['Motor', 'Unity 2D'], ['Género', 'Plataformero']],
    tour: 'Plataformero 2D en equipo de cuatro, para Diseño y Producción de Juegos.',
    video: 'PfuSDMfh4vQ',
    parrafos: [
      'Plataformero 2D hecho en equipo de cuatro para Diseño y Producción de Juegos.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1NYe7GxX6MJrHdbW2NOB7UnjQNTSNwy4I/view?usp=sharing', destacado: true }]
  },
  {
    id: 'asteroids', kind: 'house', angle: 95, radius: 46.2,
    nombre: 'Asteroids',
    linea: 'PC · Unity 2D · Equipo de 2',
    rol: 'Materia: Modelos y Algoritmos 1',
    meta: [['Materia', 'Modelos y Algoritmos 1'], ['Equipo', '2 personas'],
           ['Motor', 'Unity 2D'], ['Género', 'Arcade']],
    tour: 'El clásico reinterpretado en dupla, para Modelos y Algoritmos 1.',
    video: 'TTQJIlwGJXM',
    parrafos: [
      'Reinterpretación del clásico, hecha para Modelos y Algoritmos 1.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1r74E0lzcg4vZ-iKusEGUyCoGO44rkLw5/view?usp=sharing', destacado: true }]
  },
  {
    id: 'cold-world', kind: 'house', angle: 155, radius: 45.6,
    nombre: 'Cold World',
    linea: 'PC · Unity 2D · Plataformero shooter · Solo',
    rol: 'Mi primer juego',
    meta: [['Materia', 'Lógica de Programación'], ['Equipo', 'Solo'],
           ['Motor', 'Unity 2D'], ['Género', 'Plataformero shooter']],
    tour: 'Mi primer juego. Todo empezó acá.',
    video: 'kGAdaWTG4cg',
    parrafos: [
      'Mi primer juego. Plataformero shooter 2D hecho solo, para Lógica de Programación.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1wCVIjtfbjw6e97jDAwVeZwWj6NXRA7Pv/view', destacado: true }]
  }
];

export const NODOS = [PERFIL, ...DESTACADOS, ...CASITAS];

/* Orden del tour guiado y de las flechas anterior/siguiente de la ficha.
   De lo mas importante a lo mas viejo: perfil, estudios, carrera. */
export const ORDEN_TOUR = [
  'perfil', 'sealcoating', 'solar',
  'cold-blooded', 'zack-2', 'grab-it',
  'bit-con', 'orbbuster', 'proyecto-caos', 'asteroids', 'cold-world'
];

/* Cierre del tour: no es un edificio, es el llamado a la accion. */
export const CIERRE_TOUR = {
  titulo: 'Eso es todo lo que hay',
  texto: 'Ocho juegos de carrera y dos títulos publicados en tres años. Si querés hablar, estoy a un mail.',
  links: [
    { label: 'Descargar CV', url: 'Agustin_Vila_Game_Designer_CV.pdf', destacado: true },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/agustinvila87/' },
    { label: 'Mail', url: 'mailto:agusvila0087@gmail.com' }
  ]
};

/* La aldea como case study. No es un edificio: se abre desde el modo
   Blueprint, desde la lista y desde la barra de abajo. Cada decision de
   aca se puede ver en el diagrama del blueprint. */
export const ALDEA = {
  id: 'aldea',
  kind: 'meta',
  nombre: 'Cómo diseñé esta aldea',
  rol: 'Case study · este sitio',
  linea: 'Three.js · Sin motor · Level design aplicado a un portfolio',
  meta: [
    ['Qué es', 'Un portfolio que es un nivel'],
    ['Herramientas', 'Three.js · JavaScript · Claude Code'],
    ['Cuándo', 'Septiembre 2026'],
    ['Estado', 'En iteración']
  ],
  parrafos: [
    'Un portfolio se recorre como un nivel: alguien entra sin saber nada, tiene que entender dónde está en tres segundos y encontrar lo importante sin que nadie se lo explique. En vez de una lista, armé un espacio y le apliqué las mismas reglas que uso para diseñar niveles.',
    'La aldea está construida con Three.js directamente, sin motor: geometría procedural, texturas generadas en código y post-proceso propio. El diseño del espacio y cada iteración las dirigí yo; el código lo escribí en pareja con Claude Code.'
  ],
  decisiones: [
    { titulo: 'Un landmark que se ve desde todos lados',
      texto: 'El torreón del perfil es el punto más alto y está en el centro. Desde cualquier ángulo de cámara sabés dónde está el "yo" del portfolio y cómo volver.' },
    { titulo: 'Jerarquía por altura y distancia',
      texto: 'Tres terrazas. Lo profesional más cerca del centro y más alto; los proyectos de carrera con más peso en el anillo del medio; el resto a nivel del suelo. La importancia se lee sin leer.' },
    { titulo: 'Lenguaje de color en vez de carteles',
      texto: 'Oro para el perfil, pizarra azul para los estudios, terracota para las casas. Probé nombres flotantes sobre cada edificio: tapaban la aldea y no aportaban. Ahora el nombre aparece solo al apuntar.' },
    { titulo: 'Un camino crítico',
      texto: 'Puente, portón, avenida, escaleras, plaza. La entrada cinemática recorre ese eje para que la primera lectura sea siempre la misma, y el tour guiado lo hace por vos si tenés apuro.' },
    { titulo: 'Tres accesos por terraza',
      texto: 'Escaleras a 0° y a ±130°. Desde cualquier casa hay una subida a menos de un tercio de vuelta. Los aldeanos las usan, y el ojo también.' },
    { titulo: 'Límites legibles',
      texto: 'La muralla cierra el espacio jugable. El foso y el río lo separan del fondo sin cortar la vista, y las montañas dan escala sin competir.' }
  ],
  iteraciones: [
    'Saqué todos los árboles de adentro de la muralla: tapaban las casas desde la vista general.',
    'Una casa quedó justo detrás del torreón, a 180°, y no se podía apuntar desde la entrada. La corrí a 152°.',
    'El resaltado de selección lavaba el color de clase. Bajé el brillo y puse un anillo de luz en el piso.',
    'La ficha pasó de panel lateral a ventana centrada: en columna angosta los párrafos se leían mal.',
    'Fusioné la geometría por material: de 1663 draw calls a unos 300 con todo el mundo puesto.'
  ],
  links: [
    { label: 'Ver el código', url: 'https://github.com/agusvila87/agusvila87.github.io', destacado: true }
  ]
};

/* Anotaciones del modo Blueprint. Posiciones en unidades de mundo, con
   la misma convencion de angulo que arriba (x = sin(a)·r, z = cos(a)·r).
   Las alturas de terraza son 5.6 / 3.6 / 1.8 (ver escenario.js). */
/* Repartidas para que no se pisen con la camara del plano (dist 135,
   polar 30) en una pantalla de 1280 o mas. Textos de dos lineas como
   mucho. En pantallas mas angostas index.html esconde algunas. */
export const ANOTACIONES = [
  { pos: [0, 40, 0],
    titulo: 'Landmark',
    texto: 'El punto más alto. Se ve desde cualquier lugar.' },
  { pos: [-13.4, 12, 15.4],
    titulo: 'Anillo 1 · Profesional',
    texto: 'Los dos títulos publicados, más cerca y más alto.' },
  { pos: [0, 4, -50],
    titulo: 'Anillo 3 · El resto',
    texto: 'Los primeros cinco juegos, a nivel del suelo.' },
  { pos: [30.3, 9, 14.1],
    titulo: 'Anillo 2 · Carrera destacada',
    texto: 'Tres proyectos de carrera con más peso.' },
  { pos: [0, 1, 56],
    titulo: 'Camino crítico',
    texto: 'Puente, portón, avenida, plaza. Un solo eje.' },
  { pos: [0, 3, 34],
    titulo: 'Accesos',
    texto: 'Tres escaleras por terraza, a 0° y ±130°.' },
  { pos: [50, 2, -50],
    titulo: 'Límite legible',
    texto: 'Muralla, foso y río: cierran sin cortar la vista.' },
  { pos: [-45.2, 8, 4],
    titulo: 'Color por clase',
    texto: 'Oro, pizarra, terracota. Se lee sin carteles.' }
];
