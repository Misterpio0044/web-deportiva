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

const ORIGIN = window.location.origin;

/**
 * Página intermedia tras el callback de Strava.
 *
 * El backend siempre redirige aquí:
 *   - Éxito:  #payload=<JSON urlencoded>
 *   - Error:  #error=<mensaje urlencoded>
 *
 * Si se abrió en un popup (window.opener existe), manda un postMessage al padre
 * y cierra el popup. En caso contrario, maneja la navegación directamente.
 */
export function StravaReturnPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const isPopup = !!window.opener;
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    // ── Caso error ────────────────────────────────────────────────────────────
    const errorRaw = params.get('error');
    if (errorRaw) {
      const errorMsg = decodeURIComponent(errorRaw);
      if (isPopup) {
        window.opener?.postMessage({ type: 'strava_oauth_error', error: errorMsg }, ORIGIN);
        window.close();
      } else {
        const dest = user ? '/dashboard' : '/login';
        navigate(`${dest}?stravaError=${encodeURIComponent(errorMsg)}`, { replace: true });
      }
      return;
    }

    // ── Caso éxito ────────────────────────────────────────────────────────────
    const raw = params.get('payload');
    if (!raw) {
      if (isPopup) {
        window.opener?.postMessage(
          { type: 'strava_oauth_error', error: 'missing_payload' },
          ORIGIN
        );
        window.close();
      } else {
        navigate('/login?stravaError=missing_payload', { replace: true });
      }
      return;
    }

    try {
      const payload = JSON.parse(decodeURIComponent(raw)) as CallbackPayload;

      if (isPopup) {
        window.opener?.postMessage({ type: 'strava_oauth_success', payload }, ORIGIN);
        window.close();
      } else {
        login(payload.token, payload.user);
        const banner = {
          type: payload.firstSyncFailed ? 'warning' : 'success',
          isNewAccount: payload.isNewAccount,
          activitiesSynced: payload.activitiesSynced,
          firstSyncFailed: payload.firstSyncFailed,
        };
        sessionStorage.setItem('stravaBanner', JSON.stringify(banner));
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('[StravaReturn] payload inválido', err);
      if (isPopup) {
        window.opener?.postMessage(
          { type: 'strava_oauth_error', error: 'invalid_payload' },
          ORIGIN
        );
        window.close();
      } else {
        navigate('/login?stravaError=invalid_payload', { replace: true });
      }
    }
  }, [login, navigate, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Conectando con Strava…</p>
    </div>
  );
}
