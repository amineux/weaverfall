import { dist, pathCentroid, pathCurvature, pathLength, segPoint, signedArea } from "./math";
import type { Vec, WeaveKind } from "./types";

export interface WeaveResult {
  kind: WeaveKind;
  points: Vec[];
  damage: number;
  radius: number;
  stun: number;
  echo: boolean;
}

export const classifyWeave = (pts: Vec[], dmgBonus: number): WeaveResult | null => {
  if (pts.length < 2) return null;
  const length = pathLength(pts);
  if (length < 28) return null;
  const curve = pathCurvature(pts);
  const area = Math.abs(signedArea(pts));
  const chord = dist(pts[0], pts[pts.length - 1]);

  let kind: WeaveKind = "slash";
  if (curve > 2.15 && area > 2200) kind = "bind";
  else if (curve < 1.22 && chord > 90) kind = "pierce";

  const damage = (kind === "pierce" ? 2 : 1) + dmgBonus;
  return {
    kind,
    points: pts.map((p) => ({ ...p })),
    damage,
    radius: kind === "bind" ? 78 : kind === "pierce" ? 22 : 30,
    stun: kind === "bind" ? 1.55 : 0,
    echo: false,
  };
};

export const weaveHits = (weave: WeaveResult, x: number, y: number, r: number) => {
  if (weave.kind === "bind") {
    const c = pathCentroid(weave.points);
    return dist(c, { x, y }) <= weave.radius + r;
  }
  if (weave.kind === "pierce") {
    const a = weave.points[0];
    const b = weave.points[weave.points.length - 1];
    return segPoint(a.x, a.y, b.x, b.y, x, y) <= weave.radius + r;
  }
  for (let i = 1; i < weave.points.length; i++) {
    const a = weave.points[i - 1];
    const b = weave.points[i];
    if (segPoint(a.x, a.y, b.x, b.y, x, y) <= weave.radius + r) return true;
  }
  return false;
};

export const maxWeaveLen = (longLoom: boolean) => (longLoom ? 520 : 360);
