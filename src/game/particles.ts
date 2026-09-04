import { rand } from "./math";

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  drag: number;
  spark: boolean;
  ribbon: boolean;
}

const POOL = 520;

export class Particles {
  pool: Particle[] = [];
  private i = 0;

  constructor() {
    for (let n = 0; n < POOL; n++) {
      this.pool.push({
        alive: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        size: 2,
        r: 255,
        g: 255,
        b: 255,
        a: 1,
        drag: 0.98,
        spark: false,
        ribbon: false,
      });
    }
  }

  spawn(partial: Partial<Particle> & { x: number; y: number }) {
    for (let n = 0; n < POOL; n++) {
      const p = this.pool[this.i++ % POOL];
      if (!p.alive) {
        p.alive = true;
        p.x = partial.x;
        p.y = partial.y;
        p.vx = partial.vx ?? 0;
        p.vy = partial.vy ?? 0;
        p.life = partial.life ?? 0.5;
        p.max = p.life;
        p.size = partial.size ?? 3;
        p.r = partial.r ?? 180;
        p.g = partial.g ?? 230;
        p.b = partial.b ?? 255;
        p.a = partial.a ?? 1;
        p.drag = partial.drag ?? 0.97;
        p.spark = partial.spark ?? false;
        p.ribbon = partial.ribbon ?? false;
        return p;
      }
    }
  }

  burst(
    x: number,
    y: number,
    n: number,
    color: [number, number, number],
    speed = 80,
    life = 0.45,
    size = 3,
  ) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.2, speed);
      this.spawn({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(life * 0.5, life),
        size: rand(size * 0.5, size),
        r: color[0],
        g: color[1],
        b: color[2],
        spark: Math.random() > 0.5,
      });
    }
  }

  trail(x: number, y: number, color: [number, number, number], size = 6) {
    this.spawn({
      x: x + rand(-2, 2),
      y: y + rand(-2, 2),
      vx: rand(-8, 8),
      vy: rand(-8, 8),
      life: rand(0.18, 0.38),
      size,
      r: color[0],
      g: color[1],
      b: color[2],
      ribbon: true,
      drag: 0.9,
    });
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.life / p.max;
      const a = p.a * t;
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${a})`;
      const s = p.ribbon ? p.size * (0.4 + t) : p.size * (0.5 + t * 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
      if (p.spark) {
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - s * 1.6, p.y);
        ctx.lineTo(p.x + s * 1.6, p.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
