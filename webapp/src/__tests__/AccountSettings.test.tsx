import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect, vi } from 'vitest'
import { AccountSettings } from '../components/topRightMenu/settings/settingsSections/AccountSettings'
import '@testing-library/jest-dom'

describe('AccountSettings', () => {
  test('renders guest state and navigates to login on button click', async () => {
    const mockNavigate = vi.fn()
    const mockLogout = vi.fn()
    const user = userEvent.setup()

    const section = new AccountSettings(false, '', mockNavigate, mockLogout)
    render(<MemoryRouter>{section.render()}</MemoryRouter>)

    expect(screen.getByText('Guest')).toBeInTheDocument()
    expect(screen.getByText('Not logged in')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(mockLogout).not.toHaveBeenCalled()
  })

  test('renders logged-in state with username and logs out on button click', async () => {
    const mockNavigate = vi.fn()
    const mockLogout = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    const section = new AccountSettings(true, 'Alice', mockNavigate, mockLogout)
    render(<MemoryRouter>{section.render()}</MemoryRouter>)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
    expect(mockLogout).toHaveBeenCalled()
  })
})
