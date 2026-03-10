const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Response: match_id:string
export function createMatch(player1: string, player2: string, size: number) {
  return fetch(`${API_URL}/game/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player1,
      player2,
      size,
    }),
  }).then((res) => res.json())
    .catch((err) => {
      console.error("Error create match:", err);
      return null;
  });
}

// Response: match_id:string game_over:boolean
export function sendMove(matchId: string, x: number, y: number, z: number) {
  return fetch(`${API_URL}/game/executeMove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      coord_x: x,
      coord_y: y,
      coord_z: z,
    }),
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error("Error sending move:", err);
      return null;
    });
}

// response: match_id:string, coordinates, game_over:boolean
export function requestBotMove(matchId: string) {
  return fetch(`${API_URL}/game/reqBotMove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
    }),
  })
    .then(async (res) => {
      // 1. Clonamos la respuesta por si falla al parsear el JSON
      const text = await res.text(); 
      
      // 2. Comprobamos si el servidor dio un error (404, 500, etc.)
      if (!res.ok) {
        throw new Error(`El servidor devolvió status ${res.status}: ${text}`);
      }
      
      // 3. Si todo va bien, intentamos convertir ese texto a JSON
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`El servidor devolvió texto en vez de JSON: ${text}`);
      }
    })
    .catch((err) => {
      console.error("[GameApi] requestBotMove error:", err.message);
      return null;
    });
  }

    export function updateScore(playerid: string, username: string, is_win: boolean, time: number) {
  return fetch(`${API_URL}/game/updateScore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playerid,
      username,
      is_win,
      time,
    }),
  })
    .then(async (res) => {
      const text = await res.text(); 
      if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
      return JSON.parse(text);
    })
    .catch((err) => {
      console.error("Error actualizando score:", err.message);
      return null;
    });
}

export function saveMatch(matchId: string, player1id: string, player2id: string, result: string, time: number) {
  return fetch(`${API_URL}/game/saveMatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      player1id,
      player2id,
      result,
      time,
    }),
  })
    .then(async (res) => {
      const text = await res.text(); 
      if (!res.ok) throw new Error(`Status ${res.status}: ${text}`);
      return JSON.parse(text);
    })
    .catch((err) => {
      console.error("Error guardando partida:", err.message);
      return null;
    });
}