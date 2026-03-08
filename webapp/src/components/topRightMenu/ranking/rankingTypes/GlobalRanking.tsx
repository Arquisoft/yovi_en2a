import { useEffect, useState } from "react";
import type { RankingElementGlobal } from "../rankingElements/RankingElementGlobal";
// 1. AÑADIDO: Importamos tu nueva clase RankingElementTime
import { RankingElementTime } from "../rankingElements/RankingElementTime"; 
import RankingTable from "../RankingTableGlobal";
import type { RankingTypeGlobal } from "./RankingTypeGlobal";

// Creamos un Componente Funcional de React para manejar el fetch
const GlobalRankingFetcher = () => {
  const [data, setData] = useState<RankingElementGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hacemos GET a nuestro API Gateway (puerto 3000)
    fetch('http://localhost:3000/game/bestTimes')
      .then(res => res.json())
      .then(resData => {
        // Mapeamos el Score de Rust (data.rs) al formato RankingElementGlobal
        const mappedData: RankingElementGlobal[] = resData.rankings.map((score: any, index: number) => {
          
          // Formateamos los segundos a MM:SS
          const m = Math.floor(score.best_time / 60).toString().padStart(2, '0');
          const s = (score.best_time % 60).toString().padStart(2, '0');

          // 2. AÑADIDO: Instanciamos tu clase pasando los 3 parámetros de su constructor
          // (position, player1Name, metric)
          return new RankingElementTime(
            index + 1,
            score.username || score.playerid,
            `${m}:${s}`
          );
        });
        setData(mappedData);
      })
      .catch(err => console.error("Error fetching global rankings:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Cargando Leaderboard...</div>;

  return <RankingTable data={data} title="World Leaderboard (Top 20)" />;
};

export class GlobalRanking implements RankingTypeGlobal {
  id = 'global';
  label = 'Global';
  elements: RankingElementGlobal[] = [];

  render() {
    return <GlobalRankingFetcher />;
  }
}