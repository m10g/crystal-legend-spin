import * as THREE from "three";
import { createBattleArena, type ArenaScene } from "./battleArena";
import { PlayerSpinner, EnemySpinner, SparkParticles, ShockwaveRing } from "./spinners";

export type BattleKey = "up" | "down" | "left" | "right" | "dash";

type BattleState = "countdown" | "fighting" | "gameover";

export class BattleMode {
  readonly arenaScene: ArenaScene;
  readonly player: PlayerSpinner;
  readonly enemy: EnemySpinner;

  private particles: SparkParticles;
  private shockwaves: ShockwaveRing[] = [];
  private pendingShockwave: { pos: THREE.Vector3; delay: number } | null = null;
  private battleState: BattleState = "countdown";
  private countdownTimer = 3;
  private fightFlashTimer = 0;
  private hitCooldown = 0;
  private shakeAmount = 0;
  private baseCamera: THREE.Vector3;
  private boundaryFlash = 0;
  private keys: Record<BattleKey, boolean> = {
    up: false, down: false, left: false, right: false, dash: false,
  };
  private prevDash = false;

  onCountdownTick?: (seconds: number) => void;
  onEnergyChange?: (playerEnergy: number, enemyEnergy: number) => void;
  onGameOver?: (winner: "player" | "enemy") => void;
  onScreenFlash?: (color: string) => void;

