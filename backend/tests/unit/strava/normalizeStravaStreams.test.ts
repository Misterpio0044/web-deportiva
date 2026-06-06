import { describe, it, expect } from 'vitest';
import { normalizeStravaStreams } from '../../../src/infrastructure/strava/StravaApiClient';

describe('normalizeStravaStreams', () => {
  it('marca hasGps:false cuando no hay latlng', () => {
    expect(normalizeStravaStreams(null).hasGps).toBe(false);
    expect(normalizeStravaStreams({}).hasGps).toBe(false);
    expect(normalizeStravaStreams({ latlng: { data: [] } }).hasGps).toBe(false);
  });

  it('mapea latlng, time, altitude, heartrate y cadence', () => {
    const out = normalizeStravaStreams({
      time: { data: [0, 1, 2] },
      latlng: {
        data: [
          [40.4, -3.6],
          [40.41, -3.61],
        ],
      },
      altitude: { data: [650, 651] },
      heartrate: { data: [120, 130] },
      cadence: { data: [80, 82] },
    });
    expect(out.hasGps).toBe(true);
    expect(out.latlng).toHaveLength(2);
    expect(out.time).toEqual([0, 1, 2]);
    expect(out.altitude).toEqual([650, 651]);
    expect(out.heartrate).toEqual([120, 130]);
    expect(out.cadence).toEqual([80, 82]);
    expect(typeof out.fetchedAt).toBe('string');
  });
});
