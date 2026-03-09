import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import UserMenu from '../components/topRightMenu/user/UserMenu';
import '@testing-library/jest-dom';

// Mock de navegación
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as any, useNavigate: () => mockNavigate };
});

describe('UserMenu Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnClose.mockClear();
    // Limpiar cookies
    document.cookie = "user=; path=/; max-age=0";
  });

  afterEach(cleanup);

  test('renders guest state when no user cookie is present', () => {
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    expect(screen.getByText(/You are not logged in yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Login/i })).toBeInTheDocument();
  });

  test('navigates to login and closes menu from guest state', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Go to Login/i }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('renders user info when logged in', () => {
    const userData = JSON.stringify({ email: 'pablo@test.com', username: 'Pablo' });
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    expect(screen.getByText('pablo@test.com')).toBeInTheDocument();
    expect(screen.getByText('Pablo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log Out/i })).toBeInTheDocument();
  });

  test('handles logout correctly', async () => {
    const user = userEvent.setup();
    const userData = JSON.stringify({ email: 'pablo@test.com', username: 'Pablo' });
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Log Out/i }));

    // Verificamos que se borra la cookie (max-age=0 o valor vacío)
    expect(document.cookie).not.toContain('Pablo');
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('allows editing and saving the username', async () => {
    const user = userEvent.setup();
    const userData = JSON.stringify({ email: 'pablo@test.com', username: 'Pablo' });
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    // 1. Entrar en modo edición
    await user.click(screen.getByRole('button', { name: /Edit/i }));
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Pablo');

    // 2. Cambiar nombre
    await user.clear(input);
    await user.type(input, 'NuevoNombre');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    // 3. Verificar cambios en pantalla y cookie
    expect(screen.getByText('NuevoNombre')).toBeInTheDocument();
    expect(decodeURIComponent(document.cookie)).toContain('NuevoNombre');
  });

  test('can cancel editing without saving', async () => {
    const user = userEvent.setup();
    const userData = JSON.stringify({ email: 'pablo@test.com', username: 'Pablo' });
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;

    render(<MemoryRouter><UserMenu onClose={mockOnClose} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Edit/i }));
    const input = screen.getByRole('textbox');
    await user.type(input, 'Modificado');
    
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.getByText('Pablo')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});