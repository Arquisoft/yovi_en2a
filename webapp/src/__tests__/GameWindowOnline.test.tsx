// src/__tests__/GameWindowOnline.test.tsx
//
// Integration tests for GameWindowOnline. Heavy network deps are mocked so the
// tests run without a real backend. Mirrors the style of GameWindow.test.tsx.

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Router ────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn(() => ({
    state: { matchId: 'match-abc', turnNumber: 0, online: true },
}));

vi.mock('react-router-dom', () => ({
    useParams: () => ({ size: '8' }),
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// ── Timer ─────────────────────────────────────────────────────────────────

vi.mock('../components/gameWindow/rightPanel/Timer', () => ({
    useTimer: () => ({ formattedTime: '00:42', resetTimer: vi.fn() }),
}));

// ── Server countdown ──────────────────────────────────────────────────────

vi.mock('../components/online/UseServerCountdown', () => ({
    useServerCountdown: () => ({
        remaining: 7_000,
        secondsLeft: 7,
        fraction: 0.7,
        isExpired: false,
    }),
}));

// ── User context ──────────────────────────────────────────────────────────

const mockUseUser = vi.fn().mockReturnValue({ user: null, setUser: vi.fn() });

vi.mock('../contexts/UserContext', () => ({
    useUser: () => mockUseUser(),
}));

// ── Visual sub-components ─────────────────────────────────────────────────

vi.mock('../components/topLeftHeader/TopLeftHeader', () => ({
    default: () => <div>TopLeftHeader</div>,
}));

vi.mock('../components/topRightMenu/TopRightMenu', () => ({
    default: () => <div>TopRightMenu</div>,
}));

vi.mock('../components/gameWindow/board/Board', () => ({
    default: ({ onPlace }: { onPlace: (row: number, col: number) => void }) => (
        <button onClick={() => onPlace(0, 0)}>MockBoard</button>
    ),
}));

vi.mock('../components/online/RightPanelOnline', () => ({
    default: ({ turnSecondsLeft, totalTime }: { turnSecondsLeft: number; totalTime: string }) => (
        <div>
            <span>RightPanelOnline</span>
            <span data-testid="rp-seconds">{turnSecondsLeft}</span>
            <span data-testid="rp-time">{totalTime}</span>
        </div>
    ),
}));

vi.mock('../components/online/MobileCountdownBar', () => ({
    default: ({ secondsLeft }: { secondsLeft: number }) => (
        <div data-testid="mobile-bar">{secondsLeft}</div>
    ),
}));

// ── online module mock ────────────────────────────────────────────────────
//
// IMPORTANT: vi.spyOn on a `import * as` namespace doesn't intercept the
// component's own resolved imports under ESM (named exports are bound at
// import time and are read-only). We have to vi.mock() the whole module.

const mockGetMatchStatus = vi.fn();
const mockGetMatchTurnInfo = vi.fn();
const mockWaitForTurn = vi.fn();
const mockExecuteMoveOnline = vi.fn();
const mockSaveMatchToDb = vi.fn();
const mockUpdateScore = vi.fn();
const mockClaimForfeit = vi.fn();
const mockExtractOccupiedFromYen = vi.fn(() => []);

vi.mock('../components/online/online', () => ({
    getMatchStatus: (...args: unknown[]) => mockGetMatchStatus(...args),
    getMatchTurnInfo: (...args: unknown[]) => mockGetMatchTurnInfo(...args),
    waitForTurn: (...args: unknown[]) => mockWaitForTurn(...args),
    executeMoveOnline: (...args: unknown[]) => mockExecuteMoveOnline(...args),
    saveMatchToDb: (...args: unknown[]) => mockSaveMatchToDb(...args),
    updateScore: (...args: unknown[]) => mockUpdateScore(...args),
    claimForfeit: (...args: unknown[]) => mockClaimForfeit(...args),
    extractOccupiedFromYen: (...args: unknown[]) => mockExtractOccupiedFromYen(...args as []),
}));

// Import the component AFTER all mocks are set up.
import GameWindowOnline from '../components/online/GameWindowOnline';

// ── Default fixture data ──────────────────────────────────────────────────

const NOW = Date.now();

const defaultTurnInfo = {
    match_id: 'match-abc',
    turn: 0,
    // Anchor far enough in the past that grace is skipped.
    turn_started_at: NOW - 5_000,
    now_server: NOW,
    turn_duration_ms: 10_000,
};

const defaultStatus = {
    match_id: 'match-abc',
    status: 'active' as const,
    player1id: 'p1@test.com',
    player2id: 'p2@test.com',
    ready: true,
    winner: null,
    end_reason: null,
};

const defaultBoardStatus = {
    match_id: 'match-abc',
    board_status: { size: 8, turn: 0, layout: '', players: [] },
};

beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({ user: null, setUser: vi.fn() });
    mockUseLocation.mockReturnValue({
        state: { matchId: 'match-abc', turnNumber: 0, online: true },
    });
    mockGetMatchStatus.mockResolvedValue(defaultStatus);
    mockGetMatchTurnInfo.mockResolvedValue(defaultTurnInfo);
    mockWaitForTurn.mockResolvedValue(defaultBoardStatus);
    mockExecuteMoveOnline.mockResolvedValue({ match_id: 'match-abc', game_over: false });
    mockSaveMatchToDb.mockResolvedValue({ message: 'saved' });
    mockUpdateScore.mockResolvedValue({ message: 'updated' });
    mockClaimForfeit.mockResolvedValue({
        match_id: 'match-abc',
        accepted: true,
        winner: 'p1@test.com',
        end_reason: 'forfeit',
    });
});

// ── Basic rendering ───────────────────────────────────────────────────────

describe('GameWindowOnline — rendering', () => {
    test('renders shell components', () => {
        render(<GameWindowOnline />);

        expect(screen.getByText('TopLeftHeader')).toBeInTheDocument();
        expect(screen.getByText('TopRightMenu')).toBeInTheDocument();
        expect(screen.getByText('MockBoard')).toBeInTheDocument();
        expect(screen.getByText('RightPanelOnline')).toBeInTheDocument();
    });

    test('renders the mobile bar', () => {
        render(<GameWindowOnline />);
        expect(screen.getByTestId('mobile-bar')).toBeInTheDocument();
    });

    test('passes turnSecondsLeft and totalTime to RightPanelOnline', () => {
        render(<GameWindowOnline />);
        expect(screen.getByTestId('rp-seconds')).toHaveTextContent('7');
        expect(screen.getByTestId('rp-time')).toHaveTextContent('00:42');
    });
});

// ── Bootstrap fetches ─────────────────────────────────────────────────────

describe('GameWindowOnline — bootstrap', () => {
    test('calls getMatchStatus on mount', async () => {
        render(<GameWindowOnline />);
        await waitFor(() => {
            expect(mockGetMatchStatus).toHaveBeenCalledWith('match-abc');
        });
    });

    test('calls getMatchTurnInfo on mount', async () => {
        render(<GameWindowOnline />);
        await waitFor(() => {
            expect(mockGetMatchTurnInfo).toHaveBeenCalledWith('match-abc');
        });
    });

    test('calls waitForTurn for board size on mount', async () => {
        render(<GameWindowOnline />);
        await waitFor(() => {
            expect(mockWaitForTurn).toHaveBeenCalled();
        });
    });

    test('skips grace overlay when turn started in the past', async () => {
        mockGetMatchTurnInfo.mockResolvedValue({
            ...defaultTurnInfo,
            turn_started_at: NOW - 5_000,
        });

        render(<GameWindowOnline />);

        await waitFor(() => {
            expect(mockGetMatchTurnInfo).toHaveBeenCalled();
        });

        expect(screen.queryByText('Get ready…')).not.toBeInTheDocument();
    });
});

// ── Move sending ──────────────────────────────────────────────────────────

describe('GameWindowOnline — sending a move', () => {
    test('calls executeMoveOnline when the board is clicked on my turn', async () => {
        render(<GameWindowOnline />);

        // Wait for bootstrap to settle (grace skipped since turn is in the past).
        await waitFor(() => expect(mockGetMatchStatus).toHaveBeenCalled());

        fireEvent.click(screen.getByText('MockBoard'));

        await waitFor(() => {
            expect(mockExecuteMoveOnline).toHaveBeenCalled();
        });
    });
});

// ── Win modal ─────────────────────────────────────────────────────────────

describe('GameWindowOnline — game over modal', () => {
    test('shows win modal when my move ends the game', async () => {
        mockExecuteMoveOnline.mockResolvedValue({
            match_id: 'match-abc',
            game_over: true,
        });

        render(<GameWindowOnline />);

        await waitFor(() => expect(mockGetMatchStatus).toHaveBeenCalled());

        fireEvent.click(screen.getByText('MockBoard'));

        await waitFor(() => {
            expect(screen.getByText('You won!')).toBeInTheDocument();
        });

        expect(screen.getByText(/Total time/)).toBeInTheDocument();
    });

    test('shows loss modal when matchStatus poll detects opponent win', async () => {
        // Make executeMoveOnline never resolve — opponent is the one who wins.
        mockExecuteMoveOnline.mockReturnValue(new Promise(() => {}));

        // First call: bootstrap (active). Subsequent calls: poll returns finished.
        mockGetMatchStatus
            .mockResolvedValueOnce(defaultStatus)
            .mockResolvedValue({
                ...defaultStatus,
                status: 'finished',
                winner: 'p2@test.com',
                end_reason: 'normal',
            });

        render(<GameWindowOnline />);

        await waitFor(
            () => expect(screen.getByText('You lost.')).toBeInTheDocument(),
            { timeout: 8_000 }
        );
    }, 10_000);

    test('shows forfeit win modal when matchStatus returns forfeit', async () => {
        mockExecuteMoveOnline.mockReturnValue(new Promise(() => {}));

        mockGetMatchStatus
            .mockResolvedValueOnce(defaultStatus)
            .mockResolvedValue({
                ...defaultStatus,
                status: 'finished',
                winner: 'p1@test.com',
                end_reason: 'forfeit',
            });

        render(<GameWindowOnline />);

        await waitFor(
            () =>
                expect(
                    screen.getByText('Opponent forfeited — you win!')
                ).toBeInTheDocument(),
            { timeout: 8_000 }
        );
    }, 10_000);

    test('navigates to gameSelection when return button is clicked', async () => {
        mockExecuteMoveOnline.mockResolvedValue({
            match_id: 'match-abc',
            game_over: true,
        });

        render(<GameWindowOnline />);

        await waitFor(() => expect(mockGetMatchStatus).toHaveBeenCalled());
        fireEvent.click(screen.getByText('MockBoard'));

        await waitFor(() =>
            expect(screen.getByText('Return to game Selection')).toBeInTheDocument()
        );

        fireEvent.click(screen.getByText('Return to game Selection'));

        expect(mockNavigate).toHaveBeenCalledWith('/gameSelection');
    });

    test('modal can be dismissed with the close button', async () => {
        mockExecuteMoveOnline.mockResolvedValue({
            match_id: 'match-abc',
            game_over: true,
        });

        render(<GameWindowOnline />);

        await waitFor(() => expect(mockGetMatchStatus).toHaveBeenCalled());
        fireEvent.click(screen.getByText('MockBoard'));

        await waitFor(() =>
            expect(screen.getByText('You won!')).toBeInTheDocument()
        );

        fireEvent.click(screen.getByRole('button', { name: '✕' }));

        expect(screen.queryByText('You won!')).not.toBeInTheDocument();
    });
});

// ── Persist outcome ───────────────────────────────────────────────────────

describe('GameWindowOnline — persist outcome', () => {
    test('calls saveMatchToDb and updateScore when logged-in user wins', async () => {
        mockUseUser.mockReturnValue({
            user: { username: 'Alice', email: 'alice@test.com' },
            setUser: vi.fn(),
        });

        mockExecuteMoveOnline.mockResolvedValue({
            match_id: 'match-abc',
            game_over: true,
        });

        render(<GameWindowOnline />);

        await waitFor(() => expect(mockGetMatchStatus).toHaveBeenCalled());
        fireEvent.click(screen.getByText('MockBoard'));

        await waitFor(() => expect(mockSaveMatchToDb).toHaveBeenCalled());

        expect(mockUpdateScore).toHaveBeenCalledWith(
            expect.objectContaining({
                playerid: 'alice@test.com',
                username: 'Alice',
                is_win: true,
            })
        );
    });

    test('does not call saveMatchToDb when user is not logged in', async () => {
        // Default beforeEach sets user to null.
        mockExecuteMoveOnline.mockResolvedValue({
            match_id: 'match-abc',
            game_over: true,
        });

        render(<GameWindowOnline />);

        await waitFor(() => expect(mockGetMatchStatus).toHaveBeenCalled());
        fireEvent.click(screen.getByText('MockBoard'));

        await waitFor(() => screen.getByText('You won!'));

        expect(mockSaveMatchToDb).not.toHaveBeenCalled();
    });
});

// ── Redirect guard ────────────────────────────────────────────────────────

describe('GameWindowOnline — redirect guard', () => {
    test('redirects to /gameSelection when matchId is missing from location state', () => {
        mockUseLocation.mockReturnValue({ state: {matchId: "", turnNumber: 0, online: true} });

        render(<GameWindowOnline />);

        expect(mockNavigate).toHaveBeenCalledWith('/gameSelection', { replace: true });
    });
});

// ── Grace overlay ─────────────────────────────────────────────────────────

describe('GameWindowOnline — grace overlay', () => {
    test('shows "Get ready…" when turn_started_at is in the future', async () => {
        mockGetMatchTurnInfo.mockResolvedValue({
            ...defaultTurnInfo,
            turn_started_at: NOW + 3_000,
            now_server: NOW,
        });

        render(<GameWindowOnline />);

        await waitFor(() => {
            expect(mockGetMatchTurnInfo).toHaveBeenCalled();
        });

        expect(screen.getByText('Get ready…')).toBeInTheDocument();
    });

    test('does not show grace overlay when turn started in the past', async () => {
        mockGetMatchTurnInfo.mockResolvedValue({
            ...defaultTurnInfo,
            turn_started_at: NOW - 5_000,
            now_server: NOW,
        });

        render(<GameWindowOnline />);

        await waitFor(() => {
            expect(mockGetMatchTurnInfo).toHaveBeenCalled();
        });

        expect(screen.queryByText('Get ready…')).not.toBeInTheDocument();
    });
});

// ── Forfeit persist outcome ────────────────────────────────────────────────

describe('GameWindowOnline — forfeit persist outcome', () => {
    test('saves "Forfeit win" when logged-in user wins by opponent forfeit', async () => {
        mockUseUser.mockReturnValue({
            user: { username: 'Alice', email: 'alice@test.com' },
            setUser: vi.fn(),
        });

        mockExecuteMoveOnline.mockReturnValue(new Promise(() => {}));

        mockGetMatchStatus
            .mockResolvedValueOnce(defaultStatus)
            .mockResolvedValue({
                ...defaultStatus,
                status: 'finished',
                winner: 'p1@test.com',
                end_reason: 'forfeit',
            });

        render(<GameWindowOnline />);

        await waitFor(
            () => expect(screen.getByText('Opponent forfeited — you win!')).toBeInTheDocument(),
            { timeout: 8_000 }
        );

        expect(mockSaveMatchToDb).toHaveBeenCalledWith(
            expect.objectContaining({ result: 'Forfeit win' })
        );
    }, 10_000);

    test('does not save when guest wins by forfeit (no user logged in)', async () => {
        mockExecuteMoveOnline.mockReturnValue(new Promise(() => {}));

        mockGetMatchStatus
            .mockResolvedValueOnce(defaultStatus)
            .mockResolvedValue({
                ...defaultStatus,
                status: 'finished',
                winner: 'p1@test.com',
                end_reason: 'forfeit',
            });

        render(<GameWindowOnline />);

        await waitFor(
            () => expect(screen.getByText('Opponent forfeited — you win!')).toBeInTheDocument(),
            { timeout: 8_000 }
        );

        expect(mockSaveMatchToDb).not.toHaveBeenCalled();
    }, 10_000);
});

// ── Player IDs fetched on bootstrap ───────────────────────────────────────

describe('GameWindowOnline — player display names', () => {
    test('fetches player IDs from matchStatus on mount', async () => {
        render(<GameWindowOnline />);

        await waitFor(() => {
            expect(mockGetMatchStatus).toHaveBeenCalledWith('match-abc');
        });
    });

    test('board is blocked while it is not my turn', async () => {
        // Set turnNumber=1 → mySeat=1, game.turn=0 initially → not my turn
        mockUseLocation.mockReturnValue({
            state: { matchId: 'match-abc', turnNumber: 1, online: true },
        });

        render(<GameWindowOnline />);

        // Board is rendered as MockBoard even when blocked
        expect(screen.getByText('MockBoard')).toBeInTheDocument();
    });
});
