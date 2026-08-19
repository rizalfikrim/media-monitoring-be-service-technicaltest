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
    url: null,
    author: null,
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
