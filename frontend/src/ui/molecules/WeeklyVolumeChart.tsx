import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WeeklyVolume } from '../../infrastructure/api/dashboardApi';

interface Props {
  data: WeeklyVolume[];
}

function formatWeek(isoWeek: string): string {
  const d = new Date(isoWeek);
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function WeeklyVolumeChart({ data }: Props) {
  const chartData = data.map((d) => ({
    week: formatWeek(d.week),
    km: parseFloat((d.totalDistance / 1000).toFixed(1)),
    actividades: d.activityCount,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Volumen semanal</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}km`} />
          <Tooltip
            formatter={(value: number) => [formatKm(value * 1000), 'Distancia']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="km" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
