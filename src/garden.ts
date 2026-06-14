import * as THREE from "three";

// Builds the small crystal-garden home scene: ground, lights, a ring of glowing
// crystals, and a soft magical background. Returns the pieces main.ts needs to
// animate.

export interface Garden {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  crystals: THREE.Mesh[];
}

export function createGarden(aspect: number): Garden {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1040);
  scene.fog = new THREE.Fog(0x1a1040, 9, 20);

  // Angled 3D view looking down at the garden.
  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.set(0, 3.2, 6.2);
  camera.lookAt(0, 0.6, 0);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0x8a7dff, 0.6);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  scene.add(key);

  // Cool fill light from the front for that magical rim glow.
  const fill = new THREE.PointLight(0x5fd0ff, 0.8, 20);
  fill.position.set(-3, 2, 4);
  scene.add(fill);

  const warm = new THREE.PointLight(0xff7ad9, 0.6, 20);
  warm.position.set(3, 1.5, 2);
  scene.add(warm);

  // --- Ground: a soft circular grassy mound ---
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x3fae7a, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // A darker inner disc to suggest a magic circle the egg sits on.
  const circle = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.7, 48),
    new THREE.MeshStandardMaterial({
      color: 0x9be7ff,
      emissive: 0x4fd0ff,
      emissiveIntensity: 0.7,
      side: THREE.DoubleSide,
    }),
  );
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.02;
  scene.add(circle);

  // --- Ring of glowing crystals around the garden ---
  const crystals: THREE.Mesh[] = [];
  const crystalColors = [0xff7ad9, 0x5fd0ff, 0xa6ff6b, 0xffd36b, 0xa06bff, 0xff9b6b];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 4.2 + Math.random() * 1.0;
    const color = crystalColors[i % crystalColors.length];
    const height = 0.8 + Math.random() * 1.1;

    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, height, 5),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        roughness: 0.15,
        metalness: 0.4,
        transparent: true,
        opacity: 0.9,
      }),
    );
    crystal.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
    crystal.rotation.y = Math.random() * Math.PI;
    crystal.castShadow = true;
    crystal.userData.baseIntensity = 0.6;
    crystal.userData.phase = Math.random() * Math.PI * 2;
    scene.add(crystal);
    crystals.push(crystal);
  }

  // --- A scatter of tiny floating sparkle stars for atmosphere ---
  const starGeo = new THREE.BufferGeometry();
  const starCount = 120;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = Math.random() * 10 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.8 }),
  );
  scene.add(stars);

  return { scene, camera, crystals };
}
