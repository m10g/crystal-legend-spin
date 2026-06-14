import * as THREE from "three";

// Spark particles for collision impacts and effects.
export class SparkParticles {
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  emit(scene: THREE.Scene, position: THREE.Vector3, count: number, color = 0xffdd44): void {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), mat);
      mesh.position.copy(position);
      scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          1.5 + Math.random() * 5,
          (Math.random() - 0.5) * 8,
        ),
        life: 0.7,
      });
    }
  }

  update(scene: THREE.Scene, dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 1.8;
      p.vel.y -= dt * 14;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(Math.max(p.life, 0));
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}

// ─── Player Spinner: Spark's crystal dragon battle form ───────────────────────
// Keyboard/touch controlled.  velocity.x = world X, velocity.y = world Z.

export class PlayerSpinner {
  readonly group = new THREE.Group();
  readonly radius = 0.72;

  velocity = new THREE.Vector2(0, 0);
  energy = 100;
  dashCooldown = 0;
  isDashing = false;

  private dashTime = 0;
  private spinAngle = 0;
  private core: THREE.Mesh;
  private inner: THREE.Mesh;
  private shards: THREE.Mesh[] = [];
  private glowLight: THREE.PointLight;

  constructor() {
    // Outer crystal core.
    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.58, 0),
      new THREE.MeshStandardMaterial({
        color: 0x6fe0ff,
        emissive: 0x4fd0ff,
        emissiveIntensity: 1.6,
        roughness: 0.1,
        metalness: 0.7,
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.core.scale.set(1, 1.35, 1);
    this.core.castShadow = true;
    this.group.add(this.core);

    // Bright inner glow.
    this.inner = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x80ffff,
        emissiveIntensity: 3,
      }),
    );
    this.inner.scale.set(1, 1.35, 1);
    this.group.add(this.inner);

    // Orbiting crystal shards.
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x5fd0ff,
      emissive: 0x5fd0ff,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.5,
    });
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18), shardMat);
      shard.userData.orbitAngle = (i / 5) * Math.PI * 2;
      shard.userData.orbitRadius = 0.88;
      this.shards.push(shard);
      this.group.add(shard);
    }

    // Crystal wings.
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xa0f0ff,
      emissive: 0x5fd0ff,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4), wingMat);
      wing.position.set(s * 0.95, 0, 0);
      wing.rotation.set(Math.PI / 2, 0, (s * Math.PI) / 2.5);
      wing.scale.set(1, 1, 0.2);
      this.group.add(wing);
    }

    this.glowLight = new THREE.PointLight(0x5fd0ff, 2.5, 7);
    this.group.add(this.glowLight);

    this.group.position.set(-3, 0.7, 0);
  }

  applyInput(dx: number, dz: number, dt: number): void {
    const ACCEL = 28;
    this.velocity.x += dx * ACCEL * dt;
    this.velocity.y += dz * ACCEL * dt;
  }

  triggerDash(dx: number, dz: number): void {
    if (this.dashCooldown > 0 || this.isDashing) return;
    const mag = Math.sqrt(dx * dx + dz * dz);
    const nx = mag > 0 ? dx / mag : 0;
    const nz = mag > 0 ? dz / mag : -1;
    this.velocity.set(nx * 16, nz * 16);
    this.isDashing = true;
    this.dashTime = 0.28;
    this.dashCooldown = 1.6;
  }

  update(dt: number, arenaRadius: number): void {
    if (this.isDashing) {
      this.dashTime -= dt;
      if (this.dashTime <= 0) this.isDashing = false;
    }
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // Friction (dt-normalised to 60 fps).
    const friction = this.isDashing ? 0.98 : 0.84;
    this.velocity.multiplyScalar(Math.pow(friction, dt * 60));

    // Speed cap.
    const MAX = this.isDashing ? 20 : 10;
    const spd = this.velocity.length();
    if (spd > MAX) this.velocity.multiplyScalar(MAX / spd);

    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.y * dt;

    // Arena boundary bounce.
    const posDist = Math.sqrt(this.group.position.x ** 2 + this.group.position.z ** 2);
    if (posDist > arenaRadius - this.radius) {
      const bnx = this.group.position.x / posDist;
      const bnz = this.group.position.z / posDist;
      this.group.position.x = bnx * (arenaRadius - this.radius);
      this.group.position.z = bnz * (arenaRadius - this.radius);
      const dot = this.velocity.x * bnx + this.velocity.y * bnz;
      this.velocity.x -= 2 * dot * bnx;
      this.velocity.y -= 2 * dot * bnz;
      this.velocity.multiplyScalar(0.55);
    }

    // Spin animation.
    this.spinAngle += dt * (this.isDashing ? 22 : 11);
    this.core.rotation.y = this.spinAngle;
    this.core.rotation.x = this.spinAngle * 0.4;
    this.inner.rotation.y = -this.spinAngle * 1.5;

    // Orbit shards.
    for (const shard of this.shards) {
      const a = (shard.userData.orbitAngle as number) + this.spinAngle * 1.6;
      const r = shard.userData.orbitRadius as number;
      shard.position.set(Math.cos(a) * r, Math.sin(a * 0.8) * 0.32, Math.sin(a) * r);
      shard.rotation.x += dt * 6;
    }

    // Pulse glow when dashing.
    (this.core.material as THREE.MeshStandardMaterial).emissiveIntensity = this.isDashing ? 3.5 : 1.6;
    this.glowLight.intensity = this.isDashing ? 5 : 2.5;
    this.glowLight.color.set(this.isDashing ? 0xffffff : 0x5fd0ff);

    // Hover bob.
    this.group.position.y = 0.7 + Math.sin(Date.now() * 0.003) * 0.14;
  }

  takeDamage(amount: number): void {
    this.energy = Math.max(0, this.energy - amount);
  }

  reset(): void {
    this.group.position.set(-3, 0.7, 0);
    this.velocity.set(0, 0);
    this.energy = 100;
    this.dashCooldown = 0;
    this.isDashing = false;
    this.dashTime = 0;
  }
}

// ─── Enemy Spinner: Mega Shark Spinner ───────────────────────────────────────
// Simple AI: approach → charge → recoil loop.

export class EnemySpinner {
  readonly group = new THREE.Group();
  readonly radius = 0.78;

  velocity = new THREE.Vector2(0, 0);
  energy = 100;

  private spinAngle = 0;
  private state: "approach" | "charge" | "recoil" = "approach";
  private stateTimer = 0;
  private core: THREE.Mesh;
  private glowLight: THREE.PointLight;

  constructor() {
    // Main body — flattened dark octahedron.
    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshStandardMaterial({
        color: 0x6b1020,
        emissive: 0xff1020,
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.65,
      }),
    );
    this.core.scale.set(1.25, 0.75, 1.25);
    this.core.castShadow = true;
    this.group.add(this.core);

    // Shark fin on top.
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.75, 4),
      new THREE.MeshStandardMaterial({
        color: 0x400010,
        emissive: 0xff0820,
        emissiveIntensity: 0.7,
        roughness: 0.4,
      }),
    );
    fin.position.y = 0.58;
    fin.rotation.y = Math.PI / 4;
    this.group.add(fin);

    // Outer ring of spikes.
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xff1020,
      emissive: 0xff0000,
      emissiveIntensity: 1.0,
    });
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 4), spikeMat);
      const a = (i / 7) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72);
      spike.rotation.z = Math.PI / 2;
      spike.rotation.y = a;
      this.group.add(spike);
    }

    // Menacing eyes.
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: 2.5,
    });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
      eye.position.set(s * 0.3, 0.22, 0.56);
      this.group.add(eye);
    }

    this.glowLight = new THREE.PointLight(0xff2020, 2.0, 6);
    this.group.add(this.glowLight);

    this.group.position.set(3, 0.7, 0);
  }

  update(dt: number, playerPos: THREE.Vector3, arenaRadius: number): void {
    this.stateTimer -= dt;

    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const nx = dist > 0 ? dx / dist : 0;
    const nz = dist > 0 ? dz / dist : 0;

    switch (this.state) {
      case "approach":
        this.velocity.x += nx * 5 * dt;
        this.velocity.y += nz * 5 * dt;
        if (dist < 4 && this.stateTimer <= 0) {
          this.state = "charge";
          this.stateTimer = 0.65;
          this.velocity.set(nx * 11, nz * 11);
        }
        break;

      case "charge":
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.stateTimer = 1.2;
        }
        break;

      case "recoil":
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.stateTimer = 0.5;
        }
        break;
    }

    // Speed cap.
    const MAX = this.state === "charge" ? 13 : 6;
    const spd = this.velocity.length();
    if (spd > MAX) this.velocity.multiplyScalar(MAX / spd);

    const friction = this.state === "charge" ? 0.97 : 0.84;
    this.velocity.multiplyScalar(Math.pow(friction, dt * 60));

    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.y * dt;

    // Arena boundary bounce.
    const posDist = Math.sqrt(this.group.position.x ** 2 + this.group.position.z ** 2);
    if (posDist > arenaRadius - this.radius) {
      const bnx = this.group.position.x / posDist;
      const bnz = this.group.position.z / posDist;
      this.group.position.x = bnx * (arenaRadius - this.radius);
      this.group.position.z = bnz * (arenaRadius - this.radius);
      const dot = this.velocity.x * bnx + this.velocity.y * bnz;
      this.velocity.x -= 2 * dot * bnx;
      this.velocity.y -= 2 * dot * bnz;
      this.velocity.multiplyScalar(0.55);
    }

    // Spin.
    this.spinAngle += dt * (this.state === "charge" ? 20 : 9);
    this.core.rotation.y = this.spinAngle;

    // Face the player.
    if (dist > 0.1) this.group.rotation.y = Math.atan2(dx, dz);

    // Glow intensity.
    const isCharging = this.state === "charge";
    this.glowLight.intensity = isCharging ? 4 : 2;
    (this.core.material as THREE.MeshStandardMaterial).emissiveIntensity = isCharging ? 2.2 : 0.9;

    this.group.position.y = 0.7 + Math.sin(Date.now() * 0.003 + 1.5) * 0.11;
  }

  recoilFrom(impulseX: number, impulseZ: number): void {
    this.velocity.x += impulseX;
    this.velocity.y += impulseZ;
    this.state = "recoil";
    this.stateTimer = 0.9;
  }

  takeDamage(amount: number): void {
    this.energy = Math.max(0, this.energy - amount);
  }

  reset(): void {
    this.group.position.set(3, 0.7, 0);
    this.velocity.set(0, 0);
    this.energy = 100;
    this.state = "approach";
    this.stateTimer = 0;
  }
}
