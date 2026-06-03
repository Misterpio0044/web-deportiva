import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Pencil, FileCheck, FileText, X } from 'lucide-react';
import { AppShell } from '../templates/AppShell';
import { PageHeader } from '../atoms/PageHeader';
import { activitiesApi, type CreateActivityInput } from '../../infrastructure/api/activitiesApi';
import { gearApi, type GearStat } from '../../infrastructure/api/gearApi';
import { parseGpx } from '../../lib/gpxParser';

type Mode = 'manual' | 'gpx';

interface ManualForm {
  // Básico
  name: string;
  date: string;
  time: string;
  durationMin: string; // movingTime
  elapsedMin: string; // elapsedTime (opcional)
  distanceKm: string;
  totalElevationGain: string;
  // FC y esfuerzo
  averageHeartrate: string;
  maxHeartrate: string;
  sufferScore: string;
  // Métricas avanzadas
  averageCadence: string;
  maxSpeedKmh: string;
  averageTemp: string;
  calories: string;
  // Contexto
  deviceName: string;
  trainer: boolean;
  description: string;
}

function emptyForm(): ManualForm {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    name: '',
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    durationMin: '',
    elapsedMin: '',
    distanceKm: '',
    totalElevationGain: '',
    averageHeartrate: '',
    maxHeartrate: '',
    sufferScore: '',
    averageCadence: '',
    maxSpeedKmh: '',
    averageTemp: '',
    calories: '',
    deviceName: '',
    trainer: false,
    description: '',
  };
}

function num(s: string): number | undefined {
  const v = parseFloat(s.replace(',', '.'));
  return isNaN(v) ? undefined : v;
}

