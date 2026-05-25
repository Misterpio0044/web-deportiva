import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatPace,
  formatDistance,
  formatDate,
  formatTotalDistance,
} from '../formatters';

describe('formatTime', () => {
  it('formatea segundos a m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('62:05');
  });
});

describe('formatPace', () => {
  it('devuelve "--" si pace inválido', () => {
    expect(formatPace(0)).toBe('--');
    expect(formatPace(-1)).toBe('--');
    expect(formatPace(NaN)).toBe('--');
  });

  it('formatea segundos/km a "m:ss /km"', () => {
    expect(formatPace(300)).toBe('5:00 /km');
    expect(formatPace(330)).toBe('5:30 /km');
    expect(formatPace(245)).toBe('4:05 /km');
  });
});

describe('formatDistance', () => {
  it('convierte metros a "X.XX km"', () => {
    expect(formatDistance(5000)).toBe('5.00 km');
    expect(formatDistance(10250)).toBe('10.25 km');
    expect(formatDistance(0)).toBe('0.00 km');
  });
});

describe('formatDate', () => {
  it('formatea fecha a dd/MM/yyyy (es-ES)', () => {
    expect(formatDate('2024-05-20T10:00:00Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('formatTotalDistance', () => {
  it('formatea sin decimales (km redondeados)', () => {
    // El separador de miles depende del locale del runtime (Node/JSDOM puede
    // no tener ICU completo); validamos solo el redondeo de km.
    expect(formatTotalDistance(1_500_000)).toMatch(/^[\d.,\s]+ km$/);
    expect(formatTotalDistance(1_500_000)).toContain('500');
    expect(formatTotalDistance(500)).toBe('1 km'); // 0.5 → redondea a 1
    expect(formatTotalDistance(0)).toBe('0 km');
  });
});
