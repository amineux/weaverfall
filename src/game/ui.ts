import { DIALOGUES, PAUSE_LORE, SHOP } from "./content";
import type { SaveSys } from "./save";
import type { DialogueChoice, DialogueLine, Speaker } from "./types";

export class UI {
  hud = document.getElementById("hud")!;
  overlay = document.getElementById("overlay")!;
  title = document.getElementById("title-screen")!;
  settings = document.getElementById("settings-screen")!;
  pause = document.getElementById("pause-screen")!;
  dialogue = document.getElementById("dialogue-box")!;
  shop = document.getElementById("shop-screen")!;
  cine = document.getElementById("cinematic")!;
  cineText = document.getElementById("cine-text")!;
  toastEl = document.getElementById("toast")!;
  zoneChip = document.getElementById("zone-chip")!;
  hpRow = document.getElementById("hp-row")!;
  frag = document.getElementById("frag-count")!;
  solace = document.getElementById("bond-solace")!;
  vesper = document.getElementById("bond-vesper")!;
  pills = document.getElementById("ability-pills")!;
  dlgName = document.getElementById("dlg-name")!;
  dlgText = document.getElementById("dlg-text")!;
  dlgChoices = document.getElementById("dlg-choices")!;
  dlgNext = document.getElementById("dlg-next") as HTMLButtonElement;
  dlgPortrait = document.getElementById("dlg-portrait")!;
  shopItems = document.getElementById("shop-items")!;
  continueBtn = document.getElementById("btn-continue") as HTMLButtonElement;
  mute = document.getElementById("set-mute") as HTMLInputElement;
  shake = document.getElementById("set-shake") as HTMLInputElement;
  reduce = document.getElementById("set-reduce") as HTMLInputElement;

  talking = false;
  shopping = false;
  paused = false;
  onTitle = true;
  private lines: DialogueLine[] = [];
  private idx = 0;
  private toastT = 0;
  private onChoice: ((c: DialogueChoice) => void) | null = null;
  private onShopDone: (() => void) | null = null;
  private onLineDone: ((special?: string) => void) | null = null;

  constructor() {
    this.dlgNext.addEventListener("click", () => this.advance());
  }

  bindTitle(handlers: {
    newGame: () => void;
    cont: () => void;
    settings: () => void;
    settingsBack: () => void;
    resume: () => void;
    toTitle: () => void;
    skip: () => void;
    shopLeave: () => void;
    mute: (v: boolean) => void;
    shake: (v: boolean) => void;
    bloom: (v: boolean) => void;
  }) {
    document.getElementById("btn-new")!.onclick = handlers.newGame;
    this.continueBtn.onclick = handlers.cont;
    document.getElementById("btn-settings")!.onclick = handlers.settings;
    document.getElementById("btn-pause-settings")!.onclick = handlers.settings;
    document.getElementById("btn-settings-back")!.onclick = handlers.settingsBack;
    document.getElementById("btn-resume")!.onclick = handlers.resume;
    document.getElementById("btn-title")!.onclick = handlers.toTitle;
    document.getElementById("btn-skip")!.onclick = handlers.skip;
    document.getElementById("btn-shop-leave")!.onclick = handlers.shopLeave;
    this.mute.onchange = () => handlers.mute(this.mute.checked);
    this.shake.onchange = () => handlers.shake(this.shake.checked);
    this.reduce.onchange = () => handlers.bloom(this.reduce.checked);
  }

  setContinue(on: boolean) {
    this.continueBtn.disabled = !on;
  }

  showTitle(hasSave: boolean) {
    this.onTitle = true;
    this.hideAll();
    this.title.classList.remove("hidden");
    this.hud.classList.add("hidden");
    this.setContinue(hasSave);
  }

  showSettings(fromPause: boolean) {
    this.hideAll();
    this.settings.classList.remove("hidden");
    if (fromPause) this.pause.classList.add("hidden");
  }

  hideSettings(backTo: "title" | "pause") {
    this.settings.classList.add("hidden");
    if (backTo === "title") this.title.classList.remove("hidden");
    else {
      this.pause.classList.remove("hidden");
      this.paused = true;
    }
  }

  showPause(scene: string) {
    this.paused = true;
    this.pause.classList.remove("hidden");
    const lore = PAUSE_LORE[scene] ?? "The Loom holds its breath.";
    document.getElementById("pause-lore")!.textContent = lore;
  }

  hidePause() {
    this.paused = false;
    this.pause.classList.add("hidden");
  }

  hideAll() {
    this.title.classList.add("hidden");
    this.settings.classList.add("hidden");
    this.pause.classList.add("hidden");
    this.dialogue.classList.add("hidden");
    this.shop.classList.add("hidden");
    this.cine.classList.add("hidden");
    this.talking = false;
    this.shopping = false;
    this.paused = false;
  }

  playHud() {
    this.onTitle = false;
    this.title.classList.add("hidden");
    this.hud.classList.remove("hidden");
  }

