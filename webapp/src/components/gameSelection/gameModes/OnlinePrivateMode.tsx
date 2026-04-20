import React from "react";
import { type GameMode, Difficulty } from "./GameMode";

export class OnlinePrivateMode implements GameMode {
    // Configuración de visibilidad
    showDifficulty = false;
    showMatchId = true;
    showPassword = true;
    /** Render two buttons (CREATE / JOIN) instead of a single PLAY. */
    showJoinCreate = true;

    mode = "multi";
    id = "online_private";
    label = "Private Party Mode";
    currentLevel = Difficulty.Normal;
    size = 8;

    // Valores por defecto
    matchId = "";
    password = "";

    description = "Normal mode that follows the classical rules. Play online against a friend by sharing a Match ID and optional Password.";

    start(): React.ReactNode {
        return (
            <div className="game-container">
                <h2>{this.label}</h2>
                <p>Connecting to: {this.matchId}</p>
            </div>
        );
    }
}
