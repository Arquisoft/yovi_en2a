import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSettingsPanel from '../components/topRightMenu/settings/settingsSections/LanguageSettingsPanel';
import '@testing-library/jest-dom';

describe('LanguageSettingsPanel', () => {
  test('renders without crashing', () => {
    const { container } = render(<LanguageSettingsPanel />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('renders two language buttons', () => {
    render(<LanguageSettingsPanel />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('renders English and Spanish options', () => {
    render(<LanguageSettingsPanel />);
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Español').length).toBeGreaterThan(0);
  });

  test('renders flag images for each language', () => {
    render(<LanguageSettingsPanel />);
    expect(screen.getByAltText('English')).toBeInTheDocument();
    expect(screen.getByAltText('Español')).toBeInTheDocument();
  });

  test('clicking a language button does not throw', () => {
    render(<LanguageSettingsPanel />);
    const buttons = screen.getAllByRole('button');
    expect(() => fireEvent.click(buttons[1])).not.toThrow();
  });

  test('each button has aria-pressed attribute', () => {
    render(<LanguageSettingsPanel />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toHaveAttribute('aria-pressed');
    });
  });
});
