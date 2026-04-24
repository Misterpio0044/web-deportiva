import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { LogOut, LayoutDashboard, Users, User } from 'lucide-react';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-green-500">⚡</span>
          <span>SportDash</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin/athletes"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Users size={16} />
              Atletas
            </Link>
          )}
        </nav>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              <User size={14} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.firstname}</p>
              <p className="text-xs text-slate-400">
                {user?.role === 'admin' ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    Admin
                  </span>
                ) : (
                  'Usuario'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
