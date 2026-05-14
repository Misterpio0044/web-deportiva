import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { authApi } from '../../infrastructure/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function RegisterPage() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  function validateClient(): string | null {
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return 'El usuario solo puede contener letras, números y guion bajo';
    if (username.length < 3) return 'El usuario debe tener al menos 3 caracteres';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authApi.register({
        firstname,
        lastname,
        username,
        email,
        password,
      });
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      // Use the message that the backend sends (ConflictError or ZodError)
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'No se pudo crear la cuenta');
      } else {
        setError('No se pudo crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl">⚡</span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">SportDash</h1>
          <p className="mt-1 text-sm text-slate-500">Crea tu cuenta para empezar</p>
        </div>

        {/* Register card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crear cuenta</CardTitle>
            <CardDescription>Rellena tus datos para registrarte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstname">Nombre</Label>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastname">Apellido</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  placeholder="ej. juan_runner"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

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
                  autoComplete="new-password"
                />
                <p className="text-xs text-slate-500">Mínimo 6 caracteres y al menos un número.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium text-slate-900 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
