import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database.js';
import type { NormalizedMention } from '../types/mention.js';
import { generateDedupeKey } from '../utils/dedupe.js';
import { bulkInsertMentions, searchMentions } from './mention.repository.js';

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
    makeMention('r1', 'Alpha One', 'content alpha', new Date('2026-08-10T08:00:00Z')),
    makeMention('r2', 'Beta Two', 'beta body', new Date('2026-08-11T08:00:00Z')),
    makeMention('r3', 'Gamma Three', 'gamma alpha', new Date('2026-08-12T23:00:00Z')),
    makeMention('r4', 'Delta Four', 'delta body', new Date('2026-08-13T08:00:00Z')),
    makeMention('r5', 'Epsilon Five', 'epsilon', null),
    makeMention('r6', 'Zeta Six', 'zeta', new Date('2026-08-12T23:00:00Z')),
  ]);
});

afterAll(async () => {
  await pool.query('DELETE FROM mentions WHERE source = $1', [source]);
  await pool.end();
});

describe('searchMentions repository', () => {
  it('lists all rows with stable sort (published_at desc, id desc, nulls last)', async () => {
    const { rows, total } = await searchMentions({ source, page: 1, limit: 20 });
    expect(total).toBe(6);
    expect(rows.map((row) => row.title)).toEqual([
      'Delta Four',
      'Zeta Six',
      'Gamma Three',
      'Beta Two',
      'Alpha One',
      'Epsilon Five',
    ]);
  });

  it('filters by keyword case-insensitively on title and content', async () => {
    const { rows, total } = await searchMentions({ source, q: 'alpha', page: 1, limit: 20 });
    expect(total).toBe(2);
    expect(rows.map((row) => row.title)).toEqual(expect.arrayContaining(['Alpha One', 'Gamma Three']));
  });

  it('matches uppercase keywords case-insensitively', async () => {
    const { total } = await searchMentions({ source, q: 'BODY', page: 1, limit: 20 });
    expect(total).toBe(2);
  });

  it('treats LIKE wildcards as literal characters', async () => {
    const wildcard = await searchMentions({ source, q: '%', page: 1, limit: 20 });
    const underscore = await searchMentions({ source, q: '_', page: 1, limit: 20 });
    expect(wildcard.total).toBe(0);
    expect(underscore.total).toBe(0);
  });

  it('filters by exact normalized source', async () => {
    const { total } = await searchMentions({ source, page: 1, limit: 20 });
    expect(total).toBe(6);
    const { total: none } = await searchMentions({ source: 'does-not-exist', page: 1, limit: 20 });
    expect(none).toBe(0);
  });

  it('applies an inclusive date range and excludes null published_at', async () => {
    const { rows, total } = await searchMentions({
      source,
      from: new Date('2026-08-10T00:00:00.000Z'),
      to: new Date('2026-08-12T23:59:59.999Z'),
      page: 1,
      limit: 20,
    });
    expect(total).toBe(4);
    expect(rows.map((row) => row.title)).toEqual(['Zeta Six', 'Gamma Three', 'Beta Two', 'Alpha One']);
  });

  it('filters with from only', async () => {
    const { total } = await searchMentions({
      source,
      from: new Date('2026-08-13T00:00:00.000Z'),
      page: 1,
      limit: 20,
    });
    expect(total).toBe(1);
  });

  it('paginates with stable order across pages', async () => {
    const page1 = await searchMentions({ source, page: 1, limit: 2 });
    const page2 = await searchMentions({ source, page: 2, limit: 2 });
    const page3 = await searchMentions({ source, page: 3, limit: 2 });
    expect(page1.rows.map((row) => row.title)).toEqual(['Delta Four', 'Zeta Six']);
    expect(page2.rows.map((row) => row.title)).toEqual(['Gamma Three', 'Beta Two']);
    expect(page3.rows.map((row) => row.title)).toEqual(['Alpha One', 'Epsilon Five']);
  });

  it('returns an empty result for an unmatched keyword', async () => {
    const { rows, total } = await searchMentions({ source, q: 'zzz-no-match', page: 1, limit: 20 });
    expect(rows).toEqual([]);
    expect(total).toBe(0);
  });
});