// NormalMode.ts
import React from "react";
import type { GameMode } from "./GameMode";
import { Difficulty } from "./GameMode";

export class NormalMode implements GameMode {
  mode = "bot";

  id = "normal";

  label = "Normal Mode";

  size = 8;

  currentLevel = Difficulty.Normal;

  description = "Normal mode that follows the classical rules of the gamey game. Play against a bot and try to connect the three sizes to win.";

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
