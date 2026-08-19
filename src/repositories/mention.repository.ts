import { pool } from '../config/database.js';
import type { NormalizedMention } from '../types/mention.js';

export interface MentionRow {
  id: number;
  external_id: string | null;
  source: string;
  title: string | null;
  content: string | null;
  url: string | null;
  author: string | null;
  published_at: Date | null;
  engagement: number | null;
  created_at: Date;
}

export interface SearchQuery {
  q?: string;
  source?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function searchMentions(
  query: SearchQuery,
): Promise<{ rows: MentionRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.source) {
    params.push(query.source);
    conditions.push(`source = $${params.length}`);
  }

  if (query.q) {
    params.push(`%${escapeLike(query.q)}%`);
    conditions.push(`(title ILIKE $${params.length} OR content ILIKE $${params.length})`);
  }

  if (query.from) {
    params.push(query.from);
    conditions.push(`published_at >= $${params.length}`);
  }

  if (query.to) {
    params.push(query.to);
    conditions.push(`published_at <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const offset = (query.page - 1) * query.limit;
  params.push(query.limit, offset);

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, external_id, source, title, content, url, author, published_at, engagement, created_at
       FROM mentions
       ${where}
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM mentions ${where}`, params.slice(0, -2)),
  ]);

  return {
    rows: dataResult.rows as MentionRow[],
    total: countResult.rows[0].total as number,
  };
}

export async function bulkInsertMentions(mentions: NormalizedMention[]): Promise<number> {
  if (mentions.length === 0) {
    return 0;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i];
      const offset = i * 9;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`,
      );
      values.push(
        mention.external_id,
        mention.source,
        mention.title,
        mention.content,
        mention.url,
        mention.author,
        mention.published_at,
        mention.engagement,
        mention.dedupe_key,
      );
    }

    const result = await client.query(
      `INSERT INTO mentions (external_id, source, title, content, url, author, published_at, engagement, dedupe_key)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (dedupe_key) DO NOTHING`,
      values,
    );

    await client.query('COMMIT');
    return result.rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
