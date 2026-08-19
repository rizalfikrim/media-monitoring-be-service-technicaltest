import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database.js';
import { bulkInsertMentions } from '../repositories/mention.repository.js';
import type { NormalizedMention } from '../types/mention.js';
import { generateDedupeKey } from '../utils/dedupe.js';
import { searchMentions } from './mention.service.js';

const source = `test-src-${randomUUID()}`;

function makeMention(id: string, title: string, content: string, publishedAt: Date | null): NormalizedMention {
  return {
    external_id: id,
    source,
    title,
    content,
    url: null,
    author: null,
    published_at: publishedAt,
    engagement: 1,
    dedupe_key: generateDedupeKey({ source, title, content, publishedAt }),
  };
}

beforeAll(async () => {
  await bulkInsertMentions([
    makeMention('s1', 'Alpha One', 'content alpha', new Date('2026-08-10T08:00:00Z')),
    makeMention('s2', 'Beta Two', 'beta body', new Date('2026-08-11T08:00:00Z')),
    makeMention('s3', 'Gamma Three', 'gamma alpha', new Date('2026-08-12T23:00:00Z')),
    makeMention('s4', 'Delta Four', 'delta body', new Date('2026-08-13T08:00:00Z')),
    makeMention('s5', 'Epsilon Five', 'epsilon', null),
  ]);
});

afterAll(async () => {
  await pool.query('DELETE FROM mentions WHERE source = $1', [source]);
  await pool.end();
});

describe('searchMentions service', () => {
  it('interprets date-only to as end-of-day inclusive', async () => {
    const result = await searchMentions({
      source,
      from: '2026-08-10',
      to: '2026-08-12',
      page: 1,
      limit: 20,
    });
    expect(result.pagination.total).toBe(3);
    expect(result.data.map((mention) => mention.title)).toEqual(['Gamma Three', 'Beta Two', 'Alpha One']);
  });

  it('normalizes the source filter before matching', async () => {
    const result = await searchMentions({ source: `  ${source.toUpperCase()}  `, page: 1, limit: 20 });
    expect(result.pagination.total).toBe(5);
  });

  it('maps rows to camelCase fields', async () => {
    const result = await searchMentions({ source, page: 1, limit: 20 });
    const first = result.data[0];
    expect(first).toMatchObject({
      externalId: 's4',
      publishedAt: new Date('2026-08-13T08:00:00Z'),
      engagement: 1,
    });
    expect(first.id).toBeTypeOf('number');
    expect(first.createdAt).toBeInstanceOf(Date);
    expect(first.publishedAt).toBeInstanceOf(Date);
    expect(first).not.toHaveProperty('external_id');
    expect(first).not.toHaveProperty('published_at');
  });

  it('computes totalPages from the total', async () => {
    const result = await searchMentions({ source, page: 2, limit: 2 });
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.page).toBe(2);
  });

  it('returns empty data with zero pagination for no matches', async () => {
    const result = await searchMentions({ source, q: 'zzz-no-match', page: 1, limit: 20 });
    expect(result.data).toEqual([]);
    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });
});