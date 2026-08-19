import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database.js';
import type { NormalizedMention } from '../types/mention.js';
import { generateDedupeKey } from '../utils/dedupe.js';
import { bulkInsertMentions } from './mention.repository.js';

const source = `test-src-${randomUUID()}`;

function makeMention(id: string): NormalizedMention {
  return {
    external_id: id,
    source,
    title: `Title ${id}`,
    content: `Content ${id}`,
    url: `https://example.com/${id}`,
    author: `Author ${id}`,
    published_at: new Date('2026-08-10T08:15:00Z'),
    engagement: 1,
    dedupe_key: generateDedupeKey({
      source,
      title: `Title ${id}`,
      content: `Content ${id}`,
      publishedAt: new Date('2026-08-10T08:15:00Z'),
    }),
  };
}

afterAll(async () => {
  await pool.query('DELETE FROM mentions WHERE source = $1', [source]);
  await pool.end();
});

describe('bulkInsertMentions', () => {
  it('inserts a new batch and returns the inserted count', async () => {
    const inserted = await bulkInsertMentions([makeMention('a'), makeMention('b')]);
    expect(inserted).toBe(2);
  });

  it('persists all normalized fields', async () => {
    const id = 'persist';
    await bulkInsertMentions([makeMention(id)]);
    const result = await pool.query(
      `SELECT external_id, source, title, content, url, author, published_at, engagement, dedupe_key
       FROM mentions
       WHERE source = $1`,
      [source],
    );
    const row = result.rows.find((r) => r.external_id === id);
    expect(row).toBeDefined();
    expect(row.title).toBe(`Title ${id}`);
    expect(row.url).toBe(`https://example.com/${id}`);
    expect(row.author).toBe(`Author ${id}`);
  });

  it('is idempotent: inserting the same batch again returns 0', async () => {
    const mentions = [makeMention('x'), makeMention('y')];
    const first = await bulkInsertMentions(mentions);
    const second = await bulkInsertMentions(mentions);
    expect(first).toBe(2);
    expect(second).toBe(0);
  });

  it('skips duplicates within a single batch', async () => {
    const duplicate = makeMention('c');
    const inserted = await bulkInsertMentions([duplicate, duplicate]);
    expect(inserted).toBe(1);
  });

  it('skips rows already present from a previous batch', async () => {
    await bulkInsertMentions([makeMention('d')]);
    const inserted = await bulkInsertMentions([makeMention('d'), makeMention('e')]);
    expect(inserted).toBe(1);
  });
});
