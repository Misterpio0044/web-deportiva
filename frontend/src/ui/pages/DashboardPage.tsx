import { useEffect, useState } from 'react';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { dashboardApi } from '../../infrastructure/api/dashboardApi';
import type { DashboardData } from '../../infrastructure/api/dashboardApi';
import { athletesApi } from '../../infrastructure/api/athletesApi';
import type { AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { DashboardGrid } from '../organisms/DashboardGrid';
import { DashboardSkeleton } from '../atoms/LoadingSkeleton';
import { PageHeader } from '../atoms/PageHeader';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin athlete selector
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isAdmin) {
      athletesApi.list().then(setAthletes).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    setError('');
    dashboardApi
      .get(selectedAthleteId)
      .then(setData)
      .catch(() => setError('Error al cargar el dashboard. ¿Está el servidor corriendo?'))
      .finally(() => setLoading(false));
  }, [selectedAthleteId]);

  const title = isAdmin
    ? selectedAthleteId
      ? `Dashboard — ${athletes.find((a) => a.id === selectedAthleteId)?.firstname ?? 'Atleta'}`
      : 'Dashboard global'
    : `Hola, ${user?.firstname ?? 'atleta'} 👋`;

  const description = isAdmin && !selectedAthleteId ? 'Datos agregados de todos los atletas' : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={title} description={description}>
          {isAdmin && (
            <select
              value={selectedAthleteId ?? ''}
              onChange={(e) =>
                setSelectedAthleteId(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Global (todos)</option>
              {athletes.map((a) => (
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
        {!loading && !error && data && <DashboardGrid data={data} />}
      </div>
    </AppShell>
  );
}
