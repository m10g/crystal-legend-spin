import * as THREE from "three";

// Dark cinematic battle arena: a circular platform with a glowing boundary ring,
// cross lines, atmospheric particles, and dramatic lighting.

export interface ArenaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  arenaRadius: number;
}

export function createBattleArena(aspect: number): ArenaScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060020);
  scene.fog = new THREE.FogExp2(0x060020, 0.042);

  // Angled overhead camera for a nice battle view.
  const camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 100);
  camera.position.set(0, 9, 13);
  camera.lookAt(0, 0, 0);

  const arenaRadius = 7;

  // --- Lighting: dramatic, dark, with coloured rim lights ---
  scene.add(new THREE.AmbientLight(0x3030a0, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 12, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const blueRim = new THREE.PointLight(0x5fd0ff, 2.0, 22);
  blueRim.position.set(-7, 4, -7);
  scene.add(blueRim);

  const redRim = new THREE.PointLight(0xff2030, 1.8, 22);
  redRim.position.set(7, 4, 7);
  scene.add(redRim);

  const topLight = new THREE.PointLight(0xffffff, 0.5, 15);
  topLight.position.set(0, 10, 0);
  scene.add(topLight);

  // --- Arena floor ---
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(arenaRadius, 72),
    new THREE.MeshStandardMaterial({ color: 0x12103a, roughness: 0.55, metalness: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Glowing boundary ring.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(arenaRadius - 0.35, arenaRadius + 0.15, 72),
    new THREE.MeshStandardMaterial({
      color: 0xa06bff,
      emissive: 0xa06bff,
      emissiveIntensity: 2.0,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  // Cross-hair lines on the floor.
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x5fd0ff,
    emissive: 0x5fd0ff,
    emissiveIntensity: 0.35,
  });
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, arenaRadius * 2), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = (i / 4) * Math.PI * 2;
    line.position.y = 0.01;
    scene.add(line);
  }

  // Inner circle marker.
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.9, 3.1, 48),
    new THREE.MeshStandardMaterial({
      color: 0x5fd0ff,
      emissive: 0x5fd0ff,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.01;
  scene.add(innerRing);

  // Atmospheric particles outside the arena.
  const pGeo = new THREE.BufferGeometry();
  const pCount = 100;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = arenaRadius + 1 + Math.random() * 4;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = Math.random() * 5;
    pPos[i * 3 + 2] = Math.sin(a) * r;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  scene.add(
    new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xa06bff, size: 0.14, transparent: true, opacity: 0.65 }),
    ),
  );

  return { scene, camera, arenaRadius };
}
