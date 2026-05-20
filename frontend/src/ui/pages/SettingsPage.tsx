import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { meApi } from '../../infrastructure/api/meApi';
import { Navbar } from '../organisms/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);

  // Perfil
  const [firstname, setFirstname] = useState(user?.firstname ?? '');
  const [lastname, setLastname] = useState(user?.lastname ?? '');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [hasPasswordLocal, setHasPasswordLocal] = useState(true);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  // Cargar datos frescos (incluye username y si tiene contraseña local)
  useEffect(() => {
    let cancelled = false;
    meApi
      .get()
      .then((data) => {
        if (cancelled) return;
        setFirstname(data.user.firstname);
        setLastname(data.user.lastname);
        setEmail(data.user.email ?? '');
        setUsername(data.username);
        setOriginalUsername(data.username);
        // Si la cuenta tiene strava_id pero no email, asumimos solo-Strava (sin pwd)
        // El backend ya rechaza el cambio si no hay password_hash con un mensaje claro.
        setHasPasswordLocal(data.user.email !== null);
      })
      .catch(() => {
        if (cancelled) return;
        setProfileError('No se pudo cargar tu perfil');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileMsg('');

    // Solo envía los campos cambiados respecto al user actual
    const payload: Record<string, string> = {};
    if (firstname.trim() !== user?.firstname) payload.firstname = firstname.trim();
    if (lastname.trim() && username.trim() !== originalUsername) payload.username = username.trim();
    if (email.trim().toLowerCase() !== (user?.email ?? '')) payload.email = email.trim();

    if (Object.keys(payload).length === 0) {
      setProfileError('No hay cambios que guardar');
      return;
    }

    setLoadingProfile(true);
    try {
      const result = await meApi.updateProfile(payload);
      login(result.token, result.user);
      setUsername(result.username);
      setOriginalin(result.token, result.user);
      setUsername(result.username);
      setProfileMsg('Perfil actualizado correctamente');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setProfileError(err.response?.data?.message ?? 'No se pudo actualizar el perfil');
      } else {
        setProfileError('No se pudo actualizar el perfil');
      }
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    setPwdMsg('');

    if (newPassword !== confirmPassword) {
      setPwdError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPwdError('La contraseña debe contener al menos un número');
      return;
    }

    setLoadingPwd(true);
    try {
      await meApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg('Contraseña actualizada correctamente');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setPwdError(err.response?.data?.message ?? 'No se pudo cambiar la contraseña');
      } else {
        setPwdError('No se pudo cambiar la contraseña');
      }
    } finally {
      setLoadingPwd(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ajustes de cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona tu información personal y credenciales.
          </p>
        </div>

        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Perfil</CardTitle>
            <CardDescription>Tu nombre, usuario y email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstname">Nombre</Label>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastname">Apellido</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {profileError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {profileError}
                </p>
              )}
              {profileMsg && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  {profileMsg}
                </p>
              )}

              <Button type="submit" disabled={loadingProfile}>
                {loadingProfile ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
            <CardDescription>
              {hasPasswordLocal
                ? 'Introduce tu contraseña actual y la nueva.'
                : 'Esta cuenta no tiene contraseña local (acceso vía Strava).'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Contraseña actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={!hasPasswordLocal}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!hasPasswordLocal}
                />
                <p className="text-xs text-slate-500">
                  Mínimo 6 caracteres y al menos un número.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Repetir nueva contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!hasPasswordLocal}
                />
              </div>

              {pwdError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{pwdError}</p>
              )}
              {pwdMsg && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{pwdMsg}</p>
              )}

              <Button type="submit" disabled={loadingPwd || !hasPasswordLocal}>
                {loadingPwd ? 'Actualizando...' : 'Cambiar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
