import type { Rect, Vec } from "./types";

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const TAU = Math.PI * 2;

export const vec = (x = 0, y = 0): Vec => ({ x, y });
export const len = (x: number, y: number) => Math.hypot(x, y);
export const norm = (x: number, y: number, fallback = { x: 1, y: 0 }): Vec => {
  const l = Math.hypot(x, y);
  return l < 1e-5 ? { x: fallback.x, y: fallback.y } : { x: x / l, y: y / l };
};
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const irand = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];
export const chance = (p: number) => Math.random() < p;

export const circleRect = (cx: number, cy: number, r: number, rec: Rect) => {
  const nx = clamp(cx, rec.x, rec.x + rec.w);
  const ny = clamp(cy, rec.y, rec.y + rec.h);
  return dist2(cx, cy, nx, ny) <= r * r;
};

export const pointInRect = (x: number, y: number, r: Rect) =>
  x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;

export const segPoint = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
) => {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 < 1e-6 ? 0 : clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
};

export const pathLength = (pts: Vec[]) => {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
};

export const pathCentroid = (pts: Vec[]): Vec => {
  if (!pts.length) return vec();
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
};

export const pathCurvature = (pts: Vec[]) => {
  if (pts.length < 3) return 0;
  const start = pts[0];
  const end = pts[pts.length - 1];
  const chord = dist(start, end) + 0.001;
  return pathLength(pts) / chord;
};

export const signedArea = (pts: Vec[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a * 0.5;
};

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
