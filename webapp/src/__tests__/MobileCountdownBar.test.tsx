// src/__tests__/MobileCountdownBar.test.tsx

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileCountdownBar from '../components/online/MobileCountdownBar';

const defaultProps = {
    isMyTurn: true,
    secondsLeft: 7,
    fraction: 0.7,
    totalTime: '02:45',
    myName: 'Alice',
    opponentName: 'Bob',
    mySlot: 1 as 1 | 2,
    activeSlot: 1 as 1 | 2,
    gameOver: false,
};

// ── Rendering ──────────────────────────────────────────────────────────────

describe('MobileCountdownBar — rendering', () => {
    test('displays the countdown value', () => {
        render(<MobileCountdownBar {...defaultProps} />);
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    test('displays the seconds unit when game is not over', () => {
        render(<MobileCountdownBar {...defaultProps} />);
        expect(screen.getByText('s')).toBeInTheDocument();
    });

    test('displays the total time', () => {
        render(<MobileCountdownBar {...defaultProps} />);
        expect(screen.getByText('02:45')).toBeInTheDocument();
    });

    test('displays both player names', () => {
        render(<MobileCountdownBar {...defaultProps} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    test('displays "vs" separator between player names', () => {
        render(<MobileCountdownBar {...defaultProps} />);
        expect(screen.getByText('vs')).toBeInTheDocument();
    });

    test('renders the TIME label', () => {
        render(<MobileCountdownBar {...defaultProps} />);
        expect(screen.getByText('TIME')).toBeInTheDocument();
    });

    test('renders progress bar with correct width', () => {
        const { container } = render(<MobileCountdownBar {...defaultProps} />);
        const fill = container.querySelector('.mcb-progress-fill') as HTMLElement;
        expect(fill).toBeInTheDocument();
        expect(fill.style.width).toBe('70%');
    });
});

// ── Turn state classes ─────────────────────────────────────────────────────

describe('MobileCountdownBar — CSS classes', () => {
    test('has is-mine class when it is my turn', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} isMyTurn={true} />
        );
        expect(container.firstChild).toHaveClass('is-mine');
    });

    test('has is-theirs class when it is not my turn', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} isMyTurn={false} />
        );
        expect(container.firstChild).toHaveClass('is-theirs');
    });

    test('has is-critical class when secondsLeft ≤ 3 and game is not over', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} secondsLeft={3} gameOver={false} />
        );
        expect(container.firstChild).toHaveClass('is-critical');
    });

    test('does not have is-critical when secondsLeft > 3', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} secondsLeft={4} />
        );
        expect(container.firstChild).not.toHaveClass('is-critical');
    });

    test('does not have is-critical when game is over even if secondsLeft ≤ 3', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} secondsLeft={1} gameOver={true} />
        );
        expect(container.firstChild).not.toHaveClass('is-critical');
    });

    test('has is-over class when game is over', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} gameOver={true} />
        );
        expect(container.firstChild).toHaveClass('is-over');
    });
});

// ── Game over state ────────────────────────────────────────────────────────

describe('MobileCountdownBar — game over', () => {
    test('shows "—" instead of seconds when game is over', () => {
        render(<MobileCountdownBar {...defaultProps} gameOver={true} />);
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    test('hides the "s" unit when game is over', () => {
        render(<MobileCountdownBar {...defaultProps} gameOver={true} />);
        expect(screen.queryByText('s')).not.toBeInTheDocument();
    });
});

// ── Active player highlighting ─────────────────────────────────────────────

describe('MobileCountdownBar — active player', () => {
    test('marks p1 as active when activeSlot is 1', () => {
        render(
            <MobileCountdownBar
                {...defaultProps}
                mySlot={1}
                activeSlot={1}
                myName="Alice"
                opponentName="Bob"/>
        );
        const aliceEl = screen.getByText('Alice').closest('.mcb-player');
        expect(aliceEl).toHaveClass('mcb-player--active');

        const bobEl = screen.getByText('Bob').closest('.mcb-player');
        expect(bobEl).not.toHaveClass('mcb-player--active');
    });

    test('marks p2 as active when activeSlot is 2', () => {
        render(
            <MobileCountdownBar
                {...defaultProps}
                mySlot={1}
                activeSlot={2}
                myName="Alice"
                opponentName="Bob"
            />
        );
        const bobEl = screen.getByText('Bob').closest('.mcb-player');
        expect(bobEl).toHaveClass('mcb-player--active');

        const aliceEl = screen.getByText('Alice').closest('.mcb-player');
        expect(aliceEl).not.toHaveClass('mcb-player--active');
    });
});

// ── Name assignment ────────────────────────────────────────────────────────

describe('MobileCountdownBar — name assignment', () => {
    test('when mySlot=1, p1 name = myName, p2 name = opponentName', () => {
        render(
            <MobileCountdownBar
                {...defaultProps}
                mySlot={1}
                myName="Alice"
                opponentName="Bob"
            />
        );
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    test('when mySlot=2, p1 name = opponentName, p2 name = myName', () => {
        render(
            <MobileCountdownBar
                {...defaultProps}
                mySlot={2}
                myName="Alice"
                opponentName="Bob"
            />
        );
        // p1 = opponent = Bob, p2 = me = Alice
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });
});

// ── Progress bar edge cases ────────────────────────────────────────────────

describe('MobileCountdownBar — progress bar edge cases', () => {
    test('clamps fraction above 1 to 100%', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} fraction={2} />
        );
        const fill = container.querySelector('.mcb-progress-fill') as HTMLElement;
        expect(fill.style.width).toBe('100%');
    });

    test('clamps fraction below 0 to 0%', () => {
        const { container } = render(
            <MobileCountdownBar {...defaultProps} fraction={-1} />
        );
        const fill = container.querySelector('.mcb-progress-fill') as HTMLElement;
        expect(fill.style.width).toBe('0%');
    });
});
