import * as THREE from "three";

export interface ArenaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  arenaRadius: number;
  boundaryRing: THREE.Mesh;
  boundaryMat: THREE.MeshStandardMaterial;
  boundaryLight: THREE.PointLight;
}

export function createBattleArena(aspect: number): ArenaScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060020);
  scene.fog = new THREE.FogExp2(0x060020, 0.038);

  const camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 100);
  camera.position.set(0, 9, 13);
  camera.lookAt(0, 0, 0);

  const arenaRadius = 7;

  // Lighting
  scene.add(new THREE.AmbientLight(0x3030a0, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 12, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const blueRim = new THREE.PointLight(0x5fd0ff, 2.2, 22);
  blueRim.position.set(-7, 4, -7);
  scene.add(blueRim);

  const redRim = new THREE.PointLight(0xff2030, 2.0, 22);
  redRim.position.set(7, 4, 7);
  scene.add(redRim);

  const topLight = new THREE.PointLight(0xffffff, 0.5, 15);
  topLight.position.set(0, 10, 0);
  scene.add(topLight);

  // A dramatic under-floor purple wash
  const underLight = new THREE.PointLight(0x9040ff, 1.8, 14);
  underLight.position.set(0, -2, 0);
  scene.add(underLight);

  // --- Floor with hex-grid texture via canvas ---
  const floorCanvas = document.createElement("canvas");
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const ctx = floorCanvas.getContext("2d")!;
  // dark base
  ctx.fillStyle = "#0d0c2e";
  ctx.fillRect(0, 0, 512, 512);
  // glowing grid lines
  ctx.strokeStyle = "rgba(90,50,200,0.45)";
  ctx.lineWidth = 1.2;
  const step = 32;
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y <= 512; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  // brighter cross lines
  ctx.strokeStyle = "rgba(100,200,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(512, 256); ctx.stroke();

  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3.5, 3.5);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(arenaRadius, 72),
    new THREE.MeshStandardMaterial({ color: 0x18144a, roughness: 0.55, metalness: 0.5, map: floorTex }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Glowing boundary ring — exposed so battleMode can flash it
  const boundaryMat = new THREE.MeshStandardMaterial({
    color: 0xa06bff, emissive: 0xa06bff, emissiveIntensity: 2.0, side: THREE.DoubleSide,
  });
  const boundaryRing = new THREE.Mesh(
    new THREE.RingGeometry(arenaRadius - 0.3, arenaRadius + 0.22, 72),
    boundaryMat,
  );
  boundaryRing.rotation.x = -Math.PI / 2;
  boundaryRing.position.y = 0.02;
  scene.add(boundaryRing);

  // Under-ring glow light, also flashable
  const boundaryLight = new THREE.PointLight(0xa06bff, 1.2, 12);
  boundaryLight.position.set(0, 0.1, 0);
  scene.add(boundaryLight);

  // Inner circle marker
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.9, 3.1, 48),
    new THREE.MeshStandardMaterial({ color: 0x5fd0ff, emissive: 0x5fd0ff, emissiveIntensity: 0.5, side: THREE.DoubleSide }),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.01;
  scene.add(innerRing);

  // Diagonal cross lines
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x5fd0ff, emissive: 0x5fd0ff, emissiveIntensity: 0.4 });
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.06, arenaRadius * 2), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = (i / 4) * Math.PI * 2;
    line.position.y = 0.01;
    scene.add(line);
  }

  // Atmospheric particles
  const pGeo = new THREE.BufferGeometry();
  const pCount = 140;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = arenaRadius + 0.5 + Math.random() * 5;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = Math.random() * 6;
    pPos[i * 3 + 2] = Math.sin(a) * r;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xa06bff, size: 0.16, transparent: true, opacity: 0.7 })));

  return { scene, camera, arenaRadius, boundaryRing, boundaryMat, boundaryLight };
}
