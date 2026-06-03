import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { dashboardApi } from '../../infrastructure/api/dashboardApi';
import type { DashboardData } from '../../infrastructure/api/dashboardApi';
import { gearApi } from '../../infrastructure/api/gearApi';
import type { GearStat } from '../../infrastructure/api/gearApi';
import { athletesApi } from '../../infrastructure/api/athletesApi';
import type { AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { DashboardGrid } from '../organisms/DashboardGrid';
import { ConnectStravaCard } from '../organisms/ConnectStravaCard';
import { DashboardSkeleton } from '../atoms/LoadingSkeleton';
import { PageHeader } from '../atoms/PageHeader';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const [stravaError] = useState<string>(() => {
    const raw = searchParams.get('stravaError');
    return raw ? decodeURIComponent(raw) : '';
  });

  // Limpiar el query param ?stravaError= para que no persista al refrescar
  useEffect(() => {
    if (searchParams.get('stravaError')) {
      const next = new URLSearchParams(searchParams);
      next.delete('stravaError');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [gearStats, setGearStats] = useState<GearStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  // Admin athlete selector — arranca en el propio ID del admin (vista personal)
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | 'global' | undefined>(
    isAdmin ? (user?.id ?? undefined) : undefined
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

    const isGlobal = selectedAthleteId === 'global';
    const athleteId = isGlobal ? undefined : selectedAthleteId;

    Promise.all([
      dashboardApi.get(athleteId),
      gearApi.stats(isGlobal ? { global: true } : athleteId != null ? { athleteId } : {}),
    ])
      .then(([dashData, gearData]) => {
        if (!cancelled) {
          setData(dashData);
          setGearStats(gearData);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Error al cargar el dashboard. ¿Está el servidor corriendo?');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAthleteId, refreshTick]);

  const isAdminOwnView =
    isAdmin && selectedAthleteId !== 'global' && selectedAthleteId === user?.id;
  const showConnectStrava = !isAdmin || isAdminOwnView;

  const title =
    isAdmin && selectedAthleteId === 'global'
      ? 'Dashboard global'
      : isAdmin && typeof selectedAthleteId === 'number' && selectedAthleteId !== user?.id
        ? `Dashboard — ${athletes.find((a) => a.id === selectedAthleteId)?.firstname ?? 'Atleta'}`
        : `Hola, ${user?.firstname ?? 'atleta'} 👋`;

  const description =
    isAdmin && selectedAthleteId === 'global' ? 'Datos agregados de todos los atletas' : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={title} description={description}>
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
        {showConnectStrava && (
          <ConnectStravaCard
            onSyncComplete={() => setRefreshTick((t) => t + 1)}
            initialError={stravaError}
          />
        )}
        {!loading && !error && data && <DashboardGrid data={data} gearStats={gearStats} />}
      </div>
    </AppShell>
  );
}
