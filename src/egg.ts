import * as THREE from "three";

// The glowing Mystery Egg that sits in the garden beside Spark. In V0.1 it just
// floats, glows, and gently pulses — the hatching cutscene is a later version.

export class MysteryEgg {
  readonly group = new THREE.Group();
  private glowLight: THREE.PointLight;

  constructor() {
    // Egg shell: a stretched sphere with a pearly, slightly magical material.
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfff0fb,
        emissive: 0xff7ad9,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.2,
      }),
    );
    shell.scale.set(1, 1.35, 1);
    shell.castShadow = true;
    this.group.add(shell);

    // Decorative spots.
    const spotMat = new THREE.MeshStandardMaterial({
      color: 0x5fd0ff,
      emissive: 0x5fd0ff,
      emissiveIntensity: 0.6,
    });
    for (let i = 0; i < 8; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), spotMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.5;
      spot.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 1.35,
        r * Math.sin(phi) * Math.sin(theta),
      );
      this.group.add(spot);
    }

    // Inner glow light.
    this.glowLight = new THREE.PointLight(0xff7ad9, 0.8, 4);
    this.group.add(this.glowLight);

    this.group.position.set(1.6, 0.7, 0.4);
  }

  update(t: number): void {
    // Gentle float + bob.
    this.group.position.y = 0.7 + Math.sin(t * 1.5) * 0.08;
    this.group.rotation.y = Math.sin(t * 0.4) * 0.3;
    // Pulsing glow.
    this.glowLight.intensity = 0.8 + Math.sin(t * 3) * 0.4;
  }
}
