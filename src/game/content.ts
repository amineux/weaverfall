import type { DialogueLine, Palette, SceneId, ShopItem, ZoneDef } from "./types";

const P = {
  hub: {
    bg0: "#07060e",
    bg1: "#14102a",
    accent: "#9b7cff",
    accent2: "#f4d07a",
    floor: "#161225",
    fog: "rgba(80,60,140,0.18)",
    ambient: [196, 247, 294],
  } satisfies Palette,
  garden: {
    bg0: "#06110f",
    bg1: "#0c2422",
    accent: "#6ee7ff",
    accent2: "#f4d07a",
    floor: "#0e2a26",
    fog: "rgba(70,180,160,0.14)",
    ambient: [261, 329, 392],
  } satisfies Palette,
  market: {
    bg0: "#14080e",
    bg1: "#2a1020",
    accent: "#ff6ad5",
    accent2: "#ffb14a",
    floor: "#241018",
    fog: "rgba(220,80,140,0.12)",
    ambient: [196, 246, 311],
  } satisfies Palette,
  spire: {
    bg0: "#060714",
    bg1: "#12183a",
    accent: "#7aa2ff",
    accent2: "#c4b5fd",
    floor: "#10162c",
    fog: "rgba(60,80,180,0.16)",
    ambient: [174, 207, 261],
  } satisfies Palette,
  void: {
    bg0: "#040208",
    bg1: "#16081f",
    accent: "#b388ff",
    accent2: "#5c2a8a",
    floor: "#100816",
    fog: "rgba(90,20,120,0.22)",
    ambient: [82, 123, 155],
  } satisfies Palette,
};

export const SHOP: ShopItem[] = [
  { id: "heart", name: "Heartstring", desc: "+1 max life. A remembered pulse.", cost: 3 },
  { id: "swift", name: "Swift Thread", desc: "Dash recovers faster.", cost: 3 },
  { id: "keen", name: "Keen Weave", desc: "Thread strikes cut deeper.", cost: 4 },
  { id: "loom", name: "Long Loom", desc: "Paint farther, bind wider.", cost: 3 },
];

