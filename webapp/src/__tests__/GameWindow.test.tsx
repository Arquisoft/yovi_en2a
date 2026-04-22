import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameWindow from '../components/gameWindow/GameWindow';
import * as GameApi from '../api/GameApi';

// Mock router
const mockNavigate = vi.fn();
const mockUseUser = vi.fn().mockReturnValue({ user: null, setUser: vi.fn() });

vi.mock('react-router-dom', () => ({
  useParams: () => ({ size: '3', mode: 'bot' }),
  useNavigate: () => mockNavigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// Mock timer
vi.mock('../components/gameWindow/rightPanel/Timer', () => ({
  useTimer: () => ({
    formattedTime: '02:30',
    resetTimer: vi.fn(),
  }),
}));

// Mock User Context
vi.mock('../contexts/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

// Mock Audio Context
vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    masterVolume: 80,
    isMuted: false,
    setMasterVolume: vi.fn(),
    toggleMute: vi.fn(),
    playMoveSound: vi.fn(),
    playGameOverSound: vi.fn(),
    playGameStartSound: vi.fn(),
    playGameVictorySound: vi.fn(),
  }),
}));

// Mock visual components
vi.mock('../components/topLeftHeader/TopLeftHeader', () => ({
  default: () => <div>TopLeftHeader</div>,
}));

vi.mock('../components/topRightMenu/TopRightMenu', () => ({
  default: () => <div>TopRightMenu</div>,
}));

vi.mock('../components/gameWindow/rightPanel/RightPanel', () => ({
  default: ({ time, mode, turn }: { time: string; mode: string; turn: number }) => (
    <div>
      <span>RightPanel</span>
      <span>{time}</span>
      <span>{mode}</span>
      <span>{turn}</span>
    </div>
  ),
}));

vi.mock('../components/gameWindow/board/Board', () => ({
  default: ({ onPlace }: { onPlace: (row: number, col: number) => void }) => (
    <button onClick={() => onPlace(0, 0)}>MockBoard</button>
  ),
}));

describe('GameWindow component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = '';
  });

  test('GameWindow renders basic components', async () => {
    vi.spyOn(GameApi, 'createMatch').mockResolvedValue({ match_id: 'match-123' });

    render(<GameWindow />);

    expect(screen.getByText('TopLeftHeader')).toBeTruthy();
    expect(screen.getByText('TopRightMenu')).toBeTruthy();
    expect(screen.getByText('MockBoard')).toBeTruthy();
    expect(screen.getByText('RightPanel')).toBeTruthy();

    await waitFor(() => {
      expect(GameApi.createMatch).toHaveBeenCalled();
    });
  });

  test('GameWindow calls createMatch on mount', async () => {
    const createMatchSpy = vi
      .spyOn(GameApi, 'createMatch')
      .mockResolvedValue({ match_id: 'match-123' });

    render(<GameWindow />);

    await waitFor(() => {
      expect(createMatchSpy).toHaveBeenCalledWith('Player 1', 'bot', 3, undefined);
    });
  });

  test('GameWindow sends move when board is clicked', async () => {
    vi.spyOn(GameApi, 'createMatch').mockResolvedValue({ match_id: 'match-123' });
    const sendMoveSpy = vi
      .spyOn(GameApi, 'sendMove')
      .mockResolvedValue({ game_over: false });

    vi.spyOn(GameApi, 'requestBotMove').mockResolvedValue({
      coordinates: { x: 2, y: 0, z: 0 },
      game_over: false,
    });

    render(<GameWindow />);

    await waitFor(() => {
      expect(GameApi.createMatch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('MockBoard'));

    await waitFor(() => {
      expect(sendMoveSpy).toHaveBeenCalled();
    });
  });

  test('GameWindow shows winner modal when player 1 wins', async () => {
    vi.spyOn(GameApi, 'createMatch').mockResolvedValue({ match_id: 'match-123' });
    vi.spyOn(GameApi, 'sendMove').mockResolvedValue({ game_over: true });

    render(<GameWindow />);

    await waitFor(() => {
      expect(GameApi.createMatch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('MockBoard'));

    await waitFor(() => {
      expect(screen.getByText('Game finished! Player 1 won.')).toBeTruthy();
    });

    expect(screen.getByText('Total time: 02:30')).toBeTruthy();
  });

  test('GameWindow navigates when clicking return button in modal', async () => {
    vi.spyOn(GameApi, 'createMatch').mockResolvedValue({ match_id: 'match-123' });
    vi.spyOn(GameApi, 'sendMove').mockResolvedValue({ game_over: true });

    render(<GameWindow />);

    await waitFor(() => {
      expect(GameApi.createMatch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('MockBoard'));

    await waitFor(() => {
      expect(screen.getByText('Return to game Selection')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Return to game Selection'));

    expect(mockNavigate).toHaveBeenCalledWith('/gameSelection');
  });

  test('GameWindow updates score and saves match when logged user wins', async () => {
    mockUseUser.mockReturnValue({
      user: { username: 'Marta', email: 'marta@test.com' },
      setUser: vi.fn(),
    });

    vi.spyOn(GameApi, 'createMatch').mockResolvedValue({ match_id: 'match-123' });
    vi.spyOn(GameApi, 'sendMove').mockResolvedValue({ game_over: true });

    const updateScoreSpy = vi.spyOn(GameApi, 'updateScore').mockResolvedValue({});
    const saveMatchSpy = vi.spyOn(GameApi, 'saveMatch').mockResolvedValue({});
    render(<GameWindow />);

    await waitFor(() => {
      expect(GameApi.createMatch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('MockBoard'));

    await waitFor(() => {
      expect(updateScoreSpy).toHaveBeenCalledWith(
        'marta@test.com',
        'Marta',
        true,
        150
      );
    });

    expect(saveMatchSpy).toHaveBeenCalledWith(
      'match-123',
      'marta@test.com',
      'bot',
      'Win',
      150,
      expect.any(Array)
    );
  });

  test('GameWindow toggles mobile panel on button click', async () => {
    vi.spyOn(GameApi, 'createMatch').mockResolvedValue({ match_id: 'match-123' });

    render(<GameWindow />);

    const toggleBtn = screen.getByRole('button', { name: '☰' });
    expect(toggleBtn).toBeTruthy();

    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: '✕' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.getByRole('button', { name: '☰' })).toBeTruthy();
  });
});
