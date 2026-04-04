import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HelpMenu from '../components/topRightMenu/help/HelpMenu';

describe('HelpMenu', () => {
  test('renders default tab', () => {
    render(<HelpMenu onClose={vi.fn()} />);
    expect(screen.getAllByText('Main Menu').length).toBeGreaterThan(0);
  });

  test('Calls onClose when the button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpMenu onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalled();
  });

  test('Changes tab when nav item is clicked', () => {
    render(<HelpMenu onClose={vi.fn()} />);
    fireEvent.click(screen.getAllByText('Game Rules')[0]);
    expect(screen.getAllByText('Game Rules').length).toBeGreaterThan(0);
  });

  test('Displays mobile nav when the toggle button is clicked', () => {
    render(<HelpMenu onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '☰' }));
    expect(screen.getAllByRole('button', { name: '✕' }).length).toBeGreaterThan(0);
  });
});