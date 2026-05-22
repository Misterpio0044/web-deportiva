import { useEffect, useState } from 'react';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { athletesApi } from '../../infrastructure/api/athletesApi';
import type { AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { LoadingSkeleton } from '../atoms/LoadingSkeleton';

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtSync(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminAthletesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    athletesApi
      .list()
      .then(setAthletes)
      .catch(() => setError('Error al cargar los atletas'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(athlete: AthletePublic) {
    if (athlete.id === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta desde aquí.');
      return;
    }
    if (
      !confirm(
        `¿Eliminar a ${athlete.firstname} ${athlete.lastname}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setDeletingId(athlete.id);
    try {
      await athletesApi.delete(athlete.id);
      setAthletes((prev) => prev.filter((a) => a.id !== athlete.id));
    } catch {
      alert('Error al eliminar el atleta');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleRole(athlete: AthletePublic) {
    if (athlete.id === currentUser?.id) {
      alert('No puedes cambiar tu propio rol.');
      return;
    }
    const newRole = athlete.role === 'admin' ? 'user' : 'admin';
    setTogglingId(athlete.id);
    try {
      await athletesApi.changeRole(athlete.id, newRole);
      setAthletes((prev) => prev.map((a) => (a.id === athlete.id ? { ...a, role: newRole } : a)));
    } catch {
      alert('Error al cambiar el rol');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Gestión de usuarios"
          description={`${athletes.length} usuario${athletes.length !== 1 ? 's' : ''} registrado${athletes.length !== 1 ? 's' : ''}`}
        />

        {loading && <LoadingSkeleton className="h-64" />}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Strava</th>
                    <th className="px-5 py-3 text-right">Actividades</th>
                    <th className="px-5 py-3">Último sync</th>
                    <th className="px-5 py-3">Registro</th>
                    <th className="px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      {/* Usuario */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {a.profileMediumUrl ? (
                            <img
                              src={a.profileMediumUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                              {a.firstname[0]}
                              {a.lastname[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-800">
                              {a.firstname} {a.lastname}
                            </p>
                            <p className="font-mono text-xs text-slate-400">@{a.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3 text-slate-500">{a.email ?? '—'}</td>

                      {/* Rol */}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleRole(a)}
                          disabled={togglingId === a.id || a.id === currentUser?.id}
                          title={
                            a.id === currentUser?.id
                              ? 'No puedes cambiar tu propio rol'
                              : `Cambiar a ${a.role === 'admin' ? 'user' : 'admin'}`
                          }
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50 ${
                            a.role === 'admin'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {togglingId === a.id ? '…' : a.role}
                        </button>
                      </td>

                      {/* Strava */}
                      <td className="px-5 py-3">
                        {a.stravaId ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Conectado
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sin conectar</span>
                        )}
                      </td>

                      {/* Actividades */}
                      <td className="px-5 py-3 text-right font-medium text-slate-700">
                        {a.activityCount ?? 0}
                      </td>

                      {/* Último sync */}
                      <td className="px-5 py-3 text-slate-500">
                        <span
                          className={
                            a.lastStravaSyncStatus === 'error' ? 'text-red-500' : undefined
                          }
                        >
                          {fmtSync(a.lastStravaSyncAt)}
                        </span>
                      </td>

                      {/* Registro */}
                      <td className="px-5 py-3 text-slate-500">{fmt(a.createdAt)}</td>

                      {/* Acciones */}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(a)}
                          disabled={deletingId === a.id || a.id === currentUser?.id}
                          title={
                            a.id === currentUser?.id ? 'No puedes eliminarte a ti mismo' : undefined
                          }
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingId === a.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {athletes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
