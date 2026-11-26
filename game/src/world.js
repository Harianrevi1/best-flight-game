// SKYLANE — Island Run: the world — procedural island terrain, sea,
// runway, a small town, drifting clouds and the target rings.
window.SKYLANE = window.SKYLANE || {};

SKYLANE.world = (function () {
  const cfg = SKYLANE.config;
  const rings = [];       // { mesh, x, y, z, passed }
  const clouds = [];
  let sceneRef = null;

  // --- deterministic value noise -------------------------------------------
  function hash2(ix, iz) {
    let h = (ix * 374761393 + iz * 668265263) | 0;
    h = (h ^ (h >> 13)) | 0;
    h = Math.imul(h, 1274126177);
    h = (h ^ (h >> 16)) >>> 0;
    return h / 4294967295;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const sx = smooth(fx), sz = smooth(fz);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  }
  function fbm(x, z) {
    return vnoise(x, z) * 0.55
      + vnoise(x * 2.13 + 7.7, z * 2.13 + 3.1) * 0.28
      + vnoise(x * 4.31 + 13.7, z * 4.31 + 9.4) * 0.17;
  }

  function terrainHeight(x, z) {
    const d = Math.hypot(x, z);
    const mask = smooth(clamp01((1050 - d) / (1050 - 420)));
    // The island is a dome rising from the sea, with rolling hills on top —
    // land is guaranteed in the middle, the shore fades out at the edge.
    const dome = 58 * mask;
    const hills = (fbm(x * 0.0016, z * 0.0016) - 0.5) * 44 * mask;
    const detail = (fbm(x * 0.006 + 11, z * 0.006 + 5) - 0.5) * 10 * mask;
    let h = dome + hills + detail;
    // A small islet south-east of the main island.
    const d2 = Math.hypot(x - 1080, z + 680);
    if (d2 < 260) h += 26 * (1 - d2 / 260);
    // Flatten the runway strip so landings are possible.
    const rw = cfg.runway;
    const ax = Math.abs(x - rw.x) - rw.width / 2;
    const az = Math.abs(z - rw.z) - rw.length / 2;
    const outside = Math.max(ax, az);
    const blend = 1 - smooth(clamp01(Math.max(0, outside) / 80));
    h = h * (1 - blend) + rw.elevation * blend;
    return Math.max(h, -6);
  }

  function onRunway(x, z) {
    const rw = cfg.runway;
    return Math.abs(x - rw.x) <= rw.width / 2 + 4
      && Math.abs(z - rw.z) <= rw.length / 2 + 4;
  }

  function terrainColor(h, x, z) {
    const n = vnoise(x * 0.05, z * 0.05) * 0.16 - 0.08;
    let r, g, b;
    if (h < 2.5) { r = 0.78 + n; g = 0.72 + n; b = 0.52 + n; }        // sand
    else if (h < 26) { r = 0.32 + n; g = 0.58 + n; b = 0.26 + n; }   // grass
    else if (h < 48) { r = 0.25 + n; g = 0.46 + n; b = 0.22 + n; }   // deep green
    else { r = 0.42 + n; g = 0.40 + n; b = 0.38 + n; }               // rock
    return [r, g, b];
  }

  function buildTerrain(scene) {
    const size = cfg.worldSize;
    const seg = 120;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      const c = terrainColor(h, x, z);
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
  }

  function buildSea(scene) {
    const geo = new THREE.PlaneGeometry(7000, 7000);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1a6fb5, transparent: true, opacity: 0.92, shininess: 120,
    });
    const sea = new THREE.Mesh(geo, mat);
    sea.position.y = cfg.seaLevel;
    scene.add(sea);
  }

  function buildRunway(scene) {
    const rw = cfg.runway;
    const group = new THREE.Group();
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(rw.width, rw.length),
      new THREE.MeshLambertMaterial({ color: 0x2b2f36 })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(rw.x, rw.elevation + 0.3, rw.z);
    group.add(asphalt);
    // Centre-line dashes.
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    for (let dz = -rw.length / 2 + 20; dz < rw.length / 2 - 10; dz += 32) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(rw.x, rw.elevation + 0.45, rw.z + dz);
      group.add(dash);
    }
    // Threshold bars at both ends.
    for (const end of [-1, 1]) {
      for (let dx = -rw.width / 2 + 5; dx < rw.width / 2 - 4; dx += 7) {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), dashMat);
        bar.rotation.x = -Math.PI / 2;
        bar.position.set(rw.x + dx, rw.elevation + 0.45, rw.z + end * (rw.length / 2 - 12));
        group.add(bar);
      }
    }
    scene.add(group);
  }

  function buildTown(scene) {
    const group = new THREE.Group();
    const palette = [0xd96c4f, 0xe8b04b, 0x7fb069, 0x5b8db2, 0xc96f9b, 0xe0d6c2];
    let seed = 12345;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (let i = 0; i < 24; i++) {
      const x = 180 + rnd() * 320;
      const z = 620 + rnd() * 220;
      const w = 12 + rnd() * 14, d = 12 + rnd() * 14, h = 8 + rnd() * 16;
      const y = terrainHeight(x, z);
      if (y < 3) continue;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: palette[i % palette.length] })
      );
      box.position.set(x, y + h / 2, z);
      group.add(box);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.72, 4 + rnd() * 3, 4),
        new THREE.MeshLambertMaterial({ color: 0x8a4b2d })
      );
      roof.position.set(x, y + h + 2.5, z);
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    }
    scene.add(group);
  }

  function buildTrees(scene) {
    const trunkGeo = new THREE.CylinderGeometry(0.7, 1.0, 6, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
    const topGeo = new THREE.ConeGeometry(5, 13, 6);
    const topMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const count = 130;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const tops = new THREE.InstancedMesh(topGeo, topMat, count);
    const m = new THREE.Matrix4();
    let placed = 0, tries = 0;
    while (placed < count && tries < 900) {
      tries++;
      const x = (Math.random() * 2 - 1) * 950;
      const z = (Math.random() * 2 - 1) * 950;
      const h = terrainHeight(x, z);
      if (h < 4 || h > 42 || onRunway(x, z)) continue;
      const s = 0.8 + Math.random() * 0.9;
      m.makeScale(s, s, s);
      m.setPosition(x, h + 3 * s, z);
      trunks.setMatrixAt(placed, m);
      m.makeScale(s, s, s);
      m.setPosition(x, h + (6 + 6.5) * s, z);
      tops.setMatrixAt(placed, m);
      placed++;
    }
    trunks.count = placed;
    tops.count = placed;
    scene.add(trunks);
    scene.add(tops);
  }

  function buildClouds(scene) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 16; i++) {
      const group = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < puffs; j++) {
        const r = 14 + Math.random() * 18;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        puff.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 24);
        puff.scale.y = 0.45;
        group.add(puff);
      }
      group.position.set(
        (Math.random() * 2 - 1) * 1100,
        190 + Math.random() * 90,
        (Math.random() * 2 - 1) * 1100
      );
      group.userData.drift = 2 + Math.random() * 3;
      clouds.push(group);
      scene.add(group);
    }
  }

  function ringPositions(stage) {
    const raw = stage === 0 ? cfg.ringsStage1 : cfg.ringsStage2;
    return raw.map(function (p) {
      const y = Math.max(p[1], terrainHeight(p[0], p[2]) + 26);
      return { x: p[0], y, z: p[2] };
    });
  }

  function buildRings(scene, stage) {
    for (const r of rings) scene.remove(r.mesh);
    rings.length = 0;
    const positions = ringPositions(stage);
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const geo = new THREE.TorusGeometry(16, 1.7, 12, 42);
      const mat = new THREE.MeshBasicMaterial({ color: 0x5a7a9a, transparent: true, opacity: 0.75 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      const next = positions[(i + 1) % positions.length];
      mesh.lookAt(next.x, next.y, next.z);
      mesh.userData.baseScale = 1;
      scene.add(mesh);
      rings.push({ mesh, x: p.x, y: p.y, z: p.z, passed: false });
    }
    setRingActive(0);
  }

  function setRingActive(index) {
    rings.forEach(function (r, i) {
      if (r.passed) {
        r.mesh.material.color.setHex(0x2ecc40);
        r.mesh.material.opacity = 0.9;
      } else if (i === index) {
        r.mesh.material.color.setHex(0xff8c1a);
        r.mesh.material.opacity = 1;
      } else {
        r.mesh.material.color.setHex(0x5a7a9a);
        r.mesh.material.opacity = 0.6;
      }
    });
  }

  function markRingPassed(index) {
    if (rings[index]) {
      rings[index].passed = true;
      setRingActive(index + 1);
    }
  }

  function clearRings() {
    if (sceneRef) {
      for (const r of rings) sceneRef.remove(r.mesh);
    }
    rings.length = 0;
  }

  function build(scene, stage) {
    sceneRef = scene;
    buildTerrain(scene);
    buildSea(scene);
    buildRunway(scene);
    buildTown(scene);
    buildTrees(scene);
    buildClouds(scene);
    buildRings(scene, stage);
  }

  function update(dt, time) {
    for (const c of clouds) {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 1250) c.position.x = -1250;
    }
    // Pulse the active ring so the pilot can spot it.
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (!r.passed) {
        const s = 1 + Math.sin(time * 3 + i) * 0.045;
        r.mesh.scale.setScalar(s);
      }
    }
  }

  return {
    terrainHeight, onRunway, build, update, buildRings, clearRings,
    setRingActive, markRingPassed, rings,
  };
})();
