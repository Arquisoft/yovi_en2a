import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HexButton from '../components/gameWindow/board/HexButton';

describe('HexButton component', () => {
  test('HexButton renders a button', () => {
    render(<HexButton />);

    const button = screen.getByRole('button');

    expect(button).toBeTruthy();
  });

  test('HexButton applies player1 class when owner is 0', () => {
    render(<HexButton owner={0} />);

    const button = screen.getByRole('button');

    expect(button.className).toContain('hex--player1');
  });

  test('HexButton applies player2 class when owner is 1', () => {
    render(<HexButton owner={1} />);

    const button = screen.getByRole('button');

    expect(button.className).toContain('hex--player2');
  });

  test('HexButton applies empty class when owner is null', () => {
    render(<HexButton owner={null} />);

    const button = screen.getByRole('button');

    expect(button.className).toContain('hex--empty');
  });

  test('HexButton calls onClick when clicked', () => {
    const onClickMock = vi.fn();

    render(<HexButton onClick={onClickMock} />);

    const button = screen.getByRole('button');

    fireEvent.click(button);

    expect(onClickMock).toHaveBeenCalled();
  });

  test('HexButton disables the button when isDisabled is true', () => {
    render(<HexButton isDisabled={true} />);

    const button = screen.getByRole('button');

    expect(button.hasAttribute('disabled')).toBe(true);
  });

  test('HexButton applies hole class when isHole is true', () => {
    render(<HexButton isHole={true} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('hex--hole');
  });

  test('HexButton applies tabu-blocked class when isTabuBlocked is true', () => {
    render(<HexButton isTabuBlocked={true} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('hex--tabu-blocked');
  });

  test('HexButton owner takes priority over isHole', () => {
    render(<HexButton owner={0} isHole={true} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('hex--player1');
    expect(button.className).not.toContain('hex--hole');
  });

  test('HexButton isHole takes priority over isTabuBlocked', () => {
    render(<HexButton isHole={true} isTabuBlocked={true} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('hex--hole');
    expect(button.className).not.toContain('hex--tabu-blocked');
  });
});