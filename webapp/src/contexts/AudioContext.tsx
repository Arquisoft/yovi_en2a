/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import moveSoundUrl     from '../assets/sounds/move.mp3';
import gameOverSoundUrl from '../assets/sounds/game_over.mp3';
import gameStart        from '../assets/sounds/start.mp3';
import gameVictorySound from '../assets/sounds/victory.mp3';

interface AudioContextType {
  masterVolume: number;
  isMuted: boolean;
  setMasterVolume: (v: number) => void;
  toggleMute: () => void;
  playMoveSound: () => void;
  playGameOverSound: () => void;
  playGameStartSound: () => void;
  playGameVictorySound: () => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

const LS_MASTER = 'audioMasterVolume';
const LS_MUTED  = 'audioIsMuted';

const readNumber = (key: string, fallback: number): number => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const readBool = (key: string, fallback: boolean): boolean => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterVolume, setMasterVolumeState] = useState<number>(() => readNumber(LS_MASTER, 80));
  const [isMuted,      setIsMuted]           = useState<boolean>(() => readBool(LS_MUTED, false));

  // Lazy Web Audio API context — created on first sound to respect browser autoplay policy
  const webAudioRef = useRef<globalThis.AudioContext | null>(null);
  // Cache decoded AudioBuffers by URL so each file is fetched and decoded only once
  const bufferCache = useRef<Map<string, Promise<AudioBuffer>>>(new Map());

  const getWebAudio = useCallback((): globalThis.AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!webAudioRef.current) {
      webAudioRef.current = new window.AudioContext();
    }
    // Resume if suspended (browser may suspend after inactivity)
    if (webAudioRef.current.state === 'suspended') {
      webAudioRef.current.resume();
    }
    return webAudioRef.current;
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => { localStorage.setItem(LS_MASTER, String(masterVolume)); }, [masterVolume]);
  useEffect(() => { localStorage.setItem(LS_MUTED,  String(isMuted));      }, [isMuted]);

  const setMasterVolume = useCallback((v: number) => setMasterVolumeState(Math.max(0, Math.min(100, v))), []);
  const toggleMute      = useCallback(() => setIsMuted(prev => !prev), []);

  // effectiveGain: 0 when muted, otherwise masterVolume scaled to 0–1
  const effectiveGain = isMuted ? 0 : masterVolume / 100;

  const getBuffer = useCallback((url: string, ctx: globalThis.AudioContext): Promise<AudioBuffer> => {
    if (!bufferCache.current.has(url)) {
      const p = fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => ctx.decodeAudioData(buf));
      bufferCache.current.set(url, p);
    }
    return bufferCache.current.get(url)!;
  }, []);

  const playFile = useCallback((url: string, gain: number) => {
    const ctx = getWebAudio();
    if (!ctx) return;

    getBuffer(url, ctx)
      .then(decoded => {
        const source   = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(gain, ctx.currentTime);
        source.buffer = decoded;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();
      })
      .catch(() => {});
  }, [getWebAudio, getBuffer]);

  const playMoveSound = useCallback(() => {
    if (effectiveGain === 0) return;
    playFile(moveSoundUrl, effectiveGain * 0.6);
  }, [effectiveGain, playFile]);

  const playGameOverSound = useCallback(() => {
    if (effectiveGain === 0) return;
    playFile(gameOverSoundUrl, effectiveGain * 0.8);
  }, [effectiveGain, playFile]);

  const playGameStartSound = useCallback(() => {
    if (effectiveGain === 0) return;
    playFile(gameStart, effectiveGain * 0.8);
  }, [effectiveGain, playFile]);

  const playGameVictorySound = useCallback(() => {
    if (effectiveGain === 0) return;
    playFile(gameVictorySound, effectiveGain * 0.8);
  }, [effectiveGain, playFile]);

  const value = useMemo(() => ({
    masterVolume,
    isMuted,
    setMasterVolume,
    toggleMute,
    playMoveSound,
    playGameOverSound,
    playGameStartSound,
    playGameVictorySound,
  }), [masterVolume, isMuted, setMasterVolume, toggleMute, playMoveSound, playGameOverSound, playGameStartSound, playGameVictorySound]);

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
};

export function useAudio(): AudioContextType {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider');
  return ctx;
}
