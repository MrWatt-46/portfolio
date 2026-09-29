/* ══════════════════════════════════════════════════════
   SOLAR.JS — Three.js Solar System Scene
   Stars · Sun (with glow) · 4 Planets · Orbit rings
   Raycaster for hover detection
══════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════════════════
   GLOBAL STATE — accessed by scroll.js & hover.js
════════════════════════════════════════════════ */
window.SolarSystem = {
  scene:         null,
  camera:        null,
  renderer:      null,
  planets:       [],      // array of planet objects
  planetMeshes:  [],      // flat list of mesh refs for raycasting
  sun:           null,
  stars:         null,
  raycaster:     null,
  mouse:         null,
  hoveredPlanet: null,    // the THREE.Mesh currently hovered
  isReady:       false,
  scrollProgress: 0,
  animId:        null,
};

/* ════════════════════════════════════════════════
   PLANET CONFIG
   revealAt = scroll progress (0–1) when planet appears
════════════════════════════════════════════════ */
const PLANET_CONFIG = [
  {
    id:          'jupiter',
    label:       'Jupiter',
    emoji:       '🟡',
    section:     'education',
    distance:    400,
    radius:      20,
    color:       0xC88B3A,
    emissive:    0x7A4A10,
    emissiveInt: 0.5,
    glowRGB:     [200, 139, 58],
    orbitSpeed:  0.00042,
    startAngle:  Math.PI * 0.35,
    revealAt:    0.18,
  },
  {
    id:          'earth',
    label:       'Earth',
    emoji:       '🔵',
    section:     'projects',
    distance:    260,
    radius:      11,
    color:       0x5DADE2,
    emissive:    0x1A4E7A,
    emissiveInt: 0.55,
    glowRGB:     [93, 173, 226],
    orbitSpeed:  0.00095,
    startAngle:  Math.PI * 1.15,
    revealAt:    0.40,
  },
  {
    id:          'venus',
    label:       'Venus',
    emoji:       '🟠',
    section:     'skills',
    distance:    160,
    radius:      9,
    color:       0xE8CDA0,
    emissive:    0x8A5A20,
    emissiveInt: 0.45,
    glowRGB:     [232, 205, 160],
    orbitSpeed:  0.00145,
    startAngle:  Math.PI * 0.75,
    revealAt:    0.60,
  },
  {
    id:          'mercury',
    label:       'Mercury',
    emoji:       '⚫',
    section:     'about',
    distance:    85,
    radius:      5.5,
    color:       0x9E9E9E,
    emissive:    0x3C3C3C,
    emissiveInt: 0.3,
    glowRGB:     [158, 158, 158],
    orbitSpeed:  0.00245,
    startAngle:  Math.PI * 1.65,
    revealAt:    0.78,
  },
];

/* ════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════ */

