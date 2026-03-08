// RankingElementTime.ts
import type { RankingElementGlobal } from "./RankingElementGlobal";

export class RankingElementTime implements RankingElementGlobal {
  position: number;
  player1Name: string;
  metric: string;
  // Fijamos el valor por defecto para esta clase
  metricName: string = 'TIME'; 

  constructor(position: number, player1Name: string, metric: string) {
    this.position = position;
    this.player1Name = player1Name;
    this.metric = metric;
  }
}