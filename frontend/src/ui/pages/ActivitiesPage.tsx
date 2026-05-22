import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { activitiesApi, type ActivityDetail } from '../../infrastructure/api/activitiesApi';
import { athletesApi, type AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { DashboardSkeleton } from '../atoms/LoadingSkeleton';
import { formatDate, formatDistance, formatPace, formatTime } from '../../lib/formatters';

export function ActivitiesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [activities, setActivities] = useState<ActivityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | 'global' | undefined>(
    isAdmin ? (user?.id ?? undefined) : undefined,
  );

  useEffect(() => {
    if (isAdmin) {
      athletesApi
        .list()
        .then(setAthletes)
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    activitiesApi
      .list(selectedAthleteId === 'global' ? undefined : selectedAthleteId)
      .then((a) => {
        if (!cancelled) setActivities(a);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar las actividades.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAthleteId]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Actividades"
          description="Lista completa de tus entrenamientos. Pulsa una para ver el detalle."
        >
          {isAdmin && (
            <select
              value={selectedAthleteId === 'global' ? 'global' : (selectedAthleteId ?? '')}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'global') setSelectedAthleteId('global');
                else setSelectedAthleteId(v ? parseInt(v, 10) : user?.id);
              }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={user?.id ?? ''}>Mi perfil</option>
              <option value="global">Global (todos)</option>
              {athletes
                .filter((a) => a.id !== user?.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstname} {a.lastname}
                  </option>
                ))}
            </select>
          )}
        </PageHeader>

        {loading && <DashboardSkeleton />}
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
                  <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-400">
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Deporte</th>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Distancia</th>
                    <th className="px-5 py-3">Tiempo</th>
                    <th className="px-5 py-3">Ritmo</th>
                    <th className="px-5 py-3">FC media</th>
                    <th className="px-5 py-3">Desnivel</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => {
                    const pace = a.distance > 0 ? a.movingTime / (a.distance / 1000) : 0;
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-medium text-slate-800">
                          <Link
                            to={`/activities/${a.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {a.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{a.sportType}</td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(a.startDateLocal)}</td>
                        <td className="px-5 py-3 text-slate-700">{formatDistance(a.distance)}</td>
                        <td className="px-5 py-3 text-slate-700">{formatTime(a.movingTime)}</td>
                        <td className="px-5 py-3 text-slate-700">{formatPace(pace)}</td>
                        <td className="px-5 py-3 text-slate-700">
                          {a.averageHeartrate ? `${Math.round(a.averageHeartrate)} bpm` : '—'}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {a.totalElevationGain ? `${Math.round(a.totalElevationGain)} m` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        Sin actividades registradas
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
