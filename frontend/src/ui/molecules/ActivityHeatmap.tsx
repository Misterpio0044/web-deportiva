import type { HeatmapDay } from '../../infrastructure/api/dashboardApi';

interface Props {
  data: HeatmapDay[];
}

function getColor(count: number): string {
  if (count === 0) return 'bg-slate-100';
  if (count === 1) return 'bg-green-200';
  if (count === 2) return 'bg-green-400';
  return 'bg-green-600';
}

/** Build a full 52-week grid from today backwards */
function buildGrid(data: HeatmapDay[]): Array<{ date: string; count: number; dayOfWeek: number }[]> {
  const countMap = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start on last Sunday 52 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364 - today.getDay());

  const weeks: Array<{ date: string; count: number; dayOfWeek: number }[]> = [];
  let current = new Date(startDate);

  for (let w = 0; w < 53; w++) {
    const week: { date: string; count: number; dayOfWeek: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = current.toISOString().slice(0, 10);
      week.push({ date: iso, count: countMap.get(iso) ?? 0, dayOfWeek: d });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export function ActivityHeatmap({ data }: Props) {
  const weeks = buildGrid(data);
  const totalActivities = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Actividad últimos 12 meses</h3>
        <span className="text-xs text-slate-400">{totalActivities} actividades</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={day.count > 0 ? `${day.date}: ${day.count} actividad${day.count > 1 ? 'es' : ''}` : day.date}
                  className={`h-[10px] w-[10px] rounded-sm ${getColor(day.count)} transition-colors`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span>Menos</span>
        {['bg-slate-100', 'bg-green-200', 'bg-green-400', 'bg-green-600'].map((c) => (
          <div key={c} className={`h-[10px] w-[10px] rounded-sm ${c}`} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
