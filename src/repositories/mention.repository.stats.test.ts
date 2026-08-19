import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database.js';
import type { NormalizedMention } from '../types/mention.js';
import { generateDedupeKey } from '../utils/dedupe.js';
import { bulkInsertMentions, statsByDay, statsBySource } from './mention.repository.js';

const sourceA = `stats-src-a-${randomUUID()}`;
const sourceB = `stats-src-b-${randomUUID()}`;
const sourceC = `stats-src-c-${randomUUID()}`;

function makeMention(source: string, id: string, publishedAt: Date | null): NormalizedMention {
  const title = `Stats Title ${source}-${id}`;
  const content = `Stats Content ${source}-${id}`;
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
    makeMention(sourceA, 'a1', new Date('2025-01-01T08:00:00Z')),
    makeMention(sourceA, 'a2', new Date('2025-01-02T08:00:00Z')),
    makeMention(sourceB, 'b1', new Date('2025-01-01T09:00:00Z')),
    makeMention(sourceB, 'b2', null),
    makeMention(sourceC, 'c1', new Date('2025-01-02T09:00:00Z')),
  ]);
});

afterAll(async () => {
  await pool.query('DELETE FROM mentions WHERE source = ANY($1)', [[sourceA, sourceB, sourceC]]);
  await pool.end();
});

describe('stats repository', () => {
  it('groups by source with count desc, source asc', async () => {
    const rows = await statsBySource();

    const countA = rows.find((row) => row.key === sourceA);
    const countB = rows.find((row) => row.key === sourceB);
    const countC = rows.find((row) => row.key === sourceC);
    expect(countA?.count).toBe(2);
    expect(countB?.count).toBe(2);
    expect(countC?.count).toBe(1);

    const indexOfA = rows.findIndex((row) => row.key === sourceA);
    const indexOfB = rows.findIndex((row) => row.key === sourceB);
    expect(indexOfA).toBeLessThan(indexOfB);

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      if (prev.count === curr.count) {
        expect(prev.key < curr.key).toBe(true);
      } else {
        expect(prev.count > curr.count).toBe(true);
      }
    }
  });

  it('groups by day ascending in UTC and excludes null published_at', async () => {
    const rows = await statsByDay();

    const myRows = rows.filter((row) => row.key.startsWith('2025-'));
    expect(myRows).toEqual([
      { key: '2025-01-01', count: 2 },
      { key: '2025-01-02', count: 2 },
    ]);

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].key < rows[i].key).toBe(true);
    }
  });
});