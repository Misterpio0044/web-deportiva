import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { GearStat } from '../../infrastructure/api/gearApi';

interface Props {
  data: GearStat[];
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

const COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];

export function GearDistanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Distancia por material</h3>
        <p className="text-sm text-slate-400">
          Aún no hay datos de material. Sincroniza con Strava para ver tus materiales.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.name,
    km: parseFloat((d.totalDistance / 1000).toFixed(1)),
    actividades: d.activityCount,
    isPrimary: d.isPrimary,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Distancia por material</h3>
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 44)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v}km`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: '#475569' }}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const v = Number(value);
              const acts = (item?.payload as { actividades?: number } | undefined)?.actividades ?? 0;
              return [
                `${formatKm(v * 1000)} · ${acts} actividad${acts === 1 ? '' : 'es'}`,
                'Distancia',
              ];
            }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="km" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.isPrimary ? '#22c55e' : COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
