import type { RankingElement } from "../RankingElement";
import RankingTable from "../RankingTable";
import type { RankingType } from "./RankingType";

export class GlobalRanking implements RankingType {
  id = 'global';
  label = 'Global';
  // Mock data representing server-side records
  elements: RankingElement[] = [
    { position: 1, player1Name: 'SpeedRunner99', player2Name: 'SpeedRunner99', time: '00:58:12' },
    { position: 2, player1Name: 'ProGamer_X', player2Name: 'SpeedRunner99', time: '01:02:44' },
    { position: 3, player1Name: 'Shadow_Ninja', player2Name: 'SpeedRunner99', time: '01:05:00' },
    { position: 4, player1Name: 'Elite_Player', player2Name: 'SpeedRunner99', time: '01:10:22' },
  ];

  render() {
    return <RankingTable data={this.elements} title="World Leaderboard" />;
  }
}