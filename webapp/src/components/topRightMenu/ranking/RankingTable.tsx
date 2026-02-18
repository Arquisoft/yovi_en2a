import './RankingTable.css';
import './RankingElement.css';
import type { RankingElement } from "./RankingElement";

const RankingTable: React.FC<{ data: RankingElement[], title: string }> = ({ data, title }) => {
  return (
    /* The ranking-container must have a fixed or relative height to allow internal scrolling */
    <div className="ranking-container">
      <h3 className="ranking-subtitle">{title}</h3>
      
      {/* Fixed Header: This won't move when scrolling */}
      <div className="ranking-header-row">
        <span>POS</span>
        <span>PLAYER</span>
        <span>TIME</span>
      </div>

      {/* Scrollable List: Only this section will scroll */}
      <div className="ranking-list">
        {data.map((item) => (
          <div key={item.position} className={`ranking-item pos-${item.position}`}>
            <span className="rank-pos">#{item.position}</span>
            <span className="rank-name">{item.playerName}</span>
            <span className="rank-time">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingTable;