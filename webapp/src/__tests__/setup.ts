import { vi } from 'vitest';

// Stub all audio asset imports so tests don't need real .mp3 files
vi.mock('../assets/sounds/move.mp3',      () => ({ default: 'move.mp3' }));
vi.mock('../assets/sounds/game_over.mp3', () => ({ default: 'game_over.mp3' }));
vi.mock('../assets/sounds/start.mp3',     () => ({ default: 'start.mp3' }));
vi.mock('../assets/sounds/victory.mp3',   () => ({ default: 'victory.mp3' }));
