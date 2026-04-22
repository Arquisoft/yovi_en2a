import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { AudioProvider, useAudio } from '../contexts/AudioContext'

// --- Granular Web Audio API mocks ---
const mockStart           = vi.fn();
const mockSourceConnect   = vi.fn();
const mockGainConnect     = vi.fn();
const mockSetValueAtTime  = vi.fn();
const mockDecodeAudioData = vi.fn();
const mockResume          = vi.fn();
const mockCreateBufferSource = vi.fn();
const mockCreateGain         = vi.fn();

// Single AudioContext instance returned by every `new AudioContext()` call.
// Its `state` property is reassigned per-test to simulate a suspended context.
const audioCtxInstance = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createBufferSource: mockCreateBufferSource,
  createGain: mockCreateGain,
  decodeAudioData: mockDecodeAudioData,
  resume: mockResume,
};

// Separate vi.fn() so the caching test can assert fetch call count
const mockFetch = vi.fn();

// Consumer that exposes every context action as a button
const Consumer: React.FC = () => {
  const {
    masterVolume,
    isMuted,
    setMasterVolume,
    toggleMute,
    playMoveSound,
    playGameOverSound,
    playGameStartSound,
    playGameVictorySound,
  } = useAudio();

  return (
    <div>
      <span data-testid="vol">{masterVolume}</span>
      <span data-testid="muted">{String(isMuted)}</span>
      <button onClick={() => setMasterVolume(50)}>SetVol</button>
      <button onClick={() => setMasterVolume(-10)}>ClampLow</button>
      <button onClick={() => setMasterVolume(200)}>ClampHigh</button>
      <button onClick={toggleMute}>Mute</button>
      <button onClick={playMoveSound}>Move</button>
      <button onClick={playGameOverSound}>Over</button>
      <button onClick={playGameStartSound}>Start</button>
      <button onClick={playGameVictorySound}>Victory</button>
    </div>
  );
};

describe('AudioContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    audioCtxInstance.state = 'running';

    // Re-apply implementations after vi.clearAllMocks() clears history
    mockDecodeAudioData.mockResolvedValue({});
    mockResume.mockResolvedValue(undefined);
    mockCreateBufferSource.mockReturnValue({
      buffer: null,
      connect: mockSourceConnect,
      start: mockStart,
    });
    mockCreateGain.mockReturnValue({
      gain: { setValueAtTime: mockSetValueAtTime },
      connect: mockGainConnect,
    });
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    // jsdom does not ship Web Audio API — inject mocks directly on window/global
    // Must use a regular function (not arrow) because AudioContext is called with `new`
    Object.defineProperty(window, 'AudioContext', {
      value: function AudioContextMock() { return audioCtxInstance; },
      writable: true,
      configurable: true,
    });
    (global as unknown as Record<string, unknown>).fetch = mockFetch;
  });

  // --- State initialisation ---

  test('provides default values when localStorage is empty', () => {
    render(<AudioProvider><Consumer /></AudioProvider>);
    expect(screen.getByTestId('vol').textContent).toBe('80');
    expect(screen.getByTestId('muted').textContent).toBe('false');
  });

  test('reads masterVolume and isMuted from localStorage on init', () => {
    localStorage.setItem('audioMasterVolume', '60');
    localStorage.setItem('audioIsMuted', 'true');
    render(<AudioProvider><Consumer /></AudioProvider>);
    expect(screen.getByTestId('vol').textContent).toBe('60');
    expect(screen.getByTestId('muted').textContent).toBe('true');
  });

  test('falls back to default when localStorage has a non-numeric value', () => {
    localStorage.setItem('audioMasterVolume', 'not-a-number');
    render(<AudioProvider><Consumer /></AudioProvider>);
    expect(screen.getByTestId('vol').textContent).toBe('80');
  });

  // --- Volume control ---

  test('setMasterVolume updates value and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('SetVol'));
    expect(screen.getByTestId('vol').textContent).toBe('50');
    expect(localStorage.getItem('audioMasterVolume')).toBe('50');
  });

  test('setMasterVolume clamps values below 0 to 0', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('ClampLow'));
    expect(screen.getByTestId('vol').textContent).toBe('0');
  });

  test('setMasterVolume clamps values above 100 to 100', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('ClampHigh'));
    expect(screen.getByTestId('vol').textContent).toBe('100');
  });

  // --- Mute toggle ---

  test('toggleMute flips isMuted and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Mute'));
    expect(screen.getByTestId('muted').textContent).toBe('true');
    expect(localStorage.getItem('audioIsMuted')).toBe('true');
    await user.click(screen.getByText('Mute'));
    expect(screen.getByTestId('muted').textContent).toBe('false');
  });

  // --- Sound playback ---

  test('playMoveSound does not fetch when muted', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Mute'));
    await user.click(screen.getByText('Move'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('playMoveSound fetches, decodes, and starts playback', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Move'));
    await waitFor(() => expect(mockStart).toHaveBeenCalled(), { timeout: 2000 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockDecodeAudioData).toHaveBeenCalledTimes(1);
  });

  test('audio buffer is cached — fetch only called once for repeated plays', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Move'));
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await user.click(screen.getByText('Move'));
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(2), { timeout: 2000 });
    // Second play hits the cache — no second fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('playGameOverSound starts playback', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Over'));
    await waitFor(() => expect(mockStart).toHaveBeenCalled(), { timeout: 2000 });
  });

  test('playGameStartSound starts playback', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Start'));
    await waitFor(() => expect(mockStart).toHaveBeenCalled(), { timeout: 2000 });
  });

  test('playGameVictorySound starts playback', async () => {
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Victory'));
    await waitFor(() => expect(mockStart).toHaveBeenCalled(), { timeout: 2000 });
  });

  test('resumes AudioContext when it is suspended', async () => {
    audioCtxInstance.state = 'suspended';
    const user = userEvent.setup();
    render(<AudioProvider><Consumer /></AudioProvider>);
    await user.click(screen.getByText('Move'));
    await waitFor(() => expect(mockResume).toHaveBeenCalled(), { timeout: 2000 });
  });

  // --- Safety guard ---

  test('useAudio throws when used outside AudioProvider', () => {
    const BrokenComponent = () => { useAudio(); return null; };
    expect(() => render(<BrokenComponent />)).toThrow(
      'useAudio must be used within an AudioProvider'
    );
  });
});
