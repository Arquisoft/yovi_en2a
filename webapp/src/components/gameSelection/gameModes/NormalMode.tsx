// NormalMode.ts
import React from "react";
import type { GameMode } from "./GameMode";
import { Difficulty } from "./GameMode";

export class NormalMode implements GameMode {
  id = "normal";

  label = "Normal Mode";

  currentLevel = Difficulty.Normal;

  description = "Balanced difficulty recommended for most players.";

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
