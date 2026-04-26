import React from "react";
import type { GameMode } from "./GameMode";
import { Difficulty } from "./GameMode";

export class WhyNotMode implements GameMode {
  showDifficulty = false;

  showVariant = false;

  mode = "why_not";

  id = "why_not";

  label = "WhY not";

  currentLevel = Difficulty.Normal;

  size = 8;

  description = "Play with inverted rules: the first player to connect all three edges of the board LOSES.";

  start(): React.ReactNode {
    return (
      <div className="game-container">
        <h2>{this.label}</h2>
        <p>Game is starting...</p>
      </div>
    );
  }
}
