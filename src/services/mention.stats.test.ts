import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database.js';
import { bulkInsertMentions } from '../repositories/mention.repository.js';
import type { NormalizedMention } from '../types/mention.js';
import { generateDedupeKey } from '../utils/dedupe.js';
import { getMentionStats } from './mention.service.js';

const source = `stats-src-${randomUUID()}`;

function makeMention(id: string, publishedAt: Date | null): NormalizedMention {
  const title = `Stats Service ${id}`;
  const content = `Stats Service Content ${id}`;
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
    makeMention('s1', new Date('2025-01-01T08:00:00Z')),
    makeMention('s2', new Date('2025-01-01T09:00:00Z')),
    makeMention('s3', new Date('2025-01-02T08:00:00Z')),
    makeMention('s4', null),
  ]);
});

afterAll(async () => {
  await pool.query('DELETE FROM mentions WHERE source = $1', [source]);
  await pool.end();
});

describe('getMentionStats service', () => {
  it('returns source stats with key/count shape and count as number', async () => {
    const result = await getMentionStats('source');
    expect(result.group_by).toBe('source');
    expect(Array.isArray(result.data)).toBe(true);
    const entry = result.data.find((item) => item.key === source);
    expect(entry).toEqual({ key: source, count: 4 });
    expect(typeof entry?.count).toBe('number');
  });

  it('returns day stats excluding records with null published_at', async () => {
    const result = await getMentionStats('day');
    expect(result.group_by).toBe('day');
    const day1 = result.data.find((item) => item.key === '2025-01-01');
    const day2 = result.data.find((item) => item.key === '2025-01-02');
    expect(day1).toEqual({ key: '2025-01-01', count: 2 });
    expect(day2).toEqual({ key: '2025-01-02', count: 1 });
  });
});