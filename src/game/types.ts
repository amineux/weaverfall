export type SceneId =
  | "title"
  | "intro"
  | "hub"
  | "silk"
  | "rest1"
  | "markets"
  | "rest2"
  | "spire"
  | "rest3"
  | "boss"
  | "ending";

export type WeaveKind = "slash" | "pierce" | "bind";

export type EnemyKind = "frayling" | "stitcher" | "unraveler" | "king";

export type Speaker = "nyx" | "solace" | "vesper" | "archivist" | "king" | "narrator";

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Palette {
  bg0: string;
  bg1: string;
  accent: string;
  accent2: string;
  floor: string;
  fog: string;
  ambient: [number, number, number];
}

export interface SaveData {
  version: number;
  scene: SceneId;
  hp: number;
  maxHp: number;
  fragments: number;
  bonds: { solace: number; vesper: number };
  upgrades: string[];
  flags: Record<string, boolean>;
  collected: string[];
  settings: { mute: boolean; shake: boolean; reduceBloom: boolean };
}

export interface DialogueChoice {
  text: string;
  solace?: number;
  vesper?: number;
  flag?: string;
  next?: string;
}

export interface DialogueLine {
  id?: string;
  speaker: Speaker;
  text: string;
  choices?: DialogueChoice[];
  next?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
}

export interface Anchor {
  id: string;
  x: number;
  y: number;
}

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
}

export interface FragmentSpawn {
  id: string;
  x: number;
  y: number;
  whisper: string;
  hidden?: boolean;
}

export interface ZoneDef {
  id: SceneId;
  name: string;
  mood: "hub" | "garden" | "market" | "spire" | "void" | "ending";
  width: number;
  height: number;
  palette: Palette;
  walls: Rect[];
  pits: Rect[];
  anchors: Anchor[];
  bridgePairs: [string, string][];
  enemies: EnemySpawn[];
  fragments: FragmentSpawn[];
  npcs: { who: Speaker; x: number; y: number; label: string }[];
  exit?: { x: number; y: number; next: SceneId; label: string };
  spawn: Vec;
  rest?: boolean;
  boss?: boolean;
}

export const SAVE_KEY = "weaverfall-save-v1";

export const DEFAULT_SAVE = (): SaveData => ({
  version: 1,
  scene: "title",
  hp: 5,
  maxHp: 5,
  fragments: 0,
  bonds: { solace: 8, vesper: 0 },
  upgrades: [],
  flags: {},
  collected: [],
  settings: { mute: false, shake: true, reduceBloom: false },
});
