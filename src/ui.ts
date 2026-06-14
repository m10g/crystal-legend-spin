import type { GameState, MeterName } from "./state";

// Handles the HTML overlay: syncing meter bars, wiring action buttons, showing
// Spark's little speech bubble, and the unlock banner.

export type ActionName = "feed" | "play" | "care" | "sleep";

export class UI {
  private fills: Record<MeterName, HTMLElement>;
  private bubble: HTMLElement;
  private banner: HTMLElement;
  private bubbleTimer: number | undefined;

  constructor(
    private state: GameState,
    onAction: (action: ActionName) => void,
  ) {
    this.fills = {
      happiness: this.el("fill-happiness"),
      energy: this.el("fill-energy"),
      bond: this.el("fill-bond"),
      growth: this.el("fill-growth"),
    };
    this.bubble = this.el("speech-bubble");
    this.banner = this.el("unlock-banner");

    // Wire action buttons.
    document.querySelectorAll<HTMLButtonElement>(".action-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        onAction(btn.dataset.action as ActionName);
      });
    });

    // Dismiss the unlock banner.
    this.el("unlock-dismiss").addEventListener("click", () => {
      this.banner.classList.add("hidden");
    });

    this.syncMeters();
  }

  private el(id: string): HTMLElement {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing element #${id}`);
    return node;
  }

  /** Push current meter values into the bar widths. */
  syncMeters(): void {
    (Object.keys(this.fills) as MeterName[]).forEach((name) => {
      this.fills[name].style.width = `${this.state.meters[name]}%`;
    });
  }

  /** Show a short message above Spark. */
  say(text: string): void {
    this.bubble.textContent = text;
    this.bubble.classList.remove("hidden");
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => {
      this.bubble.classList.add("hidden");
    }, 1600);
  }

  showUnlock(): void {
    this.banner.classList.remove("hidden");
  }
}
