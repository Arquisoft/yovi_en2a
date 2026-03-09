import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { GlobalRanking } from '../components/topRightMenu/ranking/rankingTypes/GlobalRanking'
import '@testing-library/jest-dom'

describe('GlobalRanking Strategy & Fetcher', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('shows loading state initially', () => {
    // AÑADIDO: "as any" para calmar a TypeScript
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as any
    
    const strategy = new GlobalRanking()
    render(strategy.render())
    
    expect(screen.getByText(/Cargando Leaderboard/i)).toBeInTheDocument()
  })

  test('fetches data, formats time, and renders the global table', async () => {
    const mockApiResponse = {
      rankings: [
        { username: 'SpeedRunner', best_time: 95 }, // 95 segundos = 01:35
        { playerid: 'Guest123', best_time: 125 }    // Fallback a playerid. 125s = 02:05
      ]
    }

    // AÑADIDO: "as any" al final del mock
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mockApiResponse
    }) as any

    const strategy = new GlobalRanking()
    render(strategy.render())

    // Esperamos a que desaparezca el mensaje de carga
    await waitFor(() => {
      expect(screen.queryByText(/Cargando Leaderboard/i)).not.toBeInTheDocument()
    })

    // Verificamos que se calculó bien el MM:SS y se renderizan los datos
    expect(screen.getByText('World Leaderboard (Top 20)')).toBeInTheDocument()
    expect(screen.getByText('SpeedRunner')).toBeInTheDocument()
    expect(screen.getByText('01:35')).toBeInTheDocument()
    
    expect(screen.getByText('Guest123')).toBeInTheDocument()
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })
})