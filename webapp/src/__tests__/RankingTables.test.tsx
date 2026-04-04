import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach } from 'vitest'
import RankingTableGlobal from '../components/topRightMenu/ranking/RankingTableGlobal'
import RankingTableLocal from '../components/topRightMenu/ranking/RankingTableLocal'
import { RankingElementTime } from '../components/topRightMenu/ranking/rankingElements/RankingElementTime'
import '@testing-library/jest-dom'

describe('Ranking UI Tables', () => {
  afterEach(cleanup)

  test('RankingTableGlobal renders data and dynamic metric name correctly', () => {
    const mockData = [
      new RankingElementTime(1, 'Alice', '01:30'),
      new RankingElementTime(2, 'Bob', '02:15')
    ]

    render(<RankingTableGlobal data={mockData} title="Global Top 20" />)

    expect(screen.getByText('Global Top 20')).toBeInTheDocument()
    // Verifica el nombre dinámico de la métrica ('TIME' viene de la clase)
    expect(screen.getByText('TIME')).toBeInTheDocument() 
    
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  test('RankingTableGlobal renders default metric name when empty', () => {
    render(<RankingTableGlobal data={[]} title="Empty Global" />)
    expect(screen.getByText('RESULT')).toBeInTheDocument() // Valor por defecto
  })

  test('RankingTableLocal renders matches correctly', () => {
    const mockData = [
      { position: 1, player1Name: 'Alice',   player2Name: 'Bot',   result: 'WIN',  time: 30 },
      { position: 2, player1Name: 'Charlie', player2Name: 'David', result: 'LOSS', time: 45 },
    ]

    render(<RankingTableLocal data={mockData} title="My Matches" />)

    expect(screen.getByText('My Matches')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bot')).toBeInTheDocument()
    expect(screen.getByText('WIN')).toBeInTheDocument()
    
    // Verifica que se renderiza el texto VS en el medio
    const vsLabels = screen.getAllByText('VS')
    expect(vsLabels.length).toBe(2)
  })
})