// GameMode.ts
import React from "react";

export const Difficulty = {
  VeryEasy: "Very Easy",
  Easy: "Easy",
  Normal: "Normal",
  Hard: "Hard",
  VeryHard: "Very Hard",
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export interface GameMode {
  id: string;
  label: string;
  currentLevel: Difficulty;
  description: string;
  start: () => React.ReactNode;
}

export const initialDifficulty: Difficulty = Difficulty.Normal;