/** Create a radial gradient canvas texture for glow sprites */
function makeGlowTexture(r, g, b, size) {
  size = size || 256;
  const cv  = document.createElement('canvas');
  cv.width  = size;
  cv.height = size;
  const ctx  = cv.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.00, 'rgba(' + r + ',' + g + ',' + b + ',1.0)');
  grad.addColorStop(0.20, 'rgba(' + r + ',' + g + ',' + b + ',0.65)');
  grad.addColorStop(0.55, 'rgba(' + r + ',' + g + ',' + b + ',0.18)');
  grad.addColorStop(1.00, 'rgba(' + r + ',' + g + ',' + b + ',0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

/** Create an additive-blend glow Sprite */
function makeGlowSprite(r, g, b, scaleXY, opacity, texSize) {
  const tex = makeGlowTexture(r, g, b, texSize || 256);
  const mat = new THREE.SpriteMaterial({
    map:      tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity:  opacity !== undefined ? opacity : 0.6,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleXY, scaleXY, 1);
  return sprite;
}

/* ════════════════════════════════════════════════
   STARFIELD
════════════════════════════════════════════════ */
function createStarfield() {
  var count     = 10000;
  var positions = new Float32Array(count * 3);
  var colors    = new Float32Array(count * 3);

  // A handful of subtle star tint options
  var tints = [
    [1.00, 1.00, 1.00],  // pure white
    [0.82, 0.87, 1.00],  // blue-white
    [1.00, 0.96, 0.84],  // warm white
    [0.92, 0.80, 1.00],  // lavender
  ];

  for (var i = 0; i < count; i++) {
    var theta = Math.random() * Math.PI * 2;
    var phi   = Math.acos(2 * Math.random() - 1);
    var r     = 1000 + Math.random() * 1800;

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    var c = tints[Math.floor(Math.random() * tints.length)];
    // dim random stars slightly for depth
    var dim = 0.55 + Math.random() * 0.45;
    colors[i * 3]     = c[0] * dim;
    colors[i * 3 + 1] = c[1] * dim;
    colors[i * 3 + 2] = c[2] * dim;
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  var mat = new THREE.PointsMaterial({
    size:         1.4,
    vertexColors: true,
    transparent:  true,
    opacity:      0.92,
    sizeAttenuation: true,
    depthWrite:   false,
  });

  return new THREE.Points(geo, mat);
}

/* ════════════════════════════════════════════════
   SUN
════════════════════════════════════════════════ */
function createSun() {
  var group = new THREE.Group();

  // Core
  var core = new THREE.Mesh(
    new THREE.SphereGeometry(26, 64, 64),
    new THREE.MeshStandardMaterial({
      color:            0xFFD050,
      emissive:         0xFF7700,
      emissiveIntensity: 2.8,
      roughness:        0.35,
      metalness:        0.0,
    })
  );
  core.name = 'sun-core';
  group.add(core);

  // Atmosphere shell
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 32),
    new THREE.MeshStandardMaterial({
      color:    0xFF5500,
      emissive: 0xFF3300,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity:  0.12,
      side:     THREE.BackSide,
      depthWrite: false,
    })
  ));

  // Inner glow sprite
  group.add(makeGlowSprite(255, 200, 60, 160, 0.85, 512));

  // Outer halo sprite
  group.add(makeGlowSprite(255, 110, 0, 380, 0.42, 512));

  // Far halo
  group.add(makeGlowSprite(255, 60, 0, 600, 0.18, 256));

  return group;
}

/* ════════════════════════════════════════════════
   PLANET
════════════════════════════════════════════════ */
function createPlanet(cfg) {
  var group = new THREE.Group();
  group.visible = false; // revealed by scroll

  // Sphere mesh
  var mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.radius, 48, 48),
    new THREE.MeshStandardMaterial({
      color:            cfg.color,
      emissive:         cfg.emissive,
      emissiveIntensity: cfg.emissiveInt,
      roughness:        0.72,
      metalness:        0.04,
    })
  );

  // Tag the mesh so hover.js can read the config
  mesh.userData = {
    id:      cfg.id,
    label:   cfg.label,
    emoji:   cfg.emoji,
    section: cfg.section,
    config:  cfg,
  };

  group.add(mesh);

  // Atmosphere
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(cfg.radius * 1.3, 24, 24),
    new THREE.MeshStandardMaterial({
      color:       cfg.color,
      transparent: true,
      opacity:     0.07,
      side:        THREE.BackSide,
      depthWrite:  false,
    })
  ));

  // Planet glow sprite
  var gc = cfg.glowRGB;
  group.add(makeGlowSprite(gc[0], gc[1], gc[2], cfg.radius * 5.5, 0.45, 256));

  return { group, mesh, cfg, angle: cfg.startAngle, revealed: false };
}