  syncSettings(s: { mute: boolean; shake: boolean; reduceBloom: boolean }) {
    this.mute.checked = s.mute;
    this.shake.checked = s.shake;
    this.reduce.checked = s.reduceBloom;
  }

  hudSync(save: SaveSys, zone: string, revealOn: boolean, echoOn: boolean, prompt: string) {
    const d = save.data;
    this.zoneChip.textContent = zone;
    this.hpRow.innerHTML = "";
    for (let i = 0; i < d.maxHp; i++) {
      const h = document.createElement("div");
      h.className = "heart" + (i < d.hp ? "" : " empty");
      this.hpRow.appendChild(h);
    }
    this.frag.textContent = String(d.fragments);
    this.solace.style.width = `${d.bonds.solace}%`;
    this.vesper.style.width = `${d.bonds.vesper}%`;
    this.pills.innerHTML = "";
    if (d.bonds.solace >= 22) {
      const p = document.createElement("div");
      p.className = "pill";
      p.textContent = revealOn ? "Reveal" : "R Reveal";
      this.pills.appendChild(p);
    }
    if (echoOn) {
      const p = document.createElement("div");
      p.className = "pill magenta";
      p.textContent = "Echo Slash";
      this.pills.appendChild(p);
    }
    if (prompt && !this.toastT) {
      this.toastEl.textContent = prompt;
      this.toastEl.classList.add("show");
    }
  }

  toast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add("show");
    this.toastT = 3.2;
  }

  update(dt: number) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toastEl.classList.remove("show");
    }
  }

  startTalk(
    key: string,
    onChoice: (c: DialogueChoice) => void,
    onDone: (special?: string) => void,
  ) {
    const lines = DIALOGUES[key];
    if (!lines) {
      onDone();
      return;
    }
    this.onChoice = onChoice;
    this.onLineDone = onDone;
    this.lines = lines;
    this.idx = 0;
    this.talking = true;
    this.dialogue.classList.remove("hidden");
    this.renderLine();
  }

  private renderLine() {
    const line = this.lines[this.idx];
    if (!line) {
      this.endTalk();
      return;
    }
    this.dlgName.textContent = nameOf(line.speaker);
    this.dlgText.textContent = line.text;
    this.dlgPortrait.className = `dlg-portrait ${line.speaker}`;
    this.dlgChoices.innerHTML = "";
    if (line.choices?.length) {
      this.dlgNext.classList.add("hidden");
      for (const c of line.choices) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn";
        b.textContent = c.text;
        b.onclick = () => {
          this.onChoice?.(c);
          if (c.next === "shop") {
            this.endTalk("shop");
            return;
          }
          this.advance();
        };
        this.dlgChoices.appendChild(b);
      }
    } else {
      this.dlgNext.classList.remove("hidden");
    }
  }

  advance() {
    const line = this.lines[this.idx];
    if (line?.next === "shop") {
      this.endTalk("shop");
      return;
    }
    this.idx++;
    if (this.idx >= this.lines.length) this.endTalk();
    else this.renderLine();
  }

  private endTalk(special?: string) {
    this.talking = false;
    this.dialogue.classList.add("hidden");
    const cb = this.onLineDone;
    this.onLineDone = null;
    cb?.(special);
  }

  openShop(save: SaveSys, onDone: () => void) {
    this.shopping = true;
    this.shop.classList.remove("hidden");
    this.onShopDone = onDone;
    this.renderShop(save);
  }

  renderShop(save: SaveSys) {
    this.shopItems.innerHTML = "";
    document.getElementById("shop-intro")!.textContent =
      `Fragments in hand: ${save.data.fragments}. Spend a yesterday.`;
    for (const item of SHOP) {
      const owned = save.hasUpgrade(item.id);
      const row = document.createElement("div");
      row.className = "shop-item";
      row.innerHTML = `<div><strong>${item.name}</strong><small>${item.desc}</small></div>`;
      const b = document.createElement("button");
      b.className = "btn tiny";
      b.textContent = owned ? "Owned" : `${item.cost} ◆`;
      b.disabled = owned || save.data.fragments < item.cost;
      b.onclick = () => {
        if (save.buy(item.id, item.cost)) this.renderShop(save);
      };
      row.appendChild(b);
      this.shopItems.appendChild(row);
    }
  }

  closeShop() {
    this.shopping = false;
    this.shop.classList.add("hidden");
    this.onShopDone?.();
    this.onShopDone = null;
  }

  showCine(text: string) {
    this.cine.classList.remove("hidden");
    this.cineText.textContent = text;
  }

  hideCine() {
    this.cine.classList.add("hidden");
  }
}

const nameOf = (s: Speaker) =>
  ({
    nyx: "Nyx",
    solace: "Solace",
    vesper: "Vesper",
    archivist: "The Archivist",
    king: "Hollow King",
    narrator: "The Loom",
  })[s];
