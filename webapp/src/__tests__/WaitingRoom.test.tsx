// src/__tests__/WaitingRoom.test.tsx

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Router mocks ──────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ matchId: 'match-abc' }));
const mockUseLocation = vi.fn(() => ({
    state: {
        guest: true,
        role: 'create' as 'create' | 'join',
        turnNumber: 0,
        size: 8,
        isPrivate: false,
    },
}));

vi.mock('react-router-dom', () => ({
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
}));

// ── online module mock ────────────────────────────────────────────────────

const mockWaitUntilMatchReady = vi.fn();
const mockCancelMatch = vi.fn();

vi.mock('../components/online/online', () => ({
    waitUntilMatchReady: (...args: unknown[]) => mockWaitUntilMatchReady(...args),
    cancelMatch: (...args: unknown[]) => mockCancelMatch(...args),
}));

import WaitingRoom from '../components/online/WaitingRoom';

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ matchId: 'match-abc' });
    mockUseLocation.mockReturnValue({
        state: {
            guest: true,
            role: 'create' as const,
            turnNumber: 0,
            size: 8,
            isPrivate: false,
        },
    });
    mockWaitUntilMatchReady.mockResolvedValue({
        match_id: 'match-abc',
        status: 'active',
        ready: true,
    });
    mockCancelMatch.mockResolvedValue(undefined);
});

// ── Creator flow ──────────────────────────────────────────────────────────

describe('WaitingRoom — creator flow', () => {
    test('shows "Waiting for opponent…" initially', () => {
        render(<WaitingRoom />);
        expect(screen.getByText('Waiting for opponent…')).toBeInTheDocument();
    });

    test('calls waitUntilMatchReady with the match id', async () => {
        render(<WaitingRoom />);
        await waitFor(() => {
            expect(mockWaitUntilMatchReady).toHaveBeenCalledWith(
                'match-abc',
                1000,
                expect.any(AbortSignal)
            );
        });
    });

    test('shows the Cancel button while waiting', () => {
        render(<WaitingRoom />);
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('shows the match id when isPrivate is true', () => {
        mockUseLocation.mockReturnValue({
            state: {
                guest: true,
                role: 'create' as const,
                turnNumber: 0,
                size: 8,
                isPrivate: true
            },
        });

        render(<WaitingRoom />);

        expect(screen.getByText('Share this Match ID')).toBeInTheDocument();
        expect(screen.getByText('match-abc')).toBeInTheDocument();
    });

    test('does not show match id block when match is public', () => {
        render(<WaitingRoom />);
        expect(screen.queryByText('Share this Match ID')).not.toBeInTheDocument();
    });

    test('navigates to / on readiness poll error', async () => {
        mockWaitUntilMatchReady.mockRejectedValue(new Error('boom'));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<WaitingRoom />);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        });

        errorSpy.mockRestore();
    });

    test('ignores AbortError in the readiness poll', async () => {
        const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
        mockWaitUntilMatchReady.mockRejectedValue(abortErr);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<WaitingRoom />);

        // Give the async machinery a tick.
        await act(async () => { await Promise.resolve(); });

        // No fatal navigation should happen for AbortError.
        expect(mockNavigate).not.toHaveBeenCalledWith('/', { replace: true });

        errorSpy.mockRestore();
    });
});

// ── Joiner flow ───────────────────────────────────────────────────────────

describe('WaitingRoom — joiner flow', () => {
    beforeEach(() => {
        mockUseLocation.mockReturnValue({
            state: {
                guest: true,
                role: 'join' as const,
                turnNumber: 0,
                size: 8,
                isPrivate: false,
            },
        });
    });

    test('skips the waiting phase and goes straight to "Connected!"', () => {
        render(<WaitingRoom />);
        expect(screen.getByText('Connected!')).toBeInTheDocument();
    });

    test('does not call waitUntilMatchReady (only the creator polls)', () => {
        render(<WaitingRoom />);
        expect(mockWaitUntilMatchReady).not.toHaveBeenCalled();
    });
});

// ── Phase transitions ─────────────────────────────────────────────────────

describe('WaitingRoom — phase transitions', () => {
    test('transitions waiting → connected → announce → navigate', async () => {
        vi.useFakeTimers();
        try {
            render(<WaitingRoom />);

            // Phase 1: waiting → resolves the readiness promise → connected.
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(screen.getByText('Connected!')).toBeInTheDocument();

            // Phase 2: 1.2 s later → announce.
            await act(async () => {
                vi.advanceTimersByTime(1_300);
            });

            expect(screen.getByText('Player 1')).toBeInTheDocument();
            expect(screen.getByText('Your turn first')).toBeInTheDocument();

            // Phase 3: 1.5 s later → navigate.
            await act(async () => {
                vi.advanceTimersByTime(1_600);
            });

            expect(mockNavigate).toHaveBeenCalledWith(
                '/online/8/match-abc',
                expect.objectContaining({
                    state: expect.objectContaining({
                        matchId: 'match-abc',
                        turnNumber: 0,
                        online: true,
                        guest: true,
                    }),
                    replace: true,
                })
            );
        } finally {
            vi.useRealTimers();
        }
    });

    test('shows "Opponent moves first" when turnNumber is 1', async () => {
        vi.useFakeTimers();
        try {
            mockUseLocation.mockReturnValue({
                state: {
                    guest: false,
                    role: 'join' as const,
                    turnNumber: 1,
                    size: 8,
                    isPrivate: false,
                },
            });

            render(<WaitingRoom />);

            // Joiner starts at "connected"; advance to "announce".
            await act(async () => {
                vi.advanceTimersByTime(1_300);
            });

            expect(screen.getByText('Player 2')).toBeInTheDocument();
            expect(screen.getByText('Opponent moves first')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});

// ── Cancel ────────────────────────────────────────────────────────────────

describe('WaitingRoom — cancel', () => {
    test('cancel button calls cancelMatch and navigates home', async () => {
        render(<WaitingRoom />);

        fireEvent.click(screen.getByText('Cancel'));

        await waitFor(() => {
            expect(mockCancelMatch).toHaveBeenCalledWith('match-abc');
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        });
    });

    test('cancel still navigates home when cancelMatch rejects', async () => {
        mockCancelMatch.mockRejectedValue(new Error('server down'));

        render(<WaitingRoom />);

        fireEvent.click(screen.getByText('Cancel'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        });
    });
});

// ── Redirect guard ────────────────────────────────────────────────────────

describe('WaitingRoom — redirect guard', () => {
    test('redirects to / when location state is missing', () => {

        mockUseLocation.mockReturnValue({ state: undefined } as never);

        const { container } = render(<WaitingRoom />);

        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        // Component returns null when no state.
        expect(container.firstChild).toBeNull();
    });
});
