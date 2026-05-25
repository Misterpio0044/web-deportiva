import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { stravaApi, type StravaStatus } from '../../infrastructure/api/stravaApi';
import { useAuthStore } from '../../application/auth/useAuthStore';
import type { AuthUser } from '../../infrastructure/api/authApi';

interface Props {
  onSyncComplete?: () => void;
  initialError?: string;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Nunca';
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const EMPTY_STATUS: StravaStatus = {
  connected: false,
  stravaId: null,
  scope: null,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncError: null,
  lastSyncCreated: null,
  lastSyncUpdated: null,
};

export function ConnectStravaCard({ onSyncComplete, initialError }: Props) {
  const login = useAuthStore((s) => s.login);
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bannerMsg] = useState<{ error: string; message: string }>(() => {
    if (initialError) return { error: initialError, message: '' };
    const raw = sessionStorage.getItem('stravaBanner');
    if (!raw) return { error: '', message: '' };
    sessionStorage.removeItem('stravaBanner');
    try {
      const b = JSON.parse(raw) as {
        isNewAccount: boolean;
        activitiesSynced: number;
        firstSyncFailed: boolean;
      };
      if (b.firstSyncFailed) {
        return {
          error:
            'Tu cuenta se conectó, pero la primera sincronización falló. Pulsa "Sincronizar" para reintentar.',
          message: '',
        };
      }
      return {
        error: '',
        message: `${
          b.isNewAccount ? 'Cuenta creada vía Strava. ' : ''
        }Sincronizadas ${b.activitiesSynced} actividades.`,
      };
    } catch {
      return { error: '', message: '' };
    }
  });
  const [error, setError] = useState(bannerMsg.error);
  const [message, setMessage] = useState(bannerMsg.message);

  useEffect(() => {
    stravaApi
      .status()
      .then(setStatus)
      .catch(() => setError('No se pudo cargar el estado de Strava'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const result = await stravaApi.sync();
      setStatus((s) =>
        s
          ? {
              ...s,
              lastSyncAt: result.lastSyncAt,
              lastSyncStatus: 'success',
              lastSyncError: null,
              lastSyncCreated: result.created,
              lastSyncUpdated: result.updated,
            }
          : s
      );
      setMessage(
        `Sincronización OK · ${result.activitiesSynced} actividades (${result.created} nuevas, ${result.updated} actualizadas).`
      );
      onSyncComplete?.();
    } catch (err) {
      const apiErr = err as {
        response?: { data?: { error?: { message?: string }; message?: string } };
      };
      const apiMsg =
        apiErr?.response?.data?.error?.message ?? apiErr?.response?.data?.message ?? '';
      const isRevoked = /revocad/i.test(apiMsg);
      if (isRevoked) {
        setStatus(EMPTY_STATUS);
        setError('El acceso a Strava ha sido revocado. Vuelve a conectar tu cuenta.');
      } else {
        setStatus((s) =>
          s
            ? { ...s, lastSyncStatus: 'error', lastSyncError: apiMsg || 'Error de sincronización' }
            : s
        );
        setError(apiMsg || 'Falló la sincronización con Strava. Inténtalo de nuevo.');
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Seguro que quieres desvincular tu cuenta de Strava?')) return;
    try {
      await stravaApi.disconnect();
      setStatus(EMPTY_STATUS);
      setMessage('Cuenta de Strava desvinculada.');
    } catch {
      setError('No se pudo desvincular la cuenta.');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          Cargando estado de Strava…
        </CardContent>
      </Card>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Strava</CardTitle>
        <CardDescription>
          {connected
            ? 'Tu cuenta de Strava está vinculada.'
            : 'Conecta tu cuenta para importar tus entrenamientos.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected ? (
          <Button
            type="button"
            onClick={() => {
              const url = stravaApi.authorizeUrl(true);
              const w = 620;
              const h = 720;
              const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
              const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
              const popup = window.open(
                url,
                'strava_oauth',
                `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
              );
              if (!popup) {
                // Fallback si el navegador bloquea el popup
                window.location.href = url;
                return;
              }
              const handler = (e: MessageEvent) => {
                if (e.origin !== window.location.origin) return;
                if (e.data?.type === 'strava_oauth_success') {
                  window.removeEventListener('message', handler);
                  const p = e.data.payload as {
                    token: string;
                    user: AuthUser;
                    firstSyncFailed: boolean;
                    activitiesSynced: number;
                    isNewAccount: boolean;
                  };
                  login(p.token, p.user);
                  stravaApi
                    .status()
                    .then(setStatus)
                    .catch(() => {});
                  if (p.firstSyncFailed) {
                    setError(
                      'Tu cuenta se conectó, pero la primera sincronización falló. Pulsa "Sincronizar" para reintentar.'
                    );
                  } else {
                    setMessage(
                      `${
                        p.isNewAccount ? 'Cuenta creada vía Strava. ' : ''
                      }Sincronizadas ${p.activitiesSynced} actividades.`
                    );
                  }
                  onSyncComplete?.();
                } else if (e.data?.type === 'strava_oauth_error') {
                  window.removeEventListener('message', handler);
                  setError((e.data.error as string) || 'Error al conectar con Strava');
                }
              };
              window.addEventListener('message', handler);
            }}
            className="bg-[#FC4C02] text-white hover:bg-[#e34302]"
          >
            Conectar con Strava
          </Button>
        ) : (
          <>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Estado:</span>
                {status?.lastSyncStatus === 'success' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Sincronizado
                  </span>
                )}
                {status?.lastSyncStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Error en última sincronización
                  </span>
                )}
                {!status?.lastSyncStatus && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Sin sincronizar todavía
                  </span>
                )}
              </div>
              <div className="text-slate-500">
                Última sincronización:{' '}
                <span className="font-medium text-slate-700">
                  {formatDateTime(status?.lastSyncAt ?? null)}
                </span>
              </div>
              {status?.lastSyncStatus === 'success' &&
                status.lastSyncCreated !== null &&
                status.lastSyncUpdated !== null && (
                  <div className="text-slate-500">
                    Último resultado:{' '}
                    <span className="font-medium text-slate-700">
                      {(status.lastSyncCreated ?? 0) + (status.lastSyncUpdated ?? 0)} actividades
                    </span>{' '}
                    ({status.lastSyncCreated} nuevas, {status.lastSyncUpdated} actualizadas)
                  </div>
                )}
              {status?.lastSyncStatus === 'error' && status.lastSyncError && (
                <div className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                  {status.lastSyncError}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
              </Button>
              <Button type="button" variant="outline" onClick={handleDisconnect}>
                Desvincular
              </Button>
            </div>
          </>
        )}

        {message && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>
        )}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
