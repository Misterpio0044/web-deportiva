export interface ParsedGpx {
  name: string;
  startDateLocal: string; // YYYY-MM-DDTHH:mm
  distance: number; // metros
  movingTime: number; // segundos
  elapsedTime: number; // segundos
  totalElevationGain: number; // metros
  // Datos opcionales extraídos de <extensions> (Strava / Garmin TrackPointExtension)
  averageHeartrate?: number; // bpm
  maxHeartrate?: number; // bpm
  averageCadence?: number; // spm (tal cual viene del GPX, una pierna)
  averageTemp?: number; // °C
  deviceName?: string; // del atributo creator del <gpx>
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function toLocalIsoMinutes(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

/**
 * Busca un elemento por su nombre local (sin prefijo de namespace) dentro de un nodo.
 * Necesario porque DOMParser conserva los prefijos como `gpxtpx:hr` y querySelector
 * con `:` falla.
 */
function findByLocalName(parent: Element, localName: string): Element | null {
  const all = parent.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) return all[i];
  }
  return null;
}

function parseFloatTag(parent: Element, localName: string): number | null {
  const el = findByLocalName(parent, localName);
  if (!el) return null;
  const v = parseFloat(el.textContent || '');
  return isNaN(v) ? null : v;
}

export function parseGpx(xmlText: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Archivo GPX inválido');

  const nameEl =
    doc.querySelector('metadata > name') ||
    doc.querySelector('trk > name') ||
    doc.querySelector('name');
  const name = nameEl?.textContent?.trim() || 'Actividad importada';

  // creator="Garmin Connect" / "StravaGPX" etc.
  const creator = doc.documentElement?.getAttribute('creator')?.trim() || undefined;

  const trkpts = Array.from(doc.getElementsByTagName('trkpt'));
  if (trkpts.length < 2) {
    throw new Error('El GPX no contiene puntos de track suficientes');
  }

  let distance = 0;
  let elevGain = 0;
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let prevEle: number | null = null;
  let firstTime: Date | null = null;
  let lastTime: Date | null = null;
  let movingTime = 0;
  let prevT: Date | null = null;

  // Acumuladores para extensiones
  let hrSum = 0;
  let hrCount = 0;
  let hrMax = 0;
  let cadSum = 0;
  let cadCount = 0;
  let tempSum = 0;
  let tempCount = 0;

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat') || 'NaN');
    const lon = parseFloat(pt.getAttribute('lon') || 'NaN');
    if (isNaN(lat) || isNaN(lon)) continue;

    const eleEl = pt.getElementsByTagName('ele')[0];
    const ele = eleEl ? parseFloat(eleEl.textContent || 'NaN') : NaN;

    const timeEl = pt.getElementsByTagName('time')[0];
    const t = timeEl ? new Date(timeEl.textContent || '') : null;

    let segDist = 0;
    if (prevLat !== null && prevLon !== null) {
      segDist = haversine(prevLat, prevLon, lat, lon);
      distance += segDist;
    }
    if (!isNaN(ele)) {
      if (prevEle !== null && ele > prevEle) elevGain += ele - prevEle;
      prevEle = ele;
    }
    if (t && !isNaN(t.getTime())) {
      if (!firstTime) firstTime = t;
      lastTime = t;
      if (prevT && segDist > 0) {
        const dt = (t.getTime() - prevT.getTime()) / 1000;
        // Excluir pausas largas (>60s) — heurística
        if (dt > 0 && dt < 60) movingTime += dt;
      }
      prevT = t;
    }
    prevLat = lat;
    prevLon = lon;

    // Extensiones: gpxtpx:hr / gpxtpx:cad / gpxtpx:atemp
    const ext = pt.getElementsByTagName('extensions')[0];
    if (ext) {
      const hr = parseFloatTag(ext, 'hr');
      if (hr !== null && hr > 0) {
        hrSum += hr;
        hrCount += 1;
        if (hr > hrMax) hrMax = hr;
      }
      const cad = parseFloatTag(ext, 'cad');
      if (cad !== null && cad >= 0) {
        cadSum += cad;
        cadCount += 1;
      }
      const temp = parseFloatTag(ext, 'atemp');
      if (temp !== null) {
        tempSum += temp;
        tempCount += 1;
      }
    }
  }

  if (!firstTime || !lastTime) {
    throw new Error('El GPX no contiene marcas de tiempo');
  }

  const elapsedTime = Math.max(1, Math.round((lastTime.getTime() - firstTime.getTime()) / 1000));
  const moving = movingTime > 0 ? Math.round(movingTime) : elapsedTime;

  const result: ParsedGpx = {
    name,
    startDateLocal: toLocalIsoMinutes(firstTime),
    distance: Math.round(distance),
    movingTime: moving,
    elapsedTime,
    totalElevationGain: Math.round(elevGain),
  };

  if (hrCount > 0) {
    result.averageHeartrate = Math.round(hrSum / hrCount);
    result.maxHeartrate = Math.round(hrMax);
  }
  if (cadCount > 0) {
    result.averageCadence = Math.round(cadSum / cadCount);
  }
  if (tempCount > 0) {
    result.averageTemp = Math.round((tempSum / tempCount) * 10) / 10;
  }
  if (creator) {
    result.deviceName = creator;
  }

  return result;
}
