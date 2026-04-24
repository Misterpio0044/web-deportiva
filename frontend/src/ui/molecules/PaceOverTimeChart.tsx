import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PaceDataPoint } from '../../infrastructure/api/dashboardApi';

interface Props {
  data: PaceDataPoint[];
}

function secToMinKm(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Convert seconds/km to decimal minutes for chart axis */
function secToDecMin(sec: number): number {
  return parseFloat((sec / 60).toFixed(2));
}

export function PaceOverTimeChart({ data }: Props) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    paceMin: secToDecMin(d.paceSecPerKm),
    paceLabel: secToMinKm(d.paceSecPerKm),
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Ritmo a lo largo del tiempo</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={secToMinKm}
            reversed
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(_: number, __: string, props: { payload?: { paceLabel?: string } }) => [
              props.payload?.paceLabel ?? '',
              'Ritmo',
            ]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="paceMin"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
