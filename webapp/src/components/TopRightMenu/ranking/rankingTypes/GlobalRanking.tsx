import type { RankingElement } from "../RankingElement";
import RankingTable from "../RankingTable";
import type { RankingType } from "./RankingType";

export class GlobalRanking implements RankingType {
  id = 'global';
  label = 'Global';
  // Mock data representing server-side records
  elements: RankingElement[] = [
    { position: 1, playerName: 'SpeedRunner99', time: '00:58:12' },
    { position: 2, playerName: 'ProGamer_X', time: '01:02:44' },
    { position: 3, playerName: 'Shadow_Ninja', time: '01:05:00' },
    { position: 4, playerName: 'Elite_Player', time: '01:10:22' },
  ];

  render() {
    return <RankingTable data={this.elements} title="World Leaderboard" />;
  }
}