import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../application/auth/useAuthStore';
import {
  activitiesApi,
  type ActivityDetail,
  type ActivitySortField,
  type SortDirection,
} from '../../infrastructure/api/activitiesApi';
import { athletesApi, type AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { DashboardSkeleton } from '../atoms/LoadingSkeleton';
import { formatDate, formatDistance, formatPace, formatTime } from '../../lib/formatters';
import { downloadBlob } from '../../lib/downloadBlob';

const PAGE_SIZE = 20;

type SortableColumn = {
  field: ActivitySortField;
  label: string;
};

function SortableHeader({
  field,
  label,
  sortBy,
  sortDir,
  onSort,
}: SortableColumn & {
  sortBy: ActivitySortField;
  sortDir: SortDirection;
  onSort: (field: ActivitySortField) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="px-5 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 font-medium transition-colors hover:text-slate-600 ${
          active ? 'text-emerald-600' : 'text-slate-400'
        }`}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <span className="text-[10px]">{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

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

  // Paginación, ordenación, búsqueda y filtros
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<ActivitySortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  // Debounce de la búsqueda por nombre (300 ms)
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Al cambiar filtros/orden/búsqueda/atleta, volvemos a la primera página.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [selectedAthleteId, sortBy, sortDir, search, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    activitiesApi
      .list({
        athleteId: selectedAthleteId === 'global' ? undefined : selectedAthleteId,
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortDir,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setActivities(res.activities);
          setTotal(res.total);
        }
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
  }, [selectedAthleteId, page, sortBy, sortDir, search, dateFrom, dateTo]);

  // Al cambiar el contexto de filtrado (no la página ni el orden), limpia la selección
  // para no exportar actividades que ya no coinciden con los filtros activos.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set());
  }, [selectedAthleteId, search, dateFrom, dateTo]);

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

  const colCount = useMemo(() => (selectionMode ? 8 : 7), [selectionMode]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = Boolean(searchInput || dateFrom || dateTo);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const handleSort = (field: ActivitySortField) => {
    if (field === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

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

        {/* Barra de filtros: búsqueda, deporte y rango de fechas */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label htmlFor="search" className="text-xs font-medium text-slate-500">
              Buscar por nombre
            </label>
            <input
              id="search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ej. carrera matutina…"
              className="w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dateFrom" className="text-xs font-medium text-slate-500">
              Desde
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dateTo" className="text-xs font-medium text-slate-500">
              Hasta
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Limpiar filtros
            </button>
          )}
        </div>

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
                    <SortableHeader
                      field="name"
                      label="Nombre"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="date"
                      label="Fecha"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="distance"
                      label="Distancia"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="time"
                      label="Tiempo"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="speed"
                      label="Ritmo"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="hr"
                      label="FC media"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
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
                        {hasActiveFilters
                          ? 'No hay actividades que coincidan con los filtros'
                          : 'Sin actividades registradas'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                <span>
                  Mostrando {rangeStart}–{rangeEnd} de {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-slate-600">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
