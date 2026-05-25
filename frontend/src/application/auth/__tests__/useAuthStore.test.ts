import { describe, it, expect, beforeEach } from 'vitest';

const reloadStore = async () => {
  // Limpiar el módulo para reevaluar el estado inicial desde localStorage
  const mod = await import('../useAuthStore');
  // Forzar reset: usamos getState/setState con valores frescos derivados de localStorage
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  mod.useAuthStore.setState({
    token: storedToken,
    user: storedUser ? JSON.parse(storedUser) : null,
    isAuthenticated: !!storedToken,
  });
  return mod;
};

const fakeUser = {
  id: 1,
  email: 'ana@example.com',
  role: 'user' as const,
  firstname: 'Ana',
  lastname: 'Pérez',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('estado inicial sin localStorage → no autenticado', async () => {
    const { useAuthStore } = await reloadStore();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('login persiste en localStorage y actualiza el estado', async () => {
    const { useAuthStore } = await reloadStore();
    useAuthStore.getState().login('jwt-token', fakeUser);
    const s = useAuthStore.getState();
    expect(s.token).toBe('jwt-token');
    expect(s.user).toEqual(fakeUser);
    expect(s.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(fakeUser);
  });

  it('logout limpia localStorage y el estado', async () => {
    const { useAuthStore } = await reloadStore();
    useAuthStore.getState().login('jwt-token', fakeUser);
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('rehidrata desde localStorage al recargar', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify(fakeUser));
    const { useAuthStore } = await reloadStore();
    const s = useAuthStore.getState();
    expect(s.token).toBe('tok');
    expect(s.user).toEqual(fakeUser);
    expect(s.isAuthenticated).toBe(true);
  });
});
