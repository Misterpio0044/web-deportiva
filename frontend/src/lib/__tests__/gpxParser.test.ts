import { describe, it, expect } from 'vitest';
import { parseGpx } from '../gpxParser';

const validGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata><name>Carrera test</name></metadata>
  <trk>
    <trkseg>
      <trkpt lat="40.4168" lon="-3.7038"><ele>650</ele><time>2024-05-20T08:30:00Z</time>
        <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>120</gpxtpx:hr><gpxtpx:cad>80</gpxtpx:cad><gpxtpx:atemp>20</gpxtpx:atemp></gpxtpx:TrackPointExtension></extensions>
      </trkpt>
      <trkpt lat="40.4178" lon="-3.7048"><ele>655</ele><time>2024-05-20T08:30:30Z</time>
        <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr><gpxtpx:cad>82</gpxtpx:cad><gpxtpx:atemp>21</gpxtpx:atemp></gpxtpx:TrackPointExtension></extensions>
      </trkpt>
      <trkpt lat="40.4188" lon="-3.7058"><ele>660</ele><time>2024-05-20T08:31:00Z</time>
        <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>160</gpxtpx:hr><gpxtpx:cad>84</gpxtpx:cad><gpxtpx:atemp>22</gpxtpx:atemp></gpxtpx:TrackPointExtension></extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const gpxWithLongPause = `<?xml version="1.0"?>
<gpx creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg>
    <trkpt lat="40.0" lon="-3.0"><time>2024-05-20T08:30:00Z</time></trkpt>
    <trkpt lat="40.001" lon="-3.001"><time>2024-05-20T08:30:30Z</time></trkpt>
    <trkpt lat="40.002" lon="-3.002"><time>2024-05-20T08:35:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('parsea un GPX válido con extensiones', () => {
    const result = parseGpx(validGpx);
    expect(result.name).toBe('Carrera test');
    expect(result.deviceName).toBe('Garmin Connect');
    expect(result.distance).toBeGreaterThan(0);
    expect(result.totalElevationGain).toBe(10); // 650→655→660
    expect(result.averageHeartrate).toBe(140);
    expect(result.maxHeartrate).toBe(160);
    expect(result.averageCadence).toBe(82);
    expect(result.averageTemp).toBe(21);
    expect(result.startDateLocal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('movingTime excluye pausas largas (>60s)', () => {
    const result = parseGpx(gpxWithLongPause);
    expect(result.elapsedTime).toBeGreaterThan(result.movingTime);
    expect(result.movingTime).toBeLessThanOrEqual(60);
  });

  it('lanza error si el XML es inválido', () => {
    expect(() => parseGpx('<not xml')).toThrow();
  });

  it('lanza error si no hay puntos suficientes', () => {
    const empty = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg></trkseg></trk></gpx>`;
    expect(() => parseGpx(empty)).toThrow(/puntos de track/);
  });

  it('lanza error si no hay marcas de tiempo', () => {
    const noTime = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
      <trkpt lat="40.0" lon="-3.0"></trkpt>
      <trkpt lat="40.001" lon="-3.001"></trkpt>
    </trkseg></trk></gpx>`;
    expect(() => parseGpx(noTime)).toThrow(/tiempo/);
  });

  it('usa default name si no hay <name>', () => {
    const noName = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
      <trkpt lat="40.0" lon="-3.0"><time>2024-05-20T08:30:00Z</time></trkpt>
      <trkpt lat="40.001" lon="-3.001"><time>2024-05-20T08:30:30Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const result = parseGpx(noName);
    expect(result.name).toBe('Actividad importada');
  });
});