export function AddActivityPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('manual');
  const [form, setForm] = useState<ManualForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [gearList, setGearList] = useState<GearStat[]>([]);
  const [selectedGearId, setSelectedGearId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gearApi.stats().then(setGearList).catch(() => {});
  }, []);

  function set<K extends keyof ManualForm>(key: K, value: ManualForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setForm(emptyForm());
    setGpxFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── GPX: parsear y pre-rellenar el formulario para que el usuario revise ──
  async function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      const parsed = parseGpx(text);

      // Separar fecha y hora del startDateLocal "YYYY-MM-DDTHH:mm"
      const [date, time] = parsed.startDateLocal.split('T');

      setForm({
        name: parsed.name,
        date,
        time,
        durationMin: String(Math.round(parsed.movingTime / 60)),
        elapsedMin: String(Math.round(parsed.elapsedTime / 60)),
        distanceKm: (parsed.distance / 1000).toFixed(2),
        totalElevationGain: parsed.totalElevationGain > 0 ? String(parsed.totalElevationGain) : '',
        averageHeartrate:
          parsed.averageHeartrate !== undefined ? String(parsed.averageHeartrate) : '',
        maxHeartrate: parsed.maxHeartrate !== undefined ? String(parsed.maxHeartrate) : '',
        sufferScore: '',
        averageCadence: parsed.averageCadence !== undefined ? String(parsed.averageCadence) : '',
        maxSpeedKmh: '',
        averageTemp: parsed.averageTemp !== undefined ? String(parsed.averageTemp) : '',
        calories: '',
        deviceName: parsed.deviceName ?? '',
        trainer: false,
        description: '',
      });
      setGpxFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el GPX');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function clearGpx() {
    setGpxFileName(null);
    setForm(emptyForm());
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Submit (manual y GPX comparten la misma lógica) ──────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!form.date || !form.time) {
      setError('La fecha y hora son obligatorias');
      return;
    }

    const movingSec = Math.round((num(form.durationMin) ?? 0) * 60);
    if (movingSec <= 0) {
      setError('La duración es obligatoria');
      return;
    }

    const elapsedSec = form.elapsedMin
      ? Math.max(movingSec, Math.round((num(form.elapsedMin) ?? 0) * 60))
      : movingSec;

    const distanceM = (num(form.distanceKm) ?? 0) * 1000;
    const maxSpeedMs = form.maxSpeedKmh ? (num(form.maxSpeedKmh) ?? 0) / 3.6 : undefined;

    const payload: CreateActivityInput = {
      name: form.name.trim(),
      sportType: 'Run',
      startDateLocal: `${form.date}T${form.time}`,
      distance: distanceM,
      movingTime: movingSec,
      elapsedTime: elapsedSec,
    };
    if (form.totalElevationGain) payload.totalElevationGain = num(form.totalElevationGain);
    if (form.averageHeartrate) payload.averageHeartrate = num(form.averageHeartrate);
    if (form.maxHeartrate) payload.maxHeartrate = num(form.maxHeartrate);
    if (form.sufferScore) payload.sufferScore = num(form.sufferScore);
    if (form.averageCadence) payload.averageCadence = num(form.averageCadence);
    if (maxSpeedMs !== undefined && maxSpeedMs > 0) payload.maxSpeed = maxSpeedMs;
    if (form.averageTemp) payload.averageTemp = num(form.averageTemp);
    if (form.calories) payload.calories = num(form.calories);
    if (form.deviceName.trim()) payload.deviceName = form.deviceName.trim();
    if (form.trainer) payload.trainer = true;
    if (form.description.trim()) payload.description = form.description.trim();
    if (selectedGearId) payload.gearId = selectedGearId;

    setSubmitting(true);
    try {
      const activity = await activitiesApi.create(payload);
      navigate(`/activities/${activity.id}`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Error al crear la actividad';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // En modo GPX y sin archivo cargado: solo enseñamos la dropzone
  const showForm = mode === 'manual' || (mode === 'gpx' && gpxFileName !== null);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Añadir actividad"
          description="Inserta una carrera manualmente o importa un archivo GPX"
        />

        {/* Selector de modo */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchMode('manual')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Pencil size={16} />
            Manual
          </button>
          <button
            type="button"
            onClick={() => switchMode('gpx')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'gpx'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Upload size={16} />
            Subir GPX
          </button>
        </div>

        {/* Dropzone GPX (solo cuando no hay archivo) */}
        {mode === 'gpx' && !gpxFileName && (
          <div className="rounded-xl border border-slate-200 bg-white p-8">
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-10 transition-colors hover:border-green-400 hover:bg-green-50/30">
              <input
                ref={fileRef}
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                onChange={handleGpxFile}
                className="hidden"
              />
              <FileCheck size={40} className="text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Haz clic para seleccionar un archivo .gpx
              </p>
              <p className="text-xs text-slate-400">
                Leeremos automáticamente distancia, tiempos, desnivel y, si el archivo lo incluye,
                frecuencia cardíaca, cadencia y temperatura.
              </p>
            </label>
            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Banner del archivo cargado */}
        {mode === 'gpx' && gpxFileName && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-green-800">
              <FileText size={18} />
              <span className="font-medium">Archivo cargado:</span>
              <span>{gpxFileName}</span>
              <span className="text-green-600">— Revisa los datos y completa lo que falte.</span>
            </div>
            <button
              type="button"
              onClick={clearGpx}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <X size={14} />
              Cambiar
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Datos básicos ───────────────────────────────────── */}
            <Section title="Datos básicos">
              <Field label="Nombre *" full>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="form-input"
                  required
                />
              </Field>
              <Field label="Fecha *">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="form-input"
                  required
                />
              </Field>
              <Field label="Hora de inicio *">
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => set('time', e.target.value)}
                  className="form-input"
                  required
                />
              </Field>
              <Field label="Duración en movimiento (min) *">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.durationMin}
                  onChange={(e) => set('durationMin', e.target.value)}
                  className="form-input"
                  required
                />
              </Field>
              <Field label="Tiempo total con pausas (min)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.elapsedMin}
                  onChange={(e) => set('elapsedMin', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Distancia (km)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.distanceKm}
                  onChange={(e) => set('distanceKm', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Desnivel positivo (m)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.totalElevationGain}
                  onChange={(e) => set('totalElevationGain', e.target.value)}
                  className="form-input"
                />
              </Field>
            </Section>

            {/* ── FC y esfuerzo ───────────────────────────────────── */}
            <Section title="Frecuencia cardíaca y esfuerzo">
              <Field label="FC media (bpm)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.averageHeartrate}
                  onChange={(e) => set('averageHeartrate', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="FC máxima (bpm)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.maxHeartrate}
                  onChange={(e) => set('maxHeartrate', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Esfuerzo percibido (RPE 0–100)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.sufferScore}
                  onChange={(e) => set('sufferScore', e.target.value)}
                  className="form-input"
                />
              </Field>
            </Section>

            {/* ── Métricas avanzadas ──────────────────────────────── */}
            <Section title="Métricas avanzadas">
              <Field label="Cadencia media (spm)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.averageCadence}
                  onChange={(e) => set('averageCadence', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Velocidad máxima (km/h)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.maxSpeedKmh}
                  onChange={(e) => set('maxSpeedKmh', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Temperatura media (°C)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.averageTemp}
                  onChange={(e) => set('averageTemp', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Calorías (kcal)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.calories}
                  onChange={(e) => set('calories', e.target.value)}
                  className="form-input"
                />
              </Field>
            </Section>

            {/* ── Contexto ────────────────────────────────────────── */}
            <Section title="Contexto">
              <Field label="Dispositivo">
                <input
                  type="text"
                  value={form.deviceName}
                  onChange={(e) => set('deviceName', e.target.value)}
                  className="form-input"
                />
              </Field>
              {gearList.length > 0 && (
                <Field label="Zapatillas">
                  <select
                    value={selectedGearId}
                    onChange={(e) => setSelectedGearId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Sin asignar</option>
                    {gearList.map((g) => (
                      <option key={g.gearId} value={g.gearId}>
                        {g.name}{g.brand ? ` (${g.brand})` : ''}{g.isPrimary ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Cinta de correr">
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.trainer}
                    onChange={(e) => set('trainer', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  Sí, fue en cinta
                </label>
              </Field>
              <Field label="Notas" full>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  className="form-input"
                />
              </Field>
            </Section>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/activities')}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Guardar actividad'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .form-input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .form-input:focus {
          border-color: rgb(34 197 94);
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }
      `}</style>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'md:col-span-3' : undefined}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
