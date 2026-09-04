import { AudioSys } from "./audio";
import { INTRO } from "./content";
import { FX } from "./fx";
import { Input } from "./input";
import { mulberry32, rand, TAU } from "./math";
import { Particles } from "./particles";
import { SaveSys } from "./save";
import type { DialogueChoice, SceneId } from "./types";
import { UI } from "./ui";
import { World, zoneByScene } from "./world";

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  audio = new AudioSys();
  particles = new Particles();
  save = new SaveSys();
  fx = new FX();
  ui = new UI();
  world: World | null = null;
  scene: SceneId = "title";
  running = true;
  last = performance.now();
  introI = 0;
  introT = 0;
  endingHigh = true;
  settingsFrom: "title" | "pause" = "title";
  private stars: { x: number; y: number; z: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.input = new Input(canvas);
    const has = this.save.load();
    this.ui.setContinue(has);
    this.ui.syncSettings(this.save.data.settings);
    this.applySettings();
    this.ui.bindTitle({
      newGame: () => void this.newGame(),
      cont: () => void this.continueGame(),
      settings: () => {
        this.settingsFrom = this.ui.paused ? "pause" : "title";
        this.ui.showSettings(this.ui.paused);
      },
      settingsBack: () => this.ui.hideSettings(this.settingsFrom),
      resume: () => this.ui.hidePause(),
      toTitle: () => this.toTitle(),
      skip: () => this.skipCine(),
      shopLeave: () => this.ui.closeShop(),
      mute: (v) => {
        this.save.data.settings.mute = v;
        this.save.write();
        this.audio.setMute(v);
      },
      shake: (v) => {
        this.save.data.settings.shake = v;
        this.save.write();
        this.fx.shakeOn = v;
      },
      bloom: (v) => {
        this.save.data.settings.reduceBloom = v;
        this.save.write();
        this.fx.bloom = v ? 0.55 : 1;
      },
    });
    const rng = mulberry32(7);
    this.stars = Array.from({ length: 90 }, () => ({
      x: rng() * 1600,
      y: rng() * 900,
      z: 0.3 + rng() * 0.8,
    }));
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.detectTouch();
    this.ui.showTitle(has);
    const w = window as unknown as {
      __WF: () => Record<string, unknown>;
      __WF_GO: (s: SceneId) => void;
    };
    w.__WF_GO = (s: SceneId) => this.go(s);
    w.__WF = () => ({
      scene: this.scene,
      hp: this.save.data.hp,
      fragments: this.save.data.fragments,
      bonds: { ...this.save.data.bonds },
      zone: this.world?.zone.name ?? null,
      player: this.world ? { x: this.world.player.x, y: this.world.player.y } : null,
      enemies: this.world?.enemies.map((e) => ({
        kind: e.kind,
        hp: e.hp,
        alive: e.alive,
        x: e.x,
        y: e.y,
      })),
      prompt: this.world?.prompt ?? "",
      talking: this.ui.talking,
      shopping: this.ui.shopping,
      paused: this.ui.paused,
      bridges: this.world ? [...this.world.bridges] : [],
      cleared: this.world?.cleared ?? false,
      weaving: this.input.weaving,
      weavePts: this.world?.weave.length ?? 0,
    });
    requestAnimationFrame((t) => this.frame(t));
  }

  private detectTouch() {
    const touch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.input.showTouch(touch);
  }

  private applySettings() {
    const s = this.save.data.settings;
    this.audio.setMute(s.mute);
    this.fx.shakeOn = s.shake;
    this.fx.bloom = s.reduceBloom ? 0.55 : 1;
    this.ui.syncSettings(s);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private async bootAudio() {
    await this.audio.unlock();
    this.audio.setMute(this.save.data.settings.mute);
  }

  private async newGame() {
    await this.bootAudio();
    this.audio.ui();
    this.save.reset();
    this.save.checkpoint("intro");
    this.go("intro");
  }

  private async continueGame() {
    await this.bootAudio();
    this.audio.ui();
    if (!this.save.load()) return this.newGame();
    const raw = this.save.data.scene;
    const scene = raw === "title" || raw === "intro" || raw === "ending" ? "hub" : raw;
    this.go(scene);
  }

  private toTitle() {
    this.ui.hidePause();
    this.world = null;
    this.scene = "title";
    this.audio.setMood("title");
    this.ui.showTitle(this.save.has());
  }

  go(scene: SceneId) {
    this.fx.fade = 1;
    this.fx.fadeDir = -1;
    this.scene = scene;
    this.ui.hideAll();
    if (scene === "title") {
      this.toTitle();
      return;
    }
    if (scene === "intro") {
      this.introI = 0;
      this.introT = INTRO[0].t;
      this.ui.playHud();
      this.ui.hud.classList.add("hidden");
      this.ui.showCine(INTRO[0].text);
      this.audio.setMood("title");
      return;
    }
    if (scene === "ending") {
      this.beginEnding();
      return;
    }
    const zone = zoneByScene(scene);
    if (!zone) return;
    this.ui.playHud();
    this.save.checkpoint(scene);
    this.audio.setMood(zone.mood);
    this.particles = new Particles();
    this.world = new World(this.host(), zone);
  }

  private host() {
    return {
      save: this.save,
      audio: this.audio,
      particles: this.particles,
      fx: this.fx,
      input: this.input,
      toast: (m: string) => this.ui.toast(m),
      talk: (key: string) => this.talk(key),
      openShop: () => this.openShop(),
      goto: (s: SceneId) => this.go(s),
      win: () => this.go("ending"),
    };
  }

  private talk(key: string) {
    this.audio.whisper();
    this.ui.startTalk(
      key,
      (c: DialogueChoice) => {
        if (c.solace) this.save.addBond("solace", c.solace);
        if (c.vesper) this.save.addBond("vesper", c.vesper);
        if (c.flag) this.save.setFlag(c.flag);
        this.audio.ui();
      },
      (special) => {
        if (special === "shop") this.openShop();
        if (this.scene === "ending") {
          this.ui.showCine(
            this.endingHigh
              ? "The gardens drink again. A messy, living cloth."
              : "Snow-quiet. The city sleeps without dreams.",
          );
        }
      },
    );
  }

  private openShop() {
    this.audio.shop();
    this.ui.openShop(this.save, () => undefined);
  }

  private skipCine() {
    if (this.scene === "intro") this.go("hub");
    else if (this.scene === "ending") this.toTitle();
  }

  private beginEnding() {
    const b = this.save.data.bonds;
    this.endingHigh = (b.solace + b.vesper) / 2 >= 46 || (b.solace >= 40 && b.vesper >= 28);
    this.ui.playHud();
    this.ui.hud.classList.add("hidden");
    this.world = null;
    this.audio.setMood("ending");
    this.ui.showCine(this.endingHigh ? "The Loom remembers you kindly." : "The Loom goes quiet.");
    window.setTimeout(() => {
      this.ui.hideCine();
      this.talk(this.endingHigh ? "ending_high" : "ending_low");
    }, 2200);
    this.save.checkpoint("ending");
  }

  private frame(now: number) {
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.fx.update(raw);
    const dt = raw * this.fx.timeScale();
    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  private update(dt: number) {
    this.ui.update(dt);
    if (this.input.consumePause() && this.world && !this.ui.talking && !this.ui.shopping && !this.ui.onTitle) {
      if (this.ui.paused) this.ui.hidePause();
      else this.ui.showPause(this.scene);
    }
    if (this.ui.paused || this.ui.talking || this.ui.shopping) {
      this.input.consumeInteract();
      this.input.consumeDash();
      this.input.consumeAbility();
      this.input.consumeWeaveEnd();
      if (this.ui.talking && this.input.consumeSkip()) this.ui.advance();
      this.drawMenuBackdrop(dt);
      return;
    }

    if (this.scene === "title") {
      this.particles.update(dt);
      if (Math.random() < 0.6) {
        this.particles.spawn({
          x: rand(0, window.innerWidth),
          y: rand(0, window.innerHeight),
          vx: rand(-8, 8),
          vy: rand(-18, -4),
          life: rand(1.2, 2.8),
          size: rand(1, 3),
          r: 180,
          g: 220,
          b: 255,
        });
      }
      return;
    }

    if (this.scene === "intro") {
      this.particles.update(dt);
      this.introT -= dt;
      if (this.input.consumeSkip()) return this.go("hub");
      if (this.introT <= 0) {
        this.introI++;
        if (this.introI >= INTRO.length) return this.go("hub");
        this.introT = INTRO[this.introI].t;
        this.ui.showCine(INTRO[this.introI].text);
        this.audio.whisper();
      }
      return;
    }

    if (this.scene === "ending") {
      this.particles.update(dt);
      this.particles.burst(
        window.innerWidth * 0.5 + rand(-80, 80),
        window.innerHeight * 0.45,
        2,
        this.endingHigh ? [110, 231, 255] : [140, 80, 200],
        40,
        1.2,
        2,
      );
      if (!this.ui.talking && !this.ui.cine.classList.contains("hidden") === false) {
        /* wait */
      }
      if (!this.ui.talking && this.ui.cine.classList.contains("hidden")) {
        this.ui.showCine(this.endingHigh ? "WEAVERFALL — High Bond" : "WEAVERFALL — Low Bond");
      }
      if (this.input.consumeSkip()) this.toTitle();
      return;
    }

    this.world?.update(dt);
    this.particles.update(dt);
    if (this.world) {
      const echo = this.world.vesperAid && this.save.data.bonds.vesper >= 28;
      this.ui.hudSync(this.save, this.world.zone.name, this.world.revealT > 0, echo, this.world.prompt);
    }
  }

  private drawMenuBackdrop(dt: number) {
    this.particles.update(dt * 0.4);
  }

  private draw() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    if (this.world && this.scene !== "title" && this.scene !== "intro" && this.scene !== "ending") {
      this.world.draw(ctx, w, h);
    } else {
      this.drawTitleField(ctx, w, h);
    }
    this.fx.drawFade(ctx, w, h);
  }

  private drawTitleField(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.5, w * 0.7);
    const voidish = this.scene === "ending" && !this.endingHigh;
    g.addColorStop(0, voidish ? "#1a0824" : "#14102a");
    g.addColorStop(1, "#07060c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.stars) {
      const x = ((s.x - performance.now() * 0.006 * s.z) % (w + 40)) + 0;
      const y = s.y * (h / 900);
      ctx.fillStyle = `rgba(190,230,255,${0.15 + s.z * 0.45})`;
      ctx.beginPath();
      ctx.arc((x + w + 40) % (w + 40), y, s.z * 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    this.fx.glow(ctx, w * 0.5, h * 0.38, 180, this.endingHigh || this.scene !== "ending" ? "#6ee7ff" : "#b388ff", 0.12);
    this.particles.draw(ctx);
    if (this.scene === "ending") {
      ctx.textAlign = "center";
      ctx.font = "italic 28px Cormorant Garamond, serif";
      ctx.fillStyle = "rgba(232,228,244,0.55)";
      ctx.fillText(this.endingHigh ? "stitched, not sealed" : "a merciful silence", w / 2, h * 0.72);
    }
  }
}

