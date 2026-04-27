// src/__tests__/GameModeContainer.test.tsx
//
// Tests for the lobby card. Covers:
//   - Local-play "PLAY" button → navigates with right URL.
//   - Public matchmaking "JOIN" button → joinOnlineMatch happy path.
//   - Public matchmaking auto-create fallback when no match available.
//   - Private "CREATE" / "JOIN" with match id + password.
//   - Difficulty + size selectors (increase / decrease, edge bounds).
//   - Error rendering when API fails.
//   - Guest vs logged-in user state forwarded to navigate.

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { GameMode } from '../components/gameSelection/gameModes/GameMode';
import { Difficulty } from '../components/gameSelection/gameModes/GameMode';

// ── Router ────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn(() => ({ state: { guest: true } }));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

// ── User context ──────────────────────────────────────────────────────────

const mockUseUser = vi.fn().mockReturnValue({ user: null });

vi.mock('../contexts/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

// ── online module ─────────────────────────────────────────────────────────

const mockCreateOnlineMatch = vi.fn();
const mockJoinOnlineMatch = vi.fn();
const mockIsNoMatchesAvailable = vi.fn();

vi.mock('../components/online/online', () => ({
  createOnlineMatch: (...a: unknown[]) => mockCreateOnlineMatch(...a),
  joinOnlineMatch: (...a: unknown[]) => mockJoinOnlineMatch(...a),
  isNoMatchesAvailable: (...a: unknown[]) => mockIsNoMatchesAvailable(...a),
}));

// ── playerId ──────────────────────────────────────────────────────────────

vi.mock('../components/online/playerId', () => ({
  getPlayerId: () => 'mock-player-id',
}));

// ── Asset import (won't actually load in jsdom) ───────────────────────────

vi.mock('../assets/background_image_gameY.png', () => ({ default: 'mock-bg' }));

// Now import the component (after mocks are set).
import { GameModeContainer } from '../components/gameSelection/gameModes/GameModeContainer';

// ── Mode factories ────────────────────────────────────────────────────────
//
// Build minimal GameMode instances that match the four real modes used in
// the app (LocalMode, NormalMode, OnlineMode, OnlinePrivateMode).

function makeLocalMode(): GameMode {
  return {
    id: 'local',
    label: 'Local Mode',
    description: 'Play locally.',
    mode: 'multi',
    currentLevel: Difficulty.Normal,
    size: 8,
    showDifficulty: false,
    start: () => null,
  };
}

function makeNormalMode(): GameMode {
  return {
    id: 'normal',
    label: 'Normal Mode',
    description: 'Play vs bot.',
    mode: 'bot',
    currentLevel: Difficulty.Normal,
    size: 8,
    showDifficulty: true,
    start: () => null,
  };
}

function makeOnlineMode(): GameMode {
  return {
    id: 'online',
    label: 'Online Mode',
    description: 'Play online.',
    mode: 'multi',
    currentLevel: Difficulty.Normal,
    size: 8,
    showOnlyJoin: true,
    start: () => null,
  };
}

function makeOnlinePrivateMode(): GameMode {
  return {
    id: 'online_private',
    label: 'Private Party Mode',
    description: 'Private rooms.',
    mode: 'multi',
    currentLevel: Difficulty.Normal,
    size: 8,
    showMatchId: true,
    showPassword: true,
    showJoinCreate: true,
    matchId: '',
    password: '',
    start: () => null,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUseLocation.mockReturnValue({ state: { guest: true } });
  mockUseUser.mockReturnValue({ user: null });
});

// ── Rendering ─────────────────────────────────────────────────────────────

describe('GameModeContainer — rendering', () => {
  test('shows the mode label and description tooltip', () => {
    render(<GameModeContainer mode={makeLocalMode()} />);
    expect(screen.getByText('Local Mode')).toBeInTheDocument();
    expect(screen.getByText('Play locally.')).toBeInTheDocument();
  });

  test('shows the difficulty selector when showDifficulty is true', () => {
    render(<GameModeContainer mode={makeNormalMode()} />);
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  test('does not show difficulty selector when showDifficulty is false', () => {
    render(<GameModeContainer mode={makeLocalMode()} />);
    expect(screen.queryByText('Difficulty')).not.toBeInTheDocument();
  });

  test('always shows the size selector', () => {
    render(<GameModeContainer mode={makeLocalMode()} />);
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  test('renders match id and password inputs for private mode', () => {
    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    expect(screen.getByPlaceholderText('ID...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('****')).toBeInTheDocument();
  });

  test('shows PLAY button for local modes', () => {
    render(<GameModeContainer mode={makeLocalMode()} />);
    expect(screen.getByText('PLAY')).toBeInTheDocument();
  });

  test('shows JOIN button only for public matchmaking', () => {
    render(<GameModeContainer mode={makeOnlineMode()} />);
    expect(screen.getByText('JOIN')).toBeInTheDocument();
    expect(screen.queryByText('CREATE')).not.toBeInTheDocument();
  });

  test('shows CREATE and JOIN buttons for private mode', () => {
    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('JOIN')).toBeInTheDocument();
  });
});

// ── Difficulty selector ───────────────────────────────────────────────────

describe('GameModeContainer — difficulty selector', () => {
  test('right arrow advances difficulty', () => {
    const { container } = render(<GameModeContainer mode={makeNormalMode()} />);
    const arrows = Array.from(container.querySelectorAll('button')).filter(
        (el) => el.textContent === '→'
    );
    fireEvent.click(arrows[0]);
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  test('left arrow goes back to easier difficulty', () => {
    const { container } = render(<GameModeContainer mode={makeNormalMode()} />);
    const leftArrows = Array.from(container.querySelectorAll('button')).filter(
        (el) => el.textContent === '←'
    );
    fireEvent.click(leftArrows[0]);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });
});

// ── Size selector ─────────────────────────────────────────────────────────

describe('GameModeContainer — size selector', () => {
  test('right arrow increases size', () => {
    const { container } = render(<GameModeContainer mode={makeLocalMode()} />);
    const arrows = Array.from(container.querySelectorAll('button')).filter(
        (el) => el.textContent === '→'
    );
    fireEvent.click(arrows[0]);
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  test('left arrow decreases size', () => {
    const { container } = render(<GameModeContainer mode={makeLocalMode()} />);
    const arrows = Array.from(container.querySelectorAll('button')).filter(
        (el) => el.textContent === '←'
    );
    fireEvent.click(arrows[0]);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  test('size cannot go below the minimum (4)', () => {
    const mode = makeLocalMode();
    mode.size = 4;
    const { container } = render(<GameModeContainer mode={mode} />);

    // Use querySelectorAll: getAllByRole excludes visibility:hidden buttons,
    // and at the minimum the ← arrow is hidden but still in the DOM.
    const leftArrows = Array.from(
        container.querySelectorAll('button')
    ).filter((el) => el.textContent === '←');

    // If the arrow is hidden the click is a no-op, but Math.max in the
    // handler also clamps. Either way size stays at 4.
    if (leftArrows[0]) {
      for (let i = 0; i < 10; i++) fireEvent.click(leftArrows[0]);
    }
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('size cannot go above the maximum (12)', () => {
    const mode = makeLocalMode();
    mode.size = 12;
    const { container } = render(<GameModeContainer mode={mode} />);

    const rightArrows = Array.from(
        container.querySelectorAll('button')
    ).filter((el) => el.textContent === '→');

    if (rightArrows[0]) {
      for (let i = 0; i < 10; i++) fireEvent.click(rightArrows[0]);
    }
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});

// ── Local play ────────────────────────────────────────────────────────────

describe('GameModeContainer — local play', () => {
  test('PLAY navigates to /play/:size/multi for non-difficulty modes', () => {
    render(<GameModeContainer mode={makeLocalMode()} />);
    fireEvent.click(screen.getByText('PLAY'));
    expect(mockNavigate).toHaveBeenCalledWith(
        '/play/8/multi',
        expect.objectContaining({
          state: expect.objectContaining({ guest: true }),
        })
    );
  });

  test('PLAY navigates to /play/:size/:difficulty for difficulty modes', () => {
    render(<GameModeContainer mode={makeNormalMode()} />);
    fireEvent.click(screen.getByText('PLAY'));
    expect(mockNavigate).toHaveBeenCalledWith(
        '/play/8/greedy_bot',
        expect.objectContaining({
          state: expect.objectContaining({ guest: true }),
        })
    );
  });

  test('PLAY does not include guest:true when user is logged in', () => {
    mockUseLocation.mockReturnValue({ state: {guest: false} });
    mockUseUser.mockReturnValue({
      user: { username: 'Alice' },
    });

    render(<GameModeContainer mode={makeLocalMode()} />);
    fireEvent.click(screen.getByText('PLAY'));

    const callArgs = mockNavigate.mock.calls[0];
    expect(callArgs[1].state.guest).toBeUndefined();
  });
});

// ── Public matchmaking ────────────────────────────────────────────────────

describe('GameModeContainer — public matchmaking', () => {
  test('JOIN happy path navigates to /waiting/:matchId', async () => {
    mockJoinOnlineMatch.mockResolvedValue({
      match_id: 'm1',
      turn_number: 1,
    });

    render(<GameModeContainer mode={makeOnlineMode()} />);
    fireEvent.click(screen.getByText('JOIN'));

    await waitFor(() => {
      expect(mockJoinOnlineMatch).toHaveBeenCalledWith({
        player2id: 'mock-player-id',
        match_id: '',
        match_password: '',
      });
      expect(mockNavigate).toHaveBeenCalledWith(
          '/waiting/m1',
          expect.objectContaining({
            state: expect.objectContaining({
              role: 'join',
              turnNumber: 1,
            }),
          })
      );
    });
  });

  test('falls back to createMatch when no matches are available', async () => {
    const noMatchErr = new Error('no match available');
    mockJoinOnlineMatch.mockRejectedValue(noMatchErr);
    mockIsNoMatchesAvailable.mockReturnValue(true);
    mockCreateOnlineMatch.mockResolvedValue({
      match_id: 'created-m1',
      turn_number: 0,
    });

    render(<GameModeContainer mode={makeOnlineMode()} />);
    fireEvent.click(screen.getByText('JOIN'));

    await waitFor(() => {
      expect(mockCreateOnlineMatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
          '/waiting/created-m1',
          expect.objectContaining({
            state: expect.objectContaining({
              role: 'create',
            }),
          })
      );
    });
  });

  test('shows error when JOIN fails for non-no-match reason', async () => {
    mockJoinOnlineMatch.mockRejectedValue(new Error('Server exploded'));
    mockIsNoMatchesAvailable.mockReturnValue(false);

    render(<GameModeContainer mode={makeOnlineMode()} />);
    fireEvent.click(screen.getByText('JOIN'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server exploded');
    });
  });

  test('shows error when fallback createMatch also fails', async () => {
    mockJoinOnlineMatch.mockRejectedValue(new Error('no match'));
    mockIsNoMatchesAvailable.mockReturnValue(true);
    mockCreateOnlineMatch.mockRejectedValue(new Error('Could not create'));

    render(<GameModeContainer mode={makeOnlineMode()} />);
    fireEvent.click(screen.getByText('JOIN'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not create');
    });
  });
});

// ── Private rooms ─────────────────────────────────────────────────────────

describe('GameModeContainer — private rooms', () => {
  test('CREATE sends match id + password and navigates to /waiting', async () => {
    mockCreateOnlineMatch.mockResolvedValue({
      match_id: 'room-42',
      turn_number: 0,
    });

    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    fireEvent.change(screen.getByPlaceholderText('ID...'), {
      target: { value: 'room-42' },
    });
    fireEvent.change(screen.getByPlaceholderText('****'), {
      target: { value: 'hunter2' },
    });
    fireEvent.click(screen.getByText('CREATE'));

    await waitFor(() => {
      expect(mockCreateOnlineMatch).toHaveBeenCalledWith({
        player1id: 'mock-player-id',
        size: 8,
        match_id: 'room-42',
        match_password: 'hunter2',
      });
      expect(mockNavigate).toHaveBeenCalledWith(
          '/waiting/room-42',
          expect.objectContaining({
            state: expect.objectContaining({
              role: 'create',
              isPrivate: true,
              password: 'hunter2',
            }),
          })
      );
    });
  });

  test('JOIN sends match id + password and navigates', async () => {
    mockJoinOnlineMatch.mockResolvedValue({
      match_id: 'room-42',
      turn_number: 1,
    });

    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    fireEvent.change(screen.getByPlaceholderText('ID...'), {
      target: { value: 'room-42' },
    });
    fireEvent.change(screen.getByPlaceholderText('****'), {
      target: { value: 'hunter2' },
    });
    fireEvent.click(screen.getByText('JOIN'));

    await waitFor(() => {
      expect(mockJoinOnlineMatch).toHaveBeenCalledWith({
        player2id: 'mock-player-id',
        match_id: 'room-42',
        match_password: 'hunter2',
      });
      expect(mockNavigate).toHaveBeenCalledWith(
          '/waiting/room-42',
          expect.objectContaining({
            state: expect.objectContaining({
              role: 'join',
              isPrivate: true,
            }),
          })
      );
    });
  });

  test('CREATE shows error when API fails', async () => {
    mockCreateOnlineMatch.mockRejectedValue(new Error('Bad password'));

    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    fireEvent.click(screen.getByText('CREATE'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Bad password');
    });
  });

  test('shows generic error when rejected with empty message', async () => {
    mockCreateOnlineMatch.mockRejectedValue(new Error(''));

    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    fireEvent.click(screen.getByText('CREATE'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not create match');
    });
  });
});

// ── Busy state ────────────────────────────────────────────────────────────

describe('GameModeContainer — busy state', () => {
  test('disables buttons while a request is in flight', async () => {
    // Promise that never resolves so the busy state sticks.
    mockJoinOnlineMatch.mockReturnValue(new Promise(() => {}));

    render(<GameModeContainer mode={makeOnlinePrivateMode()} />);
    const joinBtn = screen.getByText('JOIN');
    const createBtn = screen.getByText('CREATE');

    fireEvent.click(joinBtn);

    await waitFor(() => {
      // Both buttons disabled while busy.
      expect(joinBtn).toBeDisabled();
      expect(createBtn).toBeDisabled();
    });
  });
});

// ── Variant selector (showVariant) ────────────────────────────────────────

function makeVariantMode(): GameMode {
  return {
    id: 'variant',
    label: 'Variant Mode',
    description: 'Choose a game variant.',
    mode: 'multi',
    currentLevel: Difficulty.Normal,
    size: 8,
    showVariant: true,
    start: () => null,
  };
}

describe('GameModeContainer — variant selector', () => {
  test('shows Game Variant selector when showVariant is true', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    expect(screen.getByText('Game Variant')).toBeInTheDocument();
  });

  test('variant selector defaults to Standard', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    const select = screen.getByRole('combobox');
    expect((select as HTMLSelectElement).value).toBe('standard');
  });

  test('selecting holey_y shows the Holes count row', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'holey_y' } });
    expect(screen.getByText('Holes')).toBeInTheDocument();
  });

  test('hole count decrements correctly', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'holey_y' } });
    // Default hole count = Math.max(1, floor(8/3)) = 2
    const arrows = Array.from(document.querySelectorAll('button')).filter(
      (el) => el.textContent === '→'
    );
    // Increase hole count first so we can decrement
    if (arrows.at(-1)) fireEvent.click(arrows.at(-1) as Element);
    const leftArrows = Array.from(document.querySelectorAll('button')).filter(
      (el) => el.textContent === '←'
    );
    if (leftArrows.at(-1)) fireEvent.click(leftArrows.at(-1) as Element);
    // Count should be back to initial
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('PLAY with standard variant navigates to /play/:size/multi with guest', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    fireEvent.click(screen.getByText('PLAY'));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/play/8/multi',
      expect.objectContaining({ state: expect.objectContaining({ guest: true }) })
    );
  });

  test('PLAY with why_not variant navigates to /play/:size/why_not', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'why_not' } });
    fireEvent.click(screen.getByText('PLAY'));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/play/8/why_not',
      expect.objectContaining({ state: expect.objectContaining({ guest: true }) })
    );
  });

  test('PLAY with holey_y navigates with holeCount in state', () => {
    render(<GameModeContainer mode={makeVariantMode()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'holey_y' } });
    fireEvent.click(screen.getByText('PLAY'));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/play/8/holey_y',
      expect.objectContaining({
        state: expect.objectContaining({ holeCount: expect.any(Number) }),
      })
    );
  });

  test('PLAY with standard variant and logged-in user navigates without state', () => {
    mockUseLocation.mockReturnValue({ state: { guest: false } });
    mockUseUser.mockReturnValue({ user: { username: 'Alice' } });

    render(<GameModeContainer mode={makeVariantMode()} />);
    fireEvent.click(screen.getByText('PLAY'));

    expect(mockNavigate).toHaveBeenCalledWith('/play/8/multi', undefined);
  });
});

// ── hideSize flag ─────────────────────────────────────────────────────────

describe('GameModeContainer — hideSize', () => {
  test('CREATE uses fixed size 8 when hideSize is true', async () => {
    mockCreateOnlineMatch.mockResolvedValue({ match_id: 'room-1', turn_number: 0 });

    const mode = makeOnlinePrivateMode();
    (mode as any).hideSize = true;
    (mode as any).size = 10; // Would be 10, but hideSize forces 8

    render(<GameModeContainer mode={mode} />);
    fireEvent.click(screen.getByText('CREATE'));

    await waitFor(() => {
      expect(mockCreateOnlineMatch).toHaveBeenCalledWith(
        expect.objectContaining({ size: 8 })
      );
    });
  });
});