import { classifyWeave, maxWeaveLen, weaveHits, type WeaveResult } from "./combat";
import { ZONES } from "./content";
import { circleRect, clamp, dist, dist2, lerp, mulberry32, norm, pointInRect, rand, TAU } from "./math";
import type { AudioSys } from "./audio";
import type { FX } from "./fx";
import type { Input } from "./input";
import type { Particles } from "./particles";
import type { SaveSys } from "./save";
import type { EnemyKind, Rect, SceneId, Speaker, Vec, ZoneDef } from "./types";

export interface WorldHost {
  save: SaveSys;
  audio: AudioSys;
  particles: Particles;
  fx: FX;
  input: Input;
  toast: (msg: string) => void;
  talk: (key: string) => void;
  openShop: () => void;
  goto: (scene: SceneId) => void;
  win: () => void;
}

interface Actor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  stun: number;
  invuln: number;
  facing: number;
}

interface Enemy extends Actor {
  kind: EnemyKind;
  cd: number;
  wind: number;
  tx: number;
  ty: number;
  phase: number;
  alive: boolean;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  hostile: boolean;
  dmg: number;
}

interface Floater {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
}

export class World {
  zone: ZoneDef;
  player: Actor;
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  floaters: Floater[] = [];
  bridges = new Set<string>();
  cam = { x: 0, y: 0 };
  weave: Vec[] = [];
  lastWeave: WeaveResult | null = null;
  echoT = -1;
  revealT = 0;
  dashT = 0;
  dashCd = 0;
  cloak: Vec[] = [];
  safe: Vec;
  prompt = "";
  interactWho: Speaker | null = null;
  time = 0;
  cleared = false;
  vesperAid = false;
  vesperCd = 0;
  entered = false;
  private host: WorldHost;
  private decors: { x: number; y: number; k: number }[] = [];

  constructor(host: WorldHost, zone: ZoneDef) {
    this.host = host;
    this.zone = zone;
    this.player = {
      x: zone.spawn.x,
      y: zone.spawn.y,
      vx: 0,
      vy: 0,
      r: 14,
      hp: host.save.data.hp,
      maxHp: host.save.data.maxHp,
      stun: 0,
      invuln: 0.6,
      facing: 0,
    };
    this.safe = { ...zone.spawn };
    this.cam.x = zone.spawn.x - 400;
    this.cam.y = zone.spawn.y - 300;
    this.rebuild(zone);
  }

  rebuild(zone: ZoneDef) {
    this.zone = zone;
    this.enemies = zone.enemies.map((e) => this.makeEnemy(e.kind, e.x, e.y));
    this.shots = [];
    this.bridges.clear();
    this.player.x = zone.spawn.x;
    this.player.y = zone.spawn.y;
    this.player.hp = this.host.save.data.hp;
    this.player.maxHp = this.host.save.data.maxHp;
    this.safe = { ...zone.spawn };
    this.cloak = Array.from({ length: 14 }, () => ({ x: zone.spawn.x, y: zone.spawn.y }));
    const rng = mulberry32(zone.name.length * 997);
    this.decors = [];
    for (let i = 0; i < 48; i++) {
      this.decors.push({
        x: 80 + rng() * (zone.width - 160),
        y: 80 + rng() * (zone.height - 160),
        k: rng(),
      });
    }
    this.entered = false;
    this.vesperAid = this.host.save.flag("vesper_joined");
  }

