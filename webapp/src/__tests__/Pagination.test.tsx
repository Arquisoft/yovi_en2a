import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import Pagination, { usePagination } from '../components/topRightMenu/ranking/Pagination'
import '@testing-library/jest-dom'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Render the Pagination component with sensible defaults */
const renderPagination = (overrides: Partial<{
  currentPage: number
  totalPages: number
  visiblePages: number[]
  onPageChange: (p: number) => void
}> = {}) => {
  const onPageChange = overrides.onPageChange ?? vi.fn()
  render(
    <Pagination
      currentPage={overrides.currentPage ?? 1}
      totalPages={overrides.totalPages ?? 3}
      visiblePages={overrides.visiblePages ?? [1, 2, 3]}
      onPageChange={onPageChange}
    />
  )
  return { onPageChange }
}

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

// ─── Pagination component ────────────────────────────────────────────────────

describe('Pagination component', () => {
  afterEach(cleanup)

  test('returns null when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} visiblePages={[1]} onPageChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('returns null when totalPages is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} visiblePages={[]} onPageChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders First, Last and page number buttons when totalPages > 1', () => {
    renderPagination()
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last'  })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  test('First button is disabled when on page 1', () => {
    renderPagination({ currentPage: 1 })
    expect(screen.getByRole('button', { name: 'First' })).toBeDisabled()
  })

  test('First button is enabled when not on page 1', () => {
    renderPagination({ currentPage: 2 })
    expect(screen.getByRole('button', { name: 'First' })).toBeEnabled()
  })

  test('Last button is disabled when on the last page', () => {
    renderPagination({ currentPage: 3, totalPages: 3 })
    expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled()
  })

  test('Last button is enabled when not on the last page', () => {
    renderPagination({ currentPage: 1, totalPages: 3 })
    expect(screen.getByRole('button', { name: 'Last' })).toBeEnabled()
  })

  test('clicking First calls onPageChange(1)', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination({ currentPage: 2 })
    await user.click(screen.getByRole('button', { name: 'First' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  test('clicking Last calls onPageChange(totalPages)', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination({ currentPage: 1, totalPages: 3 })
    await user.click(screen.getByRole('button', { name: 'Last' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  test('clicking a page number calls onPageChange with that number', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination()
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  test('renders only the visible page buttons provided', () => {
    renderPagination({ visiblePages: [2, 3, 4], totalPages: 5 })
    expect(screen.queryByRole('button', { name: '1' })).toBeNull()
    expect(screen.getByRole('button',  { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button',  { name: '4' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '5' })).toBeNull()
  })
})

// ─── usePagination hook ──────────────────────────────────────────────────────

describe('usePagination hook', () => {
  test('returns 1 total page and all items when data fits on one page', () => {
    const { result } = renderHook(() => usePagination(items(4)))
    expect(result.current.totalPages).toBe(1)
    expect(result.current.pageData).toEqual([1, 2, 3, 4])
    expect(result.current.currentPage).toBe(1)
  })

  test('returns 2 total pages for 6 items (ROWS_PER_PAGE = 5)', () => {
    const { result } = renderHook(() => usePagination(items(6)))
    expect(result.current.totalPages).toBe(2)
    // First page: items 1-5
    expect(result.current.pageData).toEqual([1, 2, 3, 4, 5])
  })

  test('page 2 contains the remaining items', () => {
    const { result } = renderHook(() => usePagination(items(6)))
    act(() => result.current.setCurrentPage(2))
    expect(result.current.pageData).toEqual([6])
  })

  test('totalPages is at least 1 for empty data', () => {
    const { result } = renderHook(() => usePagination([]))
    expect(result.current.totalPages).toBe(1)
    expect(result.current.pageData).toEqual([])
  })

  test('visiblePages has at most 3 entries', () => {
    const { result } = renderHook(() => usePagination(items(25)))
    expect(result.current.visiblePages.length).toBeLessThanOrEqual(3)
  })

  test('visiblePages is [1] for a single page', () => {
    const { result } = renderHook(() => usePagination(items(3)))
    expect(result.current.visiblePages).toEqual([1])
  })

  test('visiblePages starts at 1 on the first page of many', () => {
    const { result } = renderHook(() => usePagination(items(20)))
    expect(result.current.visiblePages[0]).toBe(1)
  })

  test('visiblePages slides forward when on a middle page', () => {
    const { result } = renderHook(() => usePagination(items(25)))
    act(() => result.current.setCurrentPage(4))
    // startPage = max(1, min(4-1, 5-2)) = max(1, min(3, 3)) = 3
    expect(result.current.visiblePages).toEqual([3, 4, 5])
  })

  test('visiblePages stays within bounds on the last page', () => {
    const { result } = renderHook(() => usePagination(items(15)))
    act(() => result.current.setCurrentPage(3))
    const pages = result.current.visiblePages
    expect(pages[pages.length - 1]).toBeLessThanOrEqual(result.current.totalPages)
  })

  test('exactly 5 items fills one page (no second page)', () => {
    const { result } = renderHook(() => usePagination(items(5)))
    expect(result.current.totalPages).toBe(1)
    expect(result.current.pageData.length).toBe(5)
  })

  test('exactly 10 items produces 2 pages of 5', () => {
    const { result } = renderHook(() => usePagination(items(10)))
    expect(result.current.totalPages).toBe(2)
    act(() => result.current.setCurrentPage(2))
    expect(result.current.pageData).toEqual([6, 7, 8, 9, 10])
  })
})
