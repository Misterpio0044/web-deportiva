import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../application/auth/useAuthStore';

export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
