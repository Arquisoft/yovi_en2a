import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Board from '../components/gameWindow/board/Board';

describe('Board component', () => {

  test('Board renders the correct number of cells for a given size', () => {
    render(<Board size={3} moves={[]} blocked={false} onPlace={() => {}} />);

    const buttons = screen.getAllByRole('button');

    // size 3 triangular board -> 1 + 2 + 3 = 6
    expect(buttons.length).toBe(6);
  });

  test('Board calls onPlace when clicking an empty cell', () => {
    const onPlaceMock = vi.fn();

    render(<Board size={2} moves={[]} blocked={false} onPlace={onPlaceMock} />);

    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]);

    expect(onPlaceMock).toHaveBeenCalled();
  });

  test('Board disables a cell if it is already occupied', () => {
    const moves = [{ row: 1, col: 0, player: 0 as 0 }];

    render(<Board size={2} moves={moves} blocked={false} onPlace={() => {}} />);

    const buttons = screen.getAllByRole('button');

    // at least one button should be disabled
    const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled'));

    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  test('Board disables all cells when board is blocked', () => {
    render(<Board size={2} moves={[]} blocked={true} onPlace={() => {}} />);

    const buttons = screen.getAllByRole('button');

    buttons.forEach(btn => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

});