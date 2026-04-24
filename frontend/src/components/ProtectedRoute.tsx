import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../application/auth/useAuthStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
