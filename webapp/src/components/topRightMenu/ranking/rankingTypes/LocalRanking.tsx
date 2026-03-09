import { useEffect, useState } from "react";
import {GetEmailFromCookie, GetUsernameFromCookie} from "../../../../utils/CookieRetriever";
import { useNavigate } from 'react-router-dom';
import type { RankingElementLocal } from "../rankingElements/RankingElementLocal";
import RankingTableLocal from "../RankingTableLocal";
import type { RankingTypeLocal } from "./RankingTypeLocal";
// Importamos el CSS Module
import styles from './LocalRanking.module.css';

const LocalRankingFetcher = () => {
  const [data, setData] = useState<RankingElementLocal[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3000/game/localRankings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: GetEmailFromCookie() }) 
    })
      .then(res => res.json())
      .then(resData => {
        const mappedData: RankingElementLocal[] = resData.matches.map((match: any, index: number) => ({
          position: index + 1,
          player1Name: match.player1id,
          player2Name: match.player2id,
          result: match.result 
        }));
        setData(mappedData);
      })
      .catch(err => console.error("Error fetching local history:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={styles.loadingContainer}>Cargando Historial...</div>;
  }

  if (GetUsernameFromCookie() === "User") {
    return (
      <div className={styles.notLoggedContainer}>
        <p className={styles.notLoggedText}>
          (You are not logged yet)
        </p>
        <button 
          onClick={() => navigate('/login')} 
          className={styles.loginButton}
        >
          Login
        </button>
      </div>
    );
  }

  return <RankingTableLocal data={data} title={`Personal Records (${GetUsernameFromCookie()})`} />;
};

export class LocalRanking implements RankingTypeLocal {
  id = 'local';
  label = 'Local';
  elements: RankingElementLocal[] = []; 

  render() {
    return <LocalRankingFetcher />;
  }
}