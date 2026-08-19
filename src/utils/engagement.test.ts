import { describe, expect, it } from 'vitest';
import { parseEngagement } from './engagement.js';

describe('parseEngagement', () => {
  it('keeps a valid integer number', () => {
    expect(parseEngagement(412)).toBe(412);
  });

  it('parses numeric string with comma separators', () => {
    expect(parseEngagement('1,204')).toBe(1204);
    expect(parseEngagement('3,402')).toBe(3402);
  });

  it('parses numeric string with surrounding whitespace', () => {
    expect(parseEngagement(' 2,310 ')).toBe(2310);
  });

  it('returns null for missing value', () => {
    expect(parseEngagement(null)).toBeNull();
    expect(parseEngagement(undefined)).toBeNull();
    expect(parseEngagement('')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseEngagement('not-a-number')).toBeNull();
    expect(parseEngagement('1,2.5')).toBeNull();
  });

  it('returns null for unsafe or negative numbers', () => {
    expect(parseEngagement(-5)).toBeNull();
    expect(parseEngagement(1.5)).toBeNull();
    expect(parseEngagement(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });
});