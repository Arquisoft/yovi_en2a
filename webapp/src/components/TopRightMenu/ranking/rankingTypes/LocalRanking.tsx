import type { RankingElement } from "../RankingElement";
import RankingTable from "../RankingTable";
import type { RankingType } from "./RankingType";

export class LocalRanking implements RankingType {
  id = 'local';
  label = 'Local';
  // Mock data for local (offline/stored) records
  elements: RankingElement[] = [
    { position: 1, playerName: 'You (Best)', time: '01:24:05' },
    { position: 2, playerName: 'Guest_12', time: '01:30:12' },
    { position: 3, playerName: 'Player_2', time: '01:45:55' },
  ];

  render() {
    return <RankingTable data={this.elements} title="My Personal Records" />;
  }
}