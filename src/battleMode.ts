import * as THREE from "three";
import { createBattleArena, type ArenaScene } from "./battleArena";
import { PlayerSpinner, EnemySpinner, SparkParticles } from "./spinners";

// Possible keys for mobile button injection.
export type BattleKey = "up" | "down" | "left" | "right" | "dash";

type BattleState = "countdown" | "fighting" | "gameover";

export class BattleMode {
  readonly arenaScene: ArenaScene;
  readonly player: PlayerSpinner;
  readonly enemy: EnemySpinner;

  private particles: SparkParticles;
  private battleState: BattleState = "countdown";
  private countdownTimer = 3;
  private fightFlashTimer = 0; // keeps "FIGHT!" on screen briefly
  private hitCooldown = 0;     // min time between scoring hits (prevents 1-frame combos)
  private shakeAmount = 0;
  private baseCamera: THREE.Vector3;
  private keys: Record<BattleKey, boolean> = {
    up: false, down: false, left: false, right: false, dash: false,
  };
  private prevDash = false; // edge-detect for dash

  // Callbacks the main game loop uses to update HTML UI.
  onCountdownTick?: (seconds: number) => void;
  onEnergyChange?: (playerEnergy: number, enemyEnergy: number) => void;
  onGameOver?: (winner: "player" | "enemy") => void;

  constructor(aspect: number) {
    this.arenaScene = createBattleArena(aspect);
    this.player = new PlayerSpinner();
    this.enemy = new EnemySpinner();
    this.particles = new SparkParticles();
    this.arenaScene.scene.add(this.player.group);
    this.arenaScene.scene.add(this.enemy.group);
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
  }

  /** Called by the HTML mobile buttons on touchstart/touchend. */
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
    this.arenaScene.camera.position.copy(this.baseCamera);
    this.onEnergyChange?.(100, 100);
  }

  update(dt: number): void {
    // ── Countdown ──────────────────────────────────────────────────────────
    if (this.battleState === "countdown") {
      this.countdownTimer -= dt;
      if (this.countdownTimer > 0) {
        this.onCountdownTick?.(Math.ceil(this.countdownTimer)); // 3, 2, 1
      } else {
        this.battleState = "fighting";
        this.fightFlashTimer = 0.8;
        this.onCountdownTick?.(0); // 0 => show "FIGHT!"
      }
      return;
    }

    if (this.battleState !== "fighting") return;

    // Clear the "FIGHT!" flash a short moment after the battle starts.
    if (this.fightFlashTimer > 0) {
      this.fightFlashTimer -= dt;
      if (this.fightFlashTimer <= 0) this.onCountdownTick?.(-1); // -1 => clear
    }

    // ── Player input ────────────────────────────────────────────────────────
    let dx = 0;
    let dz = 0;
    if (this.keys.up)    dz -= 1;
    if (this.keys.down)  dz += 1;
    if (this.keys.left)  dx -= 1;
    if (this.keys.right) dx += 1;

    // Normalise diagonal.
    const inputMag = Math.sqrt(dx * dx + dz * dz);
    if (inputMag > 0) { dx /= inputMag; dz /= inputMag; }

    this.player.applyInput(dx, dz, dt);

    // Dash: fire on rising edge of dash key. Dash in the held direction; only
    // default to "forward" (-Z) when no direction is held at all.
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

    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    // ── Collision detection ─────────────────────────────────────────────────
    const pdx = this.player.group.position.x - this.enemy.group.position.x;
    const pdz = this.player.group.position.z - this.enemy.group.position.z;
    const dist = Math.sqrt(pdx * pdx + pdz * pdz);
    const minDist = this.player.radius + this.enemy.radius;

    if (dist < minDist && dist > 0.01) {
      const nx = pdx / dist;
      const nz = pdz / dist;

      // Separate the spinners.
      const overlap = minDist - dist;
      this.player.group.position.x += nx * overlap * 0.55;
      this.player.group.position.z += nz * overlap * 0.55;
      this.enemy.group.position.x  -= nx * overlap * 0.55;
      this.enemy.group.position.z  -= nz * overlap * 0.55;

      // Relative impact speed along the collision normal.
      const relVx = this.player.velocity.x - this.enemy.velocity.x;
      const relVz = this.player.velocity.y - this.enemy.velocity.y;
      const impactSpeed = Math.abs(relVx * nx + relVz * nz);

      if (impactSpeed > 0.8 && this.hitCooldown <= 0) {
        this.hitCooldown = 0.45; // each ram scores once, then a short cooldown
        const impulse = impactSpeed * 0.9;

        // Bounce player back, then clamp so a hit can't fling them across the
        // arena in a single frame.
        this.player.velocity.x -= nx * impulse * 1.4;
        this.player.velocity.y -= nz * impulse * 1.4;
        const pvLen = Math.hypot(this.player.velocity.x, this.player.velocity.y);
        const PV_MAX = 22;
        if (pvLen > PV_MAX) this.player.velocity.multiplyScalar(PV_MAX / pvLen);

        // Send enemy flying (they take more impact).
        this.enemy.recoilFrom(nx * impulse * 2.2, nz * impulse * 2.2);

        // Player takes less damage (hero advantage — Aaron should win!).
        const dmg = Math.min(Math.max(impactSpeed * 3.5, 5), 25);
        this.player.takeDamage(dmg * 0.35);
        this.enemy.takeDamage(dmg);

        // Spark particles at the midpoint.
        const mid = new THREE.Vector3(
          (this.player.group.position.x + this.enemy.group.position.x) / 2,
          0.8,
          (this.player.group.position.z + this.enemy.group.position.z) / 2,
        );
        this.particles.emit(this.arenaScene.scene, mid, 22, 0xffdd44);
        this.particles.emit(this.arenaScene.scene, mid, 8, 0xff4444);

        this.shakeAmount = 0.35;
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
      // Settle the camera so the result card isn't shown mid-shake.
      this.shakeAmount = 0;
      this.arenaScene.camera.position.copy(this.baseCamera);
      // Ties go to the hero — Spark wins.
      this.onGameOver?.(this.enemy.energy <= 0 ? "player" : "enemy");
    }
  }

  resize(aspect: number): void {
    this.arenaScene.camera.aspect = aspect;
    this.arenaScene.camera.updateProjectionMatrix();
  }
}
