import { useEffect, useState } from 'react';
import { athletesApi } from '../../infrastructure/api/athletesApi';
import type { AthletePublic } from '../../infrastructure/api/athletesApi';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { LoadingSkeleton } from '../atoms/LoadingSkeleton';

export function AdminAthletesPage() {
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    athletesApi
      .list()
      .then(setAthletes)
      .catch(() => setError('Error al cargar los atletas'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(athlete: AthletePublic) {
    if (!confirm(`¿Eliminar a ${athlete.firstname} ${athlete.lastname}? Esta acción no se puede deshacer.`)) {
      return;
    }
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

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Gestión de atletas"
          description={`${athletes.length} atletas registrados`}
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
                  <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-400">
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">FC máx</th>
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
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {a.firstname} {a.lastname}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{a.email}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{a.username}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.role === 'admin'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {a.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {a.maxHeartrate ? `${a.maxHeartrate} bpm` : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(a)}
                          disabled={deletingId === a.id}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === a.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {athletes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        No hay atletas registrados
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
