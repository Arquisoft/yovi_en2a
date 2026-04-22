import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi, beforeEach } from 'vitest'
import { AudioSettings } from '../components/topRightMenu/settings/settingsSections/AudioSettings'
import '@testing-library/jest-dom'

const mockSetMasterVolume = vi.fn();

vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    masterVolume:        80,
    isMuted:             false,
    setMasterVolume:     mockSetMasterVolume,
    toggleMute:          vi.fn(),
    playMoveSound:       vi.fn(),
    playGameOverSound:   vi.fn(),
    playGameStartSound:  vi.fn(),
    playGameVictorySound: vi.fn(),
  }),
}));

describe('AudioSettings Strategy', () => {
  const audioSettings = new AudioSettings();

  beforeEach(() => {
    mockSetMasterVolume.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test('should render sound settings title and master volume slider', () => {
    render(audioSettings.render());

    expect(screen.getByText(/Sound Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Master Volume/i)).toBeInTheDocument();
  });

  test('should display master volume value from AudioContext', () => {
    render(audioSettings.render());

    const masterSlider = screen.getByDisplayValue('80');
    expect(masterSlider).toBeInTheDocument();
  });

  test('should call setMasterVolume when Master Volume slider changes', () => {
    render(audioSettings.render());

    const masterSlider = screen.getByDisplayValue('80');
    fireEvent.input(masterSlider, { target: { value: '40' } });

    expect(mockSetMasterVolume).toHaveBeenCalledWith(40);
  });

  test('should show tooltip on mouseDown and hide on mouseUp', () => {
    render(audioSettings.render());

    const masterSlider = screen.getByDisplayValue('80');
    const tooltip = screen.getByText('80');

    fireEvent.mouseDown(masterSlider);
    expect(tooltip.className).toMatch(/visible/i);

    fireEvent.mouseUp(masterSlider);
    expect(tooltip.className).not.toMatch(/visible/i);
  });

  test('should show tooltip on touchStart and hide on touchEnd', () => {
    render(audioSettings.render());

    const masterSlider = screen.getByDisplayValue('80');
    const tooltip = screen.getByText('80');

    fireEvent.touchStart(masterSlider);
    expect(tooltip.className).toMatch(/visible/i);

    fireEvent.touchEnd(masterSlider);
    expect(tooltip.className).not.toMatch(/visible/i);
  });
});
