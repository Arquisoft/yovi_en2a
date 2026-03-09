import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createMatch,
  sendMove,
  requestBotMove,
  updateScore,
  saveMatch,
} from '../api/GameApi'; // ajusta la ruta

describe('GameApi functions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('GameApi createMatch calls fetch with correct data and returns JSON', async () => {
    const mockResponse = { match_id: 'abc123' };

    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse),
    } as any);

    const result = await createMatch('Alice', 'Bob', 5);

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player1: 'Alice',
        player2: 'Bob',
        size: 5,
      }),
    });

    expect(result).toEqual(mockResponse);
  });

  test('GameApi createMatch returns null if fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createMatch('Alice', 'Bob', 5);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('GameApi sendMove calls fetch with correct data and returns JSON', async () => {
    const mockResponse = { match_id: 'abc123', game_over: false };

    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse),
    } as any);

    const result = await sendMove('abc123', 1, 2, -3);

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/game/executeMove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        match_id: 'abc123',
        coord_x: 1,
        coord_y: 2,
        coord_z: -3,
      }),
    });

    expect(result).toEqual(mockResponse);
  });

  test('GameApi sendMove returns null if fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Move error'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendMove('abc123', 1, 2, -3);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('GameApi requestBotMove returns parsed JSON when response is ok', async () => {
    const mockResponse = {
      match_id: 'abc123',
      coordinates: { x: 1, y: 2, z: -3 },
      game_over: false,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
    } as any);

    const result = await requestBotMove('abc123');

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/game/reqBotMove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        match_id: 'abc123',
      }),
    });

    expect(result).toEqual(mockResponse);
  });

  test('GameApi requestBotMove returns null when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    } as any);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await requestBotMove('abc123');

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('GameApi requestBotMove returns null when server returns invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('not-json'),
    } as any);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await requestBotMove('abc123');

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('GameApi updateScore calls fetch with correct data and returns JSON', async () => {
    const mockResponse = { success: true };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
    } as any);

    const result = await updateScore('p1', 'Alice', true, 120);

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/game/updateScore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerid: 'p1',
        username: 'Alice',
        is_win: true,
        time: 120,
      }),
    });

    expect(result).toEqual(mockResponse);
  });

  test('GameApi updateScore returns null when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Bad Request'),
    } as any);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateScore('p1', 'Alice', true, 120);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('GameApi saveMatch calls fetch with correct data and returns JSON', async () => {
    const mockResponse = { saved: true };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockResponse)),
    } as any);

    const result = await saveMatch('m1', 'p1', 'p2', 'player1', 180);

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/game/saveMatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        match_id: 'm1',
        player1id: 'p1',
        player2id: 'p2',
        result: 'player1',
        time: 180,
      }),
    });

    expect(result).toEqual(mockResponse);
  });

  test('GameApi saveMatch returns null when fetch fails or response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Server error'),
    } as any);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await saveMatch('m1', 'p1', 'p2', 'player1', 180);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});