export const ZONES: Record<string, ZoneDef> = {
  hub: {
    id: "hub",
    name: "The Spindle",
    mood: "hub",
    width: 1400,
    height: 1100,
    palette: P.hub,
    walls: [
      { x: 180, y: 220, w: 90, h: 220 },
      { x: 1080, y: 260, w: 80, h: 180 },
      { x: 480, y: 90, w: 70, h: 70 },
      { x: 850, y: 90, w: 70, h: 70 },
    ],
    pits: [],
    anchors: [],
    bridgePairs: [],
    enemies: [],
    fragments: [{ id: "hub-first", x: 1080, y: 820, whisper: "A first memory: someone once waited here." }],
    npcs: [
      { who: "archivist", x: 980, y: 420, label: "The Archivist" },
      { who: "solace", x: 560, y: 500, label: "Solace" },
    ],
    exit: { x: 700, y: 240, next: "silk", label: "Silk Gardens" },
    spawn: { x: 700, y: 720 },
    rest: true,
  },
  silk: {
    id: "silk",
    name: "Silk Gardens",
    mood: "garden",
    width: 1700,
    height: 1300,
    palette: P.garden,
    walls: [
      { x: 240, y: 240, w: 70, h: 260 },
      { x: 1280, y: 300, w: 80, h: 240 },
      { x: 760, y: 860, w: 200, h: 50 },
    ],
    pits: [{ x: 70, y: 430, w: 1560, h: 100 }],
    anchors: [
      { id: "a1", x: 850, y: 392 },
      { id: "a2", x: 850, y: 568 },
    ],
    bridgePairs: [["a1", "a2"]],
    enemies: [
      { kind: "frayling", x: 500, y: 980 },
      { kind: "frayling", x: 780, y: 900 },
      { kind: "frayling", x: 1100, y: 960 },
      { kind: "frayling", x: 900, y: 300 },
    ],
    fragments: [
      { id: "silk-1", x: 320, y: 1080, whisper: "Gold moths used to drink from these pools." },
      { id: "silk-2", x: 1480, y: 280, whisper: "Nyx's first thread was a promise, not a weapon." },
    ],
    npcs: [],
    exit: { x: 850, y: 180, next: "rest1", label: "Rest Node" },
    spawn: { x: 850, y: 1120 },
  },
  rest1: {
    id: "rest1",
    name: "Ember Loom",
    mood: "hub",
    width: 1100,
    height: 900,
    palette: P.hub,
    walls: [{ x: 180, y: 200, w: 60, h: 160 }],
    pits: [],
    anchors: [],
    bridgePairs: [],
    enemies: [],
    fragments: [],
    npcs: [
      { who: "solace", x: 520, y: 430, label: "Solace" },
      { who: "archivist", x: 780, y: 380, label: "The Archivist" },
    ],
    exit: { x: 550, y: 160, next: "markets", label: "Thread Markets" },
    spawn: { x: 550, y: 680 },
    rest: true,
  },
  markets: {
    id: "markets",
    name: "Thread Markets",
    mood: "market",
    width: 1800,
    height: 1400,
    palette: P.market,
    walls: [
      { x: 340, y: 280, w: 120, h: 80 },
      { x: 700, y: 520, w: 140, h: 70 },
      { x: 1180, y: 300, w: 130, h: 90 },
      { x: 980, y: 860, w: 160, h: 70 },
      { x: 420, y: 900, w: 100, h: 80 },
    ],
    pits: [{ x: 820, y: 640, w: 180, h: 160 }],
    anchors: [
      { id: "m1", x: 800, y: 720 },
      { id: "m2", x: 1020, y: 720 },
    ],
    bridgePairs: [["m1", "m2"]],
    enemies: [
      { kind: "frayling", x: 420, y: 500 },
      { kind: "frayling", x: 1400, y: 500 },
      { kind: "stitcher", x: 500, y: 1100 },
      { kind: "stitcher", x: 1500, y: 1080 },
      { kind: "frayling", x: 960, y: 240 },
    ],
    fragments: [
      { id: "mkt-1", x: 280, y: 300, whisper: "Bargains were struck in colors, not coin." },
      { id: "mkt-2", x: 1600, y: 1240, whisper: "Vesper once sold a sunrise and bought a scar." },
    ],
    npcs: [],
    exit: { x: 900, y: 180, next: "rest2", label: "Rest Node" },
    spawn: { x: 900, y: 1240 },
  },
  rest2: {
    id: "rest2",
    name: "Lantern Fold",
    mood: "market",
    width: 1100,
    height: 900,
    palette: P.market,
    walls: [],
    pits: [],
    anchors: [],
    bridgePairs: [],
    enemies: [],
    fragments: [],
    npcs: [
      { who: "vesper", x: 620, y: 400, label: "Vesper" },
      { who: "solace", x: 420, y: 480, label: "Solace" },
    ],
    exit: { x: 550, y: 160, next: "spire", label: "Frayed Spire" },
    spawn: { x: 550, y: 680 },
    rest: true,
  },
  spire: {
    id: "spire",
    name: "Frayed Spire",
    mood: "spire",
    width: 1700,
    height: 1500,
    palette: P.spire,
    walls: [
      { x: 300, y: 260, w: 70, h: 340 },
      { x: 1320, y: 260, w: 70, h: 340 },
      { x: 620, y: 700, w: 180, h: 50 },
      { x: 900, y: 980, w: 60, h: 180 },
    ],
    pits: [{ x: 70, y: 1180, w: 1560, h: 86 }],
    anchors: [
      { id: "s1", x: 850, y: 1148 },
      { id: "s2", x: 850, y: 1300 },
    ],
    bridgePairs: [["s1", "s2"]],
    enemies: [
      { kind: "unraveler", x: 500, y: 420 },
      { kind: "unraveler", x: 1200, y: 420 },
      { kind: "stitcher", x: 860, y: 560 },
      { kind: "frayling", x: 400, y: 860 },
      { kind: "frayling", x: 1300, y: 860 },
    ],
    fragments: [
      { id: "spire-1", x: 860, y: 240, whisper: "The King believed one tapestry could outlive grief." },
      { id: "spire-h", x: 250, y: 1360, whisper: "Solace hid a name here. It still glows if you ask.", hidden: true },
    ],
    npcs: [],
    exit: { x: 850, y: 180, next: "rest3", label: "Rest Node" },
    spawn: { x: 850, y: 1360 },
  },
  rest3: {
    id: "rest3",
    name: "Last Hearth",
    mood: "spire",
    width: 1100,
    height: 900,
    palette: P.spire,
    walls: [],
    pits: [],
    anchors: [],
    bridgePairs: [],
    enemies: [],
    fragments: [{ id: "rest3-1", x: 880, y: 700, whisper: "A spare kindness, left for whoever still climbs." }],
    npcs: [
      { who: "solace", x: 400, y: 430, label: "Solace" },
      { who: "vesper", x: 700, y: 400, label: "Vesper" },
      { who: "archivist", x: 860, y: 360, label: "The Archivist" },
    ],
    exit: { x: 550, y: 160, next: "boss", label: "Hollow Court" },
    spawn: { x: 550, y: 700 },
    rest: true,
  },
  boss: {
    id: "boss",
    name: "Hollow Court",
    mood: "void",
    width: 1300,
    height: 1100,
    palette: P.void,
    walls: [
      { x: 160, y: 160, w: 80, h: 80 },
      { x: 1060, y: 160, w: 80, h: 80 },
      { x: 160, y: 860, w: 80, h: 80 },
      { x: 1060, y: 860, w: 80, h: 80 },
    ],
    pits: [],
    anchors: [],
    bridgePairs: [],
    enemies: [{ kind: "king", x: 650, y: 420 }],
    fragments: [],
    npcs: [],
    spawn: { x: 650, y: 860 },
    boss: true,
  },
};

