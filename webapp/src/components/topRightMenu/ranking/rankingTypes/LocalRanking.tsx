import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useUser } from "../../../../contexts/UserContext";
import type { RankingElementLocal } from "../rankingElements/RankingElementLocal";
import RankingTableLocal from "../RankingTableLocal";
import StatisticsPanel from "./StatisticsPanel";
import GameReplayWindow from "./GameReplayWindow";
import styles from './LocalRanking.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LOCAL_SUBTABS = [
  { id: 'historial',   label: 'Historial'   },
  { id: 'time',        label: 'Time'        },
  { id: 'wins',        label: 'Wins'        },
  { id: 'loses',       label: 'Loses'       },
  { id: 'statistics',  label: 'Statistics'  },
] as const;

type SubTabId = typeof LOCAL_SUBTABS[number]['id'];

const getDisplayData = (data: RankingElementLocal[], subTab: SubTabId): RankingElementLocal[] => {
  switch (subTab) {
    case 'historial':
      return data;
    case 'time':
      return [...data].sort((a, b) => b.time - a.time);
    case 'wins':
      return [...data].filter(m => m.result.toLowerCase().includes('win')).reverse();
    case 'loses':
      return [...data].filter(m => m.result.toLowerCase().includes('los')).reverse();
    default:
      return data;
  }
};

const getTitle = (subTab: SubTabId, username: string): string => {
  switch (subTab) {
    case 'historial':   return `Match History (${username})`;
    case 'time':        return `By Duration — Longest First (${username})`;
    case 'wins':        return `Wins — Most Recent First (${username})`;
    case 'loses':       return `Loses — Most Recent First (${username})`;
    case 'statistics':  return '';
  }
};

export const LocalRanking = () => {
  const [data, setData] = useState<RankingElementLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('historial');
  const [replayMatch, setReplayMatch] = useState<RankingElementLocal | null>(null);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    fetch(`${API_URL}/game/localRankings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.email ?? '' })
    })
      .then(res => res.json())
      .then(resData => {
        const mappedData: RankingElementLocal[] = resData.matches.map((match: any, index: number) => ({
          position: index + 1,
          player1Name: match.player1id === user?.email ? (user?.username ?? match.player1id) : match.player1id,
          player2Name: match.player2id === user?.email ? (user?.username ?? match.player2id) : match.player2id,
          result: match.result,
          time: match.time ?? 0,
          moves: match.moves ?? [],
          boardSize: match.board_status?.size ?? 8,
        }));
        setData(mappedData);
      })
      .catch(err => console.error("Error fetching local history:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={styles.loadingContainer}>Loading history...</div>;
  }

  if (!user) {
    return (
      <div className={styles.notLoggedContainer}>
        <p className={styles.notLoggedText}>(You are not logged yet)</p>
        <button onClick={() => navigate('/login')} className={styles.loginButton}>Login</button>
      </div>
    );
  }

  const displayed = getDisplayData(data, activeSubTab);

  return (
    <>
    {replayMatch && (
      <GameReplayWindow match={replayMatch} onClose={() => setReplayMatch(null)} />
    )}
    <div className={styles.localContainer}>
      <nav className={styles.subMenu}>
        {LOCAL_SUBTABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.subTabBtn} ${activeSubTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.subContent}>
        {activeSubTab === 'statistics' ? (
          <StatisticsPanel data={data} username={user.username} />
        ) : (
          <RankingTableLocal
            data={displayed}
            title={getTitle(activeSubTab, user.username)}
            onReplay={setReplayMatch}
          />
        )}
      </div>
    </div>
    </>
  );
};
