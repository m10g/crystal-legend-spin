import * as THREE from "three";
import "./style.css";
import { GameState } from "./state";
import { createGarden } from "./garden";
import { Spark } from "./spark";
import { MysteryEgg } from "./egg";
import { MagicCrystal } from "./magicCrystal";
import { UI, type ActionName } from "./ui";
import { BattleMode, type BattleKey } from "./battleMode";

// ─── Renderer (shared between modes) ─────────────────────────────────────────
const root = document.getElementById("scene-root")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

// ─── Home mode objects ────────────────────────────────────────────────────────
const { scene: homeScene, camera: homeCamera, crystals } = createGarden(
  window.innerWidth / window.innerHeight,
);

const spark = new Spark();
homeScene.add(spark.group);

const egg = new MysteryEgg();
homeScene.add(egg.group);

const magicCrystal = new MagicCrystal();
homeScene.add(magicCrystal.group);

const state = new GameState();

const ACTIONS: Record<
  ActionName,
  { changes: Partial<Record<keyof GameState["meters"], number>>; react: () => void; line: string }
> = {
  feed:  { changes: { happiness: 12, energy: 8, growth: 4 },        react: () => spark.hop(),     line: "Yum! 🍓" },
  play:  { changes: { bond: 12, growth: 8, happiness: 6, energy: -6 }, react: () => spark.spin(),   line: "Wheee! ⭐" },
  care:  { changes: { energy: 10, happiness: 8, bond: 6 },           react: () => spark.sparkle(), line: "So cozy! 💖" },
  sleep: { changes: { energy: 22, happiness: 4 },                    react: () => spark.sleep(),   line: "Zzz... 😴" },
};

const ui = new UI(state, handleAction);

function handleAction(action: ActionName): void {
  if (action !== "sleep") spark.wake();
  for (const [meter, amount] of Object.entries(ACTIONS[action].changes)) {
    state.change(meter as keyof GameState["meters"], amount as number);
  }
  ACTIONS[action].react();
  ui.say(ACTIONS[action].line);
  ui.syncMeters();
  if (state.checkUnlock()) {
    magicCrystal.reveal();
    spark.sparkle();
    ui.showUnlock();
  }
}

// ─── Battle mode (lazy init) ──────────────────────────────────────────────────
let battleMode: BattleMode | null = null;
let currentMode: "home" | "battle" = "home";

const homeOverlay   = document.getElementById("ui-overlay")!;
const battleOverlay = document.getElementById("battle-ui")!;
const countdownEl   = document.getElementById("battle-countdown")!;
const playerFill    = document.getElementById("player-energy-fill")!;
const enemyFill     = document.getElementById("enemy-energy-fill")!;
const battleResult  = document.getElementById("battle-result")!;
const resultTitle   = document.getElementById("battle-result-title")!;

function enterBattle(): void {
  if (!battleMode) {
    battleMode = new BattleMode(window.innerWidth / window.innerHeight);

    battleMode.onCountdownTick = (n) => {
      if (n > 0)       countdownEl.textContent = String(n);
      else if (n === 0) countdownEl.textContent = "FIGHT!";
      else              countdownEl.textContent = "";
    };

    battleMode.onEnergyChange = (pe, ee) => {
      playerFill.style.width = `${pe}%`;
      enemyFill.style.width  = `${ee}%`;
    };

    battleMode.onGameOver = (winner) => {
      if (winner === "player") {
        resultTitle.textContent = "🏆 You Win! Spark is amazing!";
      } else {
        resultTitle.textContent = "💀 Mega Shark wins... Try again!";
      }
      battleResult.classList.remove("hidden");
    };

    // Wire mobile D-pad buttons.
    const keyMap: Record<string, BattleKey> = {
      "btn-up":    "up",
      "btn-down":  "down",
      "btn-left":  "left",
      "btn-right": "right",
      "btn-dash":  "dash",
    };
    for (const [id, key] of Object.entries(keyMap)) {
      const btn = document.getElementById(id)!;
      btn.addEventListener("touchstart", (e) => { e.preventDefault(); battleMode!.setKey(key, true); },  { passive: false });
      btn.addEventListener("touchend",   (e) => { e.preventDefault(); battleMode!.setKey(key, false); }, { passive: false });
      btn.addEventListener("mousedown",  ()  => battleMode!.setKey(key, true));
      btn.addEventListener("mouseup",    ()  => battleMode!.setKey(key, false));
    }
  }

  currentMode = "battle";
  homeOverlay.classList.add("hidden");
  battleOverlay.classList.remove("hidden");
  battleResult.classList.add("hidden");
  countdownEl.textContent = "";
  battleMode.start();
}

function exitBattle(): void {
  currentMode = "home";
  battleOverlay.classList.add("hidden");
  homeOverlay.classList.remove("hidden");
}

document.getElementById("enter-battle")!.addEventListener("click", enterBattle);
document.getElementById("battle-exit-btn")!.addEventListener("click", exitBattle);
document.getElementById("btn-back-home")!.addEventListener("click", exitBattle);
document.getElementById("btn-fight-again")!.addEventListener("click", () => {
  battleResult.classList.add("hidden");
  battleMode!.start();
});

// ─── Render loop ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0; // accumulated time; see note below

function animate(): void {
  requestAnimationFrame(animate);
  // NOTE: only call getDelta() here. THREE.Clock.getElapsedTime() also advances
  // the clock internally, so calling both would make getDelta() return ~0.
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  const t = elapsed;

  if (currentMode === "home") {
    spark.update(t, dt);
    egg.update(t);
    magicCrystal.update(t, dt);
    for (const c of crystals) {
      (c.material as THREE.MeshStandardMaterial).emissiveIntensity =
        (c.userData.baseIntensity as number) + Math.sin(t * 2 + (c.userData.phase as number)) * 0.3;
    }
    homeCamera.position.x = Math.sin(t * 0.15) * 0.6;
    homeCamera.lookAt(0, 0.6, 0);
    renderer.render(homeScene, homeCamera);
  } else if (battleMode) {
    battleMode.update(dt);
    renderer.render(battleMode.arenaScene.scene, battleMode.arenaScene.camera);
  }
}
animate();

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  homeCamera.aspect = w / h;
  homeCamera.updateProjectionMatrix();
  if (battleMode) battleMode.resize(w / h);
});
