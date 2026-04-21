// gameModes/GameMode.ts
import React from "react";

export const Difficulty = {
  Easy:   ["Easy",   "easy"]   as const,
  Normal: ["Normal", "normal"] as const,
  Hard:   ["Hard",   "hard"]   as const,
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export interface GameMode {
  // Identidad / display
  id: string;
  label: string;
  description: string;
  mode: string;

  // Configuración del juego
  currentLevel: Difficulty;
  size: number;

  // Flags de UI (todos opcionales: cada modo activa los que necesite)
  showDifficulty?: boolean;
  showMatchId?: boolean;
  showPassword?: boolean;

  /** True en OnlinePrivateMode — muestra CREATE + JOIN (ambos botones). */
  showJoinCreate?: boolean;

  /** True en OnlineMode (público) — muestra solo JOIN, sin CREATE. */
  showOnlyJoin?: boolean;

  // Datos online (opcionales, solo los rellenan los modos online)
  matchId?: string;
  password?: string;

  // Arranque
  start(): React.ReactNode;
}
