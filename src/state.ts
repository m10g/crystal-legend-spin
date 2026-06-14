// Game state for V0.1: just the four creature meters.
// Everything is clamped to 0-100. Keeping this isolated makes it easy for
// the next build to add saving, more stats, or progression later.

export type MeterName = "happiness" | "energy" | "bond" | "growth";

export interface Meters {
  happiness: number;
  energy: number;
  bond: number;
  growth: number;
}

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

export class GameState {
  meters: Meters = {
    happiness: 40,
    energy: 60,
    bond: 30,
    growth: 20,
  };

  // True once Happiness has first reached 100%, so the unlock only fires once.
  unlocked = false;

  /** Add (or subtract) a value from a meter, keeping it within 0-100. */
  change(meter: MeterName, amount: number): void {
    this.meters[meter] = clamp(this.meters[meter] + amount);
  }

  /** Returns true the first time happiness hits 100. */
  checkUnlock(): boolean {
    if (!this.unlocked && this.meters.happiness >= 100) {
      this.unlocked = true;
      return true;
    }
    return false;
  }
}
