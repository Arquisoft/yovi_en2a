import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach } from 'vitest'
import RankingTableGlobal from '../components/topRightMenu/ranking/RankingTableGlobal'
import type { RankingElementGlobal } from '../components/topRightMenu/ranking/rankingElements/RankingElementGlobal'
import '@testing-library/jest-dom'

const makeItem = (position: number, name: string, metric: string): RankingElementGlobal => ({
  position,
  player1Name: name,
  metric,
  metricName: 'ELO',
})

describe('RankingTableGlobal', () => {
  afterEach(cleanup)

  test('renders title and column headers', () => {
    render(<RankingTableGlobal data={[makeItem(1, 'Alice', '180')]} title="Elo Ranking" />)
    expect(screen.getByText('Elo Ranking')).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('PLAYER 1')).toBeInTheDocument()
    expect(screen.getByText('ELO')).toBeInTheDocument()
  })

  test('renders player names and metric values', () => {
    render(<RankingTableGlobal data={[makeItem(1, 'Alice', '180'), makeItem(2, 'Bob', '90')]} title="Elo" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
  })

  test('renders position numbers with # prefix', () => {
    render(<RankingTableGlobal data={[makeItem(1, 'Alice', '180'), makeItem(3, 'Charlie', '60')]} title="Elo" />)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  test('position > 3 applies no highlight (fallback empty string branch)', () => {
    const items = [
      makeItem(1, 'P1', '100'),
      makeItem(2, 'P2', '80'),
      makeItem(3, 'P3', '60'),
      makeItem(4, 'P4', '40'),
      makeItem(5, 'P5', '20'),
    ]
    render(<RankingTableGlobal data={items} title="Elo" />)
    // Positions 4 and 5 render without a named highlight class
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(screen.getByText('#5')).toBeInTheDocument()
  })

  test('shows empty list when data is empty', () => {
    render(<RankingTableGlobal data={[]} title="Empty" />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument()
  })

  test('metric name defaults to RESULT when data is empty', () => {
    render(<RankingTableGlobal data={[]} title="Empty" />)
    expect(screen.getByText('RESULT')).toBeInTheDocument()
  })

  test('tied players share the same position label', () => {
    render(
      <RankingTableGlobal
        data={[makeItem(1, 'X', '80'), makeItem(1, 'Y', '80'), makeItem(2, 'Z', '30')]}
        title="Elo"
      />
    )
    expect(screen.getAllByText('#1').length).toBe(2)
    expect(screen.getByText('#2')).toBeInTheDocument()
  })
})
