import { describe, it, expect } from 'vitest';
import {
  buildGpxFromActivity,
  buildGpxFilename,
} from '../../../src/infrastructure/gpx/buildGpxFromActivity';
import { makeActivity } from '../../_helpers/fixtures';

describe('buildGpxFromActivity', () => {
  it('emite XML válido con namespace GPX 1.1 y metadata', () => {
    const xml = buildGpxFromActivity(makeActivity());
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(xml).toContain('<metadata>');
    expect(xml).toContain('<name>Morning Run</name>');
    expect(xml).toContain('<time>2024-05-20T08:30:00Z</time>');
  });

  it('omite el bloque <trk> si no hay coordenadas', () => {
    const xml = buildGpxFromActivity(makeActivity());
    expect(xml).not.toContain('<trk>');
    expect(xml).not.toContain('<trkpt');
  });

  it('emite trkpt de inicio y fin cuando hay coordenadas', () => {
    const xml = buildGpxFromActivity(
      makeActivity({
        startLatitude: 40.4153,
        startLongitude: -3.6844,
        endLatitude: 40.42,
        endLongitude: -3.69,
        movingTime: 1500,
        elapsedTime: 1800,
      })
    );
    expect(xml).toContain('<trk>');
    const matches = xml.match(/<trkpt /g) ?? [];
    expect(matches.length).toBe(2);
    expect(xml).toContain('lat="40.4153"');
    // El time del segundo punto debe ser start + elapsedTime
    expect(xml).toContain('<time>2024-05-20T09:00:00Z</time>');
  });

  it('escapa caracteres XML en el nombre y la descripción', () => {
    const xml = buildGpxFromActivity(makeActivity({ name: 'Run & <fast>' }));
    expect(xml).toContain('<name>Run &amp; &lt;fast&gt;</name>');
    expect(xml).not.toContain('<fast>');
  });

  it('incluye HR y cadencia en la descripción cuando están disponibles', () => {
    const xml = buildGpxFromActivity(
      makeActivity({
        averageHeartrate: 152,
        averageCadence: 170.4,
      })
    );
    expect(xml).toContain('FC media: 152 bpm');
    expect(xml).toContain('Cadencia media: 170 spm');
  });
});

describe('buildGpxFilename', () => {
  it('genera un nombre seguro YYYY-MM-DD_slug.gpx', () => {
    const f = buildGpxFilename(
      makeActivity({ name: 'Rodaje suave – Retiro (8km)' })
    );
    expect(f).toMatch(/^2024-05-20_rodaje-suave-retiro-8km\.gpx$/);
  });

  it('usa fallback cuando el nombre es vacío', () => {
    const f = buildGpxFilename(makeActivity({ name: '   ', id: 42 }));
    expect(f.endsWith('_actividad-42.gpx')).toBe(true);
  });
});
