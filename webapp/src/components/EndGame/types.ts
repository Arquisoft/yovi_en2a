export type GameOutcome = "WIN" | "LOSE" | "DRAW";

export type GameResult = {
  outcome: GameOutcome;
  winner?: "HUMAN" | "BOT";
  durationMs?: number;
  moves?: number;
  difficulty?: "EASY" | "NORMAL" | "HARD";
};
