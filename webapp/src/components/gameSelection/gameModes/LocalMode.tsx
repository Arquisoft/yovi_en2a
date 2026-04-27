// NormalMode.ts
import React from "react";
import type { GameMode } from "./GameMode";
import { Difficulty } from "./GameMode";
import p1vsp2 from "../../../assets/p1vsp2.webp";

export class LocalMode implements GameMode {
  showDifficulty = false;

  showVariant = true;

  mode = "multi";

  id = "local";

  label = "Local Mode";

  image = p1vsp2;

  currentLevel = Difficulty.Normal;

  size = 8;

  description = "Normal mode that follows the classical rules of the gamey game. Play locally against a friend and try to connect the three sizes to win.";

  start(): React.ReactNode {
    return (
      <div className="game-container">
        <h2>{this.label}</h2>
        <p>Difficulty: {this.currentLevel}</p>
        <p>Game is starting...</p>
      </div>
    );
  }
}