  private makeEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    const stats = {
      frayling: { hp: 2, r: 12 },
      stitcher: { hp: 4, r: 15 },
      unraveler: { hp: 8, r: 20 },
      king: { hp: 54, r: 34 },
    }[kind];
    return {
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      r: stats.r,
      hp: stats.hp,
      maxHp: stats.hp,
      stun: 0,
      invuln: 0,
      facing: 0,
      cd: rand(0.4, 1.4),
      wind: 0,
      tx: x,
      ty: y,
      phase: 1,
      alive: true,
    };
  }

  update(dt: number) {
    this.time += dt;
    const { input, save, audio, particles, fx } = this.host;
    const p = this.player;
    const long = save.hasUpgrade("loom");
    const keen = save.hasUpgrade("keen") ? 1 : 0;
    const swift = save.hasUpgrade("swift");

    if (!this.entered) {
      this.entered = true;
      if (this.zone.id === "silk" && !save.flag("silk_enter")) {
        save.setFlag("silk_enter");
        this.host.talk("silk_enter");
      }
      if (this.zone.id === "spire" && !save.flag("spire_enter")) {
        save.setFlag("spire_enter");
        this.host.talk("spire_enter");
      }
      if (this.zone.id === "boss" && !save.flag("boss_enter")) {
        save.setFlag("boss_enter");
        this.host.talk("boss_enter");
        audio.king();
      }
    }

    const mv = input.move();
    const aim = this.screenToWorld(input.mx, input.my);
    p.facing = Math.atan2(aim.y - p.y, aim.x - p.x);

    if (this.dashT > 0) {
      this.dashT -= dt;
      particles.trail(p.x, p.y, [180, 230, 255], 8);
      particles.trail(p.x, p.y, [255, 120, 210], 5);
    } else {
      const acc = 920;
      p.vx = lerp(p.vx, mv.x * 236, 1 - Math.pow(0.001, dt));
      p.vy = lerp(p.vy, mv.y * 236, 1 - Math.pow(0.001, dt));
      if (mv.x || mv.y) {
        const n = norm(mv.x, mv.y);
        p.vx += n.x * acc * dt * 0.15;
        p.vy += n.y * acc * dt * 0.15;
      }
    }

    this.dashCd = Math.max(0, this.dashCd - dt);
    if (input.consumeDash() && this.dashCd <= 0 && (mv.x || mv.y || true)) {
      const d = mv.x || mv.y ? norm(mv.x, mv.y) : { x: Math.cos(p.facing), y: Math.sin(p.facing) };
      p.vx = d.x * 640;
      p.vy = d.y * 640;
      this.dashT = 0.15;
      this.dashCd = swift ? 0.4 : 0.68;
      p.invuln = Math.max(p.invuln, 0.16);
      audio.dash();
      fx.pulse(3, 0.02);
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this.collideActor(p);
    if (!this.inPit(p.x, p.y)) this.safe = { x: p.x, y: p.y };
    else {
      p.x = this.safe.x;
      p.y = this.safe.y;
      this.hurt(1, "The gulf remembers falling.");
    }

    p.invuln = Math.max(0, p.invuln - dt);
    p.stun = Math.max(0, p.stun - dt);

    for (let i = this.cloak.length - 1; i >= 0; i--) {
      const target = i === 0 ? p : this.cloak[i - 1];
      this.cloak[i].x = lerp(this.cloak[i].x, target.x - Math.cos(p.facing) * (10 + i * 3.2), 0.22);
      this.cloak[i].y = lerp(this.cloak[i].y, target.y - Math.sin(p.facing) * 4 + i * 2.2, 0.22);
    }

    if (input.weaving) {
      const last = this.weave[this.weave.length - 1];
      if (!last || dist(last, aim) > 8) this.weave.push({ ...aim });
      const max = maxWeaveLen(long);
      let total = 0;
      for (let i = 1; i < this.weave.length; i++) total += dist(this.weave[i - 1], this.weave[i]);
      if (total > max) this.weave.shift();
      if (Math.random() < 0.5) particles.trail(aim.x, aim.y, [110, 231, 255], 4);
    }
    if (input.consumeWeaveEnd()) {
      if (this.tryInteractFromWeave()) {
        this.weave = [];
      } else {
        const result = classifyWeave(this.weave, keen);
        this.weave = [];
        if (result) this.fireWeave(result);
        else this.tryInteract();
      }
    }

    if (this.echoT >= 0) {
      this.echoT -= dt;
      if (this.echoT <= 0 && this.lastWeave) {
        const echo = { ...this.lastWeave, echo: true, damage: Math.max(1, this.lastWeave.damage - 0) };
        echo.points = this.lastWeave.points.map((q) => ({ ...q }));
        this.applyWeave(echo);
        this.echoT = -1;
      }
    }

    this.revealT = Math.max(0, this.revealT - dt);
    if (input.consumeAbility()) this.useAbility();

    this.prompt = "";
    this.interactWho = null;
    for (const npc of this.zone.npcs) {
      if (dist(p, npc) < 78) {
        this.prompt = `Talk to ${npc.label}`;
        this.interactWho = npc.who;
      }
    }
    const exitOpen = this.exitReady();
    if (this.zone.exit && dist(p, this.zone.exit) < 54) {
      if (exitOpen) {
        this.prompt = `Enter ${this.zone.exit.label}`;
        if (input.consumeInteract()) this.host.goto(this.zone.exit.next);
      } else this.prompt = "The seal still sleeps — clear the chamber, stitch the gulf.";
    } else if (this.interactWho && input.consumeInteract()) this.talkTo(this.interactWho);

    this.updateEnemies(dt);
    this.updateShots(dt);

    if (this.vesperAid) {
      this.vesperCd -= dt;
      if (this.vesperCd <= 0) {
        const e = this.nearestEnemy(p.x, p.y);
        if (e) {
          this.vesperCd = 1.7;
          this.host.particles.burst(e.x, e.y, 8, [255, 106, 213], 90, 0.3, 2);
          this.damageEnemy(e, 1, false);
        } else this.vesperCd = 0.6;
      }
    }

    if (
      this.zone.id === "markets" &&
      !save.flag("vesper_joined") &&
      this.enemies.filter((e) => !e.alive).length >= 2
    ) {
      save.setFlag("vesper_joined");
      this.vesperAid = true;
      this.host.talk("markets_mid");
      this.host.toast("Vesper joins the weave.");
    }

    this.cleared = this.enemies.every((e) => !e.alive);
    if (this.zone.boss && this.cleared && !save.flag("king_dead")) {
      save.setFlag("king_dead");
      fx.pulse(16, 0.2);
      audio.king();
      setTimeout(() => this.host.win(), 900);
    }

    for (const f of this.zone.fragments) {
      if (save.data.collected.includes(f.id)) continue;
      if (f.hidden && this.revealT <= 0 && save.data.bonds.solace < 25) continue;
      if (dist(p, f) < 28) {
        save.collect(f.id);
        audio.chime();
        particles.burst(f.x, f.y, 22, [244, 208, 122], 120, 0.6, 3);
        this.host.toast(f.whisper);
        this.float(f.x, f.y, "+1 Memory", "#f4d07a");
      }
    }

    const look = 70;
    const tw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const th = typeof window !== "undefined" ? window.innerHeight : 720;
    const wantX = p.x - tw / 2 + Math.cos(p.facing) * look;
    const wantY = p.y - th / 2 + Math.sin(p.facing) * look * 0.7;
    this.cam.x = lerp(this.cam.x, clamp(wantX, 0, Math.max(0, this.zone.width - tw)), 1 - Math.pow(0.02, dt));
    this.cam.y = lerp(this.cam.y, clamp(wantY, 0, Math.max(0, this.zone.height - th)), 1 - Math.pow(0.02, dt));

    for (const f of this.floaters) {
      f.life -= dt;
      f.y += f.vy * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);

    save.data.hp = p.hp;
    fx.voidWarp = this.enemies.some((e) => e.kind === "king" && e.alive)
      ? lerp(fx.voidWarp, ePhase(this.enemies), 0.05)
      : lerp(fx.voidWarp, 0, 0.04);
  }

  private screenToWorld(mx: number, my: number): Vec {
    return { x: mx + this.cam.x, y: my + this.cam.y };
  }

  private fireWeave(w: WeaveResult) {
    this.lastWeave = w;
    this.applyWeave(w);
    if (this.vesperAid && this.host.save.data.bonds.vesper >= 28) this.echoT = 0.32;
  }

  private applyWeave(w: WeaveResult) {
    const { audio, particles, fx } = this.host;
    if (w.kind === "slash") audio.slash();
    if (w.kind === "pierce") audio.pierce();
    if (w.kind === "bind") audio.bind();
    fx.pulse(w.echo ? 3 : 7, w.echo ? 0.02 : 0.05);
    audio.duck(0.4, 70);
    const col: [number, number, number] =
      w.kind === "bind" ? [180, 140, 255] : w.kind === "pierce" ? [255, 230, 140] : [110, 231, 255];
    for (const q of w.points) particles.trail(q.x, q.y, col, w.echo ? 3 : 5);
    let hits = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (weaveHits(w, e.x, e.y, e.r)) {
        this.damageEnemy(e, w.damage, w.stun > 0);
        if (w.stun) e.stun = Math.max(e.stun, w.stun);
        hits++;
      }
    }
    if (hits) this.float(w.points[w.points.length - 1].x, w.points[w.points.length - 1].y, w.kind.toUpperCase(), "#6ee7ff");

    for (const pair of this.zone.bridgePairs) {
      const a = this.zone.anchors.find((n) => n.id === pair[0]);
      const b = this.zone.anchors.find((n) => n.id === pair[1]);
      if (!a || !b) continue;
      const start = w.points[0];
      const end = w.points[w.points.length - 1];
      const linked =
        (dist(start, a) < 46 && dist(end, b) < 46) || (dist(start, b) < 46 && dist(end, a) < 46);
      const key = pair.slice().sort().join(":");
      if (linked && !this.bridges.has(key)) {
        this.bridges.add(key);
        audio.chime();
        this.host.toast("A gulf is stitched shut.");
        particles.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 28, [244, 208, 122], 100, 0.7, 4);
      }
    }
  }

  private damageEnemy(e: Enemy, dmg: number, bind: boolean) {
    if (e.invuln > 0) return;
    e.hp -= dmg;
    e.invuln = 0.12;
    this.host.particles.burst(e.x, e.y, 12, bind ? [180, 140, 255] : [255, 160, 220], 110, 0.35, 2);
    this.host.audio.hit();
    this.float(e.x, e.y - 10, `${dmg}`, "#ffd6f3");
    if (e.hp <= 0) {
      e.alive = false;
      this.host.fx.pulse(e.kind === "king" ? 18 : 8, 0.08);
      this.host.particles.burst(e.x, e.y, e.kind === "king" ? 50 : 20, [200, 160, 255], 160, 0.8, 4);
    }
  }

  private hurt(n: number, msg?: string) {
    const p = this.player;
    if (p.invuln > 0 || this.dashT > 0) return;
    p.hp -= n;
    p.invuln = 0.85;
    this.host.save.data.hp = p.hp;
    this.host.audio.hurt();
    this.host.fx.pulse(10, 0.07);
    if (msg) this.host.toast(msg);
    if (p.hp <= 0) {
      p.hp = this.host.save.data.maxHp;
      this.host.save.data.hp = p.hp;
      p.x = this.zone.spawn.x;
      p.y = this.zone.spawn.y;
      p.invuln = 1.2;
      this.host.toast("The Loom refuses your unmaking. Again.");
      this.host.fx.fade = 1;
      this.host.fx.fadeDir = -1;
    }
  }

  private useAbility() {
    const { save, audio } = this.host;
    if (save.data.bonds.solace >= 22) {
      this.revealT = 5.2;
      audio.reveal();
      this.host.toast("Solace unfolds the shy paths.");
    } else {
      this.host.toast("Solace is not yet certain of you.");
      audio.whisper();
    }
  }

  private talkTo(who: Speaker) {
    const id = this.zone.id;
    const key = `${id}_${who}`;
    this.host.talk(key);
  }

  private tryInteract() {
    if (this.interactWho) this.talkTo(this.interactWho);
  }

  private tryInteractFromWeave() {
    if (this.weave.length > 6) return false;
    if (this.interactWho) {
      this.talkTo(this.interactWho);
      return true;
    }
    if (this.zone.exit && this.exitReady() && dist(this.player, this.zone.exit) < 54) {
      this.host.goto(this.zone.exit.next);
      return true;
    }
    return false;
  }

  private exitReady() {
    if (!this.zone.exit) return false;
    if (this.zone.rest) return true;
    const bridgesOk = this.zone.bridgePairs.every((pair) => this.bridges.has(pair.slice().sort().join(":")));
    return this.cleared && bridgesOk;
  }

  private collideActor(a: Actor) {
    a.x = clamp(a.x, 40, this.zone.width - 40);
    a.y = clamp(a.y, 40, this.zone.height - 40);
    for (const w of this.zone.walls) {
      if (circleRect(a.x, a.y, a.r, w)) this.resolveRect(a, w);
    }
  }

  private resolveRect(a: Actor, r: Rect) {
    const cx = clamp(a.x, r.x, r.x + r.w);
    const cy = clamp(a.y, r.y, r.y + r.h);
    let dx = a.x - cx;
    let dy = a.y - cy;
    const l = Math.hypot(dx, dy) || 0.001;
    const push = a.r - l + 0.5;
    if (push > 0) {
      a.x += (dx / l) * push;
      a.y += (dy / l) * push;
    }
  }

  private inPit(x: number, y: number) {
    for (const pit of this.zone.pits) {
      if (!pointInRect(x, y, pit)) continue;
      let on = false;
      for (const pair of this.zone.bridgePairs) {
        const key = pair.slice().sort().join(":");
        if (!this.bridges.has(key)) continue;
        const a = this.zone.anchors.find((n) => n.id === pair[0])!;
        const b = this.zone.anchors.find((n) => n.id === pair[1])!;
        const t = closestT(a, b, x, y);
        const px = lerp(a.x, b.x, t);
        const py = lerp(a.y, b.y, t);
        if (dist2(x, y, px, py) < 34 * 34) on = true;
      }
      if (!on) return true;
    }
    return false;
  }

  private nearestEnemy(x: number, y: number) {
    let best: Enemy | null = null;
    let d = 1e9;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dd = dist2(x, y, e.x, e.y);
      if (dd < d) {
        d = dd;
        best = e;
      }
    }
    return best;
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.invuln = Math.max(0, e.invuln - dt);
      e.stun = Math.max(0, e.stun - dt);
      e.cd -= dt;
      if (e.stun > 0) {
        e.vx *= 0.8;
        e.vy *= 0.8;
        continue;
      }
      if (e.kind === "frayling") this.aiFray(e, p, dt);
      if (e.kind === "stitcher") this.aiStitch(e, p, dt);
      if (e.kind === "unraveler") this.aiUnravel(e, p, dt);
      if (e.kind === "king") this.aiKing(e, p, dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      this.collideActor(e);
      if (dist(e, p) < e.r + p.r - 2) this.hurt(1);
    }
  }

  private aiFray(e: Enemy, p: Actor, _dt: number) {
    const n = norm(p.x - e.x, p.y - e.y);
    e.vx = lerp(e.vx, n.x * 92, 0.08);
    e.vy = lerp(e.vy, n.y * 92, 0.08);
    e.facing = Math.atan2(n.y, n.x);
  }

  private aiStitch(e: Enemy, p: Actor, _dt: number) {
    const d = dist(e, p);
    const n = norm(p.x - e.x, p.y - e.y);
    const want = d < 200 ? -1 : d > 280 ? 1 : 0;
    e.vx = lerp(e.vx, n.x * 70 * want + -n.y * 30, 0.06);
    e.vy = lerp(e.vy, n.y * 70 * want + n.x * 30, 0.06);
    if (e.cd <= 0) {
      e.cd = 1.7;
      this.shots.push({
        x: e.x,
        y: e.y,
        vx: n.x * 210,
        vy: n.y * 210,
        life: 2.6,
        r: 5,
        hostile: true,
        dmg: 1,
      });
    }
  }

  private aiUnravel(e: Enemy, p: Actor, dt: number) {
    if (e.wind > 0) {
      e.wind -= dt;
      e.vx *= 0.85;
      e.vy *= 0.85;
      if (e.wind <= 0) {
        const n = norm(e.tx - e.x, e.ty - e.y);
        e.vx = n.x * 420;
        e.vy = n.y * 420;
        e.cd = 1.8;
        this.host.fx.pulse(5, 0.03);
      }
      return;
    }
    const n = norm(p.x - e.x, p.y - e.y);
    e.vx = lerp(e.vx, n.x * 40, 0.05);
    e.vy = lerp(e.vy, n.y * 40, 0.05);
    if (e.cd <= 0 && dist(e, p) < 340) {
      e.wind = 0.85;
      e.tx = p.x;
      e.ty = p.y;
      e.cd = 99;
    }
  }

  private aiKing(e: Enemy, p: Actor, dt: number) {
    const ratio = e.hp / e.maxHp;
    e.phase = ratio > 0.62 ? 1 : ratio > 0.32 ? 2 : 3;
    const n = norm(p.x - e.x, p.y - e.y);
    e.vx = lerp(e.vx, n.x * (e.phase === 3 ? 70 : 36), 0.03);
    e.vy = lerp(e.vy, n.y * (e.phase === 3 ? 70 : 36), 0.03);
    if (e.cd <= 0) {
      if (e.phase === 1) {
        e.cd = 2.1;
        for (let i = -1; i <= 1; i++) {
          const a = Math.atan2(n.y, n.x) + i * 0.28;
          this.shots.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 180,
            vy: Math.sin(a) * 180,
            life: 3,
            r: 7,
            hostile: true,
            dmg: 1,
          });
        }
        if (this.enemies.filter((x) => x.kind === "frayling" && x.alive).length < 3 && Math.random() < 0.45) {
          this.enemies.push(this.makeEnemy("frayling", e.x + rand(-80, 80), e.y + rand(-80, 80)));
        }
      } else if (e.phase === 2) {
        e.cd = 1.35;
        e.x = clamp(p.x + rand(-180, 180), 80, this.zone.width - 80);
        e.y = clamp(p.y + rand(-180, 180), 80, this.zone.height - 80);
        this.host.particles.burst(e.x, e.y, 18, [160, 80, 220], 100, 0.4, 3);
        this.host.audio.whisper();
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        this.shots.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 260,
          vy: Math.sin(a) * 260,
          life: 2,
          r: 8,
          hostile: true,
          dmg: 1,
        });
      } else {
        e.cd = 1.05;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + this.time;
          this.shots.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 150,
            vy: Math.sin(a) * 150,
            life: 2.4,
            r: 6,
            hostile: true,
            dmg: 1,
          });
        }
      }
    }
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.hostile && dist(s, this.player) < s.r + this.player.r) {
        this.hurt(s.dmg);
        s.life = 0;
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  private float(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, vy: -28, life: 0.9, text, color });
  }

  draw(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const z = this.zone;
    const pal = z.palette;
    ctx.save();
    ctx.fillStyle = pal.bg0;
    ctx.fillRect(0, 0, vw, vh);
    const bg = ctx.createRadialGradient(vw * 0.5, vh * 0.4, 40, vw * 0.5, vh * 0.5, vw * 0.75);
    bg.addColorStop(0, pal.bg1);
    bg.addColorStop(1, pal.bg0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vw, vh);

    this.drawParallax(ctx, vw, vh, 0.25, 0.35);
    ctx.translate(-this.cam.x, -this.cam.y);
    this.host.fx.applyCamera(ctx);
    this.drawFloor(ctx);
    this.drawDecor(ctx);
    this.drawPits(ctx);
    this.drawWalls(ctx);
    this.drawAnchors(ctx);
    this.drawFragments(ctx);
    this.drawNpcs(ctx);
    this.drawExit(ctx);
    this.drawEnemies(ctx);
    this.drawShots(ctx);
    this.drawPlayer(ctx);
    this.drawCompanions(ctx);
    this.drawWeave(ctx);
    this.host.particles.draw(ctx);
    this.drawFloaters(ctx);
    if (this.revealT > 0) this.drawReveal(ctx);
    ctx.restore();

    const fog = ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.15, vw / 2, vh / 2, vw * 0.72);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(1, pal.fog);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, vw, vh);
  }

  private drawParallax(ctx: CanvasRenderingContext2D, vw: number, vh: number, par: number, a: number) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(-this.cam.x * par, -this.cam.y * par);
    ctx.fillStyle = this.zone.palette.accent;
    const rng = mulberry32(42);
    for (let i = 0; i < 80; i++) {
      const x = rng() * (this.zone.width + vw);
      const y = rng() * (this.zone.height + vh);
      ctx.globalAlpha = a * (0.2 + rng() * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, 1 + rng() * 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D) {
    const t = 58;
    ctx.save();
    for (let y = 0; y < this.zone.height + t; y += t) {
      for (let x = 0; x < this.zone.width + t; x += t) {
        const ox = (y / t) % 2 === 0 ? 0 : t / 2;
        ctx.fillStyle = (x + y) % (t * 2) === 0 ? this.zone.palette.floor : "rgba(255,255,255,0.015)";
        ctx.beginPath();
        ctx.moveTo(x + ox, y + t / 2);
        ctx.lineTo(x + ox + t / 2, y);
        ctx.lineTo(x + ox + t, y + t / 2);
        ctx.lineTo(x + ox + t / 2, y + t);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawDecor(ctx: CanvasRenderingContext2D) {
    for (const d of this.decors) {
      ctx.save();
      ctx.translate(d.x, d.y);
      if (this.zone.mood === "garden") {
        ctx.fillStyle = `rgba(80,220,180,${0.15 + d.k * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 + d.k * 10, 4, 0, 0, TAU);
        ctx.fill();
        this.host.fx.glow(ctx, 0, -8, 16, this.zone.palette.accent2, 0.12);
        ctx.strokeStyle = this.zone.palette.accent2;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(6, -12, 2, -22);
        ctx.stroke();
      } else if (this.zone.mood === "market") {
        ctx.fillStyle = `rgba(40,16,24,0.8)`;
        ctx.fillRect(-8, -18, 16, 22);
        ctx.fillStyle = d.k > 0.5 ? "#ff6ad5" : "#ffb14a";
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(-12, -18);
        ctx.lineTo(0, -28);
        ctx.lineTo(12, -18);
        ctx.fill();
      } else if (this.zone.mood === "spire" || this.zone.mood === "void") {
        ctx.fillStyle = "rgba(20,24,50,0.7)";
        ctx.fillRect(-5, -28 - d.k * 20, 10, 36 + d.k * 20);
        this.host.fx.glow(ctx, 0, -30, 14, this.zone.palette.accent, 0.1);
      } else {
        ctx.strokeStyle = this.zone.palette.accent;
        ctx.globalAlpha = 0.2 + d.k * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + d.k * 16, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawPits(ctx: CanvasRenderingContext2D) {
    for (const pit of this.zone.pits) {
      ctx.fillStyle = "rgba(2,2,8,0.92)";
      ctx.fillRect(pit.x, pit.y, pit.w, pit.h);
      ctx.strokeStyle = "rgba(110,231,255,0.15)";
      ctx.strokeRect(pit.x, pit.y, pit.w, pit.h);
    }
    for (const pair of this.zone.bridgePairs) {
      const key = pair.slice().sort().join(":");
      if (!this.bridges.has(key)) continue;
      const a = this.zone.anchors.find((n) => n.id === pair[0])!;
      const b = this.zone.anchors.find((n) => n.id === pair[1])!;
      this.host.fx.strokeGlow(
        ctx,
        () => {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        },
        this.zone.palette.accent2,
        [18, 8, 2],
        [0.18, 0.4, 0.9],
      );
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D) {
    for (const w of this.zone.walls) {
      ctx.fillStyle = "rgba(8,8,16,0.86)";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = this.zone.palette.accent;
      ctx.globalAlpha = 0.25;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawAnchors(ctx: CanvasRenderingContext2D) {
    for (const a of this.zone.anchors) {
      const pulse = 10 + Math.sin(this.time * 3 + a.x) * 3;
      this.host.fx.glow(ctx, a.x, a.y, 28, this.zone.palette.accent, 0.35);
      ctx.strokeStyle = this.zone.palette.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, pulse, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 3, 0, TAU);
      ctx.fill();
    }
  }

  private drawFragments(ctx: CanvasRenderingContext2D) {
    for (const f of this.zone.fragments) {
      if (this.host.save.data.collected.includes(f.id)) continue;
      if (f.hidden && this.revealT <= 0 && this.host.save.data.bonds.solace < 25) continue;
      const bob = Math.sin(this.time * 3 + f.x) * 4;
      this.host.fx.glow(ctx, f.x, f.y + bob, 22, "#f4d07a", 0.45);
      ctx.save();
      ctx.translate(f.x, f.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#f4d07a";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }

  private drawNpcs(ctx: CanvasRenderingContext2D) {
    for (const n of this.zone.npcs) {
      if (n.who === "solace") this.drawMoth(ctx, n.x, n.y, this.time);
      else if (n.who === "vesper") this.drawVesper(ctx, n.x, n.y, 0);
      else this.drawArchivist(ctx, n.x, n.y);
      ctx.font = "11px Outfit, sans-serif";
      ctx.fillStyle = "rgba(244,208,122,0.8)";
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y - 36);
    }
  }

  private drawExit(ctx: CanvasRenderingContext2D) {
    if (!this.zone.exit) return;
    const e = this.zone.exit;
    const ready = this.exitReady();
    this.host.fx.glow(ctx, e.x, e.y, 50, ready ? this.zone.palette.accent : "#334", ready ? 0.4 : 0.12);
    ctx.strokeStyle = ready ? this.zone.palette.accent : "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 22 + Math.sin(this.time * 2) * 3, 0, TAU);
    ctx.stroke();
    ctx.font = "12px Cinzel, serif";
    ctx.fillStyle = ready ? "#f4d07a" : "#666";
    ctx.textAlign = "center";
    ctx.fillText(e.label, e.x, e.y - 40);
  }

  private drawEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.kind === "frayling") {
        this.host.fx.glow(ctx, 0, 0, 18, "#7cf0d0", 0.25);
        ctx.fillStyle = "#1a2a28";
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#7cf0d0";
        ctx.stroke();
      } else if (e.kind === "stitcher") {
        this.host.fx.glow(ctx, 0, 0, 20, "#ff6ad5", 0.22);
        ctx.fillStyle = "#2a1020";
        ctx.beginPath();
        ctx.moveTo(0, -e.r);
        ctx.lineTo(e.r, e.r * 0.7);
        ctx.lineTo(-e.r, e.r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ff6ad5";
        ctx.stroke();
      } else if (e.kind === "unraveler") {
        this.host.fx.glow(ctx, 0, 0, 26, "#7aa2ff", 0.2);
        ctx.fillStyle = "#10162c";
        ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
        ctx.strokeStyle = "#7aa2ff";
        ctx.strokeRect(-e.r, -e.r, e.r * 2, e.r * 2);
        if (e.wind > 0) {
          ctx.strokeStyle = "rgba(255,220,140,0.7)";
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(e.tx - e.x, e.ty - e.y);
          ctx.stroke();
        }
      } else {
        const wob = Math.sin(this.time * 2) * 3;
        this.host.fx.glow(ctx, 0, 0, 70, "#b388ff", 0.35);
        ctx.fillStyle = "#120818";
        ctx.beginPath();
        ctx.ellipse(0, 8, 28, 34, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#b388ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#f4d07a";
        ctx.beginPath();
        ctx.moveTo(-16, -22 + wob);
        ctx.lineTo(0, -40 + wob);
        ctx.lineTo(16, -22 + wob);
        ctx.fill();
        ctx.fillStyle = "#e8d6ff";
        ctx.beginPath();
        ctx.arc(-8, -4, 3, 0, TAU);
        ctx.arc(8, -4, 3, 0, TAU);
        ctx.fill();
        ctx.font = "10px Cinzel, serif";
        ctx.fillStyle = "#c4b5fd";
        ctx.textAlign = "center";
        ctx.fillText(`HOLLOW KING  ·  ${e.phase}`, 0, -50);
      }
      ctx.restore();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(e.x - 16, e.y - e.r - 10, 32, 3);
        ctx.fillStyle = e.kind === "king" ? "#b388ff" : "#ff6ad5";
        ctx.fillRect(e.x - 16, e.y - e.r - 10, 32 * (e.hp / e.maxHp), 3);
      }
    }
  }

  private drawShots(ctx: CanvasRenderingContext2D) {
    for (const s of this.shots) {
      this.host.fx.glow(ctx, s.x, s.y, 12, "#d8b4fe", 0.5);
      ctx.fillStyle = "#e9d5ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 16, 12, 5, 0, 0, TAU);
    ctx.fill();
    ctx.lineCap = "round";
    this.host.fx.strokeGlow(
      ctx,
      () => {
        ctx.moveTo(this.cloak[0].x, this.cloak[0].y);
        for (const c of this.cloak) ctx.lineTo(c.x, c.y);
      },
      "#6ee7ff",
      [10, 4],
      [0.15, 0.55],
    );
    this.host.fx.strokeGlow(
      ctx,
      () => {
        ctx.moveTo(this.cloak[2]?.x ?? p.x, this.cloak[2]?.y ?? p.y);
        for (let i = 2; i < this.cloak.length; i += 2) ctx.lineTo(this.cloak[i].x, this.cloak[i].y + 3);
      },
      "#ff6ad5",
      [6],
      [0.28],
    );
    ctx.translate(p.x, p.y);
    ctx.rotate(p.facing * 0.15);
    ctx.fillStyle = "#0b0a12";
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 15, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(110,231,255,0.35)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -12, 7, 0, TAU);
    ctx.fill();
    const gx = Math.cos(p.facing) * 12;
    const gy = Math.sin(p.facing) * 8;
    this.host.fx.glow(ctx, gx, gy, 16, "#6ee7ff", 0.55);
    ctx.fillStyle = "#9ef6ff";
    ctx.beginPath();
    ctx.arc(gx, gy, 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f4d07a";
    ctx.beginPath();
    ctx.arc(-3, -13, 1.4, 0, TAU);
    ctx.arc(3, -13, 1.4, 0, TAU);
    ctx.fill();
    if (p.invuln > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(this.time * 20) * 0.2})`;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCompanions(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const sx = p.x - 36 + Math.sin(this.time * 2.1) * 10;
    const sy = p.y - 28 + Math.cos(this.time * 1.7) * 8;
    this.drawMoth(ctx, sx, sy, this.time);
    if (this.vesperAid) {
      const vx = p.x + 40 + Math.cos(this.time * 1.3) * 8;
      const vy = p.y - 8 + Math.sin(this.time * 1.6) * 6;
      this.drawVesper(ctx, vx, vy, 0.2);
    }
  }

  private drawMoth(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    ctx.save();
    ctx.translate(x, y);
    const flap = 0.6 + Math.sin(t * 11) * 0.45;
    this.host.fx.glow(ctx, 0, 0, 16, "#7cf0d0", 0.35);
    ctx.fillStyle = "rgba(180,255,230,0.85)";
    ctx.beginPath();
    ctx.ellipse(-7, 0, 8 * flap, 5, -0.5, 0, TAU);
    ctx.ellipse(7, 0, 8 * flap, 5, 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8fff8";
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawVesper(ctx: CanvasRenderingContext2D, x: number, y: number, face: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(face);
    this.host.fx.glow(ctx, 0, 0, 16, "#ff6ad5", 0.22);
    ctx.fillStyle = "#1a0a14";
    ctx.beginPath();
    ctx.ellipse(0, 2, 8, 14, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#ff6ad5";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -12, 5.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffd6f0";
    ctx.fillRect(-6, -20, 3, 8);
    ctx.fillRect(3, -20, 3, 8);
    ctx.restore();
  }

  private drawArchivist(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    this.host.fx.glow(ctx, 0, -8, 20, "#f4d07a", 0.2);
    ctx.fillStyle = "#1a140c";
    ctx.fillRect(-9, -8, 18, 24);
    ctx.beginPath();
    ctx.arc(0, -14, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#f4d07a";
    ctx.strokeRect(-11, -2, 8, 10);
    ctx.restore();
  }

  private drawWeave(ctx: CanvasRenderingContext2D) {
    if (this.weave.length < 2) return;
    this.host.fx.strokeGlow(
      ctx,
      () => {
        ctx.moveTo(this.weave[0].x, this.weave[0].y);
        for (const q of this.weave) ctx.lineTo(q.x, q.y);
      },
      "#6ee7ff",
      [14, 6, 2],
      [0.12, 0.35, 0.9],
    );
  }

  private drawFloaters(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.font = "italic 16px Cormorant Garamond, serif";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  private drawReveal(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "rgba(124,240,208,0.7)";
    ctx.setLineDash([4, 6]);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 10, 0, TAU);
      ctx.stroke();
    }
    for (const f of this.zone.fragments) {
      if (this.host.save.data.collected.includes(f.id)) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 16, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function closestT(a: Vec, b: Vec, x: number, y: number) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const den = abx * abx + aby * aby || 1;
  return clamp(((x - a.x) * abx + (y - a.y) * aby) / den, 0, 1);
}

function ePhase(enemies: Enemy[]) {
  const k = enemies.find((e) => e.kind === "king" && e.alive);
  if (!k) return 0;
  return 0.45 + (1 - k.hp / k.maxHp) * 0.7;
}

export const zoneByScene = (id: SceneId): ZoneDef | null => {
  const map: Partial<Record<SceneId, string>> = {
    hub: "hub",
    silk: "silk",
    rest1: "rest1",
    markets: "markets",
    rest2: "rest2",
    spire: "spire",
    rest3: "rest3",
    boss: "boss",
  };
  const key = map[id];
  return key ? ZONES[key] : null;
};
