// OnlineMode.tsx
import React from "react";
import type { GameMode } from "./GameMode";
import { Difficulty } from "./GameMode";

export class OnlineMode implements GameMode {
  showDifficulty = false;
  showOnlyJoin = true;
  /** Public matchmaking is always 8×8 to keep the pool unified. */
  hideSize = true;

  mode = "multi";
  id = "online";
  label = "Online Mode";

  currentLevel = Difficulty.Normal;
  size = 8;

  description = "Normal mode that follows the classical rules of the gamey game. Play online against another players and try to connect the three sizes to win.";

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