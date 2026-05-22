import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { activitiesApi, type ActivityDetail } from '../../infrastructure/api/activitiesApi';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { DashboardSkeleton } from '../atoms/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { formatDistance, formatPace, formatTime } from '../../lib/formatters';

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    activitiesApi
      .get(parseInt(id, 10))
      .then((a) => {
        if (!cancelled) setActivity(a);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar la actividad.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pace =
    activity && activity.distance > 0 ? activity.movingTime / (activity.distance / 1000) : 0;
  const speedKmh = activity?.averageSpeed ? (activity.averageSpeed * 3.6).toFixed(2) : null;
  const maxSpeedKmh = activity?.maxSpeed ? (activity.maxSpeed * 3.6).toFixed(2) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={activity?.name ?? 'Actividad'}
          description={activity ? formatDateTime(activity.startDateLocal) : undefined}
        >
          <Button variant="outline" onClick={() => navigate('/activities')}>
            <ArrowLeft size={14} />
            Volver
          </Button>
        </PageHeader>

        {loading && <DashboardSkeleton />}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}{' '}
            <Link to="/activities" className="underline">
              Volver a la lista
            </Link>
          </div>
        )}

        {activity && !loading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Resumen">
              <MetricRow label="Deporte" value={activity.sportType} />
              <MetricRow label="Distancia" value={formatDistance(activity.distance)} />
              <MetricRow label="Tiempo en movimiento" value={formatTime(activity.movingTime)} />
              <MetricRow label="Tiempo total" value={formatTime(activity.elapsedTime)} />
              <MetricRow label="Ritmo medio" value={formatPace(pace)} />
              <MetricRow
                label="Desnivel positivo"
                value={
                  activity.totalElevationGain
                    ? `${Math.round(activity.totalElevationGain)} m`
                    : '—'
                }
              />
            </Section>

            <Section title="Velocidad y cadencia">
              <MetricRow label="Velocidad media" value={speedKmh ? `${speedKmh} km/h` : '—'} />
              <MetricRow label="Velocidad máxima" value={maxSpeedKmh ? `${maxSpeedKmh} km/h` : '—'} />
              <MetricRow
                label="Cadencia media"
                value={
                  activity.averageCadence ? `${Math.round(activity.averageCadence)} ppm` : '—'
                }
              />
            </Section>

            <Section title="Frecuencia cardíaca">
              <MetricRow
                label="Datos disponibles"
                value={activity.hasHeartrate ? 'Sí' : 'No'}
              />
              <MetricRow
                label="FC media"
                value={
                  activity.averageHeartrate
                    ? `${Math.round(activity.averageHeartrate)} bpm`
                    : '—'
                }
              />
              <MetricRow
                label="FC máxima"
                value={activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)} bpm` : '—'}
              />
              <MetricRow
                label="Suffer score"
                value={activity.sufferScore != null ? activity.sufferScore : '—'}
              />
              <MetricRow
                label="Calorías"
                value={activity.calories != null ? `${activity.calories} kcal` : '—'}
              />
            </Section>

            <Section title="Contexto">
              <MetricRow
                label="Temperatura media"
                value={activity.averageTemp != null ? `${activity.averageTemp} °C` : '—'}
              />
              <MetricRow label="En cinta / rodillo" value={activity.trainer ? 'Sí' : 'No'} />
              <MetricRow label="Dispositivo" value={activity.deviceName ?? '—'} />
              <MetricRow label="Zona horaria" value={activity.timezone} />
              <MetricRow label="Material (gear)" value={activity.gearId ?? '—'} />
            </Section>

            {activity.description && (
              <Section title="Descripción">
                <p className="text-sm whitespace-pre-line text-slate-700">{activity.description}</p>
              </Section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