  constructor(aspect: number) {
    this.arenaScene = createBattleArena(aspect);
    this.player = new PlayerSpinner();
    this.enemy = new EnemySpinner();
    this.particles = new SparkParticles();
    this.arenaScene.scene.add(this.player.group);
    this.arenaScene.scene.add(this.enemy.group);
    this.player.addToScene(this.arenaScene.scene);
    this.baseCamera = this.arenaScene.camera.position.clone();
    this.bindKeyboard();
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "ArrowUp":    case "KeyW": this.keys.up    = true; break;
        case "ArrowDown":  case "KeyS": this.keys.down  = true; break;
        case "ArrowLeft":  case "KeyA": this.keys.left  = true; break;
        case "ArrowRight": case "KeyD": this.keys.right = true; break;
        case "Space": case "ShiftLeft": this.keys.dash  = true; e.preventDefault(); break;
      }
    });
    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "ArrowUp":    case "KeyW": this.keys.up    = false; break;
        case "ArrowDown":  case "KeyS": this.keys.down  = false; break;
        case "ArrowLeft":  case "KeyA": this.keys.left  = false; break;
        case "ArrowRight": case "KeyD": this.keys.right = false; break;
        case "Space": case "ShiftLeft": this.keys.dash  = false; break;
      }
    });
    window.addEventListener("blur", () => this.clearKeys());
  }

  private clearKeys(): void {
    this.keys.up = this.keys.down = this.keys.left = this.keys.right = this.keys.dash = false;
  }

  setKey(key: BattleKey, pressed: boolean): void {
    this.keys[key] = pressed;
  }

  start(): void {
    this.battleState = "countdown";
    this.countdownTimer = 3;
    this.fightFlashTimer = 0;
    this.hitCooldown = 0;
    this.player.reset();
    this.enemy.reset();
    this.shakeAmount = 0;
    this.boundaryFlash = 0;
    for (const sw of this.shockwaves) sw.dispose(this.arenaScene.scene);
    this.shockwaves.length = 0;
    this.pendingShockwave = null;
    this.particles.clear(this.arenaScene.scene);
    this.clearKeys();
    this.prevDash = false;
    this.arenaScene.camera.position.copy(this.baseCamera);
    this.arenaScene.boundaryMat.emissiveIntensity = 2.0;
    this.onEnergyChange?.(100, 100);
  }

  update(dt: number): void {
    // ── Countdown ──────────────────────────────────────────────────────────
    if (this.battleState === "countdown") {
      this.countdownTimer -= dt;
      if (this.countdownTimer > 0) {
        this.onCountdownTick?.(Math.ceil(this.countdownTimer));
      } else {
        this.battleState = "fighting";
        this.fightFlashTimer = 0.8;
        this.onCountdownTick?.(0);
      }
      return;
    }

    if (this.battleState !== "fighting") return;

    if (this.fightFlashTimer > 0) {
      this.fightFlashTimer -= dt;
      if (this.fightFlashTimer <= 0) this.onCountdownTick?.(-1);
    }

    // ── Player input ────────────────────────────────────────────────────────
    let dx = 0, dz = 0;
    if (this.keys.up)    dz -= 1;
    if (this.keys.down)  dz += 1;
    if (this.keys.left)  dx -= 1;
    if (this.keys.right) dx += 1;

    const inputMag = Math.sqrt(dx * dx + dz * dz);
    if (inputMag > 0) { dx /= inputMag; dz /= inputMag; }

    this.player.applyInput(dx, dz, dt);

    const dashNow = this.keys.dash;
    if (dashNow && !this.prevDash) {
      const noInput = dx === 0 && dz === 0;
      this.player.triggerDash(dx, noInput ? -1 : dz);
    }
    this.prevDash = dashNow;

    // ── Update spinners ─────────────────────────────────────────────────────
    const { arenaRadius } = this.arenaScene;
    this.player.update(dt, arenaRadius);
    this.enemy.update(dt, this.player.group.position, arenaRadius);
    this.particles.update(this.arenaScene.scene, dt);

    // Update shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      if (this.shockwaves[i].update(dt)) {
        this.shockwaves[i].dispose(this.arenaScene.scene);
        this.shockwaves.splice(i, 1);
      }
    }

    // Staggered third shockwave (game-loop timer, not setTimeout)
    if (this.pendingShockwave) {
      this.pendingShockwave.delay -= dt;
      if (this.pendingShockwave.delay <= 0) {
        this.shockwaves.push(new ShockwaveRing(this.arenaScene.scene, this.pendingShockwave.pos, 0xffffff));
        this.pendingShockwave = null;
      }
    }

    // Boundary flash decay
    if (this.boundaryFlash > 0) {
      this.boundaryFlash -= dt * 3;
      if (this.boundaryFlash < 0) this.boundaryFlash = 0;
      const bi = 2.0 + this.boundaryFlash * 6;
      this.arenaScene.boundaryMat.emissiveIntensity = bi;
      this.arenaScene.boundaryLight.intensity = 1.2 + this.boundaryFlash * 4;
    }

    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    // ── Collision detection ─────────────────────────────────────────────────
    const pdx = this.player.group.position.x - this.enemy.group.position.x;
    const pdz = this.player.group.position.z - this.enemy.group.position.z;
    const dist = Math.sqrt(pdx * pdx + pdz * pdz);
    const minDist = this.player.radius + this.enemy.radius;

    if (dist < minDist && dist > 0.01) {
      const nx = pdx / dist;
      const nz = pdz / dist;

      const overlap = minDist - dist;
      this.player.group.position.x += nx * overlap * 0.55;
      this.player.group.position.z += nz * overlap * 0.55;
      this.enemy.group.position.x  -= nx * overlap * 0.55;
      this.enemy.group.position.z  -= nz * overlap * 0.55;

      const relVx = this.player.velocity.x - this.enemy.velocity.x;
      const relVz = this.player.velocity.y - this.enemy.velocity.y;
      const impactSpeed = Math.abs(relVx * nx + relVz * nz);

      if (impactSpeed > 0.8 && this.hitCooldown <= 0) {
        this.hitCooldown = 0.45;
        const impulse = impactSpeed * 0.9;

        this.player.velocity.x -= nx * impulse * 1.4;
        this.player.velocity.y -= nz * impulse * 1.4;
        const pvLen = Math.hypot(this.player.velocity.x, this.player.velocity.y);
        const PV_MAX = 22;
        if (pvLen > PV_MAX) this.player.velocity.multiplyScalar(PV_MAX / pvLen);

        this.enemy.recoilFrom(nx * impulse * 2.2, nz * impulse * 2.2);

        const dmg = Math.min(Math.max(impactSpeed * 3.5, 5), 25);
        this.player.takeDamage(dmg * 0.35);
        this.enemy.takeDamage(dmg);

        const mid = new THREE.Vector3(
          (this.player.group.position.x + this.enemy.group.position.x) / 2,
          0.8,
          (this.player.group.position.z + this.enemy.group.position.z) / 2,
        );

        // Big explosive burst: 3 colours, faster particles
        this.particles.emit(this.arenaScene.scene, mid, 28, 0xffee44, 1.3);
        this.particles.emit(this.arenaScene.scene, mid, 14, 0xff4444, 1.0);
        this.particles.emit(this.arenaScene.scene, mid, 10, 0xffffff, 1.6);

        // Two expanding shockwave rings, plus a third staggered via game-loop timer.
        this.shockwaves.push(new ShockwaveRing(this.arenaScene.scene, mid, 0xffee44));
        this.shockwaves.push(new ShockwaveRing(this.arenaScene.scene, mid, 0xff4444));
        this.pendingShockwave = { pos: mid.clone(), delay: 0.08 };

        // Boundary flash
        this.boundaryFlash = 1.0;

        // Screen flash via CSS
        this.onScreenFlash?.(impactSpeed > 5 ? "#ffee44" : "#ff4444");

        this.shakeAmount = 0.4;
        this.onEnergyChange?.(this.player.energy, this.enemy.energy);
      }
    }

    // ── Camera shake ────────────────────────────────────────────────────────
    if (this.shakeAmount > 0) {
      this.arenaScene.camera.position.set(
        this.baseCamera.x + (Math.random() - 0.5) * this.shakeAmount,
        this.baseCamera.y + (Math.random() - 0.5) * this.shakeAmount,
        this.baseCamera.z + (Math.random() - 0.5) * this.shakeAmount,
      );
      this.shakeAmount *= 0.72;
      if (this.shakeAmount < 0.01) {
        this.arenaScene.camera.position.copy(this.baseCamera);
        this.shakeAmount = 0;
      }
    }

    // ── Win / lose ───────────────────────────────────────────────────────────
    if (this.player.energy <= 0 || this.enemy.energy <= 0) {
      this.battleState = "gameover";
      this.shakeAmount = 0;
      this.arenaScene.camera.position.copy(this.baseCamera);
      this.onGameOver?.(this.enemy.energy <= 0 ? "player" : "enemy");
    }
  }

  resize(aspect: number): void {
    this.arenaScene.camera.aspect = aspect;
    this.arenaScene.camera.updateProjectionMatrix();
  }
}
