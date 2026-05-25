import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('combina clases', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('elimina clases falsy', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('mergea clases de Tailwind en conflicto (la última gana)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('acepta arrays y objetos (clsx)', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});
