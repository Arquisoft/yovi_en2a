// Response: match_id:string
export function createMatch(player1: string, player2: string, size: number) {
  return fetch("http://localhost:3000/game/new", {
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
  return fetch("http://localhost:3000/game/executeMove", {
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
  return fetch("http://localhost:3000/game/reqBotMove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
    }),
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error("[GameApi] requestBotMove error:", err);
      return null;
    });
}