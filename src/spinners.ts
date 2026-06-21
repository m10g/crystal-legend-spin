import * as THREE from "three";

// ─── Spark Particles ──────────────────────────────────────────────────────────

export class SparkParticles {
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
  private materials = new Map<number, THREE.MeshStandardMaterial>();

  private getMaterial(color: number): THREE.MeshStandardMaterial {
    let mat = this.materials.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 });
      this.materials.set(color, mat);
    }
    return mat;
  }

  clear(scene: THREE.Scene): void {
    for (const p of this.particles) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.particles.length = 0;
  }

  emit(scene: THREE.Scene, position: THREE.Vector3, count: number, color = 0xffdd44, speedMult = 1): void {
    const mat = this.getMaterial(color);
    for (let i = 0; i < count; i++) {
      const size = 0.05 + Math.random() * 0.14;
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), mat);
      mesh.position.copy(position);
      scene.add(mesh);
      const life = 0.5 + Math.random() * 0.55;
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 12 * speedMult,
          1.5 + Math.random() * 7 * speedMult,
          (Math.random() - 0.5) * 12 * speedMult,
        ),
        life,
        maxLife: life,
      });
    }
  }

  update(scene: THREE.Scene, dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 1.4;
      p.vel.y -= dt * 18;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = Math.max(p.life / p.maxLife, 0);
      p.mesh.scale.setScalar(t * 1.4);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}

// ─── Shockwave ring that expands outward from a hit point ────────────────────

export class ShockwaveRing {
  readonly mesh: THREE.Mesh;
  private life = 1;
  private mat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, position: THREE.Vector3, color: number) {
    this.mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 4,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.22, 32), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.18;
    scene.add(this.mesh);
  }

  /** Returns true when the ring is done and should be removed. */
  update(dt: number): boolean {
    this.life -= dt * 2.8;
    if (this.life <= 0) return true;
    const s = 1 + (1 - this.life) * 8;
    this.mesh.scale.setScalar(s);
    this.mat.opacity = this.life * 0.85;
    this.mat.emissiveIntensity = this.life * 5;
    return false;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

// ─── Player Spinner: Spark's crystal dragon battle form ───────────────────────

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
  private coreMat: THREE.MeshStandardMaterial;
  private shards: THREE.Mesh[] = [];
  private glowLight: THREE.PointLight;

  // Motion trail: ring afterimages — each ring gets its own material so opacity
  // can differ per ring without the shared-material-overwrite bug.
  private trail: THREE.Mesh[] = [];
  private trailMats: THREE.MeshStandardMaterial[] = [];

  // Damage flash state
  private hitFlash = 0;

  constructor() {
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x6fe0ff,
      emissive: 0x4fd0ff,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.95,
    });
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 1), this.coreMat);
    this.core.scale.set(1, 1.35, 1);
    this.core.castShadow = true;
    this.group.add(this.core);

    this.inner = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x80ffff, emissiveIntensity: 3 }),
    );
    this.inner.scale.set(1, 1.35, 1);
    this.group.add(this.inner);

    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x5fd0ff, emissive: 0x5fd0ff, emissiveIntensity: 1.4,
      roughness: 0.1, metalness: 0.5,
    });
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18), shardMat);
      shard.userData.orbitAngle = (i / 5) * Math.PI * 2;
      shard.userData.orbitRadius = 0.92;
      this.shards.push(shard);
      this.group.add(shard);
    }

    // Crystal wings — wide flat diamond shapes.
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xa0f0ff, emissive: 0x5fd0ff, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.75, side: THREE.DoubleSide,
    });
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), wingMat);
      wing.position.set(s * 1.05, 0, 0);
      wing.scale.set(0.55, 0.18, 1.1);
      this.group.add(wing);
    }

    this.glowLight = new THREE.PointLight(0x5fd0ff, 2.5, 7);
    this.group.add(this.glowLight);

    // Motion trail — 7 rings, each with its own material so per-ring opacity works.
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x40cfff, emissive: 0x40cfff, emissiveIntensity: 2.5,
        transparent: true, opacity: 0, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.7, 24), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.trail.push(ring);
      this.trailMats.push(mat);
    }

    this.group.position.set(-3, 0.7, 0);
  }

  addToScene(scene: THREE.Scene): void {
    for (const r of this.trail) scene.add(r);
  }

  removeFromScene(scene: THREE.Scene): void {
    for (const r of this.trail) scene.remove(r);
  }

  applyInput(dx: number, dz: number, dt: number): void {
    this.velocity.x += dx * 40 * dt;
    this.velocity.y += dz * 40 * dt;
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

  flashHit(): void {
    this.hitFlash = 0.35;
  }

  update(dt: number, arenaRadius: number): void {
    if (this.isDashing) {
      this.dashTime -= dt;
      if (this.dashTime <= 0) this.isDashing = false;
    }
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const friction = this.isDashing ? 0.99 : 0.91;
    this.velocity.multiplyScalar(Math.pow(friction, dt * 60));

    const MAX = this.isDashing ? 20 : 11;
    const spd = this.velocity.length();
    if (spd > MAX) this.velocity.multiplyScalar(MAX / spd);

    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.y * dt;

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

    this.spinAngle += dt * (this.isDashing ? 26 : 12);
    this.core.rotation.y = this.spinAngle;
    this.core.rotation.x = this.spinAngle * 0.4;
    this.inner.rotation.y = -this.spinAngle * 1.6;

    for (const shard of this.shards) {
      const a = (shard.userData.orbitAngle as number) + this.spinAngle * 1.7;
      const r = shard.userData.orbitRadius as number;
      shard.position.set(Math.cos(a) * r, Math.sin(a * 0.8) * 0.35, Math.sin(a) * r);
      shard.rotation.x += dt * 8;
    }

    // Damage flash: pulse white when hit
    const flashOn = this.hitFlash > 0 && Math.sin(this.hitFlash * 60) > 0;
    this.coreMat.emissiveIntensity = flashOn ? 8 : (this.isDashing ? 3.5 : 1.6);
    this.coreMat.emissive.set(flashOn ? 0xffffff : (this.isDashing ? 0xffffff : 0x4fd0ff));

    this.glowLight.intensity = this.isDashing ? 6 : (flashOn ? 5 : 2.5);
    this.glowLight.color.set(flashOn ? 0xffffff : (this.isDashing ? 0xffffff : 0x5fd0ff));

    const bobY = 0.7 + Math.sin(Date.now() * 0.003) * 0.14;
    this.group.position.y = bobY;

    // Motion trail: rings trailing behind when dashing or fast.
    // Each ring has its own material so opacity decreases properly from front to back.
    const speed = this.velocity.length();
    const showTrail = this.isDashing || speed > 6;
    const N = this.trail.length;
    for (let i = 0; i < N; i++) {
      const ring = this.trail[i];
      ring.visible = showTrail;
      if (showTrail) {
        const lag = (i + 1) * 0.065;
        ring.position.set(
          this.group.position.x - this.velocity.x * lag,
          bobY + 0.01,
          this.group.position.z - this.velocity.y * lag,
        );
        // Closest ring (i=0) is most opaque; furthest ring (i=N-1) fades to ~0.
        this.trailMats[i].opacity = (1 - i / N) * (this.isDashing ? 0.6 : 0.38);
      }
    }
  }

  takeDamage(amount: number): void {
    this.energy = Math.max(0, this.energy - amount);
    this.flashHit();
  }

  reset(): void {
    this.group.position.set(-3, 0.7, 0);
    this.velocity.set(0, 0);
    this.energy = 100;
    this.dashCooldown = 0;
    this.isDashing = false;
    this.dashTime = 0;
    this.hitFlash = 0;
    for (const r of this.trail) r.visible = false;
  }
}

