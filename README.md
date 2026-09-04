# WEAVERFALL

A cinematic isometric-ish action-adventure set in **The Loom** — a living dream-city woven from memories. Reality is fraying. You are **Nyx**, a Weaver who paints combat and exploration with glowing causality threads.

Tone: Monument Valley × Hades × Hyper Light Drifter.

**Play live:** [https://amineux.github.io/weaverfall/](https://amineux.github.io/weaverfall/)

## How to play

The Loom is coming undone. Walk the chambers, collect Memory Fragments, speak with those who still remember you, and face the Hollow King. Your bonds with **Solace** and **Vesper** decide the ending.

1. Begin at **The Spindle**. Talk to Solace and the Archivist.
2. **Silk Gardens** — learn to weave, stitch a gulf, clear Fraylings.
3. **Thread Markets** — denser fights; Vesper arrives as a rival-turned-ally.
4. **Frayed Spire** — heavier enemies, a Solace crisis, a hidden fragment if she trusts you.
5. **Hollow Court** — a multi-phase duel with the Hollow King.
6. Epilogue branches on companion bonds (High Bond / Low Bond).

Rest nodes between chambers hold campfire dialogue and the Archivist’s Memory Market.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Move | `WASD` or arrows | Virtual stick |
| Weave (paint an attack) | Hold left mouse and drag, then release | Drag on the right side of the screen |
| Dash | `Shift` or `Space` | **DASH** button |
| Solace — Reveal | `R` / `E` / `Q` | ✦ button |
| Talk / enter portal | `F` or `Enter`, or a short tap while close | Short tap while close |
| Pause | `Esc` or `P` | — |
| Skip cinematic / advance line | `Space` or `Enter` | Skip / Continue |

### Weave patterns

- **Slash** — a curved painted arc. Wide, kinetic, the default cut.
- **Pierce** — a straight, committed line. Longer reach, harder hit.
- **Spiral Bind** — a loop. Stuns and holds what it catches.
- **Bridge** — paint from one glowing **anchor** to the other to stitch a gulf shut.

Dash leaves afterimage ribbons and a brief invulnerable flicker.

### Companions

- **Solace** (moth-spirit) — lore-whisperer. At bond **22+**, **Reveal** lights secrets, shy fragments, and enemy silhouettes.
- **Vesper** (rival Weaver) — joins in the Markets. At bond **28+**, **Echo Slash** duplicates your last weave.
- **The Archivist** — merchant of memories. Spends fragments on Heartstring, Swift Thread, Keen Weave, Long Loom.
- **Hollow King** — final boss. His presence warps the chrome toward void-violet across three phases.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/weaverfall/` (Vite `base` is `/weaverfall/` for GitHub Pages).

```bash
npm run build
npm run preview
```

## Tech

Pure client-side. Vite + TypeScript + Canvas 2D. Procedural Web Audio pads and SFX — no audio files. Save data lives in `localStorage`. Built for GitHub Pages via `.github/workflows/deploy.yml`.

## Settings

Pause or title → **Settings**: mute, screen shake, softer bloom. New Game / Continue on the title silk.
