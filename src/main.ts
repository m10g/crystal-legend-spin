import * as THREE from "three";
import "./style.css";
import { GameState } from "./state";
import { createGarden } from "./garden";
import { Spark } from "./spark";
import { MysteryEgg } from "./egg";
import { MagicCrystal } from "./magicCrystal";
import { UI, type ActionName } from "./ui";

// --- Renderer ---
const root = document.getElementById("scene-root")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

// --- Scene contents ---
const { scene, camera, crystals } = createGarden(window.innerWidth / window.innerHeight);

const spark = new Spark();
scene.add(spark.group);

const egg = new MysteryEgg();
scene.add(egg.group);

const magicCrystal = new MagicCrystal();
scene.add(magicCrystal.group);

// --- Game state + UI ---
const state = new GameState();

// What each button does: how the meters change, what Spark does, what she says.
const ACTIONS: Record<
  ActionName,
  { changes: Partial<Record<keyof GameState["meters"], number>>; react: () => void; line: string }
> = {
  feed: {
    changes: { happiness: 12, energy: 8, growth: 4 },
    react: () => spark.hop(),
    line: "Yum! 🍓",
  },
  play: {
    changes: { bond: 12, growth: 8, happiness: 6, energy: -6 },
    react: () => spark.spin(),
    line: "Wheee! ⭐",
  },
  care: {
    changes: { energy: 10, happiness: 8, bond: 6 },
    react: () => spark.sparkle(),
    line: "So cozy! 💖",
  },
  sleep: {
    changes: { energy: 22, happiness: 4 },
    react: () => spark.sleep(),
    line: "Zzz... 😴",
  },
};

const ui = new UI(state, handleAction);

function handleAction(action: ActionName): void {
  const def = ACTIONS[action];

  // Waking up if any non-sleep action is taken.
  if (action !== "sleep") spark.wake();

  for (const [meter, amount] of Object.entries(def.changes)) {
    state.change(meter as keyof GameState["meters"], amount as number);
  }
  def.react();
  ui.say(def.line);
  ui.syncMeters();

  if (state.checkUnlock()) {
    magicCrystal.reveal();
    spark.sparkle();
    ui.showUnlock();
  }
}

// --- Render loop ---
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05);

  spark.update(t, dt);
  egg.update(t);
  magicCrystal.update(t, dt);

  // Pulse the garden crystals.
  for (const c of crystals) {
    const mat = c.material as THREE.MeshStandardMaterial;
    const phase = c.userData.phase as number;
    mat.emissiveIntensity = (c.userData.baseIntensity as number) + Math.sin(t * 2 + phase) * 0.3;
  }

  // Slow, gentle camera drift for a lively feel.
  camera.position.x = Math.sin(t * 0.15) * 0.6;
  camera.lookAt(0, 0.6, 0);

  renderer.render(scene, camera);
}
animate();

// --- Resize handling ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
