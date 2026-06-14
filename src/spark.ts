import * as THREE from "three";

// Spark: the baby crystal dragon, built entirely from primitive shapes so the
// interaction loop can be proven before any real 3D art exists. The class
// exposes a few simple "reactions" (hop, spin, sparkle, sleep) that the game
// loop blends into the idle animation.

export class Spark {
  /** Root group — add this to the scene. */
  readonly group = new THREE.Group();

  private body: THREE.Mesh;
  private head: THREE.Group;
  private leftWing: THREE.Mesh;
  private rightWing: THREE.Mesh;
  private chestCore: THREE.Mesh;
  private eyes: THREE.Mesh[] = [];

  // Animation state.
  private hopTime = -1; // seconds remaining in the current hop, -1 = idle
  private spinTime = -1;
  private sleeping = false;
  private blinkTimer = 2 + Math.random() * 3;
  private sparkles: { mesh: THREE.Mesh; life: number; vel: THREE.Vector3 }[] = [];
  private baseY = 0;

  constructor() {
    const blue = 0x6fb8ff;
    const deepBlue = 0x3a78d6;
    const crystal = 0x9be7ff;

    // --- Body: a rounded egg-ish belly ---
    this.body = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 24, 18),
      new THREE.MeshStandardMaterial({ color: blue, roughness: 0.4, metalness: 0.1 }),
    );
    this.body.scale.set(1, 1.15, 0.95);
    this.body.castShadow = true;
    this.group.add(this.body);

    // --- Glowing crystal chest core ---
    this.chestCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: crystal,
        emissive: 0x4fd0ff,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.3,
      }),
    );
    this.chestCore.position.set(0, 0.05, 0.62);
    this.group.add(this.chestCore);

    // --- Head group (so eyes, horns, snout move together) ---
    this.head = new THREE.Group();
    this.head.position.set(0, 0.85, 0.1);
    this.group.add(this.head);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 18),
      new THREE.MeshStandardMaterial({ color: blue, roughness: 0.4, metalness: 0.1 }),
    );
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Snout
    const snout = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12),
      new THREE.MeshStandardMaterial({ color: deepBlue, roughness: 0.5 }),
    );
    snout.position.set(0, -0.12, 0.42);
    snout.scale.set(1, 0.8, 1);
    this.head.add(snout);

    // Eyes (big and cute)
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0b1a3a, roughness: 0.1 });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    for (const sx of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), eyeWhiteMat);
      white.position.set(0.2 * sx, 0.08, 0.4);
      white.scale.set(1, 1.1, 0.6);
      this.head.add(white);

      const pupil = new THREE.Mesh(eyeGeo, eyeMat);
      pupil.position.set(0.2 * sx, 0.09, 0.5);
      this.head.add(pupil);
      this.eyes.push(white);

      // Tiny sparkle highlight
      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 }),
      );
      glint.position.set(0.23 * sx, 0.14, 0.55);
      this.head.add(glint);
    }

    // --- Crystal horns ---
    const hornMat = new THREE.MeshStandardMaterial({
      color: crystal,
      emissive: 0x4fd0ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.4,
    });
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), hornMat);
      horn.position.set(0.22 * sx, 0.5, -0.05);
      horn.rotation.z = (-0.25 * sx);
      this.head.add(horn);
    }

    // --- Crystal wings ---
    const wingMat = new THREE.MeshStandardMaterial({
      color: crystal,
      emissive: 0x4fd0ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.5,
      side: THREE.DoubleSide,
    });
    const wingGeo = new THREE.ConeGeometry(0.45, 0.9, 4);
    this.leftWing = new THREE.Mesh(wingGeo, wingMat);
    this.leftWing.position.set(-0.65, 0.35, -0.25);
    this.leftWing.rotation.set(0, 0, Math.PI / 2.4);
    this.leftWing.scale.set(1, 1, 0.25);
    this.group.add(this.leftWing);

    this.rightWing = this.leftWing.clone();
    this.rightWing.position.x = 0.65;
    this.rightWing.rotation.z = -Math.PI / 2.4;
    this.group.add(this.rightWing);

    // --- Crystal tail ---
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.6, 6),
      hornMat,
    );
    tail.position.set(0, -0.1, -0.7);
    tail.rotation.x = -Math.PI / 1.6;
    this.group.add(tail);

    // --- Little feet ---
    const footMat = new THREE.MeshStandardMaterial({ color: deepBlue, roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), footMat);
      foot.position.set(0.32 * sx, -0.75, 0.15);
      foot.scale.set(1, 0.6, 1.3);
      foot.castShadow = true;
      this.group.add(foot);
    }

    this.group.position.y = this.baseY;
  }

  // --- Reactions triggered by the UI buttons ---

  hop(): void {
    this.sleeping = false;
    this.hopTime = 0.6;
  }

  spin(): void {
    this.sleeping = false;
    this.spinTime = 1.0;
  }

  sparkle(): void {
    this.sleeping = false;
    this.emitSparkles(14);
  }

  sleep(): void {
    this.sleeping = true;
    this.emitSparkles(4, 0xfff4b0); // a few drowsy "Zzz" sparkles
  }

  wake(): void {
    this.sleeping = false;
  }

  private emitSparkles(count: number, color = 0xfff0ff): void {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2,
    });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.07), mat);
      mesh.position.set(
        (Math.random() - 0.5) * 1.2,
        0.6 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.2,
      );
      this.group.add(mesh);
      this.sparkles.push({
        mesh,
        life: 1,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          0.8 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.6,
        ),
      });
    }
  }

  /** Called every frame. `t` is elapsed seconds, `dt` is delta seconds. */
  update(t: number, dt: number): void {
    // Idle breathing.
    const breathe = Math.sin(t * 2) * 0.03;
    this.body.scale.y = 1.15 + breathe;

    // Idle bobbing or sleeping droop.
    let y = this.baseY;
    if (this.sleeping) {
      y = this.baseY - 0.15 + Math.sin(t * 1.5) * 0.02;
      this.head.rotation.x = 0.5;
      this.eyes.forEach((e) => (e.scale.y = 0.12)); // closed eyes
    } else {
      y = this.baseY + Math.sin(t * 2) * 0.04;
      this.head.rotation.x = Math.sin(t * 0.8) * 0.05;
    }

    // Wing flutter.
    const flutter = Math.sin(t * 6) * 0.18;
    this.leftWing.rotation.z = Math.PI / 2.4 + flutter;
    this.rightWing.rotation.z = -Math.PI / 2.4 - flutter;

    // Pulsing chest core.
    const coreMat = this.chestCore.material as THREE.MeshStandardMaterial;
    coreMat.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.5;
    this.chestCore.rotation.y += dt * 1.5;

    // Hop animation overrides idle Y with an arc.
    if (this.hopTime >= 0) {
      this.hopTime -= dt;
      const p = 1 - Math.max(this.hopTime, 0) / 0.6; // 0..1
      y = this.baseY + Math.sin(p * Math.PI) * 0.8;
    }

    // Spin animation rotates the whole group.
    if (this.spinTime >= 0) {
      this.spinTime -= dt;
      this.group.rotation.y += dt * Math.PI * 4;
    } else {
      // Ease rotation back toward facing forward.
      this.group.rotation.y *= 0.92;
    }

    this.group.position.y = y;

    // Blinking (only when awake).
    if (!this.sleeping) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = 2 + Math.random() * 3;
      }
      const blinking = this.blinkTimer < 0.12;
      this.eyes.forEach((e) => (e.scale.y = blinking ? 0.15 : 1.1));
    }

    // Update sparkle particles.
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.life -= dt * 1.2;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += dt * 5;
      s.mesh.rotation.y += dt * 5;
      s.mesh.scale.setScalar(Math.max(s.life, 0));
      if (s.life <= 0) {
        this.group.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.sparkles.splice(i, 1);
      }
    }
  }
}
