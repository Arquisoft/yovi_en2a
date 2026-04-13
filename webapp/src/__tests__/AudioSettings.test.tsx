import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi, beforeEach } from 'vitest'
import { AudioSettings } from '../components/topRightMenu/settings/settingsSections/AudioSettings'
import '@testing-library/jest-dom'

// Mock the AudioContext so VolumeSlider renders with controlled values
// without needing a real AudioProvider in the test tree.
const mockSetMasterVolume = vi.fn();
const mockSetMusicVolume  = vi.fn();

vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    masterVolume:     80,
    musicVolume:      50,
    isMuted:          false,
    setMasterVolume:  mockSetMasterVolume,
    setMusicVolume:   mockSetMusicVolume,
    toggleMute:       vi.fn(),
    playMoveSound:    vi.fn(),
    playGameOverSound: vi.fn(),
        playGameStartSound: vi.fn(),
        playGameVictorySound: vi.fn(),
  }),
}));

describe('AudioSettings Strategy', () => {
  const audioSettings = new AudioSettings();

  beforeEach(() => {
    mockSetMasterVolume.mockClear();
    mockSetMusicVolume.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test('should render sound settings title and sliders', () => {
    render(audioSettings.render());

    expect(screen.getByText(/Sound Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Master Volume/i)).toBeInTheDocument();
    expect(screen.getByText(/Music Volume/i)).toBeInTheDocument();
  });

  test('should display slider values from AudioContext', () => {
    render(audioSettings.render());

    const masterSlider = screen.getByDisplayValue('80');
    const musicSlider  = screen.getByDisplayValue('50');

    expect(masterSlider).toBeInTheDocument();
    expect(musicSlider).toBeInTheDocument();
  });

  test('should call setMasterVolume when Master Volume slider changes', () => {
    render(audioSettings.render());

    const masterSlider = screen.getByDisplayValue('80');
    fireEvent.input(masterSlider, { target: { value: '40' } });

    expect(mockSetMasterVolume).toHaveBeenCalledWith(40);
  });

  test('should call setMusicVolume when Music Volume slider changes', () => {
    render(audioSettings.render());

    const musicSlider = screen.getByDisplayValue('50');
    fireEvent.input(musicSlider, { target: { value: '20' } });

    expect(mockSetMusicVolume).toHaveBeenCalledWith(20);
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

    const musicSlider = screen.getByDisplayValue('50');
    const tooltip = screen.getByText('50');

    fireEvent.touchStart(musicSlider);
    expect(tooltip.className).toMatch(/visible/i);

    fireEvent.touchEnd(musicSlider);
    expect(tooltip.className).not.toMatch(/visible/i);
  });
});
