// src/__tests__/RightPanelOnline.test.tsx

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RightPanelOnline from '../components/online/RightPanelOnline';

const defaultProps = {
    turn: 1 as 1 | 2,
    mySlot: 1 as 1 | 2,
    totalTime: '01:23',
    turnSecondsLeft: 7,
    turnFraction: 0.7,
    myName: 'Alice',
    opponentName: 'Bob',
};

// ── Rendering ──────────────────────────────────────────────────────────────

describe('RightPanelOnline — rendering', () => {
    test('displays the countdown value', () => {
        render(<RightPanelOnline {...defaultProps} />);
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    test('displays the total time', () => {
        render(<RightPanelOnline {...defaultProps} />);
        expect(screen.getByText('01:23')).toBeInTheDocument();
    });

    test('displays both player names', () => {
        render(<RightPanelOnline {...defaultProps} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    test('renders the progress bar with correct width', () => {
        const { container } = render(<RightPanelOnline {...defaultProps} />);
        const fill = container.querySelector('.turn-countdown-bar-fill') as HTMLElement;
        expect(fill).toBeInTheDocument();
        expect(fill.style.width).toBe('70%');
    });

    test('renders "s" unit next to countdown', () => {
        render(<RightPanelOnline {...defaultProps} />);
        expect(screen.getByText('s')).toBeInTheDocument();
    });
});

// ── Turn state ─────────────────────────────────────────────────────────────

describe('RightPanelOnline — turn state', () => {
    test('shows "Your turn" heading when it is my turn', () => {
        render(<RightPanelOnline {...defaultProps} turn={1} mySlot={1} />);
        expect(screen.getByText('Your turn')).toBeInTheDocument();
    });

    test('shows "Opponent\'s turn" heading when it is not my turn', () => {
        render(<RightPanelOnline {...defaultProps} turn={2} mySlot={1} />);
        expect(screen.getByText("Opponent's turn")).toBeInTheDocument();
    });

    test('active player chip shows YOUR TURN, inactive shows WAITING', () => {
        render(<RightPanelOnline {...defaultProps} turn={1} mySlot={1} />);
        expect(screen.getAllByText('YOUR TURN')).toHaveLength(1);
        expect(screen.getAllByText('WAITING')).toHaveLength(1);
    });

    test('YOUR TURN chip is on the active player row', () => {
        // mySlot=1, turn=1 → p1 (Alice) is active
        render(<RightPanelOnline {...defaultProps} turn={1} mySlot={1} />);
        const aliceRow = screen.getByText('Alice').closest('.rightpanel-player');
        expect(aliceRow?.querySelector('.rightpanel-chip')?.textContent).toBe('YOUR TURN');
    });
});

// ── Critical state ─────────────────────────────────────────────────────────

describe('RightPanelOnline — critical state', () => {
    test('applies is-critical class when turnSecondsLeft ≤ 3', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turnSecondsLeft={3} />
        );
        const card = container.querySelector('.turn-countdown');
        expect(card).toHaveClass('is-critical');
    });

    test('does not apply is-critical class when turnSecondsLeft > 3', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turnSecondsLeft={4} />
        );
        const card = container.querySelector('.turn-countdown');
        expect(card).not.toHaveClass('is-critical');
    });

    test('applies is-mine class when it is my turn', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turn={1} mySlot={1} />
        );
        const card = container.querySelector('.turn-countdown');
        expect(card).toHaveClass('is-mine');
    });

    test('applies is-theirs class when it is the opponent\'s turn', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turn={2} mySlot={1} />
        );
        const card = container.querySelector('.turn-countdown');
        expect(card).toHaveClass('is-theirs');
    });
});

// ── Progress bar edge cases ────────────────────────────────────────────────

describe('RightPanelOnline — progress bar', () => {
    test('clamps fraction > 1 to 100%', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turnFraction={1.5} />
        );
        const fill = container.querySelector('.turn-countdown-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('100%');
    });

    test('clamps fraction < 0 to 0%', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turnFraction={-0.3} />
        );
        const fill = container.querySelector('.turn-countdown-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('0%');
    });

    test('renders 0% bar when fraction is 0', () => {
        const { container } = render(
            <RightPanelOnline {...defaultProps} turnFraction={0} />
        );
        const fill = container.querySelector('.turn-countdown-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('0%');
    });
});

// ── Player name assignment ─────────────────────────────────────────────────

describe('RightPanelOnline — player name assignment', () => {
    test('when mySlot=1, p1 shows myName and p2 shows opponentName', () => {
        render(
            <RightPanelOnline
                {...defaultProps}
                mySlot={1}
                myName="Alice"
                opponentName="Bob"
            />
        );
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();

        // Alice is p1 → her meta should say "You"
        const aliceRow = screen.getByText('Alice').closest('.rightpanel-player');
        expect(aliceRow).toHaveTextContent('You');

        const bobRow = screen.getByText('Bob').closest('.rightpanel-player');
        expect(bobRow).toHaveTextContent('Opponent');
    });

    test('when mySlot=2, p2 shows myName and p1 shows opponentName', () => {
        render(
            <RightPanelOnline
                {...defaultProps}
                mySlot={2}
                myName="Alice"
                opponentName="Bob"
            />
        );

        // p1 = opponent (Bob), p2 = me (Alice)
        const bobRow = screen.getByText('Bob').closest('.rightpanel-player');
        expect(bobRow).toHaveTextContent('Opponent');

        const aliceRow = screen.getByText('Alice').closest('.rightpanel-player');
        expect(aliceRow).toHaveTextContent('You');
    });
});
