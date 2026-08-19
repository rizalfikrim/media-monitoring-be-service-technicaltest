import { describe, expect, it } from 'vitest';
import { InvalidDateError, parsePublishedAt } from './date.js';

describe('parsePublishedAt', () => {
  it('parses ISO 8601 with Z suffix', () => {
    expect(parsePublishedAt('2026-08-10T08:15:00Z')?.toISOString()).toBe('2026-08-10T08:15:00.000Z');
  });

  it('parses ISO 8601 with timezone offset', () => {
    expect(parsePublishedAt('2026-08-11T14:02:33+08:00')?.toISOString()).toBe('2026-08-11T06:02:33.000Z');
  });

  it('parses naive datetime as UTC', () => {
    expect(parsePublishedAt('2026-08-10 08:20:00')?.toISOString()).toBe('2026-08-10T08:20:00.000Z');
  });

  it('parses unix epoch in seconds', () => {
    expect(parsePublishedAt(1786435200)?.toISOString()).toBe('2026-08-11T08:00:00.000Z');
  });

  it('parses DD/MM/YYYY as day-first', () => {
    expect(parsePublishedAt('11/08/2026')?.toISOString()).toBe('2026-08-11T00:00:00.000Z');
  });

  it('returns null for missing value', () => {
    expect(parsePublishedAt(null)).toBeNull();
    expect(parsePublishedAt(undefined)).toBeNull();
    expect(parsePublishedAt('')).toBeNull();
  });

  it('throws InvalidDateError for invalid values', () => {
    expect(() => parsePublishedAt('not-a-date')).toThrow(InvalidDateError);
    expect(() => parsePublishedAt('31/02/2026')).toThrow(InvalidDateError);
    expect(() => parsePublishedAt(-5)).toThrow(InvalidDateError);
    expect(() => parsePublishedAt(true)).toThrow(InvalidDateError);
  });
});