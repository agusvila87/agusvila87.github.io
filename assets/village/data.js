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

  /* EDITAR: subí tu foto al repo (cuadrada, 500x500 alcanza) y poné acá la
     ruta, por ejemplo 'assets/foto.jpg'. Mientras esté vacío el panel muestra
     las iniciales AV, sin pedirle al servidor un archivo que no existe. */
  foto: '',

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
    radius: 19.4,
    nombre: 'Sealcoating Simulator',
    linea: 'PC · Steam · Unity · ACE 87 Studios',
    rol: 'Game & Level Designer',
    meta: [
      ['Rol', 'Game &amp; Level Designer'],
      ['Estudio', 'ACE 87 Studios'],
      ['Motor', 'Unity · C#'],
      ['Plataforma', 'PC (Steam) · Coop hasta 4']
    ],
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
      'Simulador cozy en primera persona sobre sellar asfalto, en desarrollo en <strong>ACE 87 Studios</strong> para PC. Cooperativo local y online para hasta cuatro jugadores, por ahora.',
      'Estoy a cargo del <strong>diseño del juego y de los niveles</strong>: el core loop, las mecánicas, cada nivel jugable y la curva de ritmo que sostiene el interés desde el primer chorro hasta el 100% de cobertura.',
      'La dificultad no se regula con números. El sellador se comporta como un fluido: fluye, se encharca y se asienta, así que ninguna superficie se resuelve dos veces igual. Lo que gradúa la exigencia es la <strong>geometría del espacio, los obstáculos y la capacidad del tanque</strong>.',
      'En un cozy la fricción tiene que estar en la tarea, nunca en orientarse. Por eso las zonas sin cubrir se resaltan y las estaciones de recarga se ven a través de las paredes: <strong>nadie pierde tiempo preguntándose qué le falta ni adónde ir</strong>.'
    ],
    links: [
      { label: 'Ver en Steam', url: 'https://store.steampowered.com/app/5027030/Sealcoating_Simulator/', destacado: true }
    ]
  },
  {
    id: 'solar',
    kind: 'castle',
    angle: 40,
    radius: 18.6,
    nombre: 'SolAR',
    linea: 'Mobile · Geo + AR · Unity · KYKUYO',
    rol: 'Game Designer · 3 años',
    meta: [
      ['Rol', 'Game Designer · 3 años'],
      ['Estudio', 'KYKUYO · Singapur'],
      ['Motor', 'Unity'],
      ['Plataforma', 'Mobile · Geo y AR']
    ],
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
      'Estoy a cargo del <strong>diseño de enemigos</strong>: la mecánica de cada uno, su comportamiento y el rol que cumple en combate. Cubro esa área de punta a punta, del concepto a la documentación con la que después trabajan animación y programación.',
      'También diseño <strong>habilidades de combate del jugador</strong> y construyo prototipos para validar ideas antes de comprometer tiempo de producción. A eso se suman documentación de diseño, investigación, testeo y diseño de niveles en zonas puntuales del mapa.',
      'También participé en el desarrollo de <strong>SolAR × SPCA</strong>, un spin-off hecho junto a la SPCA de Singapur: el jugador sigue rastros de huellas por la ciudad para rescatar gatos que la organización tiene realmente a su cuidado. Salió en 2025 como app propia en iOS y Android.'
    ],
    links: [
      { label: 'App Store', url: 'https://apps.apple.com/sg/app/solar-solarpunk-geo-rpg/id6737652523', destacado: true },
      { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.kykuyo.solar' },
      { label: 'SolAR × SPCA', url: 'https://apps.apple.com/sg/app/solar-x-spca/id6751254495' },
      { label: 'Sobre el juego', url: 'https://www.kykuyo.com/solar' }
    ]
  }
];

