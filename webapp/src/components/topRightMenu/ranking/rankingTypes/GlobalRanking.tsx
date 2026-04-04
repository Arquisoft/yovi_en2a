import { useEffect, useRef, useState } from "react";
import type { RankingElementGlobal } from "../rankingElements/RankingElementGlobal";
import type { RankingElementLocal } from "../rankingElements/RankingElementLocal";
import RankingTableGlobal from "../RankingTableGlobal";
import RankingTableLocal from "../RankingTableLocal";
import GameReplayWindow from "./GameReplayWindow";
import styles from './GlobalRanking.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GLOBAL_SUBTABS = [
    { id: 'time',  label: 'Time'  },
    { id: 'wins',  label: 'Wins'  },
    { id: 'loses', label: 'Loses' },
    { id: 'elo',   label: 'Elo'   },
] as const;

type SubTabId = typeof GLOBAL_SUBTABS[number]['id'];

interface RawScore {
    playerid: string;
    username: string;
    total_matches: number;
    wins: number;
    losses: number;
    win_rate: number;
    elo: number;
    best_time: number;
}

const mapToDisplayData = (scores: RawScore[], subTab: Exclude<SubTabId, 'time'>): RankingElementGlobal[] => {
    let sorted: RawScore[];
    switch (subTab) {
        case 'wins':  sorted = [...scores].sort((a, b) => b.wins    - a.wins);    break;
        case 'loses': sorted = [...scores].sort((a, b) => a.losses  - b.losses);  break;
        case 'elo':   sorted = [...scores].sort((a, b) => b.elo     - a.elo);     break;
    }

    let pos = 0;
    let lastVal: number | null = null;

    return sorted.map((score, index) => {
        const val = subTab === 'wins' ? score.wins : subTab === 'loses' ? score.losses : score.elo;
        if (index === 0 || val !== lastVal) { pos++; lastVal = val; }
        const name = score.username || score.playerid;
        switch (subTab) {
            case 'wins':  return { position: pos, player1Name: name, metric: String(score.wins),    metricName: 'WINS'  };
            case 'loses': return { position: pos, player1Name: name, metric: String(score.losses),  metricName: 'LOSES' };
            case 'elo':   return { position: pos, player1Name: name, metric: String(score.elo),     metricName: 'ELO'   };
        }
    });
};

const getTitle = (subTab: SubTabId): string => {
    switch (subTab) {
        case 'time':  return 'Fastest Games — World Top 20';
        case 'wins':  return 'Most Wins — World Top 20';
        case 'loses': return 'Fewest Losses — World Top 20';
        case 'elo':   return 'Elo Ranking — World Top 20';
    }
};

/** Fetch the fastest match played by a player and map it to RankingElementLocal. */
const fetchBestMatch = async (score: RawScore, position: number): Promise<RankingElementLocal | null> => {
    try {
        const res = await fetch(`${API_URL}/game/localRankings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: score.playerid }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const matches: any[] = data?.matches ?? [];
        if (!matches.length) return null;

        const best = matches.reduce((b: any, m: any) => !b || m.time < b.time ? m : b, null);
        if (!best) return null;

        const isP1 = best.player1id === score.playerid;
        return {
            position,
            player1Name: score.username || score.playerid,
            player2Name: isP1 ? best.player2id : best.player1id,
            result: isP1 ? best.result : (best.result === 'Win' ? 'Loss' : 'Win'),
            time: best.time,
            moves: best.moves ?? [],
            boardSize: best.board_status?.size ?? 8,
        };
    } catch {
        return null;
    }
};

export const GlobalRanking = () => {
    const [rawScores, setRawScores] = useState<RawScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('time');
    const [replayMatch, setReplayMatch] = useState<RankingElementLocal | null>(null);
    const [timeMatches, setTimeMatches] = useState<RankingElementLocal[]>([]);
    const [timeLoading, setTimeLoading] = useState(false);
    const timeFetched = useRef(false);

    useEffect(() => {
        fetch(`${API_URL}/game/bestTimes`)
            .then(res => res.json())
            .then(resData => setRawScores(resData.rankings ?? []))
            .catch(err => console.error("Error fetching global rankings:", err))
            .finally(() => setLoading(false));
    }, []);

    // Eagerly fetch all best matches when Time tab is active
    useEffect(() => {
        if (activeSubTab !== 'time' || !rawScores.length || timeFetched.current) return;

        timeFetched.current = true;
        setTimeLoading(true);

        const sorted = [...rawScores].sort((a, b) => a.best_time - b.best_time);
        let pos = 0;
        let lastVal: number | null = null;
        const withPositions = sorted.map((score, i) => {
            if (i === 0 || score.best_time !== lastVal) { pos++; lastVal = score.best_time; }
            return { score, position: pos };
        });

        Promise.all(withPositions.map(({ score, position }) => fetchBestMatch(score, position)))
            .then(results => setTimeMatches(results.filter((r): r is RankingElementLocal => r !== null)))
            .finally(() => setTimeLoading(false));
    }, [activeSubTab, rawScores]);

    if (loading) return <div className={styles.loadingContainer}>Loading leaderboard...</div>;

    return (
        <>
        {replayMatch && (
            <GameReplayWindow match={replayMatch} onClose={() => setReplayMatch(null)} />
        )}
        <div className={styles.globalContainer}>
            <nav className={styles.subMenu}>
                {GLOBAL_SUBTABS.map(tab => (
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
                {activeSubTab === 'time' ? (
                    timeLoading
                        ? <div className={styles.loadingContainer}>Loading fastest games...</div>
                        : <RankingTableLocal
                            data={timeMatches}
                            title={getTitle('time')}
                            onReplay={setReplayMatch}
                          />
                ) : (
                    <RankingTableGlobal
                        data={mapToDisplayData(rawScores, activeSubTab)}
                        title={getTitle(activeSubTab)}
                    />
                )}
            </div>
        </div>
        </>
    );
};
