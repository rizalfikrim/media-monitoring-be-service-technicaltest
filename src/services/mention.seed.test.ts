import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database.js';
import { processBulkMentions } from './mention.service.js';

const prefix = `seedtest-${randomUUID()}`;

describe('seed fidelity', () => {
  it('processes the real seed payload to 14 inserted and 1 duplicate', async () => {
    const raw = JSON.parse(
      await readFile(new URL('../../seed_mentions.json', import.meta.url), 'utf8'),
    ) as Array<Record<string, unknown>>;

    const payload = raw.map((record) => ({ ...record, source: `${prefix}|${record.source}` }));

    const result = await processBulkMentions(payload);
    expect(result).toEqual({ received: 15, inserted: 14, duplicates: 1, rejected: 0 });

    const rowsResult = await pool.query(
      `SELECT source, title, content, external_id, url, author, published_at, engagement, dedupe_key
       FROM mentions
       WHERE source LIKE $1`,
      [`${prefix}%`],
    );
    expect(rowsResult.rows).toHaveLength(14);

    const dedupeKeys = rowsResult.rows.map((row) => row.dedupe_key);
    expect(new Set(dedupeKeys).size).toBe(14);

    const ringgit = rowsResult.rows.filter(
      (row) => row.title === 'Ringgit strengthens against US dollar in early trade',
    );
    expect(ringgit).toHaveLength(1);

    const withExternalId = rowsResult.rows.filter((row) => row.external_id !== null);
    const withUrl = rowsResult.rows.filter((row) => row.url !== null);
    const withAuthor = rowsResult.rows.filter((row) => row.author !== null);
    expect(withExternalId.length).toBeGreaterThan(0);
    expect(withUrl.length).toBeGreaterThan(0);
    expect(withAuthor.length).toBeGreaterThan(0);
  });
});

afterAll(async () => {
  await pool.query('DELETE FROM mentions WHERE source LIKE $1', [`${prefix}%`]);
  await pool.end();
});