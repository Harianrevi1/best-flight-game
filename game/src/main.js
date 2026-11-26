// SKYLANE — Island Run: bootstrap, the game loop, missions, scoring,
// the chase camera and the debug hook the screenshots use.
window.SKYLANE = window.SKYLANE || {};

SKYLANE.game = (function () {
  const cfg = SKYLANE.config;
  const world = SKYLANE.world;
  const plane = SKYLANE.plane;
  const input = SKYLANE.input;
  const hud = SKYLANE.hud;
  const audio = SKYLANE.audio;

  let renderer, scene, camera, clock;
  const game = {
    state: 'menu',           // menu | flying | paused | crashed | complete
    score: 0,
    stage: 0,                // 0 = Ring Run, 1 = Island Tour, 2 = Final Approach
    ringIndex: 0,
    ringTotal: 0,
    landedCount: 0,
  };
  let camOrbit = { x: 0, y: 0 };
  let elapsed = 0;
  let crashReason = '';

  function stageRings() {
    world.buildRings(scene, game.stage);
    game.ringIndex = 0;
    game.ringTotal = world.rings.length;
  }

  function startFlight() {
    audio.init();
    audio.click();
    plane.reset();
    game.score = 0;
    game.stage = 0;
    game.landedCount = 0;
    stageRings();
    game.state = 'flying';
    hud.showScreen(null);
    hud.message('STAGE 1 — RING RUN: fly through all 6 rings!', 3200);
  }

  function nextStage() {
    game.score += cfg.stageScore;
    game.stage++;
    if (game.stage >= 2) {
      hud.message('FINAL APPROACH — land on the runway!', 3200);
      world.clearRings();
      game.ringTotal = 0;
      game.ringIndex = 0;
      return;
    }
    stageRings();
    hud.message('STAGE 2 — ISLAND TOUR: 8 more rings!', 3200);
  }

  function onRingPassed() {
    game.score += cfg.ringScore;
    plane.state.fuel = Math.min(cfg.fuelMax, plane.state.fuel + cfg.ringFuelBonus);
    audio.ring();
    world.markRingPassed(game.ringIndex);
    game.ringIndex++;
    hud.message('RING ' + game.ringIndex + ' / ' + game.ringTotal + '  +' + cfg.ringScore + '  •  FUEL +15', 1800);
    if (game.ringIndex >= game.ringTotal) nextStage();
  }

  function onLanded() {
    audio.land();
    plane.state.fuel = cfg.fuelMax;
    plane.state.speed = 0;
    plane.state.throttle = 0;
    game.landedCount++;
    if (game.stage >= 2) {
      game.score += cfg.landingScore;
      game.state = 'complete';
      hud.showScreen('complete', { score: game.score });
      return;
    }
    game.score += cfg.landingScore;
    hud.message('LANDED — refuelled! +' + cfg.landingScore + '  •  Throttle up to take off again', 3000);
    plane.state.y = cfg.runway.elevation + 2.4;
    plane.state.pitch = 0;
    plane.state.bank = 0;
  }

  function onCrash(kind) {
    audio.crash();
    game.state = 'crashed';
    crashReason = kind === 'crashed-sea'
      ? 'You ditched into the sea. The rings are still out there — fly again!'
      : 'You hit the terrain. Mind the hills — keep some altitude!';
    hud.showScreen('crash', { reason: crashReason, score: game.score });
  }

  function checkRings() {
    if (game.stage >= 2 || game.ringIndex >= game.ringTotal) return;
    const ring = world.rings[game.ringIndex];
    if (!ring) return;
    const dx = plane.state.x - ring.x;
    const dy = plane.state.y - ring.y;
    const dz = plane.state.z - ring.z;
    if (dx * dx + dy * dy + dz * dz < 16 * 16) onRingPassed();
  }

  function updateCamera(dt) {
    const mouse = input.consumeMouse();
    camOrbit.x += mouse.dx * 0.0035;
    camOrbit.y += mouse.dy * 0.002;
    camOrbit.x = Math.max(-0.7, Math.min(0.7, camOrbit.x));
    camOrbit.y = Math.max(-0.25, Math.min(0.35, camOrbit.y));
    camOrbit.x *= Math.pow(0.4, dt);
    camOrbit.y *= Math.pow(0.4, dt);

    const yaw = plane.state.yaw;
    const cp = Math.cos(plane.state.pitch), sp = Math.sin(plane.state.pitch);
    const fx = Math.sin(yaw) * cp, fy = sp, fz = -Math.cos(yaw) * cp;
    const target = new THREE.Vector3(
      plane.state.x - fx * 24 + Math.cos(yaw) * camOrbit.x * 14,
      plane.state.y - fy * 24 + 8 + camOrbit.y * 10,
      plane.state.z - fz * 24 + Math.sin(yaw) * camOrbit.x * 14
    );
    camera.position.lerp(target, Math.min(1, 7 * dt));
    camera.lookAt(
      plane.state.x + fx * 34,
      plane.state.y + fy * 34 + 1,
      plane.state.z + fz * 34
    );
  }

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    elapsed += dt;
    if (game.state === 'flying') {
      const result = plane.update(dt, input, world);
      checkRings();
      if (result === 'landed') onLanded();
      else if (result === 'crashed-terrain' || result === 'crashed-sea') onCrash(result);
      audio.setEngine(plane.state.throttle, plane.state.speed / cfg.maxSpeed);
    }
    world.update(dt, elapsed);
    updateCamera(dt);
    hud.update(plane.state, game);
    renderer.render(scene, camera);
  }

  function init() {
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87bfe8);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87bfe8);
    scene.fog = new THREE.Fog(0x9fc8e8, 500, 2400);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 6000);
    camera.position.set(0, 40, 620);

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3d6b35, 0.95);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
    sun.position.set(500, 800, 300);
    scene.add(sun);

    world.build(scene, 0);
    const planeMesh = plane.buildModel();
    scene.add(planeMesh);
    plane.reset();
    game.ringTotal = world.rings.length;

    hud.init();
    input.attach();
    hud.showScreen('menu');
    hud.update(plane.state, game);

    document.getElementById('btn-takeoff').addEventListener('click', startFlight);
    document.getElementById('btn-resume').addEventListener('click', function () {
      audio.click();
      game.state = 'flying';
      hud.showScreen(null);
    });
    document.getElementById('btn-retry').addEventListener('click', startFlight);
    document.getElementById('btn-flyagain').addEventListener('click', startFlight);
    document.getElementById('btn-mute').addEventListener('click', function () {
      audio.init();
      audio.setMuted(!audio.isMuted());
      this.textContent = audio.isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
    });
    window.addEventListener('keydown', function (e) {
      if (e.code === 'KeyP') {
        if (game.state === 'flying') {
          game.state = 'paused';
          hud.showScreen('pause');
        } else if (game.state === 'paused') {
          game.state = 'flying';
          hud.showScreen(null);
        }
      }
      if (e.code === 'KeyR' && (game.state === 'crashed' || game.state === 'complete')) startFlight();
      if (e.code === 'KeyM') audio.setMuted(!audio.isMuted());
      if (e.code === 'Enter' && game.state === 'menu') startFlight();
    });
    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    clock = new THREE.Clock();
    loop();

    // Debug hook for the screenshot maker: pose the plane anywhere.
    window.__SKYLANE__ = {
      game, plane: plane.state,
      start: startFlight,
      setPose: function (x, y, z, yaw, pitch, speed, throttle) {
        plane.state.x = x; plane.state.y = y; plane.state.z = z;
        plane.state.yaw = yaw; plane.state.pitch = pitch || 0; plane.state.bank = 0;
        plane.state.speed = speed || 55; plane.state.throttle = throttle == null ? 0.6 : throttle;
        plane.state.grounded = false; // an airborne pose, never glue to the ground
        game.state = 'flying';
        hud.showScreen(null);
        // Snap the chase camera behind the plane so the next frame is framed.
        const cp = Math.cos(plane.state.pitch), sp = Math.sin(plane.state.pitch);
        const fx = Math.sin(yaw) * cp, fy = sp, fz = -Math.cos(yaw) * cp;
        camera.position.set(x - fx * 24, y - fy * 24 + 8, z - fz * 24);
        camera.lookAt(x + fx * 34, y + fy * 34 + 1, z + fz * 34);
      },
      setFuel: function (v) { plane.state.fuel = v; },
      setStage: function (s) { game.stage = s; if (s < 2) stageRings(); },
      setRingIndex: function (i) { game.ringIndex = i; world.setRingActive(i); },
    };
  }

  return { init, game };
})();

window.addEventListener('DOMContentLoaded', function () {
  SKYLANE.game.init();
});