// ─── Enemy Spinner: Mega Shark Spinner ───────────────────────────────────────

export class EnemySpinner {
  readonly group = new THREE.Group();
  readonly radius = 0.78;

  velocity = new THREE.Vector2(0, 0);
  energy = 100;

  private spinAngle = 0;
  private state: "approach" | "windup" | "charge" | "recoil" = "approach";
  private stateTimer = 0;
  private core: THREE.Mesh;
  private coreMat: THREE.MeshStandardMaterial;
  private spikes: THREE.Mesh[] = [];
  private spikeMat: THREE.MeshStandardMaterial;
  private glowLight: THREE.PointLight;
  private auraRing: THREE.Mesh;
  private auraMat: THREE.MeshStandardMaterial;

  // Damage flash state
  private hitFlash = 0;
  // Windup charge telegraph
  private windupPulse = 0;

  constructor() {
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x6b1020, emissive: 0xff1020, emissiveIntensity: 0.9,
      roughness: 0.3, metalness: 0.65,
    });
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), this.coreMat);
    this.core.scale.set(1.25, 0.75, 1.25);
    this.core.castShadow = true;
    this.group.add(this.core);

    // Shark fin — taller, more menacing
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.92, 3),
      new THREE.MeshStandardMaterial({ color: 0x400010, emissive: 0xff0820, emissiveIntensity: 0.9, roughness: 0.3 }),
    );
    fin.position.y = 0.62;
    fin.rotation.y = Math.PI / 4;
    this.group.add(fin);

    this.spikeMat = new THREE.MeshStandardMaterial({
      color: 0xff1020, emissive: 0xff0000, emissiveIntensity: 1.0,
    });
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.62, 4), this.spikeMat);
      const a = (i / 8) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.78, 0, Math.sin(a) * 0.78);
      spike.rotation.z = Math.PI / 2;
      spike.rotation.y = a;
      this.spikes.push(spike);
      this.group.add(spike);
    }

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 3,
    });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeMat);
      eye.position.set(s * 0.3, 0.22, 0.58);
      this.group.add(eye);
    }

    // Red aura ring — grows and pulses during windup
    this.auraMat = new THREE.MeshStandardMaterial({
      color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 3,
      transparent: true, opacity: 0, side: THREE.DoubleSide,
    });
    this.auraRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.35, 32), this.auraMat);
    this.auraRing.rotation.x = -Math.PI / 2;
    this.group.add(this.auraRing);

    this.glowLight = new THREE.PointLight(0xff2020, 2.0, 6);
    this.group.add(this.glowLight);

    this.group.position.set(3, 0.7, 0);
  }

  flashHit(): void {
    this.hitFlash = 0.35;
  }

  update(dt: number, playerPos: THREE.Vector3, arenaRadius: number): void {
    this.stateTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.windupPulse > 0) this.windupPulse -= dt;

    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const nx = dist > 0 ? dx / dist : 0;
    const nz = dist > 0 ? dz / dist : 0;

    switch (this.state) {
      case "approach":
        this.velocity.x += nx * 30 * dt;
        this.velocity.y += nz * 30 * dt;
        if (dist < 4.5 && this.stateTimer <= 0) {
          this.state = "windup";
          this.stateTimer = 0.65; // telegraph window
          this.windupPulse = 0.65;
          this.velocity.multiplyScalar(0.3); // slow down before charging
        }
        break;

      case "windup":
        // Slow creep during windup
        this.velocity.x += nx * 5 * dt;
        this.velocity.y += nz * 5 * dt;
        if (this.stateTimer <= 0) {
          this.state = "charge";
          this.stateTimer = 0.65;
          this.velocity.set(nx * 16, nz * 16);
          this.windupPulse = 0;
        }
        break;

      case "charge":
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.stateTimer = 1.4;
        }
        break;

      case "recoil":
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.stateTimer = 0.5;
        }
        break;
    }

    const MAX = this.state === "charge" ? 14 : (this.state === "windup" ? 3 : 7);
    const spd = this.velocity.length();
    if (spd > MAX) this.velocity.multiplyScalar(MAX / spd);

    const friction = this.state === "charge" ? 0.98 : 0.91;
    this.velocity.multiplyScalar(Math.pow(friction, dt * 60));

    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.y * dt;

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

    this.spinAngle += dt * (this.state === "charge" ? 24 : 10);
    this.core.rotation.y = this.spinAngle;
    if (dist > 0.1) this.group.rotation.y = Math.atan2(dx, dz);

    // Spikes flare outward during charge
    const chargeT = this.state === "charge" ? 1 : (this.state === "windup" ? this.windupPulse / 0.65 : 0);
    for (let i = 0; i < this.spikes.length; i++) {
      const a = (i / this.spikes.length) * Math.PI * 2;
      const baseR = 0.78;
      const r = baseR + chargeT * 0.3;
      this.spikes[i].position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
    this.spikeMat.emissiveIntensity = 1.0 + chargeT * 3;

    // Aura ring grows during windup, pulses during charge
    const auraVisible = this.state === "windup" || this.state === "charge";
    this.auraMat.opacity = auraVisible
      ? (this.state === "windup"
          ? 0.3 + Math.sin(this.windupPulse * 20) * 0.15
          : 0.25 + Math.sin(Date.now() * 0.015) * 0.1)
      : 0;
    this.auraRing.scale.setScalar(1 + chargeT * 0.6 + Math.sin(Date.now() * 0.012) * 0.07);

    // Damage flash: pulse white
    const flashOn = this.hitFlash > 0 && Math.sin(this.hitFlash * 60) > 0;
    this.coreMat.emissive.set(flashOn ? 0xffffff : 0xff1020);
    this.coreMat.emissiveIntensity = flashOn ? 8 : (this.state === "charge" ? 2.8 : 0.9);

    this.glowLight.intensity = this.state === "charge" ? 5 : (this.state === "windup" ? 3.5 : (flashOn ? 4 : 2));
    this.glowLight.color.set(flashOn ? 0xffffff : 0xff2020);

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
    this.flashHit();
  }

  reset(): void {
    this.group.position.set(3, 0.7, 0);
    this.velocity.set(0, 0);
    this.energy = 100;
    this.state = "approach";
    this.stateTimer = 0;
    this.hitFlash = 0;
    this.windupPulse = 0;
    this.auraMat.opacity = 0;
  }
}
