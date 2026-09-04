import { clamp, rand } from "./math";

type Mood = "title" | "hub" | "garden" | "market" | "spire" | "void" | "ending";

export class AudioSys {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  private mood: Mood = "title";
  private started = false;
  private padOsc: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private interval: number | null = null;

  async unlock() {
    if (this.started) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music.gain.value = 0.22;
    this.sfx.gain.value = 0.55;
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.started = true;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.startPads(this.mood);
  }

  setMute(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.started) this.startPads(mood);
  }

  private chords(mood: Mood): number[][] {
    switch (mood) {
      case "title":
        return [[196, 247, 294], [174, 220, 261], [196, 233, 311]];
      case "hub":
        return [[220, 277, 329], [196, 247, 294], [233, 293, 349]];
      case "garden":
        return [[261, 329, 392], [246, 311, 370], [220, 277, 349]];
      case "market":
        return [[196, 246, 311], [233, 293, 370], [207, 277, 349]];
      case "spire":
        return [[174, 207, 261], [155, 196, 246], [185, 233, 277]];
      case "void":
        return [[82, 123, 155], [98, 146, 185], [73, 110, 146]];
      case "ending":
        return [[261, 329, 392], [220, 277, 349], [196, 247, 330]];
    }
  }

  private startPads(mood: Mood) {
    if (!this.ctx || !this.music) return;
    this.stopPads();
    const ctx = this.ctx;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = mood === "void" ? 420 : 900;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.music);

    this.lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = mood === "void" ? 80 : 140;
    this.lfo.frequency.value = mood === "void" ? 0.07 : 0.11;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    const chord = this.chords(mood)[0];
    for (let i = 0; i < chord.length; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = chord[i];
      o.detune.value = rand(-6, 6);
      g.gain.value = 0.07 - i * 0.012;
      o.connect(g);
      g.connect(this.filter);
      o.start();
      this.padOsc.push(o);
    }

    let step = 0;
    this.interval = window.setInterval(() => {
      if (!this.ctx) return;
      const next = this.chords(this.mood)[++step % this.chords(this.mood).length];
      this.padOsc.forEach((o, i) => {
        o.frequency.exponentialRampToValueAtTime(
          Math.max(40, next[i] ?? next[0]),
          this.ctx!.currentTime + 2.4,
        );
      });
    }, 6400);
  }

  private stopPads() {
    if (this.interval) window.clearInterval(this.interval);
    this.interval = null;
    for (const o of this.padOsc) {
      try {
        o.stop();
      } catch {
        /* */
      }
    }
    this.padOsc = [];
    try {
      this.lfo?.stop();
    } catch {
      /* */
    }
    this.lfo = null;
    this.filter = null;
  }

  private beep(freq: number, dur: number, type: OscillatorType, vol = 0.2, slide = 0) {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.12, hp = 800) {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = n;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start();
  }

  slash() {
    this.noise(0.12, 0.16, 1200);
    this.beep(620, 0.14, "sawtooth", 0.09, -280);
  }
  pierce() {
    this.beep(880, 0.16, "square", 0.08, 220);
    this.noise(0.08, 0.08, 1800);
  }
  bind() {
    this.beep(220, 0.28, "sine", 0.12, 180);
    this.beep(330, 0.28, "triangle", 0.07, 90);
  }
  dash() {
    this.noise(0.16, 0.14, 400);
    this.beep(180, 0.12, "sine", 0.08, 140);
  }
  hit() {
    this.beep(110, 0.1, "square", 0.12, -40);
    this.noise(0.08, 0.1, 200);
  }
  hurt() {
    this.beep(160, 0.18, "sawtooth", 0.12, -90);
  }
  chime() {
    this.beep(784, 0.22, "sine", 0.12, 20);
    this.beep(988, 0.28, "sine", 0.08, 10);
    this.beep(1174, 0.34, "triangle", 0.06, 0);
  }
  whisper() {
    this.noise(0.35, 0.07, 900);
    this.beep(520, 0.4, "sine", 0.04, 40);
  }
  ui() {
    this.beep(640, 0.06, "sine", 0.07, 80);
  }
  shop() {
    this.beep(440, 0.1, "triangle", 0.08);
    this.beep(660, 0.14, "sine", 0.06);
  }
  king() {
    this.beep(55, 0.4, "sawtooth", 0.1, -10);
    this.noise(0.3, 0.12, 80);
  }
  reveal() {
    this.beep(880, 0.2, "sine", 0.06, 200);
    this.whisper();
  }

  duck(amount = 0.35, ms = 80) {
    if (!this.music) return;
    const g = this.music.gain;
    const now = this.ctx?.currentTime ?? 0;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(clamp(0.22 * (1 - amount), 0.04, 0.22), now + 0.02);
    g.linearRampToValueAtTime(0.22, now + ms / 1000 + 0.08);
  }
}
