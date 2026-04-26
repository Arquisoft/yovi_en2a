// GameMode.ts
import React from "react";

export const Difficulty = {
  VeryEasy: ["Very Easy","random_bot"],
  Easy: ["Easy","greedy_bot"],
  Normal: ["Normal","minimax_bot"],
  Hard: ["Hard","minimax_bot"],
  VeryHard: ["Very Hard","minimax_bot"],
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export interface GameMode {
  id: string;
  label: string;
  currentLevel: Difficulty;
  description: string;
  size: number;
  mode: string;
  showDifficulty: boolean;
  showVariant: boolean;
  image?: string;
  start: () => React.ReactNode;
}

export const initialDifficulty: Difficulty = Difficulty.Normal;
