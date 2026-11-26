// SKYLANE — Island Run: the aeroplane — a small prop plane built from
// primitives — and its arcade flight model (throttle, bank, pitch, stall).
window.SKYLANE = window.SKYLANE || {};

SKYLANE.plane = (function () {
  const cfg = SKYLANE.config;
  let mesh = null;
  let prop = null;
  const state = {
    x: 0, y: 10, z: 520,
    yaw: 0, pitch: 0, bank: 0,
    speed: 0, throttle: 0,
    fuel: cfg.fuelMax,
    grounded: true,
  };

  function buildModel() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xe8442e, shininess: 60 });
    const wingMat = new THREE.MeshPhongMaterial({ color: 0xf5f0e6, shininess: 40 });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x222831, shininess: 30 });

    // Fuselage: a stretched, nose-tapered body (cylinder + cone nose).
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.85, 7.4, 12), bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 12), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -4.8;
    group.add(nose);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.0, 10), bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 4.6;
    group.add(tail);

    // Canopy: a glossy bubble the pilot looks through.
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 12, 10),
      new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 140, transparent: true, opacity: 0.9 })
    );
    canopy.scale.set(0.95, 0.75, 1.7);
    canopy.position.set(0, 0.85, -1.2);
    group.add(canopy);

    // Main wings and tail wings.
    const wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.4), wingMat);
    wing.position.set(0, 0.1, -0.4);
    group.add(wing);
    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.6), wingMat);
    tailWing.position.set(0, 0.35, 4.3);
    group.add(tailWing);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 1.9), bodyMat);
    fin.position.set(0, 1.1, 4.4);
    group.add(fin);

    // Wingtip navigation lights: red left, green right, both glowing.
    const tipL = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    tipL.position.set(-6.8, 0.1, -0.4);
    group.add(tipL);
    const tipR = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x22ff66 })
    );
    tipR.position.set(6.8, 0.1, -0.4);
    group.add(tipR);

    // Spinning propeller with a spinner cone.
    prop = new THREE.Group();
    const bladeMat = new THREE.MeshPhongMaterial({ color: 0x1c1c22, shininess: 20 });
    for (const a of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.4, 0.18), bladeMat);
      blade.rotation.z = a;
      prop.add(blade);
    }
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 10), darkMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -0.5;
    prop.add(spinner);
    prop.position.set(0, 0, -6.0);
    group.add(prop);

    // Fixed landing gear.
    for (const sx of [-1.5, 1.5]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 6), darkMat);
      leg.position.set(sx, -1.4, -0.6);
      group.add(leg);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, -2.2, -0.6);
      group.add(wheel);
    }

    mesh = group;
    return group;
  }

  function reset() {
    state.x = cfg.runway.x;
    state.y = cfg.runway.elevation + 2.4;
    state.z = cfg.runway.z + cfg.runway.length / 2 - 30;
    state.yaw = 0;
    state.pitch = 0;
    state.bank = 0;
    state.speed = 0;
    state.throttle = 0;
    state.fuel = cfg.fuelMax;
    state.grounded = true;
  }

  // Returns one of: 'flying' | 'crashed-terrain' | 'crashed-sea' | 'landed'.
  function update(dt, input, world) {
    // Throttle.
    if (input.throttleUp()) state.throttle = Math.min(1, state.throttle + 0.55 * dt);
    if (input.throttleDown()) state.throttle = Math.max(0, state.throttle - 0.8 * dt);
    if (state.fuel <= 0) state.throttle = 0;

    // Speed chases the throttle target.
    const targetSpeed = cfg.minSpeed + state.throttle * (cfg.maxSpeed - cfg.minSpeed);
    state.speed += (targetSpeed - state.speed) * Math.min(1, cfg.accelRate * dt);

    // Bank and pitch chase their targets.
    let bankTarget = 0;
    if (input.bankLeft()) bankTarget = -cfg.maxBank;
    if (input.bankRight()) bankTarget = cfg.maxBank;
    const bankRate = 2.6;
    state.bank += Math.max(-bankRate * dt, Math.min(bankRate * dt, bankTarget - state.bank));

    let pitchTarget = 0;
    if (input.pitchUp()) pitchTarget = cfg.maxPitchUp;
    if (input.pitchDown()) pitchTarget = cfg.maxPitchDown;
    const pitchRate = 2.0;
    state.pitch += Math.max(-pitchRate * dt, Math.min(pitchRate * dt, pitchTarget - state.pitch));

    // Bank turns the plane; pitch aims it up or down.
    const speedNorm = state.speed / cfg.maxSpeed;
    state.yaw += state.bank * cfg.turnRate * (0.35 + 0.65 * speedNorm) * dt;

    const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    const fx = Math.sin(state.yaw) * cp;
    const fy = sp;
    const fz = -Math.cos(state.yaw) * cp;

    state.x += fx * state.speed * dt;
    state.z += fz * state.speed * dt;
    state.y += fy * state.speed * dt;

    // Stall: too slow and the plane sinks.
    if (state.speed < cfg.stallSpeed) {
      state.y -= (cfg.stallSpeed - state.speed) * 0.55 * dt;
    }
    if (state.y < 1.5) state.y = 1.5;

    // Fuel drains with throttle.
    state.fuel -= (cfg.fuelDrainIdle + state.throttle * cfg.fuelDrainFull) * dt;
    if (state.fuel < 0) state.fuel = 0;

    // Pose the mesh.
    mesh.position.set(state.x, state.y, state.z);
    mesh.rotation.set(0, 0, 0);
    mesh.rotateY(state.yaw);
    mesh.rotateX(-state.pitch);
    mesh.rotateZ(state.bank);
    if (prop) prop.rotation.z += (2 + state.throttle * 38) * dt;

    // Ground and sea contact. While taxiing the plane stays glued to the
    // ground; a touchdown only counts when arriving from the air.
    const groundH = world.terrainHeight(state.x, state.z);
    const clearance = state.y - groundH;
    if (state.grounded) {
      state.y = groundH + 2.4;
      if (!world.onRunway(state.x, state.z) && state.speed > 20) return 'crashed-terrain';
      if (state.speed > 48 && state.pitch > 0.12) state.grounded = false; // liftoff
      return 'flying';
    }
    if (clearance <= 2.2) {
      if (world.onRunway(state.x, state.z) && state.speed < 45 && state.pitch < 0.18) {
        state.grounded = true;
        state.y = groundH + 2.4;
        return 'landed';
      }
      return 'crashed-terrain';
    }
    if (groundH < 0.5 && state.y <= 1.6) return 'crashed-sea';
    return 'flying';
  }

  function headingDeg() {
    let deg = (-state.yaw * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    return Math.round(deg);
  }

  return { buildModel, reset, update, state, headingDeg, get mesh() { return mesh; } };
})();
