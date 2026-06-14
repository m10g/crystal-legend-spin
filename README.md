# Crystal Spin Legends — V0.1 (Baby Dragon Home Demo)

A tiny browser-based 3D prototype built with **Vite + TypeScript + Three.js**.

This first version is **not** the battle game — it is the cute "home" demo:
you raise **Spark**, a baby crystal dragon, in a glowing crystal garden. Press
the action buttons to make Spark happy. When **Happiness reaches 100%**, the
**Magic Spin Crystal** appears and the transformation unlocks. ✨

## Run it

You need [Node.js](https://nodejs.org/) (v18 or newer).

```bash
npm install
npm run dev
```

Then open the URL Vite prints in your terminal — usually:

```
http://localhost:5173
```

The page reloads automatically when the code changes.

To make a production build:

```bash
npm run build      # output goes to /dist
npm run preview    # serve the production build locally
```

## What's in the demo

- **3D crystal garden** — a grassy mound, a glowing magic circle, a ring of
  colored crystals, drifting sparkle-stars, and a gentle angled camera.
- **Spark** — a cute blue baby dragon built from simple Three.js shapes
  (body, big eyes, crystal horns, glowing chest core, crystal wings and tail).
  She breathes, blinks, flutters her wings, and reacts to you.
- **Mystery Egg** — a glowing, floating egg next to Spark (hatching comes in a
  later version).
- **Four meters** — Happiness, Energy, Bond, Growth (all stay between 0–100).
- **Four buttons:**
  | Button | Spark does | Meters |
  |---|---|---|
  | 🍓 Feed | happy hop | +Happiness, +Energy, +Growth |
  | ⭐ Play | spin & jump | +Bond, +Growth, +Happiness, −Energy |
  | 💖 Care | sparkle burst | +Energy, +Happiness, +Bond |
  | 😴 Sleep | rests & droops | +Energy, +Happiness |
- **Unlock moment** — at 100% Happiness, the Magic Spin Crystal rises with a
  "Crystal Transformation Unlocked!" banner.

## Project layout

```
index.html            # HUD overlay (meters, buttons, banner) + canvas mount
src/
  main.ts             # renderer, game loop, button → action wiring
  garden.ts           # scene: ground, lights, crystals, camera, stars
  spark.ts            # the baby dragon model + its animations
  egg.ts              # the glowing Mystery Egg
  magicCrystal.ts     # the unlock-reveal Magic Spin Crystal
  state.ts            # the four meters (clamped 0–100) + unlock check
  ui.ts               # syncing meters, speech bubble, unlock banner
  style.css           # overlay styling
```

The code is intentionally simple and modular so the next build can extend it
(see the handoff doc for V0.2+ ideas: hatching scene, idle emotions, the first
transformation teaser, and a battle sandbox).
