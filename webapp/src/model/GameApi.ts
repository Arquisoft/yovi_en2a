export type NewMatchRequest = {
  size: number;
};

export type NewMatchResponse = {
  match_id: string;
};

export type MoveRequest = {
  match_id: string;
  coord_x: number;
  coord_y: number;
  coord_z: number;
};

export type MoveResponse = {
  match_id: string;
  game_over: boolean;
};

export type BotMoveResponse = {
  match_id: string;
  coord_x: number;
  coord_y: number;
  coord_z: number;
  game_over: boolean;
};

const API_URL = "http://localhost:3000/game";

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return await response.json();
}

export async function createMatch(size: number): Promise<NewMatchResponse> {
  return request<NewMatchResponse>(`${API_URL}/matches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ size }),
  });
}

export async function sendMove(data: MoveRequest): Promise<MoveResponse> {
  return request<MoveResponse>(`${API_URL}/moves`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function requestBotMove(data: { match_id: string }): Promise<BotMoveResponse> {
  return request<BotMoveResponse>(`${API_URL}/bot-move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}