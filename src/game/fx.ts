import { clamp, lerp, rand } from "./math";

export class FX {
  shakeAmp = 0;
  shakeOn = true;
  hitstop = 0;
  chromatic = 0;
  bloom = 1;
  voidWarp = 0;
  fade = 0;
  fadeDir = 0;
  private ox = 0;
  private oy = 0;
  private grainT = 0;

  pulse(amp = 6, stop = 0.045) {
    if (this.shakeOn) this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.hitstop = Math.max(this.hitstop, stop);
    this.chromatic = 1;
  }

  update(dt: number) {
    this.shakeAmp = lerp(this.shakeAmp, 0, 1 - Math.pow(0.001, dt));
    this.ox = this.shakeOn ? rand(-this.shakeAmp, this.shakeAmp) : 0;
    this.oy = this.shakeOn ? rand(-this.shakeAmp, this.shakeAmp) : 0;
    this.chromatic = lerp(this.chromatic, 0, 1 - Math.pow(0.02, dt));
    this.grainT += dt;
    if (this.hitstop > 0) this.hitstop -= dt;
    if (this.fadeDir !== 0) {
      this.fade = clamp(this.fade + this.fadeDir * dt * 1.8, 0, 1);
      if (this.fade === 0 || this.fade === 1) this.fadeDir = 0;
    }
    document.getElementById("chromatic")?.classList.toggle("on", this.chromatic > 0.35);
    document.body.classList.toggle("void-chrome", this.voidWarp > 0.4);
  }

  timeScale() {
    return this.hitstop > 0 ? 0.08 : 1;
  }

  applyCamera(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.ox, this.oy);
  }

  drawFade(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.fade <= 0.001) return;
    ctx.fillStyle = `rgba(4,3,8,${this.fade})`;
    ctx.fillRect(0, 0, w, h);
  }

  glow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    alpha = 0.35,
  ) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = alpha * this.bloom;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  strokeGlow(
    ctx: CanvasRenderingContext2D,
    draw: () => void,
    color: string,
    widths: number[],
    alphas: number[],
  ) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < widths.length; i++) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alphas[i] * this.bloom;
      ctx.lineWidth = widths[i];
      ctx.beginPath();
      draw();
      ctx.stroke();
    }
    ctx.restore();
  }
}
