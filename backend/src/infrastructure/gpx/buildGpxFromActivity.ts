import { Activity } from '../../domain/activity/Activity';

/**
 * Construye un archivo GPX 1.1 a partir de los datos agregados de una actividad.
 *
 * Limitación actual: solo persistimos el punto de inicio y de fin de cada
 * actividad (no la traza completa). El GPX generado contiene, como máximo,
 * dos `<trkpt>` (inicio y fin). Si no hay coordenadas conocidas, se emite
 * un GPX bien formado solo con metadatos.
 */
export function buildGpxFromActivity(activity: Activity): string {
  const start = isoUtc(activity.startDate);
  const end = isoUtc(new Date(activity.startDate.getTime() + activity.elapsedTime * 1000));

  const desc = buildDescription(activity);
  const name = escapeXml(activity.name || 'Actividad');

  const hasStart =
    typeof activity.startLatitude === 'number' && typeof activity.startLongitude === 'number';
  const hasEnd =
    typeof activity.endLatitude === 'number' && typeof activity.endLongitude === 'number';

  const trkpts: string[] = [];
  if (hasStart) {
    trkpts.push(
      `      <trkpt lat="${activity.startLatitude}" lon="${activity.startLongitude}"><time>${start}</time></trkpt>`
    );
  }
  if (hasEnd) {
    trkpts.push(
      `      <trkpt lat="${activity.endLatitude}" lon="${activity.endLongitude}"><time>${end}</time></trkpt>`
    );
  }

  const trkBlock =
    trkpts.length > 0
      ? `  <trk>
    <name>${name}</name>
    <type>${escapeXml(activity.sportType)}</type>
    <trkseg>
${trkpts.join('\n')}
    </trkseg>
  </trk>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="web-deportiva"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>${name}</name>
    <time>${start}</time>
    <desc>${escapeXml(desc)}</desc>
  </metadata>
${trkBlock}
</gpx>
`;
}

/** Nombre de fichero seguro: `YYYY-MM-DD_slug-del-nombre.gpx`. */
export function buildGpxFilename(activity: Activity): string {
  const d = activity.startDateLocal ?? activity.startDate;
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const slug = slugify(activity.name) || `actividad-${activity.id}`;
  return `${date}_${slug}.gpx`;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isoUtc(d: Date): string {
  return new Date(d.getTime()).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildDescription(a: Activity): string {
  const parts: string[] = [];
  parts.push(`Deporte: ${a.sportType}`);
  parts.push(`Distancia: ${(a.distance / 1000).toFixed(2)} km`);
  parts.push(`Tiempo en movimiento: ${formatDuration(a.movingTime)}`);
  parts.push(`Tiempo total: ${formatDuration(a.elapsedTime)}`);
  if (a.totalElevationGain != null) {
    parts.push(`Desnivel positivo: ${Math.round(a.totalElevationGain)} m`);
  }
  if (a.averageHeartrate != null) {
    parts.push(`FC media: ${Math.round(a.averageHeartrate)} bpm`);
  }
  if (a.averageCadence != null) {
    parts.push(`Cadencia media: ${Math.round(a.averageCadence)} spm`);
  }
  return parts.join(' · ');
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
