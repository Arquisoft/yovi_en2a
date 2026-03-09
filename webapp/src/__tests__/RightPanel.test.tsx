import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RightPanel from '../components/gameWindow/rightPanel/RightPanel';

// Mock of CookieRetriever
vi.mock('../utils/CookieRetriever', () => ({
  GetUsernameFromCookie: () => 'TestUser'
}));

describe('RightPanel component', () => {

  test('RightPanel renders the timer correctly', () => {
    render(<RightPanel turn={1} time='01:23' mode='bot' />);

    const timer = screen.getByText('01:23');

    expect(timer).toBeTruthy();
  });

  test('RightPanel shows player 1 username from cookie', () => {
    render(<RightPanel turn={1} time='00:10' mode='bot' />);

    const username = screen.getByText('TestUser');

    expect(username).toBeTruthy();
  });

  test('RightPanel shows Bot when mode is bot', () => {
    render(<RightPanel turn={1} time='00:10' mode='bot' />);

    const botLabel = screen.getByText('Bot');

    expect(botLabel).toBeTruthy();
  });

  test('RightPanel shows Human when mode is multi', () => {
    render(<RightPanel turn={1} time='00:10' mode='multi' />);

    const humanLabel = screen.getAllByText('Human');

    expect(humanLabel.length).toBeGreaterThan(0);
  });

  test('RightPanel highlights player 1 when turn is 1', () => {
    const { container } = render(<RightPanel turn={1} time='00:10' mode='bot' />);

    const activePlayer = container.querySelector('.rightpanel-player.active');

    expect(activePlayer).toBeTruthy();
  });

  test('RightPanel highlights player 2 when turn is 2', () => {
    const { container } = render(<RightPanel turn={2} time='00:10' mode='bot' />);

    const activePlayer = container.querySelector('.rightpanel-player.active');

    expect(activePlayer).toBeTruthy();
  });

});