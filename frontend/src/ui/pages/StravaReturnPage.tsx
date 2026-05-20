import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import type { AuthUser } from '../../infrastructure/api/authApi';

interface CallbackPayload {
  token: string;
  user: AuthUser;
  firstSyncFailed: boolean;
  activitiesSynced: number;
  isNewAccount: boolean;
}

/**
 * Página intermedia tras el callback de Strava.
 *
 * El backend redirige aquí con un hash `#payload=<JSON urlencoded>`
 * que contiene el JWT de la app, el usuario y los detalles del primer sync
 * automático ("efecto wow"). Hidratamos el store, persistimos en localStorage
 * y saltamos al dashboard.
 */
export function StravaReturnPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const raw = params.get('payload');

    if (!raw) {
      navigate('/login?stravaError=missing_payload', { replace: true });
      return;
    }

    try {
      const payload = JSON.parse(decodeURIComponent(raw)) as CallbackPayload;
      login(payload.token, payload.user);

      const banner = {
        type: payload.firstSyncFailed ? 'warning' : 'success',
        isNewAccount: payload.isNewAccount,
        activitiesSynced: payload.activitiesSynced,
        firstSyncFailed: payload.firstSyncFailed,
      };
      sessionStorage.setItem('stravaBanner', JSON.stringify(banner));

      // Limpiar el hash de la URL antes de navegar
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('[StravaReturn] payload inválido', err);
      navigate('/login?stravaError=invalid_payload', { replace: true });
    }
  }, [login, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Conectando con Strava…</p>
    </div>
  );
}
