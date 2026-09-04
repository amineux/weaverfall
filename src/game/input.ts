import { clamp, len, norm } from "./math";

export class Input {
  keys = new Set<string>();
  mx = 0;
  my = 0;
  worldAim = { x: 0, y: 0 };
  weaving = false;
  weaveJustEnded = false;
  pointerDown = false;
  dashPressed = false;
  abilityPressed = false;
  pausePressed = false;
  interactPressed = false;
  skipPressed = false;

  stick = { x: 0, y: 0, active: false };
  private stickId: number | null = null;
  private weaveId: number | null = null;
  private canvas: HTMLCanvasElement;
  private stickEl: HTMLElement | null;
  private knobEl: HTMLElement | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.stickEl = document.getElementById("stick-base");
    this.knobEl = document.getElementById("stick-knob");

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "Space") {
        this.dashPressed = true;
      }
      if (e.code === "KeyE" || e.code === "KeyR" || e.code === "KeyQ") this.abilityPressed = true;
      if (e.code === "KeyF" || e.code === "Enter") this.interactPressed = true;
      if (e.code === "Escape" || e.code === "KeyP") this.pausePressed = true;
      if (e.code === "Space" || e.code === "Enter") this.skipPressed = true;
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.pointerDown = true;
      this.weaving = true;
      this.syncMouse(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => this.syncMouse(e.clientX, e.clientY));
    window.addEventListener("mouseup", (e) => {
      if (e.button !== 0) return;
      if (this.weaving) this.weaveJustEnded = true;
      this.weaving = false;
      this.pointerDown = false;
    });

    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) this.onTouchStart(t);
      },
      { passive: false },
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) this.onTouchMove(t);
      },
      { passive: false },
    );
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) this.onTouchEnd(t);
    };
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);

    document.getElementById("btn-dash")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.dashPressed = true;
    });
    document.getElementById("btn-ability")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.abilityPressed = true;
    });
  }

  private syncMouse(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    this.mx = cx - r.left;
    this.my = cy - r.top;
  }

  private onTouchStart(t: Touch) {
    if (this.isOnStick(t.clientX, t.clientY) && this.stickId === null) {
      this.stickId = t.identifier;
      this.stick.active = true;
      this.updateStick(t.clientX, t.clientY);
      return;
    }
    this.weaveId = t.identifier;
    this.weaving = true;
    this.pointerDown = true;
    this.syncMouse(t.clientX, t.clientY);
  }

  private onTouchMove(t: Touch) {
    if (t.identifier === this.stickId) this.updateStick(t.clientX, t.clientY);
    if (t.identifier === this.weaveId) this.syncMouse(t.clientX, t.clientY);
  }

  private onTouchEnd(t: Touch) {
    if (t.identifier === this.stickId) {
      this.stickId = null;
      this.stick.active = false;
      this.stick.x = 0;
      this.stick.y = 0;
      this.updateKnob(0, 0);
    }
    if (t.identifier === this.weaveId) {
      this.weaveId = null;
      if (this.weaving) this.weaveJustEnded = true;
      this.weaving = false;
      this.pointerDown = false;
    }
  }

  private isOnStick(cx: number, cy: number) {
    if (!this.stickEl) return false;
    const r = this.stickEl.getBoundingClientRect();
    const pad = 28;
    return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;
  }

  private updateStick(cx: number, cy: number) {
    if (!this.stickEl) return;
    const r = this.stickEl.getBoundingClientRect();
    const ox = r.left + r.width / 2;
    const oy = r.top + r.height / 2;
    let dx = cx - ox;
    let dy = cy - oy;
    const max = r.width * 0.38;
    const l = len(dx, dy);
    if (l > max) {
      dx = (dx / l) * max;
      dy = (dy / l) * max;
    }
    this.stick.x = dx / max;
    this.stick.y = dy / max;
    this.updateKnob(dx, dy);
  }

  private updateKnob(dx: number, dy: number) {
    if (!this.knobEl || !this.stickEl) return;
    const base = 35;
    this.knobEl.style.left = `${base + dx}px`;
    this.knobEl.style.top = `${base + dy}px`;
  }

  move(): { x: number; y: number } {
    let x = this.stick.x;
    let y = this.stick.y;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    const l = len(x, y);
    if (l > 1) {
      const n = norm(x, y);
      return n;
    }
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  consumeDash() {
    const v = this.dashPressed;
    this.dashPressed = false;
    return v;
  }

  consumeAbility() {
    const v = this.abilityPressed;
    this.abilityPressed = false;
    return v;
  }

  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  consumeInteract() {
    const v = this.interactPressed;
    this.interactPressed = false;
    return v;
  }

  consumeSkip() {
    const v = this.skipPressed;
    this.skipPressed = false;
    return v;
  }

  consumeWeaveEnd() {
    const v = this.weaveJustEnded;
    this.weaveJustEnded = false;
    return v;
  }

  showTouch(on: boolean) {
    document.getElementById("touch")?.classList.toggle("hidden", !on);
  }
}
