import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { authApi } from '../../infrastructure/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login({ email, password });
      login(token, user);
      navigate('/dashboard');
    } catch {
      setError('Credenciales incorrectas. Comprueba email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl">⚡</span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">SportDash</h1>
          <p className="mt-1 text-sm text-slate-500">Plataforma de análisis deportivo</p>
        </div>

        {/* Login card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
            <CardDescription>Introduce tus credenciales de acceso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <p className="mb-2 font-semibold text-slate-700">Credenciales de demo</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-mono">admin@demo.com</span>
              <span>
                <span className="font-mono">admin123</span>
                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                  Admin
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono">user1@demo.com</span>
              <span className="font-mono">user123</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono">user2@demo.com</span>
              <span className="font-mono">user123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