export const INTRO: { text: string; t: number }[] = [
  { text: "The Loom was a city of remembered light.", t: 3.2 },
  { text: "Every street a stitch. Every name a thread.", t: 3.3 },
  { text: "Then the first Weaver tried to bind every grief into one immortal cloth.", t: 3.8 },
  { text: "Reality frayed. The Hollow King was born from the snarl.", t: 3.4 },
  { text: "You are Nyx. You paint with causality.", t: 3.1 },
  { text: "Mend what you can. Remember who remains.", t: 3.2 },
];

export const DIALOGUES: Record<string, DialogueLine[]> = {
  hub_solace: [
    {
      speaker: "solace",
      text: "The gardens still smell like rain that never fell. I can show you the shy paths, if you trust a moth.",
      choices: [
        { text: "Stay close. I listen.", solace: 14, flag: "solace_listen" },
        { text: "Keep watch. I'll walk first.", solace: 4 },
      ],
    },
  ],
  hub_archivist: [
    {
      speaker: "archivist",
      text: "Memories are not kept. They are spent. Bring fragments, and I will sell you a better yesterday.",
      next: "shop",
    },
  ],
  silk_enter: [
    {
      speaker: "solace",
      text: "Paint a thread, Nyx. Straight lines pierce. Curves slash. Loops bind. The garden will answer.",
    },
    {
      speaker: "narrator",
      text: "A pale gulf waits ahead. Weave between the glowing anchors to stitch a bridge.",
    },
  ],
  rest1_solace: [
    {
      speaker: "solace",
      text: "You did not tear the flowers. Most Weavers do, when they are afraid. May I keep a little of that gentleness?",
      choices: [
        { text: "Keep it. It's yours.", solace: 16 },
        { text: "Gentleness is a luxury.", solace: -6 },
      ],
    },
  ],
  rest1_archivist: [
    { speaker: "archivist", text: "The Markets remember hunger. Buy a longer thread, or a stronger heart.", next: "shop" },
  ],
  markets_mid: [
    {
      speaker: "vesper",
      text: "Still painting pretty arcs? Cute. The King eats pretty. Try not to die before I decide you're useful.",
    },
    {
      speaker: "nyx",
      text: "…",
    },
    {
      speaker: "vesper",
      text: "Fine. I'll echo your last strike — if you stop looking at me like a hymn.",
    },
  ],
  rest2_vesper: [
    {
      speaker: "vesper",
      text: "I used to think the Loom owed me a perfect ending. Then I watched one. It was a cage with good lighting.",
      choices: [
        { text: "Then we write a messy one.", vesper: 16 },
        { text: "Perfection is the only mercy.", vesper: -8 },
      ],
    },
  ],
  rest2_solace: [
    {
      speaker: "solace",
      text: "Vesper's thread is all edges. I like her anyway. Is that allowed?",
      choices: [
        { text: "It's the point.", solace: 10, vesper: 6 },
        { text: "Stay wary.", solace: 2 },
      ],
    },
  ],
  spire_enter: [
    {
      speaker: "solace",
      text: "Nyx — something in me is coming unstitched. If I flicker, don't chase the dark. Call my name.",
      choices: [
        { text: "I will call. Always.", solace: 18, flag: "solace_promise" },
        { text: "Hold together. We finish this.", solace: 6 },
      ],
    },
  ],
  rest3_solace: [
    {
      speaker: "solace",
      text: "I saw the King in a dream of dust. He is lonely the way a library is lonely. Will you unmake him, or invite him back?",
      choices: [
        { text: "I will remember him, then let him go.", solace: 12 },
        { text: "I will cut the snarl out.", solace: -4, vesper: 6 },
      ],
    },
  ],
  rest3_vesper: [
    {
      speaker: "vesper",
      text: "If I freeze in there, don't waste a thread on me. Echo my last good hit and keep walking.",
      choices: [
        { text: "I don't leave Weavers in the dark.", vesper: 18 },
        { text: "Then don't freeze.", vesper: 4 },
      ],
    },
  ],
  rest3_archivist: [
    { speaker: "archivist", text: "Last market. After this, only endings are for sale.", next: "shop" },
  ],
  boss_enter: [
    {
      speaker: "king",
      text: "Little Weaver. You bring moths and rivals to a throne of unfinished names. Kneel, and I will keep you forever.",
    },
    {
      speaker: "nyx",
      text: "No.",
    },
    {
      speaker: "king",
      text: "Then fray.",
    },
  ],
  ending_high: [
    {
      speaker: "narrator",
      text: "You do not bind every grief. You leave room for weather. The Loom brightens, imperfect, alive.",
    },
    {
      speaker: "solace",
      text: "I can hear the gardens drinking again. Thank you for calling my name.",
    },
    {
      speaker: "vesper",
      text: "Messy ending. I hate that I like it. Don't vanish on me, Nyx.",
    },
  ],
  ending_low: [
    {
      speaker: "narrator",
      text: "You cut the snarl. Silence arrives like snow. The city sleeps without dreams.",
    },
    {
      speaker: "solace",
      text: "I am becoming dust that remembers being a moth. It is… quiet.",
    },
    {
      speaker: "vesper",
      text: "A clean cut. Congratulations. I hope the quiet is worth us.",
    },
  ],
};

export const PAUSE_LORE: Record<string, string> = {
  hub: "The Spindle turns even when no one is watching.",
  silk: "Silk Gardens keep rain that never chose a sky.",
  rest1: "Embers here are leftover birthdays.",
  markets: "Every stall sells a color someone lost.",
  rest2: "Lanterns fold themselves smaller at dusk.",
  spire: "The Spire is a spine the city outgrew.",
  rest3: "Last hearths do not promise warmth. They promise witness.",
  boss: "The Hollow Court has no walls — only appetite.",
  ending: "Endings are just threads that learned to rest.",
};

export const nextPlayable = (scene: SceneId): SceneId => {
  const order: SceneId[] = [
    "hub",
    "silk",
    "rest1",
    "markets",
    "rest2",
    "spire",
    "rest3",
    "boss",
    "ending",
  ];
  return order.includes(scene) ? scene : "hub";
};
