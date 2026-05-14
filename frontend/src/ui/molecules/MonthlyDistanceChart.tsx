import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyDistance } from '../../infrastructure/api/dashboardApi';

interface Props {
  data: MonthlyDistance[];
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

function formatMonth(yyyyMm: string): string {
  const [, mm] = yyyyMm.split('-');
  return MONTH_LABELS[mm] ?? yyyyMm;
}

export function MonthlyDistanceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: formatMonth(d.month),
    km: d.totalDistanceKm,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Distancia mensual (últimos 12 meses)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: number) => `${v} km`}
          />
          <Tooltip
            formatter={(value: number) => [`${value} km`, 'Distancia']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="km"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#distGradient)"
            dot={{ r: 3, fill: '#6366f1' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
