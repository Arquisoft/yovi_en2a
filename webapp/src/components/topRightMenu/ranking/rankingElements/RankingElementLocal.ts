export interface RankingElementLocal {
    position: number;
    player1Name: string;
    player2Name: string;
    result: string;
    time: number; // seconds (f32 from backend)
    moves?: { x: number; y: number; z: number }[];
    boardSize?: number;
}