/* ════════════════════════════════════════════════
   ORBIT RING
════════════════════════════════════════════════ */
function createOrbitRing(distance) {
  var pts = [];
  var N   = 160;
  for (var i = 0; i <= N; i++) {
    var a = (i / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
  }
  var geo = new THREE.BufferGeometry().setFromPoints(pts);
  var mat = new THREE.LineBasicMaterial({
    color:       0x4a3a6a,
    transparent: true,
    opacity:     0.22,
    depthWrite:  false,
  });
  return new THREE.Line(geo, mat);
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
function initSolarSystem() {
  var SS = window.SolarSystem;

  /* Scene */
  SS.scene = new THREE.Scene();

  /* Camera — starts far away, GSAP will move it */
  SS.camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 6000
  );
  SS.camera.position.set(0, 80, 830);

  /* Renderer */
  var canvas = document.getElementById('solar-canvas');
  SS.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  SS.renderer.setSize(window.innerWidth, window.innerHeight);
  SS.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  SS.renderer.setClearColor(0x050308, 1);

  /* Lighting */
  SS.scene.add(new THREE.AmbientLight(0x1a1040, 1.3));

  var sunPt = new THREE.PointLight(0xFFE060, 5, 2200, 1.4);
  sunPt.position.set(0, 0, 0);
  SS.scene.add(sunPt);

  var rimLight = new THREE.DirectionalLight(0x3030aa, 0.55);
  rimLight.position.set(-1, 1.5, -1).normalize();
  SS.scene.add(rimLight);

  /* Starfield */
  SS.stars = createStarfield();
  SS.scene.add(SS.stars);

  /* Sun */
  SS.sun = createSun();
  SS.scene.add(SS.sun);

  /* Planets */
  PLANET_CONFIG.forEach(function (cfg) {
    var planet = createPlanet(cfg);

    // Set initial world position
    planet.group.position.set(
      Math.cos(cfg.startAngle) * cfg.distance,
      0,
      Math.sin(cfg.startAngle) * cfg.distance
    );

    SS.scene.add(planet.group);
    SS.planets.push(planet);
    SS.planetMeshes.push(planet.mesh);

    // Orbit ring
    SS.scene.add(createOrbitRing(cfg.distance));
  });

  /* Raycaster */
  SS.raycaster = new THREE.Raycaster();
  SS.mouse     = new THREE.Vector2(-10, -10);

  /* Resize */
  window.addEventListener('resize', function () {
    SS.camera.aspect = window.innerWidth / window.innerHeight;
    SS.camera.updateProjectionMatrix();
    SS.renderer.setSize(window.innerWidth, window.innerHeight);
    SS.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  SS.isReady = true;
  animate();
}

/* ════════════════════════════════════════════════
   ANIMATION LOOP
════════════════════════════════════════════════ */
function animate() {
  var SS = window.SolarSystem;
  SS.animId = requestAnimationFrame(animate);

  var t = Date.now() * 0.001;

  /* Rotate sun */
  if (SS.sun) SS.sun.rotation.y = t * 0.07;

  /* Update planet orbits */
  SS.planets.forEach(function (planet) {
    if (!planet.group.visible) return;

    planet.angle += planet.cfg.orbitSpeed;

    planet.group.position.set(
      Math.cos(planet.angle) * planet.cfg.distance,
      Math.sin(planet.angle * 0.18) * 8,  // gentle Y wobble
      Math.sin(planet.angle) * planet.cfg.distance
    );

    planet.mesh.rotation.y += 0.004; // self-rotation
  });

  /* Slow star drift */
  if (SS.stars) SS.stars.rotation.y = t * 0.0045;

  /* Camera always looks at sun */
  SS.camera.lookAt(0, 0, 0);

  /* Raycasting — detect hovered planet */
  if (SS.raycaster && SS.mouse && SS.camera) {
    SS.raycaster.setFromCamera(SS.mouse, SS.camera);
    var visibleMeshes = SS.planets
      .filter(function (p) { return p.group.visible; })
      .map(function (p) { return p.mesh; });

    var hits = SS.raycaster.intersectObjects(visibleMeshes);
    SS.hoveredPlanet = hits.length > 0 ? hits[0].object : null;
  }

  SS.renderer.render(SS.scene, SS.camera);
}
