import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import { activitiesApi, type ActivityDetail } from '../../infrastructure/api/activitiesApi';
import { athletesApi, type AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { DashboardSkeleton } from '../atoms/LoadingSkeleton';
import { formatDate, formatDistance, formatPace, formatTime } from '../../lib/formatters';
import { downloadBlob } from '../../lib/downloadBlob';

export function ActivitiesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [activities, setActivities] = useState<ActivityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | 'global' | undefined>(
    isAdmin ? (user?.id ?? undefined) : undefined
  );

  // Estado del modo selección/exportación
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

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

  // Al cambiar el conjunto visible (cambio de atleta), limpia selecciones obsoletas
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(activities.map((a) => a.id));
      const next = new Set<number>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [activities]);

  // Estado indeterminate del checkbox maestro
  const allSelected = activities.length > 0 && selectedIds.size === activities.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setExportError('');
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setExportError('');
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activities.map((a) => a.id)));
    }
  };

  const exportSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setExporting(true);
    setExportError('');
    try {
      if (ids.length === 1) {
        const { blob, filename } = await activitiesApi.exportOne(ids[0]);
        downloadBlob(blob, filename ?? `actividad-${ids[0]}.gpx`);
      } else {
        const { blob, filename } = await activitiesApi.exportMany(ids);
        downloadBlob(blob, filename ?? 'actividades.zip');
      }
      cancelSelectionMode();
    } catch {
      setExportError('No se pudo completar la exportación. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const colCount = useMemo(() => (selectionMode ? 9 : 8), [selectionMode]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Actividades"
          description="Lista completa de tus entrenamientos. Pulsa una para ver el detalle."
        >
          <div className="flex flex-wrap items-center gap-2">
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
            {!selectionMode ? (
              <button
                type="button"
                onClick={enterSelectionMode}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Exportar GPX
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelSelectionMode}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Cancelar
              </button>
            )}
          </div>
        </PageHeader>

        {selectionMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {selectedIds.size} seleccionada{selectedIds.size === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Limpiar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={exportSelected}
              disabled={selectedIds.size === 0 || exporting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? 'Generando…' : 'Descargar GPX'}
            </button>
          </div>
        )}

        {exportError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {exportError}
          </div>
        )}

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
                    {selectionMode && (
                      <th className="px-5 py-3 w-10">
                        <input
                          ref={masterCheckboxRef}
                          type="checkbox"
                          aria-label="Seleccionar todas las actividades visibles"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </th>
                    )}
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
                    const checked = selectedIds.has(a.id);
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-50 transition-colors last:border-0 ${
                          checked ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        {selectionMode && (
                          <td className="px-5 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar actividad ${a.name}`}
                              checked={checked}
                              onChange={() => toggleOne(a.id)}
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                        )}
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
                      <td colSpan={colCount} className="px-5 py-8 text-center text-slate-400">
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
