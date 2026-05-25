import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AdminRoute } from '../AdminRoute';
import { useAuthStore } from '../../application/auth/useAuthStore';

const renderWithRouter = (initialPath: string, Guard: React.ComponentType) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<Guard />}>
          <Route path="/secret" element={<div>SECRET</div>} />
          <Route path="/admin" element={<div>ADMIN_AREA</div>} />
        </Route>
        <Route path="/login" element={<div>LOGIN_PAGE</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});

describe('ProtectedRoute', () => {
  it('redirige a /login si no está autenticado', () => {
    renderWithRouter('/secret', ProtectedRoute);
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
  });

  it('renderiza el contenido si está autenticado', () => {
    useAuthStore.setState({
      token: 't',
      user: { id: 1, email: 'a@b.c', role: 'user', firstname: 'A', lastname: 'B' },
      isAuthenticated: true,
    });
    renderWithRouter('/secret', ProtectedRoute);
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  it('redirige a /login si no hay user', () => {
    renderWithRouter('/admin', AdminRoute);
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
  });

  it('redirige a /dashboard si user role no es admin', () => {
    useAuthStore.setState({
      token: 't',
      user: { id: 1, email: 'a@b.c', role: 'user', firstname: 'A', lastname: 'B' },
      isAuthenticated: true,
    });
    renderWithRouter('/admin', AdminRoute);
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });

  it('renderiza el área admin si role=admin', () => {
    useAuthStore.setState({
      token: 't',
      user: { id: 1, email: 'a@b.c', role: 'admin', firstname: 'A', lastname: 'B' },
      isAuthenticated: true,
    });
    renderWithRouter('/admin', AdminRoute);
    expect(screen.getByText('ADMIN_AREA')).toBeInTheDocument();
  });
});
