import type { RecentActivity } from '../../infrastructure/api/dashboardApi';
import { formatDate, formatDistance, formatPace, formatTime } from '../../lib/formatters';

interface Props {
  activities: RecentActivity[];
}

export function RecentActivitiesTable({ activities }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-700">Actividades recientes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-400">
              <th className="px-5 py-3">Nombre</th>
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
              const paceSecPerKm = a.distance > 0 ? a.movingTime / (a.distance / 1000) : 0;
              return (
                <tr
                  key={a.id}
                  className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 font-medium text-slate-800">{a.name}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(a.startDateLocal)}</td>
                  <td className="px-5 py-3 text-slate-700">{formatDistance(a.distance)}</td>
                  <td className="px-5 py-3 text-slate-700">{formatTime(a.movingTime)}</td>
                  <td className="px-5 py-3 text-slate-700">{formatPace(paceSecPerKm)}</td>
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
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  Sin actividades recientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
