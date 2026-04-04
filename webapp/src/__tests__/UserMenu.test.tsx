import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import UserMenu from '../components/topRightMenu/user/UserMenu';
import '@testing-library/jest-dom';

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as any, useNavigate: () => mockNavigate };
});

// Mock UserContext
const mockLogout = vi.fn();
const mockUpdateUsername = vi.fn();

vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn()
}));

import { useUser } from '../contexts/UserContext';

describe('UserMenu Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnClose.mockClear();
    mockLogout.mockClear();
    mockUpdateUsername.mockClear();
  });

  afterEach(cleanup);

  test('renders guest state when no user is logged in', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null, isLoggedIn: false, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    expect(screen.getByText(/Not logged in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Login/i })).toBeInTheDocument();
  });

  test('navigates to login and closes menu from guest state', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: null, isLoggedIn: false, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    const user = userEvent.setup();
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Go to Login/i }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('renders user info when logged in', () => {
    vi.mocked(useUser).mockReturnValue({
      user: { email: 'pablo@test.com', username: 'Pablo' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    expect(screen.getByText('pablo@test.com')).toBeInTheDocument();
    expect(screen.getAllByText('Pablo')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log Out/i })).toBeInTheDocument();
  });

  test('handles logout correctly', async () => {
    mockLogout.mockResolvedValue(undefined);
    vi.mocked(useUser).mockReturnValue({
      user: { email: 'pablo@test.com', username: 'Pablo' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    const user = userEvent.setup();
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Log Out/i }));

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('allows editing and saving the username', async () => {
    mockUpdateUsername.mockResolvedValue(undefined);
    vi.mocked(useUser).mockReturnValue({
      user: { email: 'pablo@test.com', username: 'Pablo' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    const user = userEvent.setup();
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Edit/i }));

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Pablo');

    await user.clear(input);
    await user.type(input, 'NuevoNombre');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    expect(mockUpdateUsername).toHaveBeenCalledWith('NuevoNombre');
  });

  test('shows fallback error message when updateUsername throws without a message', async () => {
    mockUpdateUsername.mockRejectedValue({ message: null })
    vi.mocked(useUser).mockReturnValue({
      user: { email: 'pablo@test.com', username: 'Pablo' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    })

    const user = userEvent.setup()
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /Edit/i }))
    await user.click(screen.getByRole('button', { name: /Save/i }))

    expect(await screen.findByText('Failed to update username.')).toBeInTheDocument()
  })

  test('shows U avatar when username is empty', () => {
    vi.mocked(useUser).mockReturnValue({
      user: { email: 'anon@test.com', username: '' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);
    // Empty username → avatar fallback 'U'
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  test('can cancel editing without saving', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { email: 'pablo@test.com', username: 'Pablo' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: mockLogout, updateUsername: mockUpdateUsername
    });

    const user = userEvent.setup();
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Edit/i }));
    const input = screen.getByRole('textbox');
    await user.type(input, 'Modificado');

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.getAllByText('Pablo')[0]).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
