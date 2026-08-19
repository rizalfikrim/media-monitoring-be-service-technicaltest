import { describe, expect, it } from 'vitest';
import {
  bulkMentionSchema,
  searchMentionsQuerySchema,
  statsQuerySchema,
} from './mention.schema.js';

describe('bulkMentionSchema', () => {
  it('accepts a non-empty array of raw mentions', () => {
    expect(bulkMentionSchema.safeParse([{ source: 'x', title: 'T' }]).success).toBe(true);
  });

  it('rejects an empty array', () => {
    expect(bulkMentionSchema.safeParse([]).success).toBe(false);
  });

  it('rejects a non-array body', () => {
    expect(bulkMentionSchema.safeParse({ source: 'x' }).success).toBe(false);
    expect(bulkMentionSchema.safeParse('not-an-array').success).toBe(false);
  });
});

describe('searchMentionsQuerySchema', () => {
  it('applies default page and limit', () => {
    const result = searchMentionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(20);
  });

  it('coerces numeric page and limit strings', () => {
    const result = searchMentionsQuerySchema.safeParse({ page: '2', limit: '5' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page).toBe(2);
    expect(result.data.limit).toBe(5);
  });

  it('rejects page below 1 and non-numeric values', () => {
    expect(searchMentionsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(searchMentionsQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
    expect(searchMentionsQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('rejects limit outside the 1-100 range', () => {
    expect(searchMentionsQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(searchMentionsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(searchMentionsQuerySchema.safeParse({ limit: '100' }).success).toBe(true);
  });

  it('rejects invalid dates and from > to', () => {
    expect(searchMentionsQuerySchema.safeParse({ from: 'not-a-date' }).success).toBe(false);
    expect(searchMentionsQuerySchema.safeParse({ from: '2026-08-20', to: '2026-08-10' }).success).toBe(false);
  });

  it('accepts from <= to', () => {
    expect(searchMentionsQuerySchema.safeParse({ from: '2026-08-10', to: '2026-08-20' }).success).toBe(true);
  });

  it('trims q and source', () => {
    const result = searchMentionsQuerySchema.safeParse({ q: '  ringgit  ', source: '  the star  ' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.q).toBe('ringgit');
    expect(result.data.source).toBe('the star');
  });
});

describe('statsQuerySchema', () => {
  it('accepts source and day', () => {
    expect(statsQuerySchema.safeParse({ group_by: 'source' }).success).toBe(true);
    expect(statsQuerySchema.safeParse({ group_by: 'day' }).success).toBe(true);
  });

  it('rejects invalid and missing group_by', () => {
    expect(statsQuerySchema.safeParse({ group_by: 'week' }).success).toBe(false);
    expect(statsQuerySchema.safeParse({}).success).toBe(false);
  });
});