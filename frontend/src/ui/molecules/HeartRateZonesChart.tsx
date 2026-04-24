import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { HeartRateZone } from '../../infrastructure/api/dashboardApi';

interface Props {
  data: HeartRateZone[];
}

const ZONE_COLORS = ['#94a3b8', '#22c55e', '#eab308', '#f97316', '#ef4444'];
const ZONE_LABELS: Record<string, string> = {
  'Zona 1': 'Z1 Recuperación',
  'Zona 2': 'Z2 Aeróbico',
  'Zona 3': 'Z3 Tempo',
  'Zona 4': 'Z4 Umbral',
  'Zona 5': 'Z5 VO2max',
};

export function HeartRateZonesChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d, i) => ({
      name: ZONE_LABELS[d.zone] ?? d.zone,
      value: d.count,
      pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
      color: ZONE_COLORS[i] ?? '#94a3b8',
    }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Distribución por zonas de FC</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} actividades`, name]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#64748b' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
