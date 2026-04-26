// gameModes/GameMode.ts
import React from "react";

export const Difficulty = {
  Easy:   ["Easy",   "random_bot"]   as const,
  Normal: ["Normal", "greedy_bot"] as const,
  Hard:   ["Hard",   "minimax_bot"]   as const,
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export interface GameMode {
  id: string;
  label: string;
  description: string;
  mode: string;

  currentLevel: Difficulty;
  size: number;

  // UI flags — every mode enables only what it needs.
  showDifficulty?: boolean;
  showVariant?: boolean;
  showMatchId?: boolean;
  showPassword?: boolean;

  /** Show CREATE + JOIN buttons (private rooms). */
  showJoinCreate?: boolean;
  /** Show JOIN only (public matchmaking). */
  showOnlyJoin?: boolean;
  /** Hide the size selector entirely — size is fixed by the mode (public)
   *  or inherited from the creator (private JOIN). */
  hideSize?: boolean;

  matchId?: string;
  password?: string;

  start(): React.ReactNode;
}