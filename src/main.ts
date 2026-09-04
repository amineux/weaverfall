import "./style.css";
import { Game } from "./game/game";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("WEAVERFALL: missing #game canvas");
}

new Game(canvas);
