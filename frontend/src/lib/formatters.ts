/** Format seconds to mm:ss */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format pace in seconds/km to "m:ss /km" */
export function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return '--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** Format distance in meters to "X.XX km" */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Format a date string to "dd/MM/yyyy" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format total distance in meters to "X,XXX km" */
export function formatTotalDistance(meters: number): string {
  return `${(meters / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} km`;
}
