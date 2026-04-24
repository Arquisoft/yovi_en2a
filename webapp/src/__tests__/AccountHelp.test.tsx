import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountHelp from '../components/topRightMenu/help/tabs/AccountHelp';
import '@testing-library/jest-dom';

describe('AccountHelp', () => {
  test('renders without crashing', () => {
    const { container } = render(<AccountHelp />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('renders all four sections', () => {
    const { container } = render(<AccountHelp />);
    expect(container.querySelectorAll('section')).toHaveLength(4);
  });

  test('renders three images for account features', () => {
    render(<AccountHelp />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  test('images have descriptive alt text', () => {
    render(<AccountHelp />);
    expect(screen.getByAltText('Main menu')).toBeInTheDocument();
    expect(screen.getByAltText('Registration window')).toBeInTheDocument();
    expect(screen.getByAltText('Log in window')).toBeInTheDocument();
  });
});
