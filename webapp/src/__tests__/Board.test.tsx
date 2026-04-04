import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import Board from '../components/gameWindow/board/Board'
import HexButton from '../components/gameWindow/board/HexButton'
import '@testing-library/jest-dom'

describe('HexButton', () => {
  afterEach(cleanup)

  test('renders as player1 hex when owner is 0', () => {
    render(<HexButton owner={0} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('hex--player1')
  })

  test('renders as player2 hex when owner is 1', () => {
    render(<HexButton owner={1} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('hex--player2')
  })

  test('renders as empty hex when owner is null', () => {
    render(<HexButton owner={null} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('hex--empty')
  })

  test('is disabled when isDisabled is true', () => {
    render(<HexButton isDisabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  test('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<HexButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('Board', () => {
  afterEach(cleanup)

  test('renders (size × size+1) / 2 cells for a size-3 board', () => {
    const onPlace = vi.fn()
    render(<Board size={3} moves={[]} blocked={false} onPlace={onPlace} />)
    // size=3 → rows 0,1,2 → 1+2+3 = 6 cells
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  test('all cells are enabled when blocked is false and no moves', () => {
    render(<Board size={2} moves={[]} blocked={false} onPlace={vi.fn()} />)
    screen.getAllByRole('button').forEach(btn => expect(btn).not.toBeDisabled())
  })

  test('all cells are disabled when blocked is true', () => {
    render(<Board size={2} moves={[]} blocked={true} onPlace={vi.fn()} />)
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled())
  })

  test('cell with a matching move is disabled and has correct owner class', () => {
    const onPlace = vi.fn()
    const moves = [{ row: 0, col: 0, player: 0 as 0 | 1 }]
    render(<Board size={2} moves={moves} blocked={false} onPlace={onPlace} />)
    const buttons = screen.getAllByRole('button')
    // First cell (row=0, col=0) should be occupied by player 0 → disabled
    expect(buttons[0]).toBeDisabled()
    expect(buttons[0].className).toContain('hex--player1')
  })

  test('cells without a matching move remain enabled', () => {
    const moves = [{ row: 1, col: 0, player: 1 as 0 | 1 }]
    render(<Board size={2} moves={moves} blocked={false} onPlace={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    // row=0 col=0 has no move → enabled
    expect(buttons[0]).not.toBeDisabled()
  })

  test('clicking a cell calls onPlace with the correct row and col', () => {
    const onPlace = vi.fn()
    render(<Board size={2} moves={[]} blocked={false} onPlace={onPlace} />)
    const buttons = screen.getAllByRole('button')
    // Second cell is row=1, col=0
    fireEvent.click(buttons[1])
    expect(onPlace).toHaveBeenCalledWith(1, 0)
  })
})
