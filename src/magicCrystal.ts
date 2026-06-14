import * as THREE from "three";

// The Magic Spin Crystal that is revealed when Happiness reaches 100%. It starts
// hidden and animates in with a grow + rise when reveal() is called.

export class MagicCrystal {
  readonly group = new THREE.Group();
  private revealed = false;
  private revealProgress = 0; // 0..1
  private light: THREE.PointLight;

  constructor() {
    // Main faceted crystal.
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.6, 0),
      new THREE.MeshStandardMaterial({
        color: 0xbfa6ff,
        emissive: 0xa06bff,
        emissiveIntensity: 1.6,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.92,
      }),
    );
    crystal.scale.set(1, 1.5, 1);
    this.group.add(crystal);

    // Orbiting smaller shards.
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.15),
        new THREE.MeshStandardMaterial({
          color: 0x5fd0ff,
          emissive: 0x5fd0ff,
          emissiveIntensity: 1.2,
        }),
      );
      const angle = (i / 4) * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9);
      shard.userData.angle = angle;
      this.group.add(shard);
    }

    this.light = new THREE.PointLight(0xa06bff, 0, 8);
    this.group.add(this.light);

    // Hovers over the magic circle, in front of Spark.
    this.group.position.set(-1.6, 1.0, 0.4);
    this.group.visible = false;
    this.group.scale.setScalar(0.01);
  }

  reveal(): void {
    this.revealed = true;
    this.group.visible = true;
  }

  update(t: number, dt: number): void {
    if (!this.revealed) return;

    // Ease the grow-in.
    if (this.revealProgress < 1) {
      this.revealProgress = Math.min(1, this.revealProgress + dt * 0.8);
    }
    const eased = 1 - Math.pow(1 - this.revealProgress, 3);
    this.group.scale.setScalar(eased);
    this.light.intensity = eased * 2;

    // Spin and bob.
    this.group.rotation.y += dt * 1.2;
    this.group.position.y = 1.0 + Math.sin(t * 1.8) * 0.12;

    // Orbit the shards.
    this.group.children.forEach((child) => {
      if (child.userData.angle !== undefined) {
        const a = child.userData.angle + t * 1.5;
        child.position.set(Math.cos(a) * 0.9, Math.sin(t * 2 + a) * 0.2, Math.sin(a) * 0.9);
        child.rotation.x += dt * 3;
      }
    });
  }
}
