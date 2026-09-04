import { DEFAULT_SAVE, SAVE_KEY, type SaveData, type SceneId } from "./types";

export class SaveSys {
  data: SaveData = DEFAULT_SAVE();

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SaveData;
      if (!parsed || parsed.version !== 1) return false;
      this.data = { ...DEFAULT_SAVE(), ...parsed, settings: { ...DEFAULT_SAVE().settings, ...parsed.settings } };
      return true;
    } catch {
      return false;
    }
  }

  has(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  write() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }

  reset() {
    const settings = this.data.settings;
    this.data = DEFAULT_SAVE();
    this.data.settings = settings;
    this.write();
  }

  checkpoint(scene: SceneId) {
    this.data.scene = scene;
    this.write();
  }

  flag(id: string) {
    return !!this.data.flags[id];
  }

  setFlag(id: string, v = true) {
    this.data.flags[id] = v;
    this.write();
  }

  addBond(who: "solace" | "vesper", n: number) {
    this.data.bonds[who] = Math.max(0, Math.min(100, this.data.bonds[who] + n));
    this.write();
  }

  hasUpgrade(id: string) {
    return this.data.upgrades.includes(id);
  }

  buy(id: string, cost: number) {
    if (this.hasUpgrade(id) || this.data.fragments < cost) return false;
    this.data.fragments -= cost;
    this.data.upgrades.push(id);
    if (id === "heart") {
      this.data.maxHp += 1;
      this.data.hp = Math.min(this.data.maxHp, this.data.hp + 1);
    }
    this.write();
    return true;
  }

  collect(id: string, whisper?: string) {
    if (this.data.collected.includes(id)) return false;
    this.data.collected.push(id);
    this.data.fragments += 1;
    this.write();
    return whisper ?? true;
  }
}