/* Las ocho casas: carrera en Escuela Da Vinci. */
export const CASITAS = [
  {
    id: 'cold-blooded', kind: 'house', angle: -68, radius: 25.2,
    nombre: 'Cold Blooded',
    linea: 'PC · Unity 3D · FPS · Solo',
    rol: 'Proyecto final de carrera',
    meta: [['Rol', 'Diseño · Niveles · Programación · Guion'], ['Equipo', 'Solo'],
           ['Motor', 'Unity 3D'], ['Género', 'FPS single player']],
    video: '4lcbUXcykps',
    parrafos: [
      'Proyecto final de carrera, hecho enteramente por mí: diseño, niveles, programación y guion. Es la prueba de que puedo llevar un juego de la idea al build sin nadie más.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/open?id=1xBf7i2JIhsNbTl9bxaHIxE__QqPO_fQR&usp=drive_fs' }]
  },
  {
    id: 'zack-2', kind: 'house', angle: 71, radius: 26.4,
    nombre: 'Zack 2',
    linea: 'Mobile · Unity 3D · Shooter survival · Equipo de 3',
    rol: 'Sigue actualizándose',
    meta: [['Rol', 'Diseño · Niveles · Programación · Guion'], ['Equipo', '3 personas'],
           ['Motor', 'Unity 3D'], ['Género', 'Shooter survival mobile']],
    video: 'MwDtFKsLwvs',
    parrafos: [
      'Shooter de supervivencia para mobile, con actualizaciones que le sigo haciendo hoy. Cubrí diseño, niveles, programación y guion.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1wGHjWC-hT7eG88OY1FST6lJG-An_nNfE/view' }]
  },
  {
    id: 'grab-it', kind: 'house', angle: -101, radius: 24.6,
    nombre: "Grab it, It's Hot!",
    linea: 'PC · Unity 3D · Multiplayer Photon · Equipo de 2',
    rol: 'Materia: Desarrollo de Redes',
    meta: [['Materia', 'Desarrollo de Redes'], ['Equipo', '2 personas'],
           ['Motor', 'Unity 3D · Photon'], ['Género', 'Multiplayer de 2 a 4']],
    video: 'TfBjDYBX2PI',
    parrafos: [
      'Multiplayer de 2 a 4 jugadores con Photon, hecho para la materia Desarrollo de Redes.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/open?id=1xErI63W65QAe1Zq-qM7va3-dPqqNPn2Q&usp=drive_fs' }]
  },
  {
    id: 'bit-con', kind: 'house', angle: 104, radius: 26.9,
    nombre: 'Bit Con',
    linea: 'PC · Unity 3D · Plataformero · Solo',
    rol: 'Materia: Diseño de Niveles',
    meta: [['Materia', 'Diseño de Niveles'], ['Equipo', 'Solo'],
           ['Motor', 'Unity 3D'], ['Género', 'Plataformero']],
    video: 'S9SGYD3hVBs',
    parrafos: [
      'Plataformero construido específicamente como ejercicio de diseño de niveles, sobre la consigna obligatoria <strong>"la avaricia corrompe"</strong>. Mecánicas, niveles e historia empujan la misma idea: el nivel castiga al que quiere de más.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1vTNqeawi_gHIq55o95ece2zziRdQ1f81/view' }]
  },
  {
    id: 'orbbuster', kind: 'house', angle: -131, radius: 25.4,
    nombre: 'OrbBuster',
    linea: 'PC · Unreal Engine 4 · RPG · Equipo de 3',
    rol: 'Game & Level Design',
    meta: [['Rol', 'Game &amp; Level Design'], ['Equipo', '3 personas'],
           ['Motor', 'Unreal Engine 4'], ['Género', 'RPG single player']],
    video: 'kFyClFSWqzs',
    parrafos: [
      'Único proyecto en Unreal. Me concentré en el diseño e implementación de mecánicas y en la construcción de los niveles.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1E-hNoGor7rCVNsnJDJmmFoBBtuJWSDxg/view?usp=drive_link' }]
  },
  {
    id: 'proyecto-caos', kind: 'house', angle: 136, radius: 26.2,
    nombre: 'Proyecto Caos',
    linea: 'PC · Unity 2D · Plataformero · Equipo de 4',
    rol: 'Materia: Diseño y Producción',
    meta: [['Materia', 'Diseño y Producción de Juegos'], ['Equipo', '4 personas'],
           ['Motor', 'Unity 2D'], ['Género', 'Plataformero']],
    video: 'PfuSDMfh4vQ',
    parrafos: [
      'Plataformero 2D hecho en equipo de cuatro para Diseño y Producción de Juegos.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1NYe7GxX6MJrHdbW2NOB7UnjQNTSNwy4I/view?usp=sharing' }]
  },
  {
    id: 'asteroids', kind: 'house', angle: -163, radius: 24.8,
    nombre: 'Asteroids',
    linea: 'PC · Unity 2D · Equipo de 2',
    rol: 'Materia: Modelos y Algoritmos 1',
    meta: [['Materia', 'Modelos y Algoritmos 1'], ['Equipo', '2 personas'],
           ['Motor', 'Unity 2D'], ['Género', 'Arcade']],
    video: 'TTQJIlwGJXM',
    parrafos: [
      'Reinterpretación del clásico, hecha para Modelos y Algoritmos 1.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1r74E0lzcg4vZ-iKusEGUyCoGO44rkLw5/view?usp=sharing' }]
  },
  {
    id: 'cold-world', kind: 'house', angle: 168, radius: 26.6,
    nombre: 'Cold World',
    linea: 'PC · Unity 2D · Plataformero shooter · Solo',
    rol: 'Mi primer juego',
    meta: [['Materia', 'Lógica de Programación'], ['Equipo', 'Solo'],
           ['Motor', 'Unity 2D'], ['Género', 'Plataformero shooter']],
    video: 'kGAdaWTG4cg',
    parrafos: [
      'Mi primer juego. Plataformero shooter 2D hecho solo, para Lógica de Programación.'
    ],
    links: [{ label: 'Descargar', url: 'https://drive.google.com/file/d/1wCVIjtfbjw6e97jDAwVeZwWj6NXRA7Pv/view' }]
  }
];

export const NODOS = [PERFIL, ...DESTACADOS, ...CASITAS];